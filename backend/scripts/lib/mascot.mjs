#!/usr/bin/env node
/* ============================================================
   한끗 마스코트 '불타는 고구마' (B안 반쪽 군고구마, 2026-11-10 사용자 확정)

   몸·속살·불꽃·발·볼터치는 모든 표정이 같은 코드를 쓴다 → 매번 같은 캐릭터로 보인다.
   표정마다 바뀌는 것은 눈·입·팔·소품뿐이다. 우리가 직접 그린 SVG라 라이선스 문제가 없다.

   본문 그림으로 쓸 때(meta.figures[]):
     { id:'m1', kind:'mascot', expr:'tip', say:'짧은 한마디(선택)', title:'대체텍스트' }
   say 가 있으면 캐릭터 + 말풍선 가로 그림, 없으면 캐릭터만.

   실행:
     node backend/scripts/lib/mascot.mjs            # assets/mascot/ 에 표정별 SVG·PNG + 표정표 생성
   ============================================================ */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const assetDir = join(repoRoot, 'backend', 'blog', 'assets', 'mascot');

const INK = '#22101A', ARM = '#7A3648';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── 표정 목록: 이름 · 쓰는 자리 · 대체텍스트 ───────────────── */
export const EXPRESSIONS = {
  explain:   { label: '설명',       use: '핵심 정리·개념 설명 앞',         alt: '불타는 고구마가 손가락으로 가리키며 설명하는 그림' },
  surprise:  { label: '놀람',       use: '의외의 사실·오해 바로잡기',      alt: '불타는 고구마가 깜짝 놀란 그림' },
  thumbs:    { label: '엄지척',     use: '꿀팁·추천·장점',                 alt: '불타는 고구마가 엄지를 치켜든 그림' },
  caution:   { label: '주의',       use: '주의사항·흔한 실수',             alt: '불타는 고구마가 손을 들어 주의를 주는 그림' },
  think:     { label: '생각',       use: '질문·고민·비교 직전',            alt: '불타는 고구마가 턱을 괴고 생각하는 그림' },
  hello:     { label: '인사',       use: '글 마무리(맨 끝)',               alt: '불타는 고구마가 손을 흔들며 인사하는 그림' },
  checklist: { label: '체크리스트', use: '준비물·확인 목록·단계',          alt: '불타는 고구마가 체크리스트를 들고 있는 그림' },
  yum:       { label: '맛있음',     use: '음식·레시피·맛집 소개',          alt: '불타는 고구마가 볼을 감싸며 맛있어하는 그림' },
};

/* ── 공통 몸(바꾸지 않는다) ─────────────────────────────────── */
const DEFS = `<defs>
  <linearGradient id="bgSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C4A5E"/><stop offset="1" stop-color="#6A2F3E"/></linearGradient>
  <radialGradient id="bgFlesh" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFE58A"/><stop offset="1" stop-color="#FFB72E"/></radialGradient>
</defs>`;
const FLAMES = `
  <path d="M170 120 C150 90 178 74 166 44 C196 64 196 92 186 116 Z" fill="#FF7A30"/>
  <path d="M206 116 C190 80 222 62 214 24 C248 52 240 92 222 116 Z" fill="#FF5A26"/>
  <path d="M238 122 C232 98 252 88 250 64 C272 84 266 110 252 124 Z" fill="#FF9A35"/>`;
const FEET = `<ellipse cx="164" cy="368" rx="24" ry="13" fill="#4F2230"/><ellipse cx="236" cy="368" rx="24" ry="13" fill="#4F2230"/>`;
const BODY = `
  <path d="M200 120 C290 120 316 200 312 262 C308 332 262 370 200 370 C138 370 92 332 88 262 C84 200 110 120 200 120 Z" fill="url(#bgSkin)"/>
  <path d="M108 178 L132 196 L150 174 L172 198 L194 172 L216 198 L238 172 L258 196 L278 176 L294 190 C282 140 246 122 200 122 C152 122 120 140 108 178 Z" fill="url(#bgFlesh)"/>
  <circle cx="176" cy="152" r="5" fill="#fff" opacity=".6"/><circle cx="228" cy="146" r="4" fill="#fff" opacity=".6"/>
  <ellipse cx="118" cy="300" rx="10" ry="6" fill="#3E1A24" opacity=".35"/><ellipse cx="286" cy="236" rx="8" ry="5" fill="#3E1A24" opacity=".35"/>`;
