#!/usr/bin/env node
/* ============================================================
   한끗 마스코트 '불타는 고구마' — 말랑 키링 3D 스타일 표정 세트(Meshy)

   표정별 투명 PNG는 backend/blog/assets/mascot/<expr>.png 에 둔다.
   본문 그림은 이 PNG에 선택적 말풍선을 합성해 만든다.

   실행:
     node backend/scripts/lib/mascot.mjs  # 표정 미리보기 판 갱신
   ============================================================ */
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const assetDir = join(repoRoot, 'backend', 'blog', 'assets', 'mascot');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── 표정 목록: 이름 · 쓰는 자리 · 대체텍스트 ───────────────── */
export const EXPRESSIONS = {
  explain:   { label: '설명',       use: '핵심 정리·개념 설명 앞',         alt: '불타는 고구마가 손가락으로 가리키며 설명하는 그림', sayExamples: ['궁금한 곳부터 같이 봐요', '큰 흐름부터 차근차근 읽어요', '핵심만 콕 짚어볼까요?', '이 대목이 참 궁금해요', '천천히 따라와도 괜찮아요'] },
  surprise:  { label: '놀람',       use: '의외의 사실·오해 바로잡기',      alt: '불타는 고구마가 깜짝 놀란 그림', sayExamples: ['어라, 여기 한 번 볼까요?', '생각과 달라도 괜찮아요', '이 부분이 눈에 띄어요', '다른 관점으로 살펴봐요', '다시 보면 재밌을 거예요'] },
  thumbs:    { label: '엄지척',     use: '꿀팁·추천·장점',                 alt: '불타는 고구마가 엄지를 치켜든 그림', sayExamples: ['오, 이쪽도 괜찮아요', '마음에 들면 가볍게 써봐요', '내 방식대로 바꿔도 좋아요', '천천히 시작해도 충분해요', '필요한 만큼만 골라봐요'] },
  caution:   { label: '주의',       use: '주의사항·흔한 실수',             alt: '불타는 고구마가 손을 들어 주의를 주는 그림', sayExamples: ['잠깐, 이것도 살펴봐요', '급하게 정하지 않아도 괜찮아요', '여기 한 번 더 확인해요', '작은 조건도 함께 챙겨봐요', '놓치기 쉬운 대목이에요'] },
  think:     { label: '생각',       use: '질문·고민·비교 직전',            alt: '불타는 고구마가 턱을 괴고 생각하는 그림', sayExamples: ['음, 어디부터 볼까요?', '내게 맞는 쪽을 골라봐요', '차이를 천천히 비교해요', '잠깐 멈춰도 괜찮아요', '어떤 쪽이 더 편할까요?'] },
  hello:     { label: '인사',       use: '글 마무리(맨 끝)',               alt: '불타는 고구마가 손을 흔들며 인사하는 그림', sayExamples: ['읽어 주셔서 고마워요', '오늘 얘기는 여기까지예요', '또 궁금할 때 찾아봐요', '함께 살펴봐서 반가워요', '다음에도 같이 이야기해요'] },
  checklist: { label: '체크리스트', use: '준비물·확인 목록·단계',          alt: '불타는 고구마가 체크리스트를 들고 있는 그림', sayExamples: ['빠진 게 있나 같이 볼까요?', '하나씩 천천히 체크해요', '준비할 건 가볍게 챙겨봐요', '끝까지 확인하면 마음이 놓여요', '이제 한 번 더 살펴봐요'] },
  yum:       { label: '맛있음',     use: '음식·레시피·맛집 소개',          alt: '불타는 고구마가 볼을 감싸며 맛있어하는 그림', sayExamples: ['오, 어떤 맛일지 궁금해요', '좋아하는 맛을 떠올려봐요', '마음 가는 메뉴도 좋아요', '천천히 즐기는 재미도 있어요', '입맛 따라 골라봐도 좋아요'] },
};

