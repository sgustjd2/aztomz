// 한끗 MVP 시연영상 녹화 — 배포본(az2mz.vercel.app)을 읽기만 하며 1920x1080으로 찍는다.
// 실행: node docs/midterm/w9/demo/record-demo.mjs  → output/demo/hangeut-demo.webm(원본) + scenes.json
// 자막·마우스 포인터는 녹화용 오버레이(addInitScript)일 뿐, 사이트 소스는 건드리지 않는다.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(path.join(ROOT, 'backend/package.json'));
const { chromium } = require('playwright');

const BASE = 'https://az2mz.vercel.app';
const OUT = path.join(ROOT, 'output/demo');
const RAW = path.join(OUT, 'raw');
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });

// 녹화용 오버레이: 하단 자막 + 가짜 마우스 포인터(헤드리스 녹화엔 커서가 안 찍힘)
const OVERLAY = () => {
  const mk = () => {
    if (document.getElementById('__demo_cap')) return;
    const st = document.createElement('style');
    st.textContent = `
      #__demo_cap{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:2147483647;
        max-width:80vw;padding:16px 30px;border-radius:12px;background:rgba(17,20,28,.86);color:#fff;
        font:700 30px/1.35 "Pretendard","Malgun Gothic",sans-serif;letter-spacing:-.01em;text-align:center;
        pointer-events:none;opacity:0;transition:opacity .2s}
      #__demo_cap.on{opacity:1}
      #__demo_cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);transition:none}
      #__demo_cur svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
      #__demo_cur.down::after{content:"";position:absolute;left:-14px;top:-14px;width:28px;height:28px;
        border-radius:50%;background:rgba(255,120,60,.45)}`;
    document.head.appendChild(st);
    const cap = document.createElement('div'); cap.id = '__demo_cap';
    const cur = document.createElement('div'); cur.id = '__demo_cur';
    cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(cap, cur);
    const pos = JSON.parse(sessionStorage.getItem('__demo_pos') || 'null');
    if (pos) cur.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
    addEventListener('mousemove', e => {
      cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      sessionStorage.setItem('__demo_pos', JSON.stringify([e.clientX, e.clientY]));
    }, true);
    addEventListener('mousedown', () => cur.classList.add('down'), true);
    addEventListener('mouseup', () => setTimeout(() => cur.classList.remove('down'), 150), true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mk); else mk();
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  colorScheme: 'light',
  locale: 'ko-KR',
  recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
});
await ctx.addInitScript(OVERLAY);
const page = await ctx.newPage();
const t0 = Date.now();
const scenes = [];
let leadIn = 0;

const wait = ms => page.waitForTimeout(ms);
const sec = () => +((Date.now() - t0) / 1000).toFixed(1);
let mouse = [960, 540];

async function caption(text, feature = '') {
  if (text) scenes.push({ t: sec(), caption: text, feature });
  await page.evaluate(s => {
    const el = document.getElementById('__demo_cap'); if (!el) return;
    if (s) { el.textContent = s; el.classList.add('on'); } else el.classList.remove('on');
  }, text);
}
async function moveTo(x, y, steps = 30) {
  await page.mouse.move(x, y, { steps });
  mouse = [x, y];
}
async function hover(loc) {
  const b = await loc.boundingBox();
  await moveTo(b.x + Math.min(b.width / 2, 120), b.y + b.height / 2);
  await wait(500);
}
async function click(loc) {
  await hover(loc);
  await page.mouse.down(); await wait(90); await page.mouse.up();
}
// 사람이 휠 굴리듯 부드럽게 스크롤(ms 동안), 요소 기준이면 화면 위에서 offset px 지점에 맞춘다
async function scrollTo(target, offset = 120, ms = 1400) {
  await page.evaluate(async ([sel, off, dur]) => {
    const y0 = scrollY;
    const y1 = typeof sel === 'number' ? sel : document.querySelector(sel).getBoundingClientRect().top + scrollY - off;
    const t = performance.now();
    await new Promise(r => {
      const f = now => {
        const k = Math.min(1, (now - t) / dur), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        window.scrollTo(0, y0 + (y1 - y0) * e);
        k < 1 ? requestAnimationFrame(f) : r();
      };
      requestAnimationFrame(f);
    });
  }, [target, offset, ms]);
  await wait(300);
}
// 클릭으로 페이지가 바뀌는 경우: 이동 완료까지 기다린 뒤 오버레이 재정비
async function go(loc) {
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), click(loc)]);
  await settle();
}
async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await moveTo(mouse[0] + 1, mouse[1], 1); // 새 문서에 포인터 다시 그리기
  await wait(400);
}

// ── 0. 홈 첫 화면
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await settle();
leadIn = sec();
await caption('한끗 — 요즘 유행을 1분 만에 번역해 주는 트렌드 번역소');
await moveTo(700, 420, 40);
await wait(3500);
await hover(page.locator('#featured .fx-title'));
await caption('오늘의 한끗: 매일 재확인한 분석이 맨 위에 — 분석 날짜를 함께 표시', '③');
await hover(page.locator('#featured .it-date'));
await wait(3000);

