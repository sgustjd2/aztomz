#!/usr/bin/env node
/* ============================================================
   한끗 — 티스토리 자동 발행 (Playwright)

   blog-build.mjs 가 만든 backend/out/blog/<id>.{html,json} 을 읽어
   burning-go9me.tistory.com 에 글을 올린다.

   ── 로그인은 자동화하지 않는다 ──
   전용 크롬 프로필(backend/.tistory-profile)에 사람이 딱 1번 로그인해 두고,
   이후엔 그 프로필을 그대로 재사용한다. 카카오 로그인 셀렉터·2단계인증·기기인증이
   전부 우회되고, 깨질 구석이 사라진다. (CDP attach 는 크롬 136+ 에서 기본 프로필이
   막혀 있어 flag+토글 이중 조건이 필요 — 전용 프로필이 훨씬 결정적이다.)

   실행 (레포 루트에서):
     node backend/scripts/blog-publish.mjs --login      # ① 최초 1회: 창 열리면 직접 로그인 후 엔터
     node backend/scripts/blog-publish.mjs --keepalive  # 세션 유지(스케줄러 하루 1회) — 만료면 exit 1
     node backend/scripts/blog-publish.mjs <id> --dry   # ② 에디터까지만 채우고 멈춤(셀렉터 점검)
     node backend/scripts/blog-publish.mjs <id>         # ③ 공개 발행
     node backend/scripts/blog-publish.mjs <id> --draft # 비공개 저장
     node backend/scripts/blog-publish.mjs <id> --edit  # 이미 발행된 글을 새 글 대신 "그 자리에서" 수정
                                                         # (posted.json 의 URL에서 글 번호를 찾아 그 편집화면으로 감)

   환경변수: TISTORY_BLOG(기본 burning-go9me) · TISTORY_CATEGORY(기본 AZTOMZ)
             HEADLESS=1 로 창 없이 실행(로그인 이후에만 권장)
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const profileDir = join(repoRoot, 'backend', '.tistory-profile');
// 티스토리 인증 쿠키는 만료시각이 없는 '세션 쿠키'라 크로미움이 디스크에 안 남긴다.
// 프로필만 믿으면 다음 실행에서 로그인 화면으로 튕긴다(2026-07-25 실측) → storageState 로 따로 떠둔다.
const statePath = join(repoRoot, 'backend', '.tistory-state.json');
const postedPath = join(outDir, 'posted.json');   // 중복 발행 방지 기록

const BLOG = process.env.TISTORY_BLOG || 'burning-go9me';
const CATEGORY = process.env.TISTORY_CATEGORY || 'AZTOMZ';
const BASE = `https://${BLOG}.tistory.com`;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const id = argv.find((a) => !a.startsWith('--'));

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('✗ playwright 가 없습니다. 한 번만:\n    cd backend && npm i && npx playwright install chromium');
  process.exit(1);
}

/* ───────────────────── 요소 찾기 ─────────────────────
   티스토리 에디터는 개편이 잦다. 후보를 여러 개 걸어두고 먼저 보이는 걸 쓰되,
   전부 실패하면 "무엇을 찾다 실패했는지"를 남겨 다음 수정이 1분에 끝나게 한다. */
async function pick(scope, name, candidates, { timeout = 8000, required = true } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const sel of candidates) {
      const loc = typeof sel === 'string' ? scope.locator(sel).first() : sel(scope);
      try {
        if (await loc.isVisible({ timeout: 400 })) return loc;
      } catch { /* 다음 후보 */ }
    }
  }
  if (!required) return null;
  throw new Error(`요소를 못 찾음: ${name}\n  시도한 후보: ${candidates.filter((c) => typeof c === 'string').join(' | ')}`);
}

/* 커버용 실사진 찾기 — 상업적 사용이 허용된 무료 라이선스만(2026-09-24 사용자 요청: 3D 아이콘이 AI 티가 난다).
   1순위 Pexels(무료 API 키 .env PEXELS_API_KEY, 출처표기 불필요) → 없거나 결과 0이면 Openverse CC0/PDM(키 불필요).
   검색어: coverSpec.photo(영문, blog-seo 가 넣음) > 한국어 제목 핵심(Pexels ko-KR) > 분야 기본 영문.
   같은 분야 글끼리 같은 사진이 반복되지 않게 상위 5장 중 글 id 해시로 고른다.
   ponytail: 자동 선택이라 엉뚱한 사진이 걸릴 수 있다 — 문제되면 coverSpec.photo 를 구체적으로 적거나 noPhoto:true. */
