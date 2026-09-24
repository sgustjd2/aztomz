#!/usr/bin/env node
/* ============================================================
   한끗 — 네이버 블로그 발행 (Playwright)

   blog-publish.mjs(티스토리)와 같은 빌드 결과 backend/out/blog/<id>.{html,json} 을
   네이버 블로그(SmartEditor ONE)에 올린다. 평소엔 티스토리만 발행하고, 네이버는 매일 18:00
   스케줄작업 AZ2MZ_Naver_Queue(tools/naver-queue.vbs → --queue)가 하루 3편씩 천천히 따라 올린다.

   ── 로그인은 자동화하지 않는다 (티스토리와 같은 철칙) ──
   전용 프로필(backend/.naver-profile)에 사람이 1번 로그인("로그인 상태 유지" 체크)하고 재사용.
   캡차·기기인증은 사람이 푼다. 네이버 글쓰기 API 는 공식 종료돼 브라우저 경로뿐이다.

   ── 본문 주입 ──
   SmartEditor ONE 은 setContent 같은 API 가 없다. HTML 을 클립보드에 넣고 Ctrl+V 하면
   에디터가 제목·목록·표·링크를 자기 컴포넌트로 변환한다(사람이 붙여넣는 것과 같은 경로).
   <!--COVER--> / <!--FIG:id--> 자리에서는 붙여넣기를 끊고 그 이미지를 [사진] 버튼으로 올린다.

   실행 (레포 루트에서):
     node backend/scripts/blog-publish-naver.mjs --login      # 최초 1회: 직접 로그인 후 엔터
     node backend/scripts/blog-publish-naver.mjs <id> --dry   # 에디터까지만 채우고 멈춤(눈으로 확인)
     node backend/scripts/blog-publish-naver.mjs <id> --probe # 에디터 DOM 덤프(셀렉터 고칠 때)
     node backend/scripts/blog-publish-naver.mjs <id>         # 공개 발행
     node backend/scripts/blog-publish-naver.mjs <id> --draft # 임시저장만
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const profileDir = join(repoRoot, 'backend', '.naver-profile');
const statePath = join(repoRoot, 'backend', '.naver-state.json');
const postedPath = join(outDir, 'posted-naver.json');   // 티스토리 posted.json 과 분리(다른 스크립트가 그걸 읽는다)
const WRITE_URL = 'https://blog.naver.com/GoBlogWrite.naver';   // 로그인한 본인 블로그 글쓰기로 리다이렉트

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const id = argv.find((a) => !a.startsWith('--'));
const ask = async (q) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(q);
  rl.close();
};

/* 티스토리용 HTML → 네이버 붙여넣기용 조각들.
   iframe(유튜브)은 SE ONE 이 붙여넣기에서 버리므로 링크로 바꾼다 — 네이버가 URL 을 링크 카드로 만든다.
   [IMG: ...] 같은 작성용 주석은 지우고, 이미지 마커만 남겨 경계로 쓴다. */
export function toParts(html) {
  const clean = html
    .replace(/<iframe\b([^>]*)>\s*<\/iframe>/g, (tag, attrs) => {
      const v = attrs.match(/\/embed\/([\w-]{11})/)?.[1];
      if (!v) return '';
      const t = attrs.match(/title="([^"]*)"/)?.[1] || '영상 보기';
      return `<p><a href="https://www.youtube.com/watch?v=${v}">▶ ${t}</a></p>`;
    })
    .replace(/<!--(?!COVER-->|FIG:)[\s\S]*?-->/g, '');
  return clean.split(/<!--(COVER|FIG:[A-Za-z0-9_-]+)-->/)
    .map((s, i) => (i % 2 ? { img: s } : { html: s.trim() }))
    .filter((p) => p.img || p.html);
}

/* 티스토리 카테고리 + 커버 분야(coverSpec.cat) → 네이버 카테고리(2026-09-24 생성: 한끗 트렌드 5개 하위 ·
   AI·IT 2개 하위 · 생활정보). 먼저 맞는 규칙이 이긴다 — 개발이 AI보다 앞(“AI 동향 / 개발” 은 개발·자동화). */