const BLUSH = `<ellipse cx="136" cy="282" rx="16" ry="9" fill="#FF9DB0" opacity=".75"/><ellipse cx="264" cy="282" rx="16" ry="9" fill="#FF9DB0" opacity=".75"/>`;

/* ── 바뀌는 부품 ─────────────────────────────────────────────── */
const eye = {
  smile: (x) => `<path d="M${x - 13} 254 q13 -16 26 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  dot: (x, dy = 0) => `<ellipse cx="${x}" cy="${250 + dy}" rx="11" ry="14" fill="${INK}"/><circle cx="${x - 4}" cy="${245 + dy}" r="4.5" fill="#fff"/>`,
  wide: (x) => `<circle cx="${x}" cy="248" r="16" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${x}" cy="248" r="7" fill="${INK}"/>`,
  heart: (x) => `<path d="M${x} 262 C${x - 22} 248 ${x - 16} 230 ${x} 240 C${x + 16} 230 ${x + 22} 248 ${x} 262 Z" fill="#FF4F6D"/>`,
  shut: (x) => `<path d="M${x - 13} 248 q13 10 26 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
};
const brow = {
  worried: `<path d="M150 224 L176 216 M250 224 L224 216" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  up: `<path d="M152 220 q13 -8 26 0 M222 220 q13 -8 26 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
};
const mouth = {
  open: `<path d="M184 276 Q200 300 216 276 Z" fill="${INK}"/><path d="M192 288 Q200 296 208 288" fill="#FF7A8A"/>`,
  smile: `<path d="M186 276 Q200 290 214 276" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  o: `<ellipse cx="200" cy="286" rx="10" ry="13" fill="${INK}"/>`,
  wavy: `<path d="M184 286 q8 -8 16 0 q8 8 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  hmm: `<path d="M190 286 L212 282" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  tongue: `<path d="M186 276 Q200 290 214 276" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M202 284 q8 0 9 10 q-1 9 -9 6 Z" fill="#FF7A8A" stroke="${INK}" stroke-width="3"/>`,
};
const arm = (d) => `<path d="${d}" stroke="${ARM}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
const hand = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ARM}"/>`;
/* 몸 앞을 지나는 팔·손 — 몸과 색이 비슷해 묻히므로 밝은 색 + 외곽선 */
const FRONT = '#C76E88';
const armF = (d) => `<path d="${d}" stroke="${INK}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${FRONT}" stroke-width="14" fill="none" stroke-linecap="round"/>`;
const handF = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${FRONT}" stroke="${INK}" stroke-width="4"/>`;
const ARM_L_REST = arm('M94 270 q-24 6 -30 28');
const ARM_R_REST = arm('M306 270 q24 6 30 28');