const PHOTO_EN = {
  디저트: 'dessert', 카페: 'cafe drink', 맛집: 'korean food', 간식: 'snack', 과일: 'fruit', 해산물: 'seafood',
  김장: 'kimchi', 음식: 'korean food', 축제: 'festival lights', 추석: 'korean traditional', 명절: 'korean traditional',
  여행: 'travel landscape', 신조어: 'friends smartphone', 밈: 'friends smartphone', n8n: 'computer workspace',
  개발: 'coding laptop', AI: 'technology computer', LLM: 'technology computer', 패션: 'fashion street',
  미용: 'cosmetics', 뷰티: 'cosmetics', 노래: 'concert stage', 챌린지: 'dance', 음악: 'music headphones',
  가전: 'home appliance', 반려: 'pet dog', 건강: 'healthy food', 생활: 'cozy home',
};
export async function findCoverPhoto(spec, head, id, key) {
  try { process.loadEnvFile(join(repoRoot, '.env')); } catch { /* .env 없으면 셸 환경변수만 */ }
  const seed = [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (arr) => arr[seed % Math.min(arr.length, 5)];
  const en = spec.photo || PHOTO_EN[key] || 'lifestyle';
  const get = (u, h) => fetch(u, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (process.env.PEXELS_API_KEY) {
    const tries = spec.photo ? [[spec.photo, 'en-US']] : [[head, 'ko-KR'], [en, 'en-US']];
    for (const [q, loc] of tries) {
      if (!q) continue;
      const j = await get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&per_page=8&locale=${loc}`,
        { Authorization: process.env.PEXELS_API_KEY });
      if (j?.photos?.length) { const x = pick(j.photos); return { url: x.src.large2x, credit: `Pexels · ${x.photographer} · ${x.url}` }; }
    }
  }
  const j = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(en)}&license=cc0,pdm&category=photograph&aspect_ratio=wide&size=large&mature=false&page_size=10`);
  // Openverse 는 실사진이 아닌 옛 그림·스캔이 섞인다("shrimp" → 동양화 실측) — 실사진 위주 출처만.
  const ok = (j?.results || []).filter((x) => x.width >= 1000 && /^(stocksnap|wikimedia)$/.test(x.source));
  if (ok.length) { const x = pick(ok); return { url: x.url, credit: `Openverse ${x.license} · ${x.source} · ${x.foreign_landing_url}` }; }
  return null;
}

/* 대표 이미지 카드를 직접 만든다(1200x630).
   남의 사진(언론사·나무위키·인스타)을 내려받아 재업로드하지 않는다 — 출처를 밝혀도 저작권 침해다.
   우리 점수 데이터로 만든 카드는 저작권 문제가 없고, 브랜드도 일관되고, images 가 없는 신조어 글도 커버를 갖는다. */
export async function makeCover(ctx, spec, id) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ── 썸네일 안전영역 ──────────────────────────────────────────
     티스토리 글목록 썸네일은 256x256 정사각형에 object-fit:cover 다(2026-07-28 실측).
     즉 1200x630 카드에서 실제로 보이는 건 **가운데 630x630** 뿐이고 좌우는 잘려나간다.
     그래서 제목·카테고리·브랜드를 전부 가운데 620px 안에 모으고 중앙정렬한다.
     (예전 좌측정렬 카드는 목록에서 제목이 양쪽 다 잘렸다) */
  const SAFE = 620;

  /* ── 디자인 (2026-09-24 2차 개편 — 분야별 템플릿) ─────────────────────────
     1차(단색+흰 제목)는 깔끔했지만 "허접하다"는 피드백. 사용자가 준 핀터레스트 레퍼런스 48장
     (블로그 썸네일·카드뉴스 보드 3개)에서 반복되는 패턴을 분야별 템플릿으로 나눴다:
       pop       원색 바탕 + 두툼한 디스플레이 제목 + 노란 강조 박스 + 큰 3D 아이콘  (음식·행사·여행)
       chat      말풍선 채팅 UI — "이게 무슨 뜻이야?" 질문형                          (신조어·밈)
       editorial 검정 바탕 + 형광 라임 강조 + 격자선                                  (AI·개발)
       clean     흰 바탕 + 형광펜 밑줄 강조 + 좌측 강조선                             (생활·가이드 기본)
       magazine  짙은 컬러 바탕 + 큰 흰 제목 + 영문 워터마크                          (패션·뷰티·음악)
       score     흰 바탕 + 큰 숫자 타일 + 판정 말풍선                                 (광고일까 진짜일까)
     아이콘은 Microsoft Fluent Emoji 3D(MIT 라이선스) — 남의 사진이 아니라 저작권 문제 없음.
     못 받아오면 시스템 이모지로 대체된다. 모든 요소는 가운데 정사각형(SAFE) 안 — 목록 썸네일 크롭 대비. */
  const FLUENT = (name) => `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(name)}/3D/${name.toLowerCase().replace(/ /g, '_')}_3d.png`;
  // [키워드, 템플릿, 색, Fluent 이름, 대체 이모지, 영문 워터마크]
  const THEMES = [
    ['디저트', 'pop', '#ff5d8f', 'Shortcake', '🍰'], ['카페', 'pop', '#7b4a2d', 'Hot beverage', '☕'],
    ['맛집', 'pop', '#ff6b1a', 'Steaming bowl', '🍜'], ['간식', 'pop', '#f77f00', 'Roasted sweet potato', '🍠'],
    ['과일', 'pop', '#ff8c00', 'Tangerine', '🍊'], ['해산물', 'pop', '#1f7ae0', 'Shrimp', '🦐'],
    ['김장', 'pop', '#2f8f46', 'Leafy green', '🥬'], ['음식', 'pop', '#ff6b1a', 'Pot of food', '🍲'],
    ['축제', 'pop', '#5b3cc4', 'Fireworks', '🎆'], ['추석', 'pop', '#6b4a2f', 'Full moon', '🌕'],
    ['명절', 'pop', '#6b4a2f', 'Full moon', '🌕'], ['여행', 'pop', '#1f7ae0', 'Luggage', '🧳'],
    ['신조어', 'chat', '#6c4cf0', 'Speech balloon', '💬'], ['밈', 'chat', '#6c4cf0', 'Speech balloon', '💬'],
    ['n8n', 'editorial', '#c6f432', 'Gear', '⚙️'], ['개발', 'editorial', '#c6f432', 'Laptop', '💻'],
    ['AI', 'editorial', '#c6f432', 'Robot', '🤖'], ['LLM', 'editorial', '#c6f432', 'Robot', '🤖'],
    ['패션', 'magazine', '#0f5c55', 'Running shoe', '👟', 'FASHION'],
    ['미용', 'magazine', '#a8325e', 'Lipstick', '💄', 'BEAUTY'], ['뷰티', 'magazine', '#a8325e', 'Lipstick', '💄', 'BEAUTY'],
    ['노래', 'magazine', '#3b1f7a', 'Musical notes', '🎵', 'MUSIC'], ['챌린지', 'magazine', '#3b1f7a', 'Musical notes', '🎵', 'MUSIC'],
    ['음악', 'magazine', '#3b1f7a', 'Headphone', '🎧', 'MUSIC'],
    ['가전', 'clean', '#2563eb', 'Electric plug', '🔌'], ['반려', 'clean', '#d97706', 'Paw prints', '🐾'],
    ['건강', 'clean', '#16a34a', 'Herb', '🌿'], ['생활', 'clean', '#16a34a', 'House', '🏠'],
    ['error', 'clean', '#dc2626', 'Warning', '⚠️'],
  ];
  // 티스토리 카테고리명(AZTOMZ)이 분야 자리에 새면 의미가 없다 — 그땐 분야 태그를 숨긴다.
  const rawCat = String(spec.cat || '').trim();
  const cat = /^(AZTOMZ|한끗)?$/i.test(rawCat) ? '' : rawCat;
  const hasScore = Number.isFinite(spec.ad) || Number.isFinite(spec.trust);
  const hit = THEMES.find(([k]) => cat.includes(k));
  const [, tplBase, color, fluent, emoji, mark] = hit || ['', 'clean', '#2563eb', 'Pushpin', '📌'];
  const tpl = hasScore ? 'score' : tplBase;

  // 제목: "핵심, 보조" → 핵심을 강조, 보조는 작게. 쉼표가 없으면 통째로 핵심.
  const t = String(spec.title || '').trim();
  const ci = t.indexOf(',');
  let head = t, rest = '';
  if (ci > 1 && ci <= 22) { head = t.slice(0, ci).trim(); rest = t.slice(ci + 1).trim(); }
  const hs = (base) => Math.round(base * (head.length <= 6 ? 1.18 : head.length <= 9 ? 1 : head.length <= 13 ? 0.84 : head.length <= 18 ? 0.7 : 0.6));
  const label = hasScore && spec.label && !t.replace(/\s/g, '').includes(String(spec.label).replace(/\s/g, '')) ? spec.label : '';
  const icon = (size) => `<img class="ic" style="width:${size}px;height:${size}px" src="${FLUENT(fluent)}"
    onerror="this.outerHTML='<span class=&quot;ic&quot; style=&quot;font-size:${Math.round(size * 0.8)}px;line-height:1&quot;>${emoji}</span>'">`;
  const tag = cat ? esc(cat) : '';
  const date = esc(spec.analyzedAt || '');

  // 실사진 카드: 위 사진(가로 전체) + 아래 분야색 단색 패널에 흰 제목. 그라데이션 오버레이 없음.
  // 흰 글씨 대비를 위해 밝은 라임(editorial)은 검정 패널로 바꾼다.
  const photo = spec.noPhoto ? null : await findCoverPhoto(spec, head, id, hit?.[0]);
  if (photo) console.log(`  · 커버 사진: ${photo.credit}`);
  const panel = tplBase === 'editorial' ? '#101216' : hit ? color : '#1d2433';
  const PHOTO = () => `
      <style>
        body{background:${panel}}
        .ph{position:absolute;left:0;top:0;width:1200px;height:360px;object-fit:cover}
        .safe{padding:390px 40px 30px}
        .tagp{position:absolute;left:40px;top:30px;background:#fff;color:#15171c;font-weight:800;font-size:24px;padding:7px 14px;border-radius:8px}
        .head{font-size:${hs(76)}px;line-height:1.12;font-weight:900;color:#fff;letter-spacing:-.04em}
        .rest{margin-top:12px;font-size:28px;font-weight:600;color:rgba(255,255,255,.88)}
        .sc{position:absolute;left:40px;top:258px;display:flex;gap:10px}
        .sc div{background:#fff;border-radius:12px;padding:8px 16px;font-size:18px;font-weight:700;color:#6b7080}
        .sc b{font-size:40px;font-weight:900;margin-right:6px}
        .foot{color:rgba(255,255,255,.8)}
      </style>
      <img class="ph" src="${photo.url}">
      <div class="safe">
        ${tag ? `<div class="tagp">${tag}</div>` : ''}
        ${hasScore ? `<div class="sc">${Number.isFinite(spec.ad) ? `<div><b style="color:#e5484d">${spec.ad}</b>광고 의심도</div>` : ''}${Number.isFinite(spec.trust) ? `<div><b style="color:#12a150">${spec.trust}</b>후기 신뢰도</div>` : ''}</div>` : ''}
        <div class="main">
          <div class="head">${esc(head)}</div>
          ${rest ? `<div class="rest">${esc(rest)}</div>` : ''}
        </div>
        <div class="foot"><b style="color:#fff">한끗</b> ${hasScore ? '추정치 · ' : ''}${date}</div>
      </div>`;

  const BODY = {
    pop: () => `
      <style>
        body{background:${color}}
        .dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.16) 3px,transparent 3.5px);background-size:34px 34px}
        .blob{position:absolute;width:330px;height:330px;border-radius:50%;background:rgba(255,255,255,.2);right:-40px;bottom:-40px}
        .tag{background:#fff;color:${color};font-weight:800;font-size:25px;padding:8px 16px;border-radius:8px;align-self:flex-start}
        .head{font-family:"Black Han Sans",Pretendard,sans-serif;font-weight:400;font-size:${hs(92)}px;line-height:1.12;color:#fff;margin-top:26px;
              text-shadow:0 5px 0 rgba(0,0,0,.18)}
        .head span{background:#ffe14d;color:#1a1a1a;padding:0 12px;box-decoration-break:clone;-webkit-box-decoration-break:clone;text-shadow:none}
        .rest{margin-top:20px;font-size:34px;font-weight:700;color:#fff;max-width:420px}
        .ic{position:absolute;right:26px;bottom:34px}
        .foot{color:rgba(255,255,255,.85)}
      </style>
      <div class="dots"></div>
      <div class="safe">
        <div class="blob"></div>
        <div class="main">
        ${tag ? `<div class="tag">${tag}</div>` : ''}
        <div class="head"><span>${esc(head)}</span></div>
        ${rest ? `<div class="rest">${esc(rest)}</div>` : ''}
        </div>
        ${icon(230)}
        <div class="foot"><b>한끗</b> ${date}</div>
      </div>`,

    chat: () => `
      <style>
        body{background:#eceafe;background-image:radial-gradient(rgba(108,76,240,.14) 3px,transparent 3.5px);background-size:34px 34px}
        .b{max-width:470px;border-radius:26px;padding:22px 28px;font-weight:800;box-shadow:0 8px 24px rgba(40,20,120,.12)}
        .q{background:#fff;color:#2b2b3a;font-size:32px;border-bottom-left-radius:6px;align-self:flex-start;margin-top:26px}
        .a{background:${color};color:#fff;font-size:${hs(64)}px;line-height:1.18;border-bottom-right-radius:6px;align-self:flex-end;margin-top:18px}
        .a small{display:block;font-size:26px;font-weight:600;opacity:.9;margin-top:10px}
        .dotsb{background:#fff;border-radius:20px;padding:12px 20px;align-self:flex-start;font-size:26px;color:#9a97b8;letter-spacing:4px}
        .tag{color:${color};font-weight:800;font-size:26px}
        .ic{position:absolute;left:44px;bottom:78px;transform:rotate(-8deg)}
        .foot{color:#5f5c7a}
      </style>
      <div class="safe">
        <div class="main">
        ${tag ? `<div class="tag">${tag}</div>` : ''}
        <div class="dotsb">•••</div>
        <div class="b q">이게 무슨 뜻이야?</div>
        <div class="b a">${esc(head)}${rest ? `<small>${esc(rest)}</small>` : ''}</div>
        </div>
        ${icon(150)}
        <div class="foot"><b>한끗</b> ${date}</div>
      </div>`,

    editorial: () => `
      <style>
        body{background:#101216}
        .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:42px 42px}
        .tag{color:${color};font-weight:800;font-size:25px;letter-spacing:.04em}
        .head{font-size:${hs(84)}px;line-height:1.14;font-weight:900;color:#fff;letter-spacing:-.04em;margin-top:22px}
        .head span{background:${color};color:#101216;padding:0 10px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
        .rest{margin-top:22px;font-size:32px;font-weight:600;color:rgba(255,255,255,.78);max-width:430px}
        .ic{position:absolute;right:30px;bottom:40px}
        .foot{color:rgba(255,255,255,.6)}
      </style>
      <div class="grid"></div>
      <div class="safe">
        <div class="main">
        ${tag ? `<div class="tag">${tag}</div>` : ''}
        <div class="head"><span>${esc(head)}</span></div>
        ${rest ? `<div class="rest">${esc(rest)}</div>` : ''}
        </div>
        ${icon(200)}
        <div class="foot"><b style="color:#fff">한끗</b> ${date}</div>
      </div>`,

    clean: () => `
      <style>
        body{background:#fff;background-image:radial-gradient(${color}26 3px,transparent 3.5px);background-size:34px 34px}
        .safe{background:#fff}
        .side{position:absolute;top:0;bottom:0;left:285px;width:14px;background:${color}}
        .tag{color:${color};font-weight:800;font-size:26px}
        .head{font-size:${hs(82)}px;line-height:1.16;font-weight:900;color:#15171c;letter-spacing:-.04em;margin-top:20px}
        .head span{background:linear-gradient(transparent 58%, ${color}40 58%)}
        .rest{margin-top:20px;font-size:32px;font-weight:600;color:#4b5060;max-width:420px}
        .circle{position:absolute;right:24px;bottom:30px;width:250px;height:250px;border-radius:50%;background:${color}1f}
        .ic{position:absolute;right:44px;bottom:50px}
        .foot{color:#6b7080}
      </style>
      <div class="side"></div>
      <div class="safe">
        <div class="main">
        ${tag ? `<div class="tag">${tag}</div>` : ''}
        <div class="head"><span>${esc(head)}</span></div>
        ${rest ? `<div class="rest">${esc(rest)}</div>` : ''}
        </div>
        <div class="circle"></div>
        ${icon(210)}
        <div class="foot"><b style="color:#15171c">한끗</b> ${date}</div>
      </div>`,

    magazine: () => `
      <style>
        body{background:${color}}
        .mark{position:absolute;right:24px;top:18px;font-size:112px;font-weight:900;letter-spacing:-.04em;color:transparent;
              -webkit-text-stroke:2px rgba(255,255,255,.18);writing-mode:vertical-rl;line-height:1}
        .tag{color:#fff;font-weight:700;font-size:25px;opacity:.85;border-bottom:3px solid #fff;padding-bottom:6px;align-self:flex-start}
        .head{font-size:${hs(96)}px;line-height:1.08;font-weight:900;color:#fff;letter-spacing:-.045em;margin-top:28px}
        .rest{margin-top:22px;font-size:32px;font-weight:600;color:rgba(255,255,255,.88);max-width:430px}
        .ic{position:absolute;right:30px;bottom:44px;filter:drop-shadow(0 14px 24px rgba(0,0,0,.35))}
        .foot{color:rgba(255,255,255,.75)}
      </style>
      ${mark ? `<div class="mark">${mark}</div>` : ''}
      <div class="safe">
        <div class="main">
        ${tag ? `<div class="tag">${tag}</div>` : ''}
        <div class="head">${esc(head)}</div>
        ${rest ? `<div class="rest">${esc(rest)}</div>` : ''}
        </div>
        ${icon(210)}
        <div class="foot"><b style="color:#fff">한끗</b> ${date}</div>
      </div>`,

    score: () => `
      <style>
        body{background:#f3f4f8;background-image:linear-gradient(rgba(20,20,40,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,20,40,.05) 1px,transparent 1px);background-size:42px 42px}
        .tag{color:#e5484d;font-weight:800;font-size:25px}
        .head{font-size:${hs(74)}px;line-height:1.15;font-weight:900;color:#15171c;letter-spacing:-.04em;margin-top:16px;max-width:430px}
        .tiles{display:flex;gap:16px;margin-top:26px}
        .tile{background:#fff;border-radius:18px;padding:16px 26px;box-shadow:0 6px 20px rgba(20,20,40,.08)}
        .tile b{display:block;font-size:66px;font-weight:900;line-height:1}
        .tile span{font-size:21px;font-weight:700;color:#6b7080}
        .say{margin-top:22px;background:#15171c;color:#fff;font-size:26px;font-weight:700;padding:12px 20px;border-radius:16px;
             border-bottom-left-radius:4px;align-self:flex-start}
        .ic{position:absolute;right:34px;top:48px}
        .foot{color:#6b7080}
      </style>
      <div class="safe">
        <div class="main">
        <div class="tag">광고일까 진짜일까${tag ? ` · ${tag}` : ''}</div>
        <div class="head">${esc(head)}</div>
        <div class="tiles">
          ${Number.isFinite(spec.ad) ? `<div class="tile"><b style="color:#e5484d">${spec.ad}</b><span>광고 의심도</span></div>` : ''}
          ${Number.isFinite(spec.trust) ? `<div class="tile"><b style="color:#12a150">${spec.trust}</b><span>후기 신뢰도</span></div>` : ''}
        </div>
        ${label ? `<div class="say">“${esc(label)}”</div>` : ''}
        </div>
        ${icon(150)}
        <div class="foot"><b style="color:#15171c">한끗</b> 추정치 · ${date}</div>
      </div>`,
  };

  const html = `<!doctype html><meta charset="utf-8">
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
  @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=block');
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;position:relative;color:#15171c;
       font-family:Pretendard,"Malgun Gothic","맑은 고딕",system-ui,sans-serif;word-break:keep-all}
  /* 목록 썸네일(가운데 정사각형 크롭)에 실제로 보이는 영역 — 핵심 요소는 전부 이 안 */
  .safe{position:absolute;left:${(1200 - SAFE) / 2}px;top:0;width:${SAFE}px;height:630px;padding:54px 44px 44px;
        display:flex;flex-direction:column;align-items:flex-start;overflow:visible}
  .safe > *{flex-shrink:0}
  .main{display:flex;flex-direction:column;align-items:flex-start;width:100%;position:relative;z-index:1;transform-origin:left top}
  .foot{margin-top:auto;font-size:21px;font-weight:600;display:flex;gap:10px;align-items:baseline;position:relative;z-index:1}
  .foot b{font-size:27px;font-weight:900;letter-spacing:-.02em}
  .ic{object-fit:contain;z-index:0}
  .head,.rest,.tag,.b{position:relative;z-index:1}
</style>
${photo ? PHOTO() : BODY[tpl]()}`;

  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
  // 웹폰트·아이콘이 다 받아진 뒤에 찍는다(오프라인이면 기본 글꼴·시스템 이모지로 폴백).
  await p.evaluate(() => document.fonts.ready);
  // 제목 블록(.main)이 아래 푸터를 침범하면 블록만 통째로 줄인다(아이콘은 절대배치라 그대로).
  await p.evaluate(() => {
    const main = document.querySelector('.main');
    const foot = document.querySelector('.foot');
    const m = main.getBoundingClientRect();
    const room = foot.getBoundingClientRect().top - 18 - m.top;
    if (m.height > room) main.style.transform = `scale(${room / m.height})`;
  });
  const file = join(outDir, `${id}.cover.png`);
  await p.screenshot({ path: file });
  await p.close();
  return file;
}

/* 커버 업로드.
   이 에디터에는 input[type=file] 이 상시 존재하지 않는다(--probe 결과 files: []).
   툴바 [첨부](aria-label) → [사진] 이 네이티브 파일창을 띄우므로 filechooser 로 받아야 한다. */
/* 본문 첫 이미지를 '대표 이미지'로 지정한다.
   티스토리는 대표 이미지를 본문 마크업이 아니라 **글 메타로 따로** 보관한다([##_Image|...] 치환자
   JSON 에는 originWidth/style/filename 뿐이다). 그래서 본문 이미지를 새로 갈아도 목록 썸네일과
   og:image 는 예전 이미지를 계속 가리킨다(2026-07-28 실측 — 커버를 12편 교체했는데 목록은 옛 카드였다).
   이미지를 클릭하면 TinyMCE 가 .mce-represent-image-btn 오버레이를 띄우고, 누르면 .active 가 붙는다. */
export async function setRepresentative(page) {
  try {
    await page.frameLocator('#editor-tistory_ifr').locator('figure img').first()
      .click({ timeout: 8000 });
    await page.waitForTimeout(600);
    const btn = page.locator('.mce-represent-image-btn').first();
    if (!await btn.count()) return false;
    // 이미 대표면 다시 누르지 않는다(토글이라 해제돼버린다).
    if (await btn.evaluate((b) => b.classList.contains('active'))) return true;
    await btn.click();
    await page.waitForTimeout(700);
    return await btn.evaluate((b) => b.classList.contains('active')).catch(() => false);
  } catch { return false; }
}

/* 본문 그림 N장 업로드 → <!--FIG:id--> 마커를 티스토리 CDN 마크업으로 치환한다.
   커버와 같은 경로(uploadCover)를 재사용하되, 한 장 올릴 때마다 에디터를 비워
   "방금 올라온 것"만 집어낸다 — 누적된 본문에서 마지막 이미지를 골라내려 하면
   업로드 순서가 어긋났을 때 조용히 다른 그림이 들어간다.
   실패는 비치명적이다: 그 그림만 빠지고 나머지 본문은 정상 발행된다. */
export async function uploadFigures(page, ctx, meta, id, body) {
  const wanted = [...body.matchAll(/<!--FIG:([A-Za-z0-9_-]+)-->/g)].map((m) => m[1]);
  if (!wanted.length) return { html: body, done: 0, failed: [] };

  const { makeFigure } = await import('./blog-figure.mjs');
  const byId = new Map((meta.figures || []).map((f) => [f.id, f]));
  let html = body;
  const failed = [];
  let done = 0;

  for (const figId of wanted) {
    const spec = byId.get(figId);
    if (!spec) { failed.push(`${figId}(메타 figures 에 정의 없음)`); continue; }
    try {
      const file = await makeFigure(ctx, spec, id);
      await page.bringToFront();
      await page.evaluate(() => (window.tinymce.activeEditor || window.tinymce.editors[0]).setContent(''));
      if (!await uploadCover(page, file)) throw new Error('업로드 트리거 실패');
      await waitForBodyImage(page);
      // alt 는 getContent() 직렬화 전에 넣어야 결과 마크업에 반영된다(2026-09-13 추가 —
      // 네이버 서치어드바이저 진단에서 이미지 130개가 alt 누락으로 잡혀 추가함).
      await setImageAlt(page, spec.title || '본문 이미지');
      const markup = await page.waitForFunction(() => {
        try {
          const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
          const c = ed.getContent();          // 업로드 중이면 throw → 계속 폴링
          return /##_Image|<img\b/i.test(c) ? c : false;
        } catch { return false; }
      }, null, { timeout: 60000 }).then((h) => h.jsonValue());
      html = html.replace(`<!--FIG:${figId}-->`, markup);
      done++;
      console.log(`  · 그림 ${figId} 업로드됨`);
    } catch (e) {
      failed.push(`${figId}(${String(e.message).split('\n')[0].slice(0, 60)})`);
    }
  }
  // 못 올린 마커는 지운다 — 남겨두면 독자에게 빈 figure 가 보인다.
  html = html.replace(/<!--FIG:[A-Za-z0-9_-]+-->/g, '');
  return { html, done, failed };
}

/* 업로드된 이미지가 에디터 DOM에 실제로 나타날 때까지 기다린다. 업로드 직후엔 잠깐
   비어있다가 뜨므로, alt 를 넣기 전에 이 함수로 먼저 대기해야 img 요소를 찾을 수 있다. */
async function waitForBodyImage(page) {
  return page.waitForFunction(() => {
    try {
      const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
      return /##_Image|<img\b/i.test(ed?.getBody()?.innerHTML || '');
    } catch { return false; }
  }, null, { timeout: 60000 }).catch(() => {});
}

/* alt 속성 채우기(2026-09-13) — 네이버 서치어드바이저 진단에서 이미지 130개가 alt 누락으로
   잡혔다. 원인: 우리 md.mjs 는 <img> 를 직접 안 쓰고(티스토리가 업로드 후 자기 마크업으로
   대체) alt 를 넣을 지점이 없었다. 매번 에디터를 비우고 한 장씩 올리므로(uploadFigures 의
   루프) 이 시점엔 본문에 이미지가 최대 1장뿐이라 어느 이미지인지 헷갈릴 일이 없다. */
async function setImageAlt(page, altText) {
  return page.evaluate((alt) => {
    const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
    const img = ed.getBody().querySelector('img');
    if (!img) return false;
    img.setAttribute('alt', alt);
    ed.fire('change');
    return true;
  }, altText).catch(() => false);
}

export async function uploadCover(page, file) {
  // input[type=file] 로 직접 주입하지 않는다 — 에디터가 뜬 뒤 '동작하지 않는' 숨은 input 이 생겨서
  // setInputFiles 가 조용히 성공만 하고 이미지는 영원히 안 들어온다(2026-07-25 실측).
  try {
    // 포커스·커서가 본문 안에 있어야 업로드된 이미지가 본문에 삽입된다.
    await page.evaluate(() => {
      const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
      ed.focus();
      ed.selection.select(ed.getBody(), true);
      ed.selection.collapse(true);
    });
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      (async () => {
        // 툴바가 두 벌 렌더돼 있어(숨김 포함) 보이는 것만 고른다.
        await page.locator('[aria-label="첨부"]:visible').first().click();
        // [첨부]가 곧바로 파일창을 여는 경우도 있으므로 [사진] 클릭 실패는 무시한다.
        await page.locator('[role="menuitem"], button, a').filter({ hasText: /^\s*사진\s*$/ })
          .first().click({ timeout: 4000 }).catch(() => {});
      })(),
    ]);
    await chooser.setFiles(file);
    return true;
  } catch (e) {
    console.warn('  · 커버 업로드 경로 실패:', String(e.message).split('\n')[0].slice(0, 120));
    return false;
  }
}