const CATEGORY_RULES = [
  [/n8n|개발|dev-/, '개발·자동화'],
  [/AI|LLM/, 'AI 동향'],
  [/맛집|디저트|간식|제철 음식/, '맛집·디저트'],
  [/카페|핫플/, '카페·핫플'],
  [/신조어|밈/, '신조어·밈'],
  [/노래|음악|챌린지/, '노래·음악'],
  [/패션|미용|뷰티|하객룩/, '패션·뷰티'],
];
export function naverCategory(meta) {
  const key = `${meta.id || ''} ${meta.category || ''} ${meta.coverSpec?.cat || ''}`;
  return CATEGORY_RULES.find(([re]) => re.test(key))?.[1] || '생활정보';
}

/* 에디터는 #mainFrame iframe 안에 있을 때도, 최상위에 있을 때도 있다(네이버가 오간다). */
async function editorFrame(page) {
  for (let i = 0; i < 40; i++) {
    for (const f of page.frames()) {
      if (await f.locator('.se-content, .se-documentTitle').first().count().catch(() => 0)) return f;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('SmartEditor 를 못 찾음 — 로그인 만료거나 에디터 개편. --probe 로 확인');
}

async function firstVisible(scope, name, sels, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const s of sels) {
      const loc = scope.locator(s).first();
      if (await loc.isVisible().catch(() => false)) return loc;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`요소를 못 찾음: ${name} (${sels.join(' | ')}) — --probe 로 확인`);
}

/* 붙여넣기 = 진짜 클립보드 + Ctrl+V. SE ONE 은 합성 paste 이벤트엔 반응하지 않는다(2026-09-24 실측).
   무인 실행 중 사용자의 클립보드를 날리지 않도록 원래 텍스트를 읽어뒀다가 붙여넣은 직후 되돌린다.
   ponytail: 텍스트만 복원(이미지 복사본은 못 살림) · 쓰기→붙여넣기 사이 수 ms 동안 사용자가 복사하면 섞일 수 있음. */
async function pasteHtml(page, f, html) {
  const saved = await f.evaluate(() => navigator.clipboard.readText().catch(() => null));
  await f.evaluate(async (h) => {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([h], { type: 'text/html' }),
      'text/plain': new Blob([h.replace(/<[^>]+>/g, '')], { type: 'text/plain' }),
    })]);
  }, html);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(1500);
  if (saved !== null) await f.evaluate((t) => navigator.clipboard.writeText(t).catch(() => {}), saved);
}

async function uploadImage(page, f, file) {
  const before = await f.locator('.se-component.se-image').count();
  const btn = await firstVisible(f, '사진 버튼', ['button.se-image-toolbar-button', 'button[data-name="image"]']);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }), btn.click()]);
  await chooser.setFiles(file);
  await f.waitForFunction((n) => document.querySelectorAll('.se-component.se-image').length > n, before, { timeout: 60000 });
  await page.waitForTimeout(800);
  // 사진 컴포넌트가 선택된 채면 다음 붙여넣기가 사진을 덮을 수 있다 — 본문 끝 문단으로 커서를 옮긴다.
  await f.locator('.se-component.se-text .se-text-paragraph').last().click().catch(() => {});
  await page.keyboard.press('Control+End');
}

async function login() {
  const ctx = await chromium.launchPersistentContext(profileDir, { headless: false, viewport: null });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`https://nid.naver.com/nidlogin.login?url=${encodeURIComponent(WRITE_URL)}`);
  console.log('\n브라우저에서 네이버 로그인을 끝내세요("로그인 상태 유지" 체크). 글쓰기 화면이 뜨면 엔터.');
  await ask('> 로그인 완료 후 엔터: ');
  const ok = /blog\.naver\.com/.test(page.url());
  if (ok) await ctx.storageState({ path: statePath });
  await ctx.close();
  console.log(ok ? '✓ 네이버 세션 저장됨 → backend/.naver-state.json (+ 프로필)'
    : `⚠ 글쓰기 화면이 아닙니다(${page.url()}). 다시 --login 하세요.`);
  process.exit(ok ? 0 : 1);
}

async function probe(f) {
  const dump = await f.evaluate(() => ({
    url: location.href,
    buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
      .map((b) => `${b.className.toString().slice(0, 60)} | ${b.dataset.name || b.dataset.testid || ''} | ${b.innerText.trim().slice(0, 15)}`),
    inputs: [...document.querySelectorAll('input')].map((i) => `${i.id} ${i.type} ${i.placeholder}`),
  }));
  console.log(JSON.stringify(dump, null, 2));
}

