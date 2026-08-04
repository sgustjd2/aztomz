#!/usr/bin/env node
/* ============================================================
   본문 삽입용 그림(figure) 생성 — 커버와 별개.

   왜 만들었나: 글에 이미지가 커버 1장뿐이라 본문이 텍스트만으로 허전했다(2026-07-30 운영자 지적).
   그런데 남의 사진을 가져다 쓸 수는 없다 — 저작권이고, 핫링크는 403 으로 깨진다(CLAUDE.md 철칙).
   그래서 **우리가 만들거나 우리가 직접 찍은 것만** 쓴다.

   두 종류:
     card  — 우리 데이터로 그린 도표·비교표·설정값 카드. 저작권 무관. 어느 카테고리에나 쓴다.
     shot  — 이미 본문에서 인용 중인 **공개 웹페이지**를 우리가 직접 캡처. 사실 확인용 자료화면이라
             출처(URL)를 캡션에 반드시 박는다. 로그인벽·유료 페이지는 찍지 않는다.

   figure 정의는 글 메타(backend/out/blog/<id>.json)의 figures[] 에 둔다.
   본문(md)에서는 [FIG: <figId> | 캡션] 으로 자리만 잡는다 — 정의와 배치를 분리해야
   blog-assemble 이 "출처 없는 그림"을 걸러낼 수 있다.

   실행:
     node backend/scripts/blog-figure.mjs <글id>            # 그 글의 figures 전부 생성
     node backend/scripts/blog-figure.mjs <글id> --only=a,b
     node backend/scripts/blog-figure.mjs --selftest        # 브라우저로 샘플 렌더(네트워크 불필요)
   ============================================================ */
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 본문 그림은 커버와 달리 잘리지 않는다(썸네일 크롭 대상이 아님) — 가로를 넓게 쓴다.
   티스토리 본문 폭이 대략 900px 이라 1000px 로 만들어 선명하게 들어가게 한다. */
const W = 1000;

const PALETTE = {
  bg: '#111113', fg: '#f7f4ee', dim: '#a9a396', line: '#2c2c30',
  accent: '#f0b429', good: '#34d399', bad: '#ff6b52', info: '#60a5fa',
};

const BASE_CSS = `
  *{margin:0;box-sizing:border-box}
  body{width:${W}px;background:${PALETTE.bg};color:${PALETTE.fg};
       font-family:"Malgun Gothic","맑은 고딕",system-ui,sans-serif;padding:40px 44px}
  .ftitle{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
  .fsub{font-size:19px;color:${PALETTE.dim};margin-bottom:26px;line-height:1.5}
  .rule{height:4px;width:56px;background:${PALETTE.accent};border-radius:99px;margin-bottom:24px}
`;

/* ── card: 표 ───────────────────────────────────────────────
   {kind:'card', layout:'table', title, sub, columns:[..], rows:[[..],..], highlight:[행index]} */
