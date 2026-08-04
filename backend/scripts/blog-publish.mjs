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
     node backend/scripts/blog-publish.mjs <id> --dry   # ② 에디터까지만 채우고 멈춤(셀렉터 점검)
     node backend/scripts/blog-publish.mjs <id>         # ③ 공개 발행
     node backend/scripts/blog-publish.mjs <id> --draft # 비공개 저장

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

  // 분야마다 다른 포인트색 — 목록에서 글이 섞여 있을 때 한눈에 구분된다.
  const ACCENT = {
    '디저트': '#ff8ba7', '맛집': '#ff9f43', '카페·핫플': '#c08457',
    '신조어': '#a78bfa', '노래·챌린지': '#f472b6', '패션': '#2dd4bf',
    'AI 프롬프트': '#60a5fa', 'AI 동향': '#60a5fa', 'n8n': '#f0b429',
    '음악': '#f472b6', 'error': '#fb7185',
  };
  const cat = spec.cat || '한끗';
  const accent = ACCENT[cat] || '#f0b429';

  // 제목 길이에 맞춰 글자 크기를 정한다 — 좁은 안전영역이라 긴 제목은 줄여야 3줄에 들어간다.
  const t = String(spec.title || '');
  const titleSize = t.length <= 16 ? 66 : t.length <= 24 ? 58 : t.length <= 34 ? 50 : 44;

  const hasScore = Number.isFinite(spec.ad) || Number.isFinite(spec.trust);

  // 점수 배지 — 막대그래프는 가로로 길어 썸네일에서 잘린다. 숫자를 크게 보여준다.
  const score = (label, n, color) => !Number.isFinite(n) ? '' : `
    <div class="sc">
      <div class="sc-n" style="color:${color}">${n}</div>
      <div class="sc-l">${esc(label)}</div>
    </div>`;

  const html = `<!doctype html><meta charset="utf-8">
<style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;position:relative;overflow:hidden;
       background:#111113;color:#f7f4ee;
       font-family:"Malgun Gothic","맑은 고딕",system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center}
  /* 포인트색 은은한 발광 — 밋밋한 검정보다 눈에 걸린다 */
  .glow{position:absolute;width:900px;height:900px;border-radius:50%;
        background:radial-gradient(circle, ${accent}2e 0%, transparent 62%);
        top:-330px;left:50%;transform:translateX(-50%)}
  .glow2{position:absolute;width:700px;height:700px;border-radius:50%;
         background:radial-gradient(circle, ${accent}18 0%, transparent 60%);
         bottom:-320px;left:50%;transform:translateX(-50%)}
  /* 실제로 썸네일에 보이는 영역 — 여기 밖으로 중요한 걸 두지 않는다 */
  .safe{position:relative;width:${SAFE}px;display:flex;flex-direction:column;
        align-items:center;text-align:center}
  .chip{background:${accent};color:#141414;padding:9px 26px;border-radius:999px;
        font-size:27px;font-weight:800;letter-spacing:-.01em}
  h1{font-size:${titleSize}px;line-height:1.28;font-weight:800;letter-spacing:-.03em;
     margin-top:26px;word-break:keep-all;
     display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .label{font-size:28px;font-weight:600;color:#a9a396;margin-top:20px;
         display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
  .scores{display:flex;gap:52px;margin-top:30px}
  .sc{display:flex;flex-direction:column;align-items:center}
  .sc-n{font-size:60px;font-weight:800;line-height:1}
  .sc-l{font-size:22px;color:#a9a396;margin-top:8px;font-weight:600}
  .rule{width:64px;height:5px;background:${accent};border-radius:99px;margin-top:34px}
  .brand{margin-top:22px;font-size:26px;font-weight:800;color:#f7f4ee;letter-spacing:.02em}
  .note{font-size:20px;color:#7d776b;margin-top:8px}
</style>
<div class="glow"></div><div class="glow2"></div>
<div class="safe">
  <span class="chip">${esc(cat)}</span>
  <h1>${esc(spec.title)}</h1>
  ${spec.label ? `<div class="label">${esc(spec.label)}</div>` : ''}
  ${hasScore ? `<div class="scores">
    ${score('광고 의심도', spec.ad, '#ff6b52')}
    ${score('후기 신뢰도', spec.trust, '#34d399')}
  </div>` : ''}
  <div class="rule"></div>
  <div class="brand">한끗</div>
  <div class="note">${hasScore ? '추정치 · 확정 판정 아님 · ' : ''}${esc(spec.analyzedAt || '')}</div>
</div>`;

  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.setContent(html, { waitUntil: 'load' });
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
      const markup = await page.waitForFunction(() => {
        try {
          const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
          if (!/##_Image|<img\b/i.test(ed?.getBody()?.innerHTML || '')) return false;
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

  // 같은 글을 두 번 올리면 중복 콘텐츠가 된다. 발행 기록을 남기고 재실행은 --force 로만.
  // (로그인 확인보다 먼저 — 이미 올린 글이면 브라우저를 띄울 이유가 없다.)
  const posted = existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  if (posted[id] && !has('force') && !has('dry')) {
    console.log(`· 이미 발행됨 (${posted[id].at}) — ${posted[id].url}\n  다시 올리려면 --force`);
    process.exit(0);
  }

  if (!existsSync(profileDir)) {
    console.error('✗ 로그인 프로필이 없습니다. 먼저: node backend/scripts/blog-publish.mjs --login');
    process.exit(1);
  }

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.HEADLESS === '1',
    viewport: { width: 1440, height: 960 },
  });
  // 프로필에 안 남는 세션 쿠키를 --login 때 떠둔 storageState 에서 되살린다.
  if (existsSync(statePath)) {
    const st = JSON.parse(await readFile(statePath, 'utf8'));
    await ctx.addCookies(st.cookies || []);
  }

  const page = ctx.pages()[0] || await ctx.newPage();
  // "작성 중인 글을 불러올까요?" 네이티브 confirm — 항상 '아니오'(새 글로 시작).
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  const fail = async (e) => {
    const shot = join(outDir, `${id}.error.png`);
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
    console.error(`✗ 발행 실패: ${e.message}\n  현재 URL: ${page.url()}\n  스크린샷: ${shot}`);
    if (!has('keep-open')) await ctx.close();
    process.exit(1);
  };

  try {
    await page.goto(`${BASE}/manage/newpost/`, { waitUntil: 'domcontentloaded' });

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
        // 업로드가 끝나기 전에는 티스토리가 getContent() 를 막고
        // "이미지 업로드가 완료된 후 시도해 주세요." 를 던진다 → 삼키고 계속 폴링해야 한다.
        coverMarkup = await page.waitForFunction(() => {
          try {
            const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
            if (!/##_Image|<img\b/i.test(ed?.getBody()?.innerHTML || '')) return false;
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

    // 발행되면 글 주소로 이동한다.
    await page.waitForURL((u) => /\/\d+$/.test(u.pathname) || u.pathname.includes('/manage/posts'), { timeout: 30000 })
      .catch(() => { throw new Error('발행 후 이동을 확인하지 못했습니다. 티스토리에서 직접 확인하세요.'); });

    // /manage/posts/ 로 튕겼으면 page.url() 은 진짜 글 주소가 아니다 — RSS 로 퍼머링크를 확정한다.
    let finalUrl = page.url();
    if (!has('draft') && !/\/\d+$/.test(new URL(finalUrl).pathname)) {
      const permalink = await findPermalink(meta.title);
      if (permalink) finalUrl = permalink;
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
  else if (has('selftest')) await selftest();
  else if (has('cover') && id) await coverOnly();
  else if (!id) {
    console.error('사용법:\n  node backend/scripts/blog-publish.mjs --login\n  node backend/scripts/blog-publish.mjs <id> [--dry|--draft]\n  node backend/scripts/blog-publish.mjs --selftest');
    process.exit(1);
  } else await publish();
}
