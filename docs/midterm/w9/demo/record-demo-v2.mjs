// 한끗 MVP 시연영상 v2 녹화 — 기능 1·2·3을 장면마다 따라가는 판(2026-11-04 데이터 기준).
// 실행: node docs/midterm/w9/demo/record-demo-v2.mjs  → output/demo/hangeut-demo-v2.webm(원본) + scenes-v2.json
// v1(record-demo.mjs, hangeut-demo.*)은 그대로 둔다. 배포본은 읽기만 하고,
// 자막·기능 배지·마우스 포인터는 녹화용 오버레이(addInitScript)일 뿐 사이트 소스는 건드리지 않는다.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(path.join(ROOT, 'backend/package.json'));
const { chromium } = require('playwright');

const BASE = 'https://az2mz.vercel.app';
const OUT = path.join(ROOT, 'output/demo');
const RAW = path.join(OUT, 'raw-v2');
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });

// 기능 배지(화면 오른쪽 위) — 어느 기능 장면인지 계속 보이게
const BADGE = {
  intro: '한끗 MVP 시연',
  f1: '기능 1 · MZ 사전·검색',
  f2: '기능 2 · 출처·근거 확인',
  f3: '기능 3 · 오래된 분석 경고·단계',
  ad: '더 보기 · 광고일까 진짜일까',
};

const OVERLAY = () => {
  const mk = () => {
    if (document.getElementById('__demo_cap')) return;
    const st = document.createElement('style');
    st.textContent = `
      #__demo_cap{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:2147483647;
        max-width:80vw;padding:16px 30px;border-radius:12px;background:rgba(17,20,28,.88);color:#fff;
        font:700 30px/1.35 "Pretendard","Malgun Gothic",sans-serif;letter-spacing:-.01em;text-align:center;
        pointer-events:none;opacity:0;transition:opacity .2s}
      #__demo_cap.on{opacity:1}
      #__demo_badge{position:fixed;right:28px;top:24px;z-index:2147483647;padding:12px 20px;border-radius:10px;
        background:#1f3a8a;color:#fff;font:800 24px/1.2 "Pretendard","Malgun Gothic",sans-serif;
        pointer-events:none;opacity:0;transition:opacity .2s;box-shadow:0 2px 8px rgba(0,0,0,.18)}
      #__demo_badge.on{opacity:1}
      #__demo_badge.f2{background:#0f6b4f} #__demo_badge.f3{background:#9a3412} #__demo_badge.ad{background:#4c1d95}
      #__demo_badge.intro{background:#111827}
      #__demo_cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px)}
      #__demo_cur svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
      #__demo_cur.down::after{content:"";position:absolute;left:-14px;top:-14px;width:28px;height:28px;
        border-radius:50%;background:rgba(255,120,60,.45)}`;
    document.head.appendChild(st);
    const cap = document.createElement('div'); cap.id = '__demo_cap';
    const badge = document.createElement('div'); badge.id = '__demo_badge';
    const cur = document.createElement('div'); cur.id = '__demo_cur';
    cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(cap, badge, cur);
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
let cur = { text: '', badge: '' }; // 페이지가 바뀌어도 자막·배지를 다시 그리기 위한 현재 상태

const wait = ms => page.waitForTimeout(ms);
const sec = () => +((Date.now() - t0) / 1000).toFixed(1);
let mouse = [960, 540];

async function paint() {
  await page.evaluate(([s, b, label]) => {
    const el = document.getElementById('__demo_cap'), bd = document.getElementById('__demo_badge');
    if (!el || !bd) return;
    if (s) { el.textContent = s; el.classList.add('on'); } else el.classList.remove('on');
    bd.className = b ? `on ${b}` : '';
    if (b) bd.textContent = label;
  }, [cur.text, cur.badge, BADGE[cur.badge] || '']);
}
// example: 이 장면에 쓴 트렌드 id (scenes-v2.json·장면표용)
async function caption(text, badge = cur.badge, example = '') {
  cur = { text, badge };
  if (text) scenes.push({ t: sec(), badge, caption: text, example });
  await paint();
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
async function settle() {
  // 유튜브 임베드가 있는 상세는 networkidle에 안 닿으므로 짧게 끊는다
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await paint();
  await moveTo(mouse[0] + 1, mouse[1], 1); // 새 문서에 포인터 다시 그리기
  await wait(400);
}
// 클릭으로 페이지가 바뀌는 경우: 이동 완료까지 기다린 뒤 오버레이 재정비
async function go(loc) {
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), click(loc)]);
  await settle();
}
const card = id => page.locator(`a[href*="id=${id}"]`).first();