/* 카테고리는 발행 레이어가 아니라 에디터 상단에 인라인으로 있다.
   네이티브 select 가 아니라 #category-btn 커스텀 드롭다운(--probe 결과 selects: []). */
async function setCategory(page, name) {
  const btn = page.locator('#category-btn').first();
  if (!await btn.count()) return false;
  await btn.click();

  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 하위 카테고리는 "- AZTOMZ" 처럼 하이픈 접두사로 렌더된다(2026-07-25 실측). "AI/AZTOMZ" 형태도 함께 받는다.
  const hits = page.locator('[role="option"], li a, li button, li').filter({ hasText: new RegExp(`^\\s*[-–]?\\s*(.*/)?${esc}\\s*$`) });
  const n = await hits.count();
  /* 같은 이름이 진짜로 여러 곳에 있으면(예: 최상위 ETC 와 취미/ETC) 조용히 아무거나 고르지 않는다.
     단 n 을 그대로 믿으면 안 된다 — 셀렉터가 li 와 그 안의 li a 를 겹쳐 잡아 같은 항목이
     2번 세어진다(2026-07-30 실측: 유일한 "ETC" 인데 "2곳에 있습니다" 오탐. 매번 뜨면
     진짜 충돌 때 무시하게 된다). 서로 겹치지 않는 것만 골라 실제 개수를 센다. */
  let distinct = n;
  if (n > 1) {
    const boxes = [];
    for (let i = 0; i < n; i++) boxes.push(await hits.nth(i).boundingBox().catch(() => null));
    const keys = new Set(boxes.filter(Boolean).map((b) => `${Math.round(b.x)},${Math.round(b.y)}`));
    distinct = keys.size || n;
  }
  if (distinct > 1) console.warn(`  ⚠ 카테고리 "${name}" 가 ${distinct}곳에 있습니다 — 첫 번째를 씁니다. 고유한 이름으로 바꾸는 게 안전합니다.`);
  if (n) { await hits.first().click(); return true; }

  // 못 찾으면 실제로 뭐가 떠 있었는지 남긴다 — 다시 probe 하지 않아도 되게.
  const seen = (await page.locator('[role="option"], li').allTextContents())
    .map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60);
  console.warn(`  · 카테고리 목록에 보인 항목: ${seen.join(' | ') || '(없음)'}`);
  await page.keyboard.press('Escape').catch(() => {});
  return false;
}