async function imageDataUri(expr) {
  if (!EXPRESSIONS[expr]) throw new Error(`마스코트 표정 없음: ${expr} (가능: ${Object.keys(EXPRESSIONS).join(', ')})`);
  const bytes = await readFile(join(assetDir, `${expr}.png`));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

/* 본문용 HTML: 말풍선은 위, 캐릭터는 아래 중앙에 세로 배치.
   말풍선은 캐릭터(말랑한 키링 장난감)에 맞춘 도톰한 젤리 풍선이다:
   자두빛 테두리, 아래쪽 입체 두께, 위쪽 광택, 캐릭터를 향한 꼬리. */
function mascotHtml(src, say, expr) {
  const char = `<img src="${src}" alt="" />`;
  if (!say) {
    return `<style>*{margin:0}body{background:transparent}#m img{width:420px;height:420px;display:block;object-fit:contain}</style><div id="m">${char}</div>`;
  }
  // 표정별 말풍선 색: [윗색, 아랫색, 두께색]
  const tone = {
    hello: ['#FFF3C4', '#FFDF85', '#E9A93B'],      // 꿀색 속살
    thumbs: ['#FFE6D6', '#FFC9AE', '#E58A63'],     // 살구빛 불꽃
    surprise: ['#FFFFFF', '#FFEFE0', '#F08A3C'],   // 불꽃 주황 테두리 강조
  }[expr] || ['#FFFFFF', '#FFF4E8', '#C9A6B8'];
  const ink = '#4A1838', line = expr === 'surprise' ? '#E0702A' : '#6A2A4F';
  const isThink = expr === 'think';
  return `<style>@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
    *{margin:0;box-sizing:border-box}body{background:transparent;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
    #m{display:flex;flex-direction:column;align-items:center;width:900px;padding:14px 12px 10px}
    #m img{width:270px;height:270px;flex:none;object-fit:contain;margin-top:46px}
    .b{position:relative;isolation:isolate;width:fit-content;max-width:780px;padding:22px 46px 24px;
       border:4px solid ${line};border-radius:${isThink ? '999px' : '38px'};
       background:linear-gradient(180deg,${tone[0]} 0%,${tone[1]} 100%);
       box-shadow:0 7px 0 ${tone[2]},0 7px 0 4px ${line},0 18px 22px rgba(74,24,56,.18);
       color:${ink};text-align:center;font-size:32px;font-weight:700;line-height:1.22;letter-spacing:-.025em;
       word-break:keep-all;overflow-wrap:anywhere}
    .b>span{position:relative;z-index:2;display:block}
    /* 위쪽 광택 */
    .b:before{content:"";position:absolute;left:22px;top:8px;width:46px;height:12px;border-radius:999px;background:rgba(255,255,255,.85);transform:rotate(-8deg)}
    /* 꼬리: 입체 두께 아래에 붙는 둥근 삼각형 */
    .t{position:absolute;left:50%;bottom:-31px;width:44px;height:24px;transform:translateX(-50%);display:block}
    /* 생각 풍선: 꼬리 대신 방울 두 개 */
    .d{position:absolute;border:4px solid ${line};border-radius:50%;background:${tone[1]}}
    .d1{width:24px;height:24px;left:calc(50% - 40px);bottom:-40px}.d2{width:14px;height:14px;left:calc(50% - 62px);bottom:-58px}
  </style><div id="m"><div class="b"><span>${esc(say)}</span>${isThink ? '<i class="d d1"></i><i class="d d2"></i>' : `<svg class="t" viewBox="0 0 44 24"><path d="M0 0 H44 L25 21 Q22 24 19 21 Z" fill="${line}"/><path d="M8 0 H36 L23.5 13 Q22 14.5 20.5 13 Z" fill="${tone[1]}"/></svg>`}</div>${char}</div>`;
}

/* ctx = Playwright BrowserContext(blog-figure 의 makeFigure 가 넘기는 것) */
export async function renderMascot(ctx, { expr, say }, file) {
  const src = await imageDataUri(expr);
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 960, height: 600 });
    await page.setContent(mascotHtml(src, say, expr));
    await page.locator('#m img').evaluate((img) => img.decode());
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#m').screenshot({ path: file, omitBackground: true });
  } finally { await page.close(); }
  return file;
}

/* 글 하나 안의 마스코트 규칙 검사 — blog-assemble 에서 부른다. */
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

async function renderExpressionSheet() {
  const { chromium } = await import('playwright');
  await mkdir(assetDir, { recursive: true });
  const cards = await Promise.all(Object.entries(EXPRESSIONS).map(async ([expr, data]) => {
    const src = await imageDataUri(expr);
    return `<div class="c"><img src="${src}" alt=""><b>${data.label} · ${expr}</b><small>${data.use}</small></div>`;
  }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 715 }, deviceScaleFactor: 1 });
    await page.setContent(`<style>*{margin:0;box-sizing:border-box}body{width:1240px;background:#FFF7EE;font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif;padding:28px}
      h1{font-size:28px;color:#3A1626;margin-bottom:14px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
      .c{height:315px;background:#fff;border-radius:20px;padding:10px;text-align:center;overflow:hidden}
      .c img{width:230px;height:230px;display:block;margin:0 auto;object-fit:contain}
      b{display:block;font-size:22px;color:#3A1626}small{display:block;font-size:15px;color:#7a6a70;margin-top:2px}</style>
      <h1>불타는 고구마 — 말랑 키링 표정 세트 8종</h1><div class="g">${cards.join('')}</div>`);
    await page.screenshot({ path: join(assetDir, 'expressions-sheet.png'), fullPage: true });
  } finally { await browser.close(); }
  console.log(`✓ ${Object.keys(EXPRESSIONS).length}종 미리보기 → ${assetDir}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await renderExpressionSheet();