const POSES = {
  explain: () => ARM_L_REST + arm('M306 262 q34 -6 46 -44') + hand(352, 214, 10)
    + `<path d="M354 206 L364 182" stroke="${ARM}" stroke-width="9" stroke-linecap="round"/>`
    + eye.dot(165) + eye.dot(235) + mouth.open,
  surprise: () => arm('M94 262 q-32 -14 -36 -54') + arm('M306 262 q32 -14 36 -54') + hand(58, 206) + hand(342, 206)
    + eye.wide(165) + eye.wide(235) + mouth.o
    + `<path d="M300 150 q-10 18 0 24 q10 -6 0 -24 Z" fill="#7CC6FF"/>`
    + `<path d="M70 150 L84 172 M52 176 L76 182 M92 140 L94 164" stroke="#FF7A30" stroke-width="5" stroke-linecap="round"/>`,
  thumbs: () => ARM_L_REST + arm('M306 270 q30 -4 40 -30') + hand(348, 236, 14)
    + `<rect x="341" y="196" width="13" height="32" rx="6.5" fill="${ARM}"/>`
    + eye.dot(165) + eye.smile(235) + mouth.open
    + `<path d="M364 168 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#FFC83A"/>`,
  caution: () => ARM_L_REST + arm('M306 262 q24 -18 26 -60') + hand(332, 196, 15)
    + `<path d="M322 184 v-14 M332 182 v-18 M342 184 v-14" stroke="${ARM}" stroke-width="8" stroke-linecap="round"/>`
    + brow.worried + eye.dot(165) + eye.dot(235) + mouth.wavy
    + `<g transform="translate(40 70)"><path d="M40 0 L80 70 L0 70 Z" fill="#FFC83A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M40 22 v24" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><circle cx="40" cy="58" r="5" fill="${INK}"/></g>`,
  think: () => armF('M100 278 q20 40 74 30') + handF(178, 306, 13) + ARM_R_REST
    + brow.up + eye.dot(165, -6) + eye.dot(235, -6) + mouth.hmm
    + `<circle cx="300" cy="120" r="8" fill="#E8D8DE"/><circle cx="322" cy="96" r="12" fill="#E8D8DE"/>`
    + `<text x="346" y="80" font-size="58" font-weight="900" fill="#9C4A5E" font-family="Arial,sans-serif">?</text>`,
  hello: () => ARM_L_REST + arm('M306 262 q26 -24 22 -70') + hand(328, 188, 14)
    + `<path d="M352 170 q10 14 4 30 M366 160 q14 20 6 44" stroke="#FF9A35" stroke-width="5" fill="none" stroke-linecap="round"/>`
    + eye.smile(165) + eye.smile(235) + mouth.open,
  checklist: () => eye.dot(165) + eye.dot(235) + mouth.smile
    + `<g transform="rotate(-6 200 330)"><rect x="146" y="296" width="108" height="86" rx="10" fill="#fff" stroke="${INK}" stroke-width="5"/>`
    + `<rect x="180" y="288" width="40" height="16" rx="5" fill="#FF7A30" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M160 322 l7 7 l12 -14 M160 352 l7 7 l12 -14" stroke="#16845b" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M190 324 h48 M190 354 h40" stroke="#C9B9C0" stroke-width="6" stroke-linecap="round"/></g>`
    + armF('M100 276 q24 26 48 34') + handF(150, 312, 12) + armF('M300 276 q-24 26 -48 30') + handF(252, 306, 12),
  yum: () => arm('M92 284 q8 4 18 2') + arm('M308 284 q-8 4 -18 2') + handF(118, 284, 15) + handF(282, 284, 15)
    + eye.shut(165) + eye.shut(235) + mouth.tongue
    + `<path d="M320 120 C306 110 310 96 320 102 C330 96 334 110 320 120 Z" fill="#FF4F6D"/><path d="M78 150 C66 142 70 130 78 135 C86 130 90 142 78 150 Z" fill="#FF4F6D"/>`,
};

/* 캐릭터만(400×400 좌표계) */
export function mascotSvg(expr) {
  const pose = POSES[expr];
  if (!pose) throw new Error(`마스코트 표정 없음: ${expr} (가능: ${Object.keys(POSES).join(', ')})`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${DEFS}${FLAMES}${FEET}${BODY}${BLUSH}${pose()}</svg>`;
}

/* 본문용 HTML: 말풍선이 있으면 캐릭터(왼쪽) + 말풍선(오른쪽) 가로 배치 */
function mascotHtml(expr, say) {
  const char = mascotSvg(expr);
  if (!say) {
    return `<style>*{margin:0}body{background:transparent}#m svg{width:420px;height:420px;display:block}</style><div id="m">${char}</div>`;
  }
  return `<style>*{margin:0;box-sizing:border-box}body{background:transparent;font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
    #m{display:flex;align-items:center;gap:10px;width:900px;padding:10px 20px}
    #m svg{width:260px;height:260px;flex:none}
    .b{position:relative;flex:1;background:#FFF4DC;border:4px solid #6A2F3E;border-radius:28px;padding:28px 32px;
       font-size:30px;font-weight:800;line-height:1.45;color:#3A1626;word-break:keep-all}
    .b:before{content:"";position:absolute;left:-22px;top:50%;margin-top:-16px;border:16px solid transparent;border-right:22px solid #6A2F3E;border-left:0}
    .b:after{content:"";position:absolute;left:-15px;top:50%;margin-top:-12px;border:12px solid transparent;border-right:17px solid #FFF4DC;border-left:0}
  </style><div id="m">${char}<div class="b">${esc(say)}</div></div>`;
}

