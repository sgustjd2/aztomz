#!/usr/bin/env node
/* ============================================================
   한끗 — 블로그 포스트 빌더 (트렌드 1건 → 티스토리 붙여넣기용 HTML)

   backend/data/trends.json 의 항목 1건을 읽어 티스토리 본문에 그대로 넣을 수 있는
   body fragment 를 만든다. 인라인 스타일만 쓰므로 어떤 스킨에서도 레이아웃이 깨지지 않는다.
   <style>·<script>·외부 CSS 는 넣지 않는다 — TinyMCE 가 걸러내고, 남더라도 스킨과 충돌한다.

   실행 (레포 루트에서):
     node backend/scripts/blog-build.mjs <id>          # 특정 트렌드
     node backend/scripts/blog-build.mjs --latest      # analyzedAt 가장 최신 1건
     node backend/scripts/blog-build.mjs <id> --title="..." --tags=a,b,c
     node backend/scripts/blog-build.mjs --selftest    # 렌더 자체 검증

   출력: backend/out/blog/<id>.html  (본문)
         backend/out/blog/<id>.json  (제목·태그·메타설명 — blog-publish.mjs 입력)
   ============================================================ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = join(repoRoot, 'backend', 'data', 'trends.json');
const outDir = join(repoRoot, 'backend', 'out', 'blog');

// 내부링크 대상 — 한끗 상세페이지. 티스토리 독자를 본 서비스로 보내는 유일한 경로.
const SITE = process.env.HANGEUT_SITE || 'https://aztomz.vercel.app';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* ───────────────────── 인라인 스타일 조각 ─────────────────────
   티스토리 스킨과 싸우지 않도록 색·여백만 지정하고 폰트/줄간격은 스킨에 맡긴다. */
const S = {
  lead: 'font-size:1.05em;line-height:1.8;margin:0 0 1.4em;',
  box: 'border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:1.6em 0;background:#fafafa;',
  row: 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #eee;',
  rowLast: 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0;',
  bar: 'display:inline-block;height:8px;border-radius:4px;vertical-align:middle;',
  quote: 'border-left:4px solid #111;margin:1.6em 0;padding:2px 0 2px 16px;font-weight:600;color:#111;',
  cap: 'font-size:.88em;color:#6b7280;margin-top:.5em;',
  cta: 'display:block;border:2px solid #111;border-radius:12px;padding:16px 18px;margin:2em 0;text-decoration:none;color:#111;',
  foot: 'font-size:.85em;color:#6b7280;line-height:1.7;margin-top:2em;',
};

const barColor = (n) => (n >= 70 ? '#ef4444' : n >= 45 ? '#f59e0b' : '#10b981');

function scoreRow(label, n, hint, last) {
  return `<div style="${last ? S.rowLast : S.row}">`
    + `<span><strong>${esc(label)}</strong>${hint ? ` <span style="color:#6b7280;font-size:.9em">${esc(hint)}</span>` : ''}</span>`
    + `<span style="white-space:nowrap"><span style="${S.bar}width:${Math.max(6, Math.min(100, n))}px;background:${barColor(n)}"></span> <strong>${n}</strong><span style="color:#9ca3af">/100</span></span>`
    + '</div>';
}

/* article 블록: [["h",..],["p",..],["q",..],["ul",[..]]] → HTML.
   h 는 h2 로 뽑는다(문서 h1 은 티스토리 제목이 차지). */
function renderArticle(blocks) {
  return (blocks || []).map(([kind, val]) => {
    if (kind === 'h') return `<h2>${esc(val)}</h2>`;
    if (kind === 'p') return `<p>${esc(val)}</p>`;
    if (kind === 'q') return `<blockquote style="${S.quote}">${esc(val)}</blockquote>`;
    if (kind === 'ul') return `<ul>${val.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>`;
    return '';
  }).join('\n');
}