async function publish() {
  const htmlPath = join(outDir, `${id}.html`);
  const metaPath = join(outDir, `${id}.json`);
  if (!existsSync(htmlPath) || !existsSync(metaPath)) {
    console.error(`✗ 빌드 결과가 없습니다: backend/out/blog/${id}.{html,json}`);
    process.exit(1);
  }
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const parts = toParts(await readFile(htmlPath, 'utf8'));
  const posted = existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  if (posted[id] && !has('force') && !has('dry') && !has('probe')) {
    console.log(`· 네이버에 이미 발행됨 (${posted[id].at}) — ${posted[id].url}  (다시: --force)`);
    process.exit(0);
  }
  if (!existsSync(profileDir)) {
    console.error('✗ 네이버 로그인 프로필이 없습니다. 먼저: node backend/scripts/blog-publish-naver.mjs --login');
    process.exit(1);
  }

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.HEADLESS === '1',
    viewport: { width: 1440, height: 960 },
    permissions: ['clipboard-read', 'clipboard-write'],
    // 대기열(무인)은 창을 화면 밖에 띄운다 — 게임·작업 중에 창이 튀어나오지 않게. headless 는 봇 신호라 안 씀.
    args: process.env.NAVER_OFFSCREEN === '1' ? ['--window-position=-32000,-32000'] : [],
  });
  if (existsSync(statePath)) await ctx.addCookies(JSON.parse(await readFile(statePath, 'utf8')).cookies || []);
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  try {
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (/nid\.naver\.com/.test(page.url())) throw new Error('네이버 세션 만료 — --login 다시(로그인 상태 유지 체크)');
    const f = await editorFrame(page);
    if (has('probe')) { await probe(f); await ctx.close(); return; }

    // "작성 중인 글이 있습니다" 팝업 → 취소(새 글), 도움말 패널 → 닫기
    for (const s of ['.se-popup-button-cancel', '.se-help-panel-close-button']) {
      const b = f.locator(s).first();
      if (await b.isVisible({ timeout: 1500 }).catch(() => false)) await b.click();
    }

    // ── 제목
    const title = await firstVisible(f, '제목', ['.se-documentTitle .se-text-paragraph', '.se-title-text']);
    await title.click();
    await page.keyboard.type(meta.title);

    // ── 본문: 텍스트는 붙여넣기, 이미지 마커 자리는 업로드
    const body = await firstVisible(f, '본문', ['.se-component.se-text .se-text-paragraph', '.se-content .se-text-paragraph']);
    await body.click();
    const { makeCover } = await import('./blog-publish.mjs');
    const { makeFigure } = await import('./blog-figure.mjs');
    const figs = new Map((meta.figures || []).map((x) => [x.id, x]));
    for (const p of parts) {
      if (p.html) { await pasteHtml(page, f, p.html); continue; }
      try {
        const spec = p.img === 'COVER' ? meta.coverSpec : figs.get(p.img.slice(4));
        if (!spec) continue;
        const file = p.img === 'COVER' ? await makeCover(ctx, spec, id) : await makeFigure(ctx, spec, id);
        await page.bringToFront();
        await uploadImage(page, f, file);
      } catch (e) { console.warn(`  ⚠ 이미지 ${p.img} 실패(본문은 계속): ${e.message.split('\n')[0]}`); }
    }
    const len = await f.locator('.se-content').first().innerText().then((t) => t.length);
    if (len < 200) throw new Error(`본문 붙여넣기가 비어 보입니다(${len}자) — 클립보드 권한/에디터 확인`);

    if (has('dry')) {
      await page.screenshot({ path: join(outDir, `${id}.naver-dry.png`) });
      console.log(`✓ dry: 제목·본문 주입 완료(본문 ${len}자) → 카테고리 "${naverCategory(meta)}" 예정. 스크린샷: backend/out/blog/${id}.naver-dry.png`);
      if (process.stdin.isTTY) await ask('> 확인 후 엔터(창 닫힘): ');
      await ctx.close();
      return;
    }

    if (has('draft')) {
      await (await firstVisible(f, '저장 버튼', ['button[class*="save_btn"]', 'button:has-text("저장")'])).click();
      await page.waitForTimeout(2000);
      console.log('✓ 네이버 임시저장 완료');
      await ctx.close();
      return;
    }

    // ── 발행 레이어: 카테고리 → 태그 → 전체공개 → 발행
    await (await firstVisible(f, '발행 버튼', ['button[class*="publish_btn"]', 'button:has-text("발행")'])).click();
    const catName = naverCategory(meta);
    const catBtn = await firstVisible(f, '카테고리 선택', ['button[class*="selectbox_button"]'], 5000);
    await catBtn.click();
    // 옵션 텍스트는 "하위 카테고리" + 이름이라 끝부분으로 맞춘다.
    const esc = catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await f.locator('span[class*="option__"]', { hasText: new RegExp(`${esc}$`) }).first().click({ timeout: 5000 });
    if (!(await catBtn.innerText()).includes(catName)) throw new Error(`카테고리 "${catName}" 선택 실패 — 네이버 카테고리 관리 확인`);
    const tag = await firstVisible(f, '태그 입력', ['#tag-input', 'input[placeholder*="태그"]'], 5000).catch(() => null);
    for (const t of (meta.tags || []).slice(0, 30)) {
      if (!tag) break;
      await tag.fill(t);
      await tag.press('Enter');
    }
    await f.locator('label:has-text("전체공개")').first().click({ timeout: 3000 }).catch(() => {});
    await (await firstVisible(f, '발행 확인', ['button[data-testid="seOnePublishBtn"]', 'button[class*="confirm_btn"]'])).click();

    // 발행되면 어느 프레임이든 글 번호(logNo) 주소로 바뀐다. 캡차가 뜨면 사람이 푼다(3분).
    let url = '';
    for (let i = 0; i < 360 && !url; i++) {
      await page.waitForTimeout(500);
      url = page.frames().map((x) => x.url()).find((u) => /logNo=\d+|blog\.naver\.com\/[\w-]+\/\d{6,}/.test(u) && !/postwrite|PostWriteForm/i.test(u)) || '';
    }
    if (!url) throw new Error('발행 후 글 주소를 확인하지 못했습니다(캡차 미해결일 수 있음) — 네이버에서 직접 확인');
    const m = url.match(/blogId=([\w-]+).*logNo=(\d+)/);
    if (m) url = `https://blog.naver.com/${m[1]}/${m[2]}`;

    posted[id] = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), url, title: meta.title };
    await writeFile(postedPath, JSON.stringify(posted, null, 2) + '\n', 'utf8');
    console.log(`✓ 네이버 발행 완료: ${url}`);
    await ctx.close();
  } catch (e) {
    await page.screenshot({ path: join(outDir, `${id}.naver-error.png`) }).catch(() => {});
    console.error(`✗ 네이버 발행 실패: ${e.message}\n  스크린샷: backend/out/blog/${id}.naver-error.png`);
    if (!has('keep-open')) await ctx.close();
    process.exit(1);
  }
}