/* --categories: 블로그에 실제로 존재하는 카테고리 전체를 뜬다.
   카테고리 프로파일(config/categories/*.json)의 tistoryCategory 는 여기 이름과 정확히 같아야 한다. */
async function listCategories(page) {
  await page.locator('#category-btn').first().click();
  const items = (await page.locator('[role="option"], li').allTextContents())
    .map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
  // 하위 카테고리는 "- 이름" 으로 렌더된다 → 부모/자식 구분해 트리로 보여준다.
  const seen = new Set();
  const tree = [];
  let parent = null;
  for (const raw of items) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    const child = /^[-–]\s*/.test(raw);
    const name = raw.replace(/^[-–]\s*/, '');
    if (child) tree.push({ name, path: parent ? `${parent}/${name}` : name });
    else { parent = name; tree.push({ name, path: name }); }
  }
  console.log(`카테고리 ${tree.length}개:`);
  for (const c of tree) console.log(`  ${c.path === c.name ? '' : '  '}${c.path}`);
  console.log('\n프로파일의 tistoryCategory 에는 위 이름 중 마지막 조각(예: AZTOMZ)을 그대로 쓰면 됩니다.');
}

/* --probe: 추측 대신 실제 DOM 을 한 번에 떠서 셀렉터를 확정한다. */
async function probe(page) {
  const dump = await page.evaluate(() => {
    const brief = (el) => ({
      tag: el.tagName.toLowerCase(), id: el.id || null,
      cls: (el.className || '').toString().slice(0, 60) || null,
      name: el.getAttribute('name'), type: el.getAttribute('type'),
      accept: el.getAttribute('accept'), aria: el.getAttribute('aria-label'),
      ph: el.getAttribute('placeholder'),
      text: (el.innerText || '').trim().slice(0, 30) || null,
      hidden: !el.offsetParent && getComputedStyle(el).display === 'none',
    });
    return {
      files: [...document.querySelectorAll('input[type=file]')].map(brief),
      selects: [...document.querySelectorAll('select')].map((s) => ({
        ...brief(s), options: [...s.options].map((o) => o.text.trim()).slice(0, 20),
      })),
      categoryish: [...document.querySelectorAll('[id*="category" i],[class*="category" i]')].slice(0, 8).map(brief),
      tagish: [...document.querySelectorAll('[id*="tag" i],[class*="tag" i],input[placeholder*="태그"]')].slice(0, 8).map(brief),
      toolbarBtns: [...document.querySelectorAll('button[aria-label],[role=button][aria-label]')].slice(0, 25)
        .map((b) => b.getAttribute('aria-label')),
      editors: window.tinymce ? window.tinymce.editors.map((e) => ({ id: e.id, len: (e.getContent() || '').length })) : null,
    };
  });
  console.log(JSON.stringify(dump, null, 1));
}