function render(t) {
  const h = [];
  const isWord = t.type === '신조어' || t.cat === '신조어';

  h.push(`<!-- 한끗 자동 생성 · ${esc(t.id)} · ${esc(t.analyzedAt)} -->`);
  h.push(`<p style="${S.lead}">${esc(t.excerpt || t.verdict || '')}</p>`);

  // 대표 이미지는 핫링크하지 않는다 — 나무위키 등은 403, 언론사는 브라우저 요청을 흘려보낸다(2026-07-25 실측).
  // 여기엔 자리만 남기고, blog-publish.mjs 가 내려받은 파일을 티스토리에 업로드해 이 마커를 대체한다.
  h.push(`<!--COVER-->`);

  // 신조어는 뜻/예문/순화어, 그 외는 점수 카드. 둘 다 한끗만의 오리지널 데이터.
  if (isWord) {
    h.push('<h2>한 줄 뜻</h2>');
    if (t.def) h.push(`<p>${esc(t.def)}</p>`);
    if (t.example) h.push(`<blockquote style="${S.quote}">${esc(t.example)}</blockquote>`);
    if (t.pureKorean) h.push(`<p><strong>우리말로 바꾸면</strong> — ${esc(t.pureKorean)}</p>`);
    if (t.stage) h.push(`<p><strong>유행 단계</strong> — ${esc(t.stage)}${t.stageMsg ? ` (${esc(t.stageMsg)})` : ''}</p>`);
  } else {
    h.push('<h2>한끗 점수 — 광고일까 진짜일까</h2>');
    const rows = [];
    if (typeof t.ad === 'number') rows.push(scoreRow('광고 의심도', t.ad, '협찬·바이럴 신호'));
    if (typeof t.trust === 'number') rows.push(scoreRow('후기 신뢰도', t.trust, '후기를 믿을 만한가'));
    h.push(`<div style="${S.box}">${rows.join('')}`
      + (t.satTxt ? `<div style="${S.rowLast}"><span><strong>만족도</strong> <span style="color:#6b7280;font-size:.9em">실제로 좋은가</span></span><span>${esc(t.satTxt)}</span></div>` : '')
      + (t.label ? `<p style="margin:12px 0 0;font-weight:700">${esc(t.label)}</p>` : '')
      + '</div>');
  }

  if (t.pull) h.push(`<blockquote style="${S.quote}">${esc(t.pull)}</blockquote>`);
  if (t.article?.length) h.push(renderArticle(t.article));

  if (t.verdict) {
    h.push('<h2>한끗 판단</h2>');
    h.push(`<p>${esc(t.verdict)}</p>`);
  }

  if (t.shops?.length) {
    h.push('<h2>어디서 먹나 · 어디로 가나</h2>');
    h.push('<ul>' + t.shops.map((s) => '<li>'
      + (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener"><strong>${esc(s.name)}</strong></a>` : `<strong>${esc(s.name)}</strong>`)
      + (s.area ? ` <span style="color:#6b7280">· ${esc(s.area)}</span>` : '')
      + (s.note ? `<br>${esc(s.note)}` : '') + '</li>').join('') + '</ul>');
  }

  if (t.recs?.length) {
    h.push('<h2>이런 사람에게</h2>');
    h.push('<ul>' + t.recs.map(([who, mark]) => `<li>${esc(who)} — <strong>${esc(mark)}</strong></li>`).join('') + '</ul>');
  }

  if (t.prompt) {
    h.push('<h2>그대로 쓰는 프롬프트</h2>');
    h.push(`<pre style="white-space:pre-wrap;word-break:break-word;background:#f6f7f9;border-radius:10px;padding:14px 16px"><code>${esc(t.prompt)}</code></pre>`);
  }

  if (t.reasons && Object.keys(t.reasons).length) {
    h.push('<h2>점수를 이렇게 본 이유</h2>');
    const names = { ad: '광고 의심도', trust: '후기 신뢰도', sat: '만족도' };
    h.push('<ul>' + Object.entries(t.reasons)
      .map(([k, v]) => `<li><strong>${esc(names[k] || k)}</strong> — ${esc(v)}</li>`).join('') + '</ul>');
  }

  if (t.src?.length) {
    h.push('<h2>출처</h2>');
    h.push('<ul>' + t.src.map(([name, url]) =>
      `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a></li>`).join('') + '</ul>');
  }

  h.push(`<a href="${SITE}/trend.html?id=${encodeURIComponent(t.id)}" style="${S.cta}" target="_blank" rel="noopener">`
    + `<strong>한끗에서 전체 분석 보기 →</strong><br>`
    + `<span style="color:#6b7280;font-size:.92em">점수 근거·후기 원문·비슷한 트렌드까지 한 화면에</span></a>`);

  const disclaimer = isWord
    ? '뜻과 유행 단계는 공개된 용례를 바탕으로 한 <strong>추정</strong>이며, 쓰는 집단·맥락에 따라 다를 수 있습니다.'
    : '광고 의심도와 후기 신뢰도는 공개된 후기·기사를 바탕으로 한 <strong>추정치</strong>이며 확정 판정이 아닙니다. '
      + '후기 신뢰도(믿을 만한가)와 만족도(좋은가)는 별개 축입니다.';
  h.push(`<p style="${S.foot}">분석일 ${esc(t.analyzedAt)} · ${disclaimer}<br>`
    + `분석 원문 — <a href="${SITE}/trend.html?id=${encodeURIComponent(t.id)}" target="_blank" rel="noopener">한끗</a></p>`);

  return h.join('\n');
}

/* ───────────────────── 메타(제목·태그·설명) ─────────────────────
   기본값은 결정적으로 만들고, hangeut-blog-seo 스킬이 --title/--tags 로 덮어쓴다. */
function defaultTitle(t) {
  const year = (t.analyzedAt || '').slice(0, 4) || String(new Date().getFullYear());
  if (t.type === '신조어' || t.cat === '신조어') return `${t.title} 뜻과 예문 — 요즘 진짜 쓰는 말일까 (${year})`;
  return `${t.title} 광고일까 진짜일까 — 후기 신뢰도·만족도 분석 (${year})`;
}

function defaultTags(t) {
  // 티스토리 태그는 10개 이하가 무난. 카테고리 + 데이터 태그 + 가게명.
  const raw = [t.cat, ...(t.tags || []), ...(t.shops || []).map((s) => s.name), '한끗', '요즘트렌드'];
  return [...new Set(raw.filter(Boolean).map((s) => String(s).trim()))].slice(0, 10);
}

function metaDesc(t) {
  const s = (t.excerpt || t.verdict || t.title).replace(/\s+/g, ' ').trim();
  return s.length <= 155 ? s : s.slice(0, 152).trimEnd() + '…';
}

/* ───────────────────── 대표 이미지 ─────────────────────
   trends.json 의 images[] 는 언론사·나무위키·인스타 사진이다. 내려받아 내 블로그에
   재업로드하는 건 저작권 침해다 — 출처를 밝혀도 면책되지 않는다(저작권법 28조의 '인용'은
   정당한 범위·공정한 관행이 조건이고, 대표이미지 장식 사용 + 광고수익은 둘 다 불리하다).
   그래서 남의 사진은 쓰지 않고, 우리 점수 데이터로 커버 카드를 직접 만든다.
   실제 PNG 렌더는 blog-publish.mjs 가 (이미 떠 있는) 크로미움으로 한다. */
function coverSpec(t) {
  return {
    title: t.title,
    cat: t.cat,
    ad: typeof t.ad === 'number' ? t.ad : null,
    trust: typeof t.trust === 'number' ? t.trust : null,
    label: t.label || t.stage || null,
    analyzedAt: t.analyzedAt,
  };
}

/* ───────────────────── 자체 검증 ───────────────────── */
function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error('selftest 실패: ' + msg); };
  const t = {
    id: 'x-1', type: '신뢰분석', cat: '디저트', analyzedAt: '2026-07-25',
    title: '<테스트> "따옴표" & 앰퍼샌드', excerpt: '리드', pull: '한 줄', verdict: '판단',
    ad: 80, trust: 30, satTxt: '보통', label: '주의', tags: ['a', 'a', 'b'],
    shops: [{ name: '가게', area: '서울', url: 'https://e.com/?a=1&b=2', note: '메모' }],
    recs: [['호기심', '가능']], reasons: { ad: '이유' }, src: [['출처', 'https://e.com']],
    images: ['https://e.com/i.jpg'],
    article: [['h', '소제목'], ['p', '문단'], ['q', '인용'], ['ul', ['하나', '둘']]],
  };
  const html = render(t);
  assert(!/<script/i.test(html) && !/<style/i.test(html), 'script/style 이 섞이면 티스토리가 본문을 잘라먹는다');
  assert(!html.includes('<테스트>'), '제목의 꺾쇠가 이스케이프되지 않았다');
  assert(html.includes('&amp;b=2'), 'URL 속 &가 이스케이프되지 않았다');
  assert(html.includes('<h2>') && !/<h1/i.test(html), '본문 h1 금지(제목과 중복) · h2 는 있어야 한다');
  assert(html.includes(`${SITE}/trend.html?id=x-1`), '내부링크 CTA 누락');
  assert(html.includes('추정치'), '단정 금지 고지 누락');
  assert(html.includes('<!--COVER-->') && !/<img\b/i.test(html), '커버는 마커만 남기고 핫링크 <img> 를 넣지 않는다');
  assert(defaultTags(t).length === new Set(defaultTags(t)).size, '태그 중복 제거 실패');
  assert(metaDesc({ excerpt: 'ㄱ'.repeat(300) }).length <= 155, '메타설명 길이 초과');
  // 신조어 분기
  const w = { id: 'w-1', type: '신조어', cat: '신조어', title: '말', analyzedAt: '2026-07-25', def: '뜻', example: '예문', pureKorean: '순화' };
  assert(render(w).includes('한 줄 뜻') && !render(w).includes('광고 의심도'), '신조어 분기가 점수카드를 렌더했다');
  console.log('✓ selftest 통과');
}