/* --queue: 티스토리에 이미 올린 글을 네이버에 천천히 순차 발행한다. 스팸 판정은 "짧은 시간 대량"이
   핵심 신호라 속도를 조절한다: 하루 --max 편(오늘 이미 올린 수 포함) · 글 사이 --gap 분 랜덤 대기 ·
   최신순 · 티스토리 발행 후 --max-age 일 넘은 글은 건너뜀(묵은 트렌드).
   한 편이라도 실패하면(세션 만료·캡차) 그날은 멈춘다 — 막힌 채 계속 두드리면 그게 더 스팸 신호다.
   ponytail: 캡차 자체를 피하는 방법은 없다(우회 안 함). 속도 조절이 할 수 있는 전부. */
export function queueCandidates(tistory, naver, now, maxAgeDays, hasBuild = () => true) {
  return Object.entries(tistory)
    .filter(([id, v]) => !naver[id] && hasBuild(id)
      && (now - Date.parse(v.at.replace(' ', 'T') + 'Z')) / 864e5 <= maxAgeDays)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .map(([id]) => id);
}

async function runQueue() {
  const val = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
  const max = Number(val('max', 3));
  const maxAge = Number(val('max-age', 30));
  const [gapMin, gapMax] = val('gap', '40-90').split('-').map(Number);
  const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
  const tistory = read(join(outDir, 'posted.json'));
  const naver = read(postedPath);
  const hasBuild = (x) => existsSync(join(outDir, `${x}.html`)) && existsSync(join(outDir, `${x}.json`))
    && JSON.parse(readFileSync(join(outDir, `${x}.json`), 'utf8')).category !== 'error';
  const all = queueCandidates(tistory, naver, Date.now(), maxAge, hasBuild);
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = Object.values(naver).filter((v) => v.at.startsWith(today)).length;
  const todo = all.slice(0, Math.max(0, max - doneToday));
  console.log(`네이버 대기열: 후보 ${all.length}편(최근 ${maxAge}일) · 오늘 이미 ${doneToday}편 · 이번 실행 ${todo.length}편`);
  if (has('list')) {
    for (const x of all) console.log(`  ${tistory[x].at}  ${x}  → ${naverCategory(JSON.parse(readFileSync(join(outDir, `${x}.json`), 'utf8')))}`);
    return;
  }
  for (let i = 0; i < todo.length; i++) {
    console.log(`\n[${i + 1}/${todo.length}] ${todo[i]}`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), todo[i]],
      { stdio: 'inherit', env: { ...process.env, NAVER_OFFSCREEN: '1' } });
    if (r.status !== 0) { console.error('✗ 실패 — 오늘 대기열 중단(세션·캡차 확인 후 다시)'); process.exit(1); }
    if (i < todo.length - 1) {
      const min = gapMin + Math.random() * (gapMax - gapMin);
      console.log(`  · 다음 글까지 ${min.toFixed(0)}분 대기`);
      await new Promise((res) => setTimeout(res, min * 60000));
    }
  }
}