// ── 0. 홈 첫 화면
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await settle();
leadIn = sec();
await caption('한끗 — 요즘 유행을 1분 만에 번역해 주는 트렌드 번역소', 'intro');
await moveTo(700, 420, 40);
await wait(3500);
await caption('세 가지 기능을 차례로 봅니다: ① 찾기 ② 출처 확인 ③ 오래된 분석 경고·단계', 'intro');
await hover(page.locator('#featured .fx-title'));
await wait(4000);

// ── 1. 기능 1: 분류 칩 → MZ 사전 검색 → 뜻·예문
await caption('');
await scrollTo('#trend', 90);
await caption('① 분류 칩 7개로 관심 분야만 골라 보기', 'f1');
await wait(1200);
await click(page.locator('#catFilter .cat-chip[data-cat="신조어"]'));
await wait(2200);
await click(page.locator('#catFilter .cat-chip[data-cat="AI 프롬프트"]'));
await wait(2200);
await caption('');
await go(page.locator('#mastNav a[href="dictionary.html"]'));
await caption('① MZ 사전: 처음 듣는 말을 키워드로 검색', 'f1');
await wait(1500);
await click(page.locator('#q'));
await page.keyboard.type('AI', { delay: 300 });
await wait(1800);
await caption('검색 결과도 최신 신조어와 지난 유행어(분석 14일 경과)로 나뉘어요', 'f1');
await hover(page.locator('#archHead'));
await wait(3200);
await caption('11월 2일에 다시 판정한 신조어 \'젬민이\'를 열어 봅니다', 'f1', 'jemmini');
await scrollTo(0, 0, 700);
await hover(page.locator('#freshList a.dword[href*="id=jemmini"] .dw-date'));
await wait(1500);
await caption('');
await go(page.locator('#freshList a.dword[href*="id=jemmini"]'));
await caption('① 쉬운 뜻 한 줄: AI에게 모든 결정을 맡기는 사람', 'f1', 'jemmini');
await hover(page.locator('.d-def'));
await wait(3000);
await caption('');
await scrollTo('.usage', 300);
await caption('① 실제로 이렇게 써요 — 예문과 쓰임 설명', 'f1', 'jemmini');
await hover(page.locator('.usage .u-ex'));
await wait(3000);

// ── 2. 기능 2: 근거 출처 → 원문 기사
await caption('');
await scrollTo('#sources', 320);
await caption('② 이 뜻의 근거: 참고 출처를 펼쳐 봅니다', 'f2', 'jemmini');
await click(page.locator('#sources summary'));
await wait(2000);
const srcLink = page.locator('#sources .src-list a', { hasText: '다음뉴스' });
const srcUrl = await srcLink.getAttribute('href');
const [popup] = await Promise.all([ctx.waitForEvent('page'), click(srcLink)]);
await wait(800);
await popup.close(); // 실제 사이트는 새 탭으로 연다 — 녹화 화면에서 같은 원문을 보여 준다
await caption('');
await page.goto(srcUrl, { waitUntil: 'domcontentloaded' });
await caption('② 출처 원문 기사(다음뉴스) — 사이트에선 새 탭으로 열려요', 'f2', 'jemmini');
await settle();
await moveTo(760, 160, 30);
await wait(2500);
await caption('② 기사 속 정의와 한끗의 뜻이 같은지 직접 확인할 수 있어요', 'f2', 'jemmini');
await moveTo(760, 800, 30);
await wait(3500);
await caption('');
await page.goBack({ waitUntil: 'load' });
await settle();
await caption('③ 상세 상단의 수집일·분석일 — 언제 분석한 내용인지 바로 보여요', 'f3', 'jemmini');
await scrollTo(0, 0, 900);
await hover(page.locator('.detail-meta .freshline'));
await wait(3000);