/* ctx = Playwright BrowserContext(blog-figure 의 makeFigure 가 넘기는 것) */
export async function renderMascot(ctx, { expr, say }, file) {
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 960, height: 600 });
    await page.setContent(mascotHtml(expr, say));
    await page.locator('#m').screenshot({ path: file, omitBackground: true });
  } finally { await page.close(); }
  return file;
}

/* 글 하나 안의 마스코트 규칙 검사 — blog-assemble 에서 부른다. problems 문자열 배열을 돌려준다. */
export function checkMascots(md, figures) {
  const problems = [];
  const defs = new Map((figures || []).map((f) => [f.id, f]));
  const lines = md.split('\n');
  const figLines = lines.map((l, i) => [l.match(/^\s*\[FIG:\s*([A-Za-z0-9_-]+)/)?.[1], i]).filter(([id]) => id);
  const mas = figLines.filter(([id]) => defs.get(id)?.kind === 'mascot');
  if (mas.length > 3) problems.push(`마스코트 ${mas.length}장 — 글당 최대 3장`);
  const info = figLines.length - mas.length;
  if (mas.length > info + 1) problems.push(`마스코트(${mas.length})가 정보 그림(${info})+1 보다 많다`);
  const seen = new Set();
  for (const [id] of mas) {
    const d = defs.get(id);
    if (!EXPRESSIONS[d.expr]) problems.push(`[FIG: ${id}] 마스코트 expr "${d.expr}" 없음`);
    if (seen.has(d.expr)) problems.push(`[FIG: ${id}] 마스코트 표정 "${d.expr}" 가 글 안에서 반복`);
    seen.add(d.expr);
    if (d.say && (d.say.length > 40 || /\d/.test(d.say))) problems.push(`[FIG: ${id}] 말풍선은 40자 이하, 숫자 금지(확인 안 된 수치 방지)`);
  }
  // 그림끼리 붙어 있으면 안 된다(사이에 소제목 말고 본문 문단이 하나 이상) — 마스코트가 낀 경우만 본다
  for (let k = 1; k < figLines.length; k++) {
    const [a, ia] = figLines[k - 1], [b, ib] = figLines[k];
    const between = lines.slice(ia + 1, ib).some((l) => l.trim() && !/^\s*#/.test(l));
    if (!between && (defs.get(a)?.kind === 'mascot' || defs.get(b)?.kind === 'mascot')) {
      problems.push(`[FIG: ${a}] 와 [FIG: ${b}] 가 붙어 있다 — 마스코트 앞뒤엔 본문 문단이 있어야 한다`);
    }
  }
  const firstText = lines.findIndex((l) => l.trim() && !/^\s*(#|\[FIG:)/.test(l));
  if (mas.some(([, i]) => i < firstText)) problems.push('마스코트가 첫 문단(답) 앞에 있다 — 첫 문단 뒤부터 넣는다');
  return problems;
}

/* CLI: 표정 세트 생성 */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { chromium } = await import('playwright');
  await mkdir(assetDir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  for (const expr of Object.keys(EXPRESSIONS)) {
    await writeFile(join(assetDir, `${expr}.svg`), mascotSvg(expr));
    await renderMascot(ctx, { expr }, join(assetDir, `${expr}.png`));
  }
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1240, height: 700 });
  await page.setContent(`<style>*{margin:0;box-sizing:border-box}body{width:1240px;background:#FFF7EE;font-family:"Apple SD Gothic Neo",sans-serif;padding:28px}
    h1{font-size:28px;color:#3A1626;margin-bottom:14px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .c{background:#fff;border-radius:20px;padding:10px;text-align:center}.c svg{width:230px;height:230px;display:block;margin:0 auto}
    b{display:block;font-size:22px;color:#3A1626}small{display:block;font-size:15px;color:#7a6a70;margin-top:2px}</style>
    <h1>불타는 고구마 — 표정 세트 ${Object.keys(EXPRESSIONS).length}종</h1><div class="g">${Object.entries(EXPRESSIONS)
      .map(([k, v]) => `<div class="c">${mascotSvg(k)}<b>${v.label} · ${k}</b><small>${v.use}</small></div>`).join('')}</div>`);
  await page.screenshot({ path: join(assetDir, 'expressions-sheet.png'), fullPage: true });
  await browser.close();
  console.log(`✓ ${Object.keys(EXPRESSIONS).length}종 → ${assetDir}`);
}