/* 발행 직후 Tistory SPA 가 실제 퍼머링크(/N) 대신 /manage/posts/ 로 튕길 때가 있다(2026-07-25 실측 —
   6건 발행 전부 이렇게 됐다). page.url() 을 그대로 믿으면 posted.json 에 관리 페이지 주소가 남아
   다음 글의 내부링크를 못 만든다. RSS 는 발행 즉시 갱신되고 실제 퍼머링크를 담고 있어 제목으로 대조한다. */
async function findPermalink(title) {
  try {
    const res = await fetch(`${BASE}/rss`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const xml = await res.text();
    const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    for (const [, body] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const t = (body.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
      const l = (body.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
      if (t && l && unescapeXml(t.trim()) === title.trim()) return l.trim();
    }
  } catch { /* RSS 조회가 실패해도 발행 자체는 이미 끝났다 — 호출부가 page.url() 로 폴백한다 */ }
  return null;
}

/* 자가검사: node backend/scripts/blog-publish.mjs --selftest
   findPermalink 의 존재 이유 자체("발행 직후 실제 퍼머링크를 RSS 로 확정한다")를 라이브로 검증한다.
   RSS 최신 글로 왕복 대조 + 없는 제목이 null 인지, 두 가지만 본다. */
async function selftest() {
  const res = await fetch(`${BASE}/rss`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) { console.error(`✗ RSS 조회 실패: ${res.status}`); process.exitCode = 1; return; }
  const xml = await res.text();
  const first = xml.match(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/);
  if (!first) { console.error('✗ RSS 에 글이 없어 검사할 수 없습니다'); process.exitCode = 1; return; }
  const title = first[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  const expected = first[2].trim();

  const got = await findPermalink(title);
  if (got === expected) console.log(`✓ findPermalink 정상 — "${title.slice(0, 30)}..." → ${got}`);
  else { console.error(`✗ findPermalink 불일치 — 기대 ${expected} / 실제 ${got}`); process.exitCode = 1; }

  const missing = await findPermalink('절대 존재하지 않을 제목 — selftest-nonexistent-xyz');
  if (missing === null) console.log('✓ 없는 제목은 null 반환');
  else { console.error(`✗ 없는 제목인데 매치됨: ${missing}`); process.exitCode = 1; }
}

async function login() {
  const ctx = await chromium.launchPersistentContext(profileDir, { headless: false, viewport: null });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`${BASE}/manage/newpost/`, { waitUntil: 'domcontentloaded' });
  console.log('\n브라우저에서 카카오 로그인을 끝내세요. 로그인 화면에 "로그인 상태 유지"가 있으면 반드시 체크하세요.'
    + '\n글쓰기 화면이 뜨면 이 터미널에서 엔터를 누르세요.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('> 로그인 완료 후 엔터: ');
  rl.close();
  const url = page.url();
  const ok = url.includes('/manage/newpost');
  if (ok) await ctx.storageState({ path: statePath });   // 닫기 전에 — 세션 쿠키까지 포함된다
  await ctx.close();
  console.log(ok
    ? `✓ 로그인 세션 저장됨 → backend/.tistory-state.json (+ 프로필)`
    : `⚠ 현재 URL 이 글쓰기 화면이 아닙니다(${url}). 다시 --login 하세요.`);
  process.exit(ok ? 0 : 1);
}

/* --keepalive: 봇탐지 우회가 아니라, 세션이 idle 로 죽지 않게 살려두는 정당한 방법.
   관리페이지를 한 번 열어 서버 세션을 갱신하고, 롤링된 쿠키를 .tistory-state.json 에 최신값으로
   다시 떠둔다(발행 때 re-inject 하는 그 파일). 만료됐으면 자동 로그인은 하지 않고(철칙) exit 1 로
   "사람이 --login 필요"를 알린다. 무인 스케줄러(Task Scheduler/Hermes)에서 하루 1회 돌리는 용도라
   기본 headless(--head 로 창 보기). */
async function keepalive() {
  if (!existsSync(profileDir)) {
    console.error('✗ 로그인 프로필이 없습니다. 먼저: node backend/scripts/blog-publish.mjs --login');
    process.exit(1);
  }
  const ctx = await chromium.launchPersistentContext(profileDir, { headless: !has('head') });
  if (existsSync(statePath)) {
    const st = JSON.parse(await readFile(statePath, 'utf8'));
    await ctx.addCookies(st.cookies || []);
  }
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));   // "작성 중인 글 불러올까요?" 류 무시
  const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  try {
    await page.goto(`${BASE}/manage/`, { waitUntil: 'domcontentloaded' });
    if (/login|accounts\.kakao/.test(page.url())) {
      console.error(`✗ 세션 만료 (${now()}) — 재로그인 필요: node backend/scripts/blog-publish.mjs --login`);
      await ctx.close();
      process.exit(1);
    }
    await ctx.storageState({ path: statePath });   // 방문으로 갱신된 쿠키를 최신값으로 다시 저장
    console.log(`✓ 세션 살아있음 — 갱신 완료 (${now()})`);
    await ctx.close();
  } catch (e) {
    await ctx.close().catch(() => {});
    console.error(`✗ keep-alive 실패 (${now()}): ${e.message}`);
    process.exit(1);
  }
}

async function publish() {
  const htmlPath = join(outDir, `${id}.html`);
  const metaPath = join(outDir, `${id}.json`);
  if (!existsSync(htmlPath) || !existsSync(metaPath)) {
    console.error(`✗ 빌드 결과가 없습니다. 먼저: node backend/scripts/blog-build.mjs ${id}`);
    process.exit(1);
  }
  const body = await readFile(htmlPath, 'utf8');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const category = meta.category || CATEGORY;
  // 네이버 배정 글은 티스토리에 올리지 않는다 — 두 블로그에 같은 글이 가지 않게(blog-queue.mjs).
  if (meta.platform === 'naver' && !has('force') && !has('dry')) {
    console.error(`✗ "${id}" 는 네이버 배정 글입니다(meta.platform). 그래도 올리려면 --force`);
    process.exit(1);
  }

  // 같은 글을 두 번 올리면 중복 콘텐츠가 된다. 발행 기록을 남기고 재실행은 --force 로만.
  // (로그인 확인보다 먼저 — 이미 올린 글이면 브라우저를 띄울 이유가 없다.)
  const posted = existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  let editPostId = null;
  if (has('edit')) {
    // 새 글을 또 만드는 게 아니라 이미 발행된 그 글의 편집화면으로 간다 — 사실 오류 등을
    // 사후에 고칠 때 쓴다(중복 게시물을 만들지 않기 위해).
    if (!posted[id]) {
      console.error(`✗ --edit 는 이미 발행된 글만 가능합니다 — posted.json 에 "${id}" 가 없습니다.`);
      process.exit(1);
    }
    const m = posted[id].url.match(/\/(\d+)\/?$/);
    if (!m) {
      console.error(`✗ posted.json 의 URL 에서 글 번호를 못 찾았습니다: ${posted[id].url}`);
      process.exit(1);
    }
    editPostId = m[1];
  } else if (posted[id] && !has('force') && !has('dry')) {
    console.log(`· 이미 발행됨 (${posted[id].at}) — ${posted[id].url}\n  다시 올리려면 --force (같은 글을 고치려면 --edit)`);
    process.exit(0);
  }

  if (!existsSync(profileDir)) {
    console.error('✗ 로그인 프로필이 없습니다. 먼저: node backend/scripts/blog-publish.mjs --login');
    process.exit(1);
  }

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.HEADLESS === '1',
    viewport: { width: 1440, height: 960 },
    // blog-queue.mjs(무인)가 부를 땐 창을 화면 밖에 — 게임·작업 중에 튀어나오지 않게.
    args: process.env.BLOG_OFFSCREEN === '1' ? ['--window-position=-32000,-32000'] : [],
  });
  // 프로필에 안 남는 세션 쿠키를 --login 때 떠둔 storageState 에서 되살린다.
  if (existsSync(statePath)) {
    const st = JSON.parse(await readFile(statePath, 'utf8'));
    await ctx.addCookies(st.cookies || []);
  }

  const page = ctx.pages()[0] || await ctx.newPage();
  // "작성 중인 글을 불러올까요?" 네이티브 confirm — 페이지 진입 직후엔 '아니오'(새 글/우리가 주입할
  // 내용으로 시작). 그런데 발행 버튼을 누른 뒤에 뜨는 확인창(예: "이미 발행된 글입니다. 덮어쓸까요?")
  // 까지 똑같이 dismiss 해버리면 클릭은 성공했다고 나오는데 실제로는 취소돼 아무 것도 안 바뀐다
  // (2026-08-09 --edit 모드에서 실측 — 콘솔은 "발행 완료"인데 라이브 글이 그대로였다).
  // contentReady 이후에 뜨는 다이얼로그는 발행 확인일 가능성이 높으므로 accept 한다.
  let contentReady = false;
  page.on('dialog', (d) => {
    console.log(`  · 다이얼로그(${contentReady ? 'accept' : 'dismiss'}): ${d.message().slice(0, 100)}`);
    (contentReady ? d.accept() : d.dismiss()).catch(() => {});
  });

  const fail = async (e) => {
    const shot = join(outDir, `${id}.error.png`);
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
    console.error(`✗ 발행 실패: ${e.message}\n  현재 URL: ${page.url()}\n  스크린샷: ${shot}`);
    if (!has('keep-open')) await ctx.close();
    process.exit(1);
  };

  try {
    await page.goto(editPostId ? `${BASE}/manage/newpost/${editPostId}` : `${BASE}/manage/newpost/`, { waitUntil: 'domcontentloaded' });

    if (/login|accounts\.kakao/.test(page.url())) {
      throw new Error('로그인 세션이 만료됐습니다. --login 을 다시 실행하되, '
        + '카카오 로그인 화면의 "로그인 상태 유지"를 반드시 체크하세요(안 하면 세션 쿠키라 금방 끊깁니다).');
    }

    // ── 제목
    const title = await pick(page, '제목 입력란', [
      '#post-title-inp',
      'input[placeholder="제목을 입력하세요"]',
      'input[placeholder*="제목"]',
      'textarea[placeholder*="제목"]',
    ], { timeout: 20000 });
    await title.click();
    await title.fill(meta.title);

    if (has('categories')) { await listCategories(page); await ctx.close(); return; }
    if (has('probe')) { await probe(page); await ctx.close(); return; }

    // ── 카테고리 (이 에디터는 상단 인라인 — 발행 레이어가 아니다)
    if (!await setCategory(page, category)) console.warn(`  ⚠ 카테고리 "${category}" 선택 실패 — --probe 로 확인 필요`);

    // ── 에디터(TinyMCE) 준비 확인
    await page.waitForFunction(() => !!(window.tinymce && (window.tinymce.activeEditor || window.tinymce.editors?.[0])), null, { timeout: 20000 })
      .catch(() => { throw new Error('TinyMCE 에디터를 찾지 못했습니다. 에디터가 "기본모드"인지 확인하세요(마크다운/HTML 모드면 setContent 불가).'); });

    // ── 대표 이미지: 우리 점수 데이터로 카드를 만들어(저작권 무관) 빈 에디터에 먼저 올리고,
    //    티스토리가 돌려준 CDN 마크업을 본문 <!--COVER--> 자리에 끼워 넣는다.
    let coverMarkup = '';
    if (meta.coverSpec) {
      const coverFile = await makeCover(ctx, meta.coverSpec, id);
      await page.bringToFront();
      await page.evaluate(() => (window.tinymce.activeEditor || window.tinymce.editors[0]).setContent(''));
      const uploaded = await uploadCover(page, coverFile);
      if (uploaded) {
        // 티스토리는 업로드 이미지를 [##_Image|...] 치환자로도, 실제 <img> 로도 보관한다. 둘 다 유효.
        await waitForBodyImage(page);
        await setImageAlt(page, meta.title); // getContent() 로 뽑기 전에 넣어야 결과에 반영된다.
        // 업로드가 끝나기 전에는 티스토리가 getContent() 를 막고
        // "이미지 업로드가 완료된 후 시도해 주세요." 를 던진다 → 삼키고 계속 폴링해야 한다.
        coverMarkup = await page.waitForFunction(() => {
          try {
            const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
            const c = ed.getContent();          // 업로드 진행 중이면 여기서 throw
            return /##_Image|<img\b/i.test(c) ? c : false;
          } catch { return false; }
        }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => '');
      }
      if (!coverMarkup) {
        // 왜 안 들어갔는지 남긴다 — 에디터가 진짜 비었는지, 뭔가 들어갔는데 형식이 다른지.
        const now = await page.evaluate(() => {
          try {
            const ed = window.tinymce?.activeEditor || window.tinymce?.editors?.[0];
            if (!ed) return { content: '(tinymce 없음)', dom: '' };
            return { content: (ed.getContent() || '').slice(0, 200), dom: (ed.getBody()?.innerHTML || '').slice(0, 200) };
          } catch (err) { return { content: 'ERR ' + err.message, dom: '' }; }
        }).catch((err) => ({ content: 'evaluate 실패: ' + err.message.split('\n')[0], dom: '' }));
        console.warn('  ⚠ 커버 업로드 확인 실패 — 본문만 발행합니다.');
        console.warn(`    content: ${JSON.stringify(now.content)}`);
        console.warn(`    dom    : ${JSON.stringify(now.dom)}`);
      }
    }

    // ── 본문 그림: 커버를 올린 뒤, 같은 경로로 figures 를 하나씩 올려 마커를 채운다.
    //    커버보다 뒤에 해야 한다 — 대표 이미지는 '본문 첫 이미지'를 집으므로 커버가 먼저여야 한다.
    const figRes = await uploadFigures(page, ctx, meta, id, body);
    if (figRes.done) console.log(`  · 본문 그림 ${figRes.done}장 삽입`);
    if (figRes.failed.length) console.warn(`  ⚠ 그림 실패: ${figRes.failed.join(' · ')}`);

    // ── 본문: 타이핑하지 않고 setContent 로 한 번에 주입(양식이 안 깨지는 유일한 길).
    const finalHtml = coverMarkup
      ? figRes.html.replace('<!--COVER-->', coverMarkup)
      : figRes.html.replace('<!--COVER-->', '');
    await page.evaluate((html) => {
      const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
      ed.setContent(html);
      ed.fire('change');
      ed.save?.();
    }, finalHtml);

    // 커버를 넣었으면 대표 이미지로 지정한다 — 안 하면 목록 썸네일·og:image 가 안 잡힌다.
    if (coverMarkup) {
      const rep = await setRepresentative(page);
      if (!rep) console.warn('  ⚠ 대표 이미지 지정 실패 — 목록 썸네일이 안 잡힐 수 있습니다.');
    }

    // getContent() 는 업로드 중 throw 하므로 본문 DOM 길이로 확인한다.
    const injected = await page.evaluate(() =>
      (window.tinymce.activeEditor || window.tinymce.editors[0]).getBody().innerHTML.length);
    if (injected < 200) throw new Error(`본문 주입이 비어 보입니다(${injected}자). 에디터 모드를 확인하세요.`);
    contentReady = true; // 이제부터 뜨는 다이얼로그는 발행 확인일 가능성이 높다 — accept 로 전환

    // ── 수정 모드면 기존 태그를 먼저 다 지운다 — 안 지우면 새 태그가 옛 태그 옆에 그냥 쌓인다.
    // 구조: <span class="txt_tag">#이름<a class="btn_delete">...</a></span> 가 태그마다 하나.
    // 지울 때마다 DOM 이 다시 그려지므로 매번 새로 조회한다(캐시된 핸들은 stale 해짐).
    if (editPostId) {
      for (let i = 0; i < 30; i++) {
        const del = page.locator('.editor_tag a.btn_delete').first();
        if (!(await del.count())) break;
        await del.evaluate((el) => el.click());
        await page.waitForTimeout(150);
      }
      const remaining = await page.locator('.editor_tag a.btn_delete').count();
      if (remaining) console.warn(`  ⚠ 기존 태그 ${remaining}개를 다 못 지웠습니다 — 수동 확인 필요`);
    }

    // ── 태그 (카테고리와 마찬가지로 에디터 하단 인라인)
    const tagInput = await pick(page, '태그 입력란', [
      '#tagText',
      'input[placeholder*="태그"]',
      '[class*="tag"] input',
    ], { timeout: 5000, required: false });
    if (tagInput) {
      for (const tag of meta.tags || []) {
        await tagInput.fill(tag);
        await tagInput.press('Enter');
      }
    } else console.warn('  ⚠ 태그 입력란을 못 찾았습니다 — --probe 로 확인 필요');

    if (has('dry')) {
      const shot = join(outDir, `${id}.dry.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`✓ dry: 제목·본문 주입 완료 (본문 ${injected}자, 커버 ${coverMarkup ? '있음' : '없음'})\n  스크린샷: ${shot}\n  창을 확인하고 직접 발행하거나 닫으세요.`);
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await rl.question('> 확인 후 엔터(창 닫힘): ');
      rl.close();
      await ctx.close();
      return;
    }

    // ── 발행 레이어 열기
    const done = await pick(page, '완료 버튼', [
      '#publish-layer-btn',
      'button:has-text("완료")',
      '.btn_save:has-text("완료")',
    ], { timeout: 10000 });
    await done.click();

    // ── 공개 범위
    const visLabel = has('draft') ? '비공개' : '공개';
    const vis = await pick(page, `공개 설정(${visLabel})`, [
      `label:has-text("${visLabel}")`,
      `#open${has('draft') ? '0' : '20'}`,
    ], { timeout: 5000, required: false });
    if (vis) await vis.click();
    else console.warn(`  ⚠ 공개 설정(${visLabel})을 못 찾았습니다 — 티스토리 기본값으로 발행됩니다.`);

    // ── 발행 (비공개는 버튼 이름이 "비공개 저장" 으로 바뀐다)
    const pubText = has('draft') ? '비공개 저장' : '공개 발행';
    const pub = await pick(page, `발행 버튼(${pubText})`, [
      `button:has-text("${pubText}")`,
      '#publish-btn',
      'button:has-text("발행")',
    ], { timeout: 8000 });
    await pub.click();

    // 발행되면 글 주소로 이동한다. /manage/ 아래는 전부 "아직 안 끝남" 으로 친다 —
    // --edit 모드는 시작 URL 자체가 /manage/newpost/<id> 라 숫자로 끝나는 걸로만 판정하면
    // 클릭 직후(진짜 저장이 되기도 전에) 바로 통과해버린다(2026-08-09 실측 — "발행 완료"라고
    // 나왔는데 라이브 글은 그대로였다. 원인: 발행 확인 다이얼로그가 dismiss 되며 취소된 것).
    // 발행 클릭 후 뜨는 DKAPTCHA(지도 봇검증)는 사람이 직접 푼다. 30초는 사람이 지도를
    // 읽고 답을 입력하기에 짧아 자주 시간초과됐다(2026-09-14 실측: 30초로 5회 연속 실패 →
    // 3분으로 늘리자 5편 연속 통과). 발행은 어차피 사람이 붙어 있는 반자동 단계라(무인 자동화
    // 안 함, [[tistory-publish-captcha]]) 넉넉히 3분 준다 — 정말 안 풀면 그때 실패로 친다.
    await page.waitForURL(
      (u) => (/\/\d+\/?$/.test(u.pathname) && !u.pathname.includes('/manage/')) || u.pathname.includes('/manage/posts'),
      { timeout: 180000 }
    ).catch(() => { throw new Error('발행 후 이동을 확인하지 못했습니다(캡차 미해결일 수 있음). 티스토리에서 직접 확인하세요.'); });

    // /manage/posts/ 로 튕겼으면 page.url() 은 진짜 글 주소가 아니다 — RSS 로 퍼머링크를 확정한다.
    // --edit 는 글 번호를 이미 알고 있으니(editPostId) RSS 조회가 실패해도 그걸로 확정할 수 있다.
    let finalUrl = page.url();
    if (!has('draft') && !/\/\d+\/?$/.test(new URL(finalUrl).pathname)) {
      const permalink = await findPermalink(meta.title);
      if (permalink) finalUrl = permalink;
      else if (editPostId) finalUrl = `${BASE}/${editPostId}`;
      else console.warn('  ⚠ RSS 에서 퍼머링크를 못 찾았습니다 — posted.json 에 관리 페이지 주소가 남습니다.');
    }

    // 비공개 저장은 '발행'이 아니다 — 기록하면 나중에 공개 발행할 때 중복 가드에 막힌다.
    if (!has('draft')) {
      posted[id] = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), url: finalUrl, title: meta.title };
      await writeFile(postedPath, JSON.stringify(posted, null, 2) + '\n', 'utf8');
    }

    console.log(`✓ 발행 완료: ${finalUrl}\n  제목: ${meta.title}\n  태그: ${(meta.tags || []).join(', ')}`);
    await ctx.close();
  } catch (e) {
    await fail(e);
  }
}