/* ───────────────────── 실행 ───────────────────── */
const argv = process.argv.slice(2);
if (argv.includes('--selftest')) { selftest(); process.exit(0); }

const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const data = JSON.parse(await readFile(jsonPath, 'utf8'));
const id = argv.find((a) => !a.startsWith('--'));

let trend;
if (argv.includes('--latest')) {
  // 오늘 재분석된 것 우선 — 없으면 analyzedAt 최신. 21:15 recheck-ad 가 갱신한 항목이 잡힌다.
  trend = [...data.trends].sort((a, b) => String(b.analyzedAt).localeCompare(String(a.analyzedAt)))[0];
} else if (id) {
  trend = data.trends.find((t) => t.id === id);
}
if (!trend) {
  console.error(`✗ 트렌드를 찾을 수 없음: ${id || '(id 미지정)'}\n  사용법: node backend/scripts/blog-build.mjs <id> | --latest | --selftest`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const meta = {
  id: trend.id,
  title: flag('title') || defaultTitle(trend),
  tags: flag('tags') ? flag('tags').split(',').map((s) => s.trim()).filter(Boolean) : defaultTags(trend),
  desc: flag('desc') || metaDesc(trend),
  category: process.env.TISTORY_CATEGORY || 'AZTOMZ',
  coverSpec: argv.includes('--no-cover') ? null : coverSpec(trend),
  siteUrl: `${SITE}/trend.html?id=${encodeURIComponent(trend.id)}`,
  builtAt: new Date().toISOString().slice(0, 10),
};

const htmlPath = join(outDir, `${trend.id}.html`);
await writeFile(htmlPath, render(trend) + '\n', 'utf8');
await writeFile(join(outDir, `${trend.id}.json`), JSON.stringify(meta, null, 2) + '\n', 'utf8');

console.log(`✓ blog-build: ${trend.id}\n  제목: ${meta.title}\n  태그: ${meta.tags.join(', ')}\n`
  + `  커버: ${meta.coverSpec ? '자체 생성 카드(발행 시 렌더)' : '없음'}\n`
  + `  파일: backend/out/blog/${trend.id}.html`);