// ── 3. 기능 3: 오래된 분석 경고 → 유행 단계 재판정
await caption('');
await go(page.locator('.mast .wordmark'));
await scrollTo('#trend', 90, 1200);
await click(page.locator('#catFilter .cat-chip[data-cat="AI 프롬프트"]'));
await wait(1200);
await caption('③ 할로윈 AI 코스튬 프롬프트 — 마지막 분석은 10월 11일', 'f3', 'halloween-ai-costume-prompt');
await hover(card('halloween-ai-costume-prompt').locator('.cc-foot'));
await wait(2500);
await caption('');
await go(card('halloween-ai-costume-prompt'));
await scrollTo('.stale-banner', 620, 1000);
await caption('③ 분석 14일이 지나면 \'오래된 분석\' 경고 — 방문 전 다시 확인하라고 알려요', 'f3', 'halloween-ai-costume-prompt');
await hover(page.locator('.stale-banner'));
await wait(4000);
await caption('③ 단계는 아직 \'상승\' — 할로윈(10/31) 전 분석이라 지금과 다를 수 있어요', 'f3', 'halloween-ai-costume-prompt');
await hover(page.locator('.stage-box .sb-v'));
await wait(3500);
await caption('③ 유행 단계는 매일 몇 건씩 다시 판정해요 — 다른 AI 프롬프트를 볼게요', 'f3');
await scrollTo(0, 0, 700);
await go(page.locator('.nav-categories a', { hasText: 'AI 프롬프트' }));
for (let i = 0; i < 3 && !(await card('ai-scribble-prompt').count()); i++) {
  await scrollTo('#lPager', 500, 1000);
  await click(page.locator('#lPager .pg-nav').last());
  await wait(1200);
}
await scrollTo(`a[href*="id=ai-scribble-prompt"]`, 320, 1200);
await caption('③ \'하찮은 그림 프롬프트\' — 단계가 \'하락 (한물감)\'으로 바뀌었어요', 'f3', 'ai-scribble-prompt');
await hover(card('ai-scribble-prompt').locator('.cc-stage'));
await wait(2500);
await caption('');
await go(card('ai-scribble-prompt'));
await caption('③ 11월 1일 재판정: 피크 → 하락 (한물감), 판정 근거 한 줄과 함께', 'f3', 'ai-scribble-prompt');
await hover(page.locator('.stage-box .sb-v'));
await wait(2500);
await hover(page.locator('.detail-meta .freshline'));
await wait(2500);

// ── 4. 광고일까 진짜일까
await caption('');
await go(page.locator('#mastNav a[href="list.html?type=ad"]'));
await caption('맛집·디저트는 \'광고일까 진짜일까\'로 따로 분석해요', 'ad');
await wait(2000);
await scrollTo(`a[href*="id=fig-dessert-2026"]`, 300, 2200);
await hover(card('fig-dessert-2026').locator('.it-title'));
await wait(1500);
await caption('');
await go(card('fig-dessert-2026'));
await scrollTo('.scores', 260, 1000);
await caption('광고 의심도와 후기 신뢰도를 따로 매긴 추정치 — 11월 3일 재확인', 'ad', 'fig-dessert-2026');
await hover(page.locator('.score.ad .s-num'));
await wait(2200);
await hover(page.locator('.score.trust .s-num'));
await wait(2200);
await caption('');
await scrollTo('#judgment', 240, 1000);
await caption('만족도는 신뢰도와 별도 축, 한끗 판단은 확인한 출처 기준으로', 'ad', 'fig-dessert-2026');
await hover(page.locator('#judgment .verdict'));
await wait(3500);

// ── 5. 홈으로 마무리
await caption('');
await scrollTo(0, 0, 900);
await go(page.locator('.mast .wordmark'));
await caption('한끗 — 유행을 1분에, 근거 출처와 날짜까지 함께', 'intro');
await moveTo(760, 380, 40);
await wait(4500);
await caption('', '');
await wait(600);

const video = page.video();
await ctx.close();
await browser.close();
const raw = await video.path();
fs.renameSync(raw, path.join(OUT, 'hangeut-demo-v2.webm'));
fs.rmSync(RAW, { recursive: true, force: true }); // 새 탭(출처) 영상 등 부산물 정리
const total = sec();
// t는 원본 webm 기준 초, mp4는 leadIn만큼 앞을 잘라 낸다
fs.writeFileSync(path.join(OUT, 'scenes-v2.json'), JSON.stringify({ leadIn, total, scenes }, null, 2));
console.log(JSON.stringify({ leadIn, total, n: scenes.length }));
