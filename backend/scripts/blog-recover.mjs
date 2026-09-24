#!/usr/bin/env node
/* ============================================================
   이미 발행된 티스토리 글의 대표 이미지(커버)만 교체한다.

   커버 디자인이 바뀌었을 때 옛 글을 따라오게 하려고 만들었다(2026-07-28 1차, 2026-09-24 실사진 카드로 재교체).

   ── 2026-09-24 개편: 라이브 본문 보존 ──
   예전엔 backend/out/blog/<id>.html 원본을 통째로 다시 넣어서, 티스토리에서 사람이 직접 고친 본문이
   있으면 그 수정이 덮였다. 이제는 **에디터에 실제로 게시된 본문을 읽어 맨 앞 커버 이미지만** 새 것으로
   바꾼다(맨 앞이 이미지가 아니면 앞에 끼워 넣기만 하고 아무것도 지우지 않는다).
   그리고 저장 뒤 공개 페이지의 og:image(=대표 이미지)가 실제로 바뀌었는지 확인한다 — 예전엔 캡차로
   저장이 막혀도 "성공"으로 찍혔다.

   캡차(DKAPTCHA)는 우회하지 않는다. 저장 뒤 편집 화면을 못 벗어나면 캡차로 보고 그 자리에서 전체 중단.
   연속 발행이 캡차를 부르므로 글 사이에 --gap 초 랜덤 대기. 교체 기록은 out/blog/cover-refresh.json 에
   남기고 다음 실행 때 건너뛴다. 발행 대기열(blog-queue.mjs)과 같은 락(.queue.lock)을 써서 티스토리
   프로필이 동시에 두 번 열리지 않게 한다.

   실행:
     node backend/scripts/blog-recover.mjs <id>                  # 1편 교체
     node backend/scripts/blog-recover.mjs --all [--skip=a,b]    # posted.json 전부(이미 교체한 글 제외)
       옵션: --gap=60-120(초) · --until=21:45(이 시각 넘으면 멈춤) · --reuse(이미 렌더된 <id>.cover.png 사용)
     node backend/scripts/blog-recover.mjs --list                # 남은 대상 수만 보기
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const profileDir = join(repoRoot, 'backend', '.tistory-profile');
const statePath = join(repoRoot, 'backend', '.tistory-state.json');
const postedPath = join(outDir, 'posted.json');
const donePath = join(outDir, 'cover-refresh.json');
const lockPath = join(outDir, '.queue.lock');

const BLOG = process.env.TISTORY_BLOG || 'burning-go9me';
const BASE = `https://${BLOG}.tistory.com`;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n, d = '') => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || d;
const onlyId = argv.find((a) => !a.startsWith('--'));

const postId = (url) => (String(url).match(/\/(\d+)(?:$|[?#/])/) || [])[1];

/* 게시된 본문 맨 앞의 커버 블록을 새 커버로 바꾼다. 맨 앞이 이미지가 아니면 앞에 붙이기만 한다. */
export function swapLeadingCover(live, coverMarkup) {
  const lead = /^\s*(?:<p[^>]*>\s*\[##_Image\|[\s\S]*?_##\]\s*<\/p>|\[##_Image\|[\s\S]*?_##\]|<figure[^>]*>[\s\S]*?<\/figure>)/;
  return lead.test(live) ? live.replace(lead, coverMarkup) : coverMarkup + '\n' + live;
}

async function ogImage(pid) {
  const html = await fetch(`${BASE}/${pid}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.text()).catch(() => '');
  return (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) || [])[1] || '';
}

async function recover(page, ctx, id, rec, pub) {
  const pid = postId(rec.url);
  if (!pid) return { ok: false, why: `글 번호를 못 읽음: ${rec.url}` };
  const meta = JSON.parse(await readFile(join(outDir, `${id}.json`), 'utf8'));
  if (!meta.coverSpec) return { ok: false, why: 'coverSpec 없음' };

  const before = await ogImage(pid);
  const coverFile = has('reuse') && existsSync(join(outDir, `${id}.cover.png`))
    ? join(outDir, `${id}.cover.png`) : await pub.makeCover(ctx, meta.coverSpec, id);

  let contentReady = false;
  const onDialog = (d) => (contentReady ? d.accept() : d.dismiss()).catch(() => {});
  page.on('dialog', onDialog);
  try {
    await page.goto(`${BASE}/manage/newpost/${pid}?type=post`, { waitUntil: 'domcontentloaded' });
    if (/auth\/login|accounts\.kakao/.test(page.url())) throw new Error('로그인 세션 만료');
    await page.waitForFunction(() => !!(window.tinymce && window.tinymce.activeEditor), null, { timeout: 20000 });
    await page.waitForTimeout(1500);

    const live = await page.evaluate(() => window.tinymce.activeEditor.getContent());
    if (live.length < 200) return { ok: false, why: `게시 본문이 비어 보임(${live.length}자) — 건너뜀` };

    // 빈 에디터에 새 커버만 올려 티스토리 CDN 마크업을 얻는다.
    await page.evaluate(() => window.tinymce.activeEditor.setContent(''));
    if (!await pub.uploadCover(page, coverFile)) return { ok: false, why: '커버 업로드 실패' };
    const coverMarkup = await page.waitForFunction(() => {
      try {
        const c = window.tinymce.activeEditor.getContent();
        return /##_Image|<img\b/i.test(c) ? c : false;
      } catch { return false; }
    }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => '');
    if (!coverMarkup) return { ok: false, why: '커버 마크업 확인 실패' };

    await page.evaluate((html) => {
      const ed = window.tinymce.activeEditor;
      ed.setContent(html); ed.fire('change'); ed.save?.();
    }, swapLeadingCover(live, coverMarkup));
    const rep = await pub.setRepresentative(page);
    if (!rep) return { ok: false, why: '대표 이미지 지정 실패(저장 안 함)' };
    contentReady = true;

    await page.locator('#publish-layer-btn, button:has-text("완료")').first().click();
    await page.waitForTimeout(1200);
    await page.locator('button:has-text("공개 발행"), #publish-btn, button:has-text("발행")').first().click();
    const left = await page.waitForURL((u) => !u.pathname.includes('/manage/newpost'), { timeout: 90000 })
      .then(() => true).catch(() => false);
    if (!left) return { ok: false, why: '저장 후 편집 화면을 못 벗어남(캡차 의심)', stop: true };

    await page.waitForTimeout(3000);
    const after = await ogImage(pid);
    if (!after || after === before) return { ok: false, why: `저장은 됐지만 og:image 가 그대로(${after ? '동일' : '못 읽음'})` };
    return { ok: true, url: `${BASE}/${pid}`, og: after };
  } finally {
    page.off('dialog', onDialog);
  }
}

const main = async () => {
  const posted = JSON.parse(await readFile(postedPath, 'utf8'));
  const done = existsSync(donePath) ? JSON.parse(readFileSync(donePath, 'utf8')) : {};
  const skip = new Set(flag('skip').split(',').map((s) => s.trim()).filter(Boolean));
  const eligible = (i) => posted[i] && !skip.has(i) && existsSync(join(outDir, `${i}.json`))
    && !!JSON.parse(readFileSync(join(outDir, `${i}.json`), 'utf8')).coverSpec;
  let ids = onlyId ? [onlyId] : (has('all') || has('list')) ? Object.keys(posted).filter((i) => eligible(i) && !done[i]) : [];
  if (has('list')) { console.log(`남은 교체 대상 ${ids.length}편 · 완료 ${Object.keys(done).length}편`); return; }
  if (!ids.length) {
    console.error('사용법: node backend/scripts/blog-recover.mjs <id> | --all [--skip=a,b] [--gap=60-120] [--until=21:45] [--reuse] | --list');
    process.exit(1);
  }
  const [gMin, gMax] = flag('gap', '60-120').split('-').map(Number);
  const until = flag('until');
  const pastUntil = () => until && new Date().toTimeString().slice(0, 5) >= until;

  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, 'utf8'));
    try { process.kill(pid, 0); console.error(`✗ 발행 대기열/교체가 실행 중(pid ${pid}) — 끝난 뒤 다시`); process.exit(1); } catch { /* 죽은 락 */ }
  }
  writeFileSync(lockPath, String(process.pid));

  const { chromium } = await import('playwright');
  const pub = await import('./blog-publish.mjs');
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.HEADLESS === '1', viewport: { width: 1440, height: 960 },
    args: process.env.BLOG_OFFSCREEN === '1' ? ['--window-position=-32000,-32000'] : [],
  });
  if (existsSync(statePath)) await ctx.addCookies(JSON.parse(readFileSync(statePath, 'utf8')).cookies || []);
  const page = ctx.pages()[0] || await ctx.newPage();

  let ok = 0;
  try {
    for (let i = 0; i < ids.length; i++) {
      if (pastUntil()) { console.log(`· ${until} 지남 — 여기서 멈춤(남은 ${ids.length - i}편은 다음 실행에서)`); break; }
      const id = ids[i];
      let r;
      try { r = await recover(page, ctx, id, posted[id], pub); } catch (e) { r = { ok: false, why: String(e.message).split('\n')[0], stop: /로그인 세션 만료/.test(e.message) }; }
      console.log(`${r.ok ? '✓' : '✗'} [${i + 1}/${ids.length}] ${id}${r.ok ? ` → ${r.url}` : `: ${r.why}`}`);
      if (r.ok) {
        ok++;
        done[id] = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), og: r.og };
        await writeFile(donePath, JSON.stringify(done, null, 2) + '\n', 'utf8');
      }
      if (r.stop) { console.error('✗ 중단 — 캡차/세션 문제. 사람이 확인 후 다시 실행하면 남은 글부터 이어간다.'); process.exitCode = 1; break; }
      if (i < ids.length - 1) await page.waitForTimeout((gMin + Math.random() * (gMax - gMin)) * 1000);
    }
  } finally {
    await ctx.close().catch(() => {});
    try { unlinkSync(lockPath); } catch { /* 이미 없음 */ }
  }
  console.log(`\n이번 실행 교체 ${ok}편 · 누적 ${Object.keys(done).length}편`);
};

if (has('selftest')) {
  const img = '<p>[##_Image|kage@old|CDM|1.3|{"filename":"x.cover.png"}_##]</p>';
  const a = swapLeadingCover(`${img}\n<p>본문</p>`, 'NEW');
  const b = swapLeadingCover('<p>본문 먼저</p>', 'NEW');
  const pass = a === 'NEW\n<p>본문</p>' && b === 'NEW\n<p>본문 먼저</p>';
  console.log(pass ? '✓ swapLeadingCover selftest' : `✗ swapLeadingCover: ${JSON.stringify([a, b])}`);
  process.exitCode = pass ? 0 : 1;
} else {
  main().catch((e) => { console.error('✗', e.message); try { unlinkSync(lockPath); } catch {} process.exit(1); });
}