const renderTable = (s) => `
  <style>
    table{width:100%;border-collapse:collapse;font-size:21px}
    th{text-align:left;padding:14px 16px;color:${PALETTE.dim};font-size:18px;font-weight:700;
       border-bottom:2px solid ${PALETTE.line}}
    td{padding:15px 16px;border-bottom:1px solid ${PALETTE.line};vertical-align:top;line-height:1.45}
    tr.hi td{background:${PALETTE.accent}14;color:${PALETTE.fg};font-weight:700}
    td.k{color:${PALETTE.dim}}
  </style>
  <div class="ftitle">${esc(s.title)}</div>
  ${s.sub ? `<div class="fsub">${esc(s.sub)}</div>` : '<div class="rule"></div>'}
  <table>
    ${s.columns ? `<tr>${s.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>` : ''}
    ${(s.rows || []).map((r, i) => `<tr class="${(s.highlight || []).includes(i) ? 'hi' : ''}">`
      + r.map((c, j) => `<td class="${j === 0 ? 'k' : ''}">${esc(c)}</td>`).join('') + '</tr>').join('')}
  </table>`;

/* ── card: 단계 흐름 ─────────────────────────────────────────
   {kind:'card', layout:'steps', title, sub, steps:[{n,label,note}]} */
const renderSteps = (s) => `
  <style>
    .step{display:flex;gap:20px;align-items:flex-start;padding:18px 0;
          border-bottom:1px solid ${PALETTE.line}}
    .step:last-child{border-bottom:0}
    .n{flex:0 0 46px;height:46px;border-radius:50%;background:${PALETTE.accent};color:#141414;
       font-size:23px;font-weight:800;display:flex;align-items:center;justify-content:center}
    .lb{font-size:23px;font-weight:700;line-height:1.35}
    .nt{font-size:18px;color:${PALETTE.dim};margin-top:5px;line-height:1.5}
  </style>
  <div class="ftitle">${esc(s.title)}</div>
  ${s.sub ? `<div class="fsub">${esc(s.sub)}</div>` : '<div class="rule"></div>'}
  ${(s.steps || []).map((st, i) => `
    <div class="step">
      <div class="n">${esc(st.n ?? i + 1)}</div>
      <div><div class="lb">${esc(st.label)}</div>
      ${st.note ? `<div class="nt">${esc(st.note)}</div>` : ''}</div>
    </div>`).join('')}`;

/* ── card: 타임라인 ──────────────────────────────────────────
   {kind:'card', layout:'timeline', title, sub, events:[{date,label,note,tone}]} */
const renderTimeline = (s) => `
  <style>
    .tl{position:relative;padding-left:34px}
    .tl:before{content:'';position:absolute;left:9px;top:8px;bottom:8px;width:2px;background:${PALETTE.line}}
    .ev{position:relative;padding:14px 0}
    .dot{position:absolute;left:-30px;top:21px;width:14px;height:14px;border-radius:50%;
         background:${PALETTE.accent};border:3px solid ${PALETTE.bg}}
    .ev.good .dot{background:${PALETTE.good}} .ev.bad .dot{background:${PALETTE.bad}}
    .d{font-size:17px;color:${PALETTE.dim};font-weight:700;letter-spacing:.02em}
    .l{font-size:22px;font-weight:700;margin-top:3px;line-height:1.35}
    .nt{font-size:17px;color:${PALETTE.dim};margin-top:4px;line-height:1.5}
  </style>
  <div class="ftitle">${esc(s.title)}</div>
  ${s.sub ? `<div class="fsub">${esc(s.sub)}</div>` : '<div class="rule"></div>'}
  <div class="tl">
    ${(s.events || []).map((e) => `
      <div class="ev ${esc(e.tone || '')}"><div class="dot"></div>
        <div class="d">${esc(e.date)}</div>
        <div class="l">${esc(e.label)}</div>
        ${e.note ? `<div class="nt">${esc(e.note)}</div>` : ''}
      </div>`).join('')}
  </div>`;

const LAYOUTS = { table: renderTable, steps: renderSteps, timeline: renderTimeline };

export async function makeFigure(ctx, fig, id) {
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, `${id}.fig-${fig.id}.png`);
  const p = await ctx.newPage();
  try {
    if (fig.kind === 'shot') {
      /* 공개 페이지 자료화면. 로그인이 필요한 곳은 애초에 대상이 아니다 —
         찍히더라도 남의 계정 화면이 새면 안 되므로 쿠키 없는 새 컨텍스트가 아니라
         호출자가 넘긴 ctx 를 쓰되, 캡션에 출처 URL 을 반드시 남기게 강제한다(assemble 이 검사). */
      if (!fig.url) throw new Error(`shot 인데 url 이 없다: ${fig.id}`);
      await p.setViewportSize({ width: fig.width || 1200, height: fig.height || 800 });
      await p.goto(fig.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(fig.settleMs ?? 2500);
      if (fig.hide) await p.addStyleTag({ content: `${fig.hide}{display:none !important}` }).catch(() => {});
      const target = fig.selector ? p.locator(fig.selector).first() : null;
      if (target && await target.count()) await target.screenshot({ path: file });
      else await p.screenshot({ path: file, fullPage: !!fig.fullPage });
    } else {
      const render = LAYOUTS[fig.layout];
      if (!render) throw new Error(`모르는 layout: ${fig.layout} (가능: ${Object.keys(LAYOUTS).join(', ')})`);
      await p.setViewportSize({ width: W, height: 200 });
      await p.setContent(`<!doctype html><meta charset="utf-8"><style>${BASE_CSS}</style>${render(fig)}`,
        { waitUntil: 'load' });
      // 내용 높이에 맞춰 잘리지 않게 — 표/단계 개수가 제각각이라 고정 높이를 쓸 수 없다.
      await p.screenshot({ path: file, fullPage: true });
    }
  } finally { await p.close(); }
  return file;
}

/* ── 자체검사: 세 레이아웃이 실제로 렌더되고 파일이 생기는지. 네트워크 불필요. */
async function selftest() {
  const { chromium } = await import('playwright');
  const ctx = await chromium.launchPersistentContext('', { headless: true }).catch(async () => {
    const b = await chromium.launch({ headless: true }); return b.newContext();
  });
  const specs = [
    { id: 'st-table', kind: 'card', layout: 'table', title: '표 렌더 검사', sub: '두 줄',
      columns: ['항목', '값'], rows: [['해상도', '1920x1080'], ['키프레임', '1초']], highlight: [1] },
    { id: 'st-steps', kind: 'card', layout: 'steps', title: '단계 렌더 검사',
      steps: [{ label: '첫 단계', note: '설명' }, { label: '둘째 단계' }] },
    { id: 'st-timeline', kind: 'card', layout: 'timeline', title: '타임라인 렌더 검사',
      events: [{ date: '2026-07-16', label: '공개', tone: 'bad' }, { date: '2026-07-30', label: '정리', tone: 'good' }] },
  ];
  const { statSync } = await import('node:fs');
  let ok = 0;
  for (const s of specs) {
    const f = await makeFigure(ctx, s, '_selftest');
    const bytes = statSync(f).size;
    const pass = bytes > 3000;                    // 빈 이미지면 수 백 바이트로 나온다
    console.log(`${pass ? '✓' : '✗'} ${s.layout.padEnd(9)} ${bytes.toLocaleString()} bytes  ${f}`);
    if (pass) ok++;
  }
  // 모르는 layout 은 조용히 빈 그림을 만들지 말고 반드시 throw 해야 한다.
  let threw = false;
  await makeFigure(ctx, { id: 'st-bad', kind: 'card', layout: '없는레이아웃' }, '_selftest')
    .catch(() => { threw = true; });
  console.log(`${threw ? '✓' : '✗'} 모르는 layout 은 throw`);
  await ctx.close();
  const allOk = ok === specs.length && threw;
  console.log(allOk ? '\n자체검사 통과' : '\n자체검사 실패');
  process.exit(allOk ? 0 : 1);
}

const isMain = process.argv[1]
  && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;

if (isMain) {
  if (has('selftest')) await selftest();
  else {
    const id = argv.find((a) => !a.startsWith('--'));
    if (!id) { console.error('사용법: node backend/scripts/blog-figure.mjs <글id> [--only=a,b] | --selftest'); process.exit(1); }
    const metaPath = join(outDir, `${id}.json`);
    if (!existsSync(metaPath)) { console.error(`✗ 메타 없음: ${metaPath}`); process.exit(1); }
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    let figs = meta.figures || [];
    const only = (flag('only') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (only.length) figs = figs.filter((f) => only.includes(f.id));
    if (!figs.length) { console.log('figures 가 없습니다.'); process.exit(0); }
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    for (const f of figs) {
      try { console.log(`✓ ${f.id} → ${await makeFigure(ctx, f, id)}`); }
      catch (e) { console.error(`✗ ${f.id}: ${String(e.message).split('\n')[0]}`); }
    }
    await browser.close();
  }
}