// ── 1. 분류 칩으로 필터
await caption('');
await scrollTo('#trend', 90);
await caption('① 7개 분류 칩으로 관심 분야만 골라 보기', '①');
await wait(1500);
await click(page.locator('#catFilter .cat-chip[data-cat="디저트"]'));
await wait(2200);
await click(page.locator('#catFilter .cat-chip[data-cat="신조어"]'));
await wait(1800);
await caption('카드마다 유행 단계와 분석일이 붙어 있어요', '①③');
await hover(page.locator('#stripList .chip-card .cc-stage').first());
await wait(1200);
await hover(page.locator('#stripList .chip-card .cc-foot').first());
await wait(2200);

// ── 2. MZ 사전 키워드 검색
await caption('');
await go(page.locator('#mastNav a[href="dictionary.html"]'));
await caption('① MZ 사전: 처음 듣는 말을 키워드로 검색', '①');
await wait(1500);
await click(page.locator('#q'));
await page.keyboard.type('크크', { delay: 260 });
await wait(1500);
await caption('③ 분석 14일이 지나면 \'지난 유행어\'로 따로 분리돼요', '③');
await hover(page.locator('#archHead'));
await wait(3200);
await caption('① 다른 말도 검색 — "야르"', '①');
await page.keyboard.press('Control+A');
await page.keyboard.type('야르', { delay: 260 });
await wait(2000);

// ── 3. 상세: 뜻·단계·분석일·예시
await caption('');
await go(page.locator('#freshList a.dword[href*="id=yareu"]'));
await caption('② 1분 상세: 쉬운 뜻 한 줄', '②');
await hover(page.locator('.d-def'));
await wait(2800);
await caption('③ 수집일·분석일을 항목마다 표시', '③');
await hover(page.locator('.detail-meta .freshline'));
await wait(2800);
await caption('');
await scrollTo('.stage-box', 220);
await caption('② 지금 유행 단계: 발견 → 상승 → 피크 → 하락 중 어디인지', '②');
await hover(page.locator('.stage-box .sb-v'));
await wait(3500);
await caption('');
await scrollTo('.usage', 260);
await caption('② 실제로 이렇게 써요 — 예문과 사용 팁', '②');
await hover(page.locator('.usage .u-ex'));
await wait(3000);

// ── 4. 근거 출처 → 원문
await caption('');
await scrollTo('#sources', 300);
await caption('② 근거 출처: 판단 근거가 된 원문 링크 목록', '②');
await click(page.locator('#sources summary'));
await wait(1800);
const srcLink = page.locator('#sources .src-list a', { hasText: '엑스포츠뉴스' });
const srcUrl = await srcLink.getAttribute('href');
const [popup] = await Promise.all([ctx.waitForEvent('page'), click(srcLink)]);
await wait(800);
await popup.close(); // 실제 사이트는 새 탭으로 연다 — 녹화 화면에서 같은 원문을 보여 준다
await caption('');
await page.goto(srcUrl, { waitUntil: 'domcontentloaded' });
await caption('출처 원문(엑스포츠뉴스 기사) — 사이트에선 새 탭으로 열려요', '②');
await settle();
await moveTo(900, 250, 30);
await wait(4000);
await caption('');
await page.goBack({ waitUntil: 'networkidle' });
await settle();

// ── 5. 오래된 분석 경고
await go(page.locator('.mast .wordmark'));
await scrollTo('#trend', 90, 1200);
await click(page.locator('#catFilter .cat-chip[data-cat="신조어"]'));
await wait(1200);
await caption('③ 분석한 지 14일이 지난 항목은?', '③');
await hover(page.locator('#stripList .chip-card').first().locator('.cc-foot'));
await wait(2000);
await go(page.locator('#stripList .chip-card').first());
await scrollTo('.stale-banner', 620, 1000);
await caption('③ \'오래된 분석\' 경고 — 방문 전 최신 상황을 다시 확인하도록 안내', '③');
await hover(page.locator('.stale-banner'));
await wait(4500);
await caption('');

// ── 6. 홈으로 마무리
await scrollTo(0, 0, 900);
await go(page.locator('.mast .wordmark'));
await caption('한끗 — 유행을 1분에, 근거 출처와 날짜까지 함께');
await moveTo(760, 380, 40);
await wait(4500);
await caption('');
await wait(600);

const video = page.video();
await ctx.close();
await browser.close();
const raw = await video.path();
fs.renameSync(raw, path.join(OUT, 'hangeut-demo.webm'));
fs.rmSync(RAW, { recursive: true, force: true }); // 새 탭(출처) 영상 등 부산물 정리
const total = sec();
// t는 원본 webm 기준 초, mp4는 leadIn만큼 앞을 잘라 낸다
fs.writeFileSync(path.join(OUT, 'scenes.json'), JSON.stringify({ leadIn, total, scenes }, null, 2));
console.log(JSON.stringify({ leadIn, total, n: scenes.length }));