/* --cover: 티스토리에 붙지 않고 커버 카드 PNG 만 만들어 본다(디자인 확인용). */
async function coverOnly() {
  const meta = JSON.parse(await readFile(join(outDir, `${id}.json`), 'utf8'));
  if (!meta.coverSpec) { console.log('· coverSpec 없음 — 커버 생략된 글입니다.'); return; }
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const file = await makeCover(ctx, meta.coverSpec, id);
  await browser.close();
  console.log(`✓ 커버 생성: ${file}`);
}

/* CLI 는 이 파일을 **직접 실행**했을 때만 돈다.
   blog-recover.mjs 가 makeCover/uploadCover 를 재사용하려고 import 하는데, 가드가 없으면
   import 만으로 아래 분기가 실행돼 엉뚱하게 발행이 돌아간다(2026-07-28). */
const isMain = process.argv[1]
  && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;

if (isMain) {
  if (has('login')) await login();
  else if (has('keepalive')) await keepalive();
  else if (has('selftest')) await selftest();
  else if (has('cover') && id) await coverOnly();
  else if (!id) {
    console.error('사용법:\n  node backend/scripts/blog-publish.mjs --login\n  node backend/scripts/blog-publish.mjs --keepalive   # 세션 유지(스케줄러용, 하루 1회)\n  node backend/scripts/blog-publish.mjs <id> [--dry|--draft]\n  node backend/scripts/blog-publish.mjs --selftest');
    process.exit(1);
  } else await publish();
}