function selftest() {
  const cats = [
    [{ category: 'AZTOMZ', coverSpec: { cat: '디저트' } }, '맛집·디저트'],
    [{ category: 'AI 동향', coverSpec: { cat: '개발' } }, '개발·자동화'],
    [{ category: 'LLM관련', coverSpec: { cat: 'AI' } }, 'AI 동향'],
    [{ category: '음악', coverSpec: { cat: '음악' } }, '노래·음악'],
    [{ coverSpec: { cat: '가을 하객룩' } }, '패션·뷰티'],
    [{ coverSpec: { cat: '추석' } }, '생활정보'],
    [{ id: 'dev-digest-2026-09-24', category: 'AI 동향', coverSpec: { cat: 'AI' } }, '개발·자동화'],
  ];
  const badCat = cats.filter(([m, want]) => naverCategory(m) !== want);
  console.log(badCat.length ? `✗ naverCategory: ${JSON.stringify(badCat)}` : '✓ naverCategory selftest');
  const now = Date.parse('2026-09-24T00:00:00Z');
  const q = queueCandidates({
    old: { at: '2026-07-01 10:00' }, mid: { at: '2026-09-10 10:00' }, fresh: { at: '2026-09-23 10:00' }, done: { at: '2026-09-22 10:00' },
  }, { done: {} }, now, 30);
  const qOk = JSON.stringify(q) === '["fresh","mid"]';
  console.log(qOk ? '✓ queueCandidates selftest' : `✗ queueCandidates: ${JSON.stringify(q)}`);
  if (badCat.length || !qOk) process.exitCode = 1;
  const parts = toParts('<!--COVER-->\n<p>a</p><!-- [IMG: x] --><!--FIG:t1--><div class="v"><iframe src="https://www.youtube-nocookie.com/embed/AZlnBW-MJh0" title="곡"></iframe></div>');
  const ok = parts.length === 4 && parts[0].img === 'COVER' && parts[1].html === '<p>a</p>'
    && parts[2].img === 'FIG:t1' && parts[3].html.includes('watch?v=AZlnBW-MJh0') && parts[3].html.includes('곡')
    && !parts[3].html.includes('iframe');
  console.log(ok ? '✓ toParts selftest' : `✗ toParts selftest: ${JSON.stringify(parts)}`);
  if (!ok) process.exitCode = 1;
}

let chromium;
const isMain = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (has('selftest')) selftest();
  else {
    ({ chromium } = await import('playwright'));
    if (has('login')) await login();
    else if (has('queue')) await runQueue();
    else if (id) await publish();
    else console.error('사용법: node backend/scripts/blog-publish-naver.mjs --login | <id> [--dry|--draft|--probe|--force]'
      + ' | --queue [--list] [--max=3] [--gap=40-90] [--max-age=30] | --selftest');
  }
}
