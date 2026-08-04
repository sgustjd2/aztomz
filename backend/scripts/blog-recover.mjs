#!/usr/bin/env node
/* ============================================================
   이미 발행된 글의 대표 이미지(커버)만 교체한다.

   커버 디자인이 바뀌었을 때 옛 글을 따라오게 하려고 만들었다(2026-07-28: 목록 썸네일이
   256x256 정사각 크롭이라 좌우가 잘리는 걸 발견하고 카드를 중앙정렬로 재설계함).

   본문은 backend/out/blog/<id>.html 원본을 그대로 다시 넣는다 — 즉 **글 내용은 안 바뀐다.**
   ⚠️ 그래서 티스토리에서 사람이 직접 본문을 고친 글이 있으면 그 수정이 덮인다.
      그런 글은 --skip 으로 빼거나 사람이 직접 커버만 갈아야 한다.

   실행:
     node backend/scripts/blog-recover.mjs <id>            # 1편 교체
     node backend/scripts/blog-recover.mjs --all           # posted.json 전부
     node backend/scripts/blog-recover.mjs --all --skip=a,b
     node backend/scripts/blog-recover.mjs <id> --dry      # 커버만 만들고 멈춤(발행 안 함)
   ============================================================ */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const profileDir = join(repoRoot, 'backend', '.tistory-profile');
const statePath = join(repoRoot, 'backend', '.tistory-state.json');
const postedPath = join(outDir, 'posted.json');

const BLOG = process.env.TISTORY_BLOG || 'burning-go9me';
const BASE = `https://${BLOG}.tistory.com`;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');
const onlyId = argv.find((a) => !a.startsWith('--'));

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('✗ playwright 가 없습니다:  cd backend && npm i');
  process.exit(1);
}

/* blog-publish.mjs 의 makeCover/uploadCover 를 그대로 재사용한다 — 카드 디자인이 두 벌로
   갈라지면 다음에 또 어긋난다. 그 파일이 --cover 플래그로 커버만 만들 수 있으니 그걸 쓴다. */
const { execFileSync } = await import('node:child_process');

const postId = (url) => (String(url).match(/\/(\d+)(?:$|[?#])/) || [])[1];

async function recover(page, ctx, id, rec, makeCover, uploadCover, setRepresentative, uploadFigures) {
  const pid = postId(rec.url);
  if (!pid) return { id, ok: false, why: `글 번호를 못 읽음: ${rec.url}` };

  const metaPath = join(outDir, `${id}.json`);
  const htmlPath = join(outDir, `${id}.html`);
  if (!existsSync(metaPath) || !existsSync(htmlPath)) return { id, ok: false, why: '원본 파일 없음' };

  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const body = await readFile(htmlPath, 'utf8');
  if (!meta.coverSpec) return { id, ok: false, why: 'coverSpec 없음' };
  if (!body.includes('<!--COVER-->')) return { id, ok: false, why: 'COVER 마커 없음' };

  await page.goto(`${BASE}/manage/newpost/${pid}?type=post`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  if (/auth\/login|accounts\.kakao/.test(page.url())) throw new Error('로그인 세션 만료');

  await page.waitForFunction(
    () => !!(window.tinymce && (window.tinymce.activeEditor || window.tinymce.editors?.[0])),
    null, { timeout: 20000 });

  const coverFile = await makeCover(ctx, meta.coverSpec, id);
  await page.evaluate(() => (window.tinymce.activeEditor || window.tinymce.editors[0]).setContent(''));
  const uploaded = await uploadCover(page, coverFile);
  if (!uploaded) return { id, ok: false, why: '커버 업로드 실패' };

  const coverMarkup = await page.waitForFunction(() => {
    try {
      const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
      if (!/##_Image|<img\b/i.test(ed?.getBody()?.innerHTML || '')) return false;
      const c = ed.getContent();
      return /##_Image|<img\b/i.test(c) ? c : false;
    } catch { return false; }
  }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => '');
  if (!coverMarkup) return { id, ok: false, why: '커버 마크업 확인 실패' };

  /* 본문 그림(figures)도 커버와 같이 다시 올린다.
     여기 빠뜨리면 <!--FIG:id--> 마커가 그대로 남아 캡션만 있고 그림은 없는 figure 가 발행된다
     (2026-07-30 실측 — /295 를 그렇게 한 번 망가뜨렸다). blog-publish 와 같은 함수를 쓴다. */
  const figRes = await uploadFigures(page, ctx, meta, id, body);
  if (figRes.done) console.log(`  · ${id}: 본문 그림 ${figRes.done}장`);
  if (figRes.failed.length) console.warn(`  ⚠ ${id}: 그림 실패 — ${figRes.failed.join(' · ')}`);

  await page.evaluate((html) => {
    const ed = window.tinymce.activeEditor || window.tinymce.editors[0];
    ed.setContent(html); ed.fire('change'); ed.save?.();
  }, figRes.html.replace('<!--COVER-->', coverMarkup));

  // ★ 새 이미지를 대표로 지정한다. 이게 이 스크립트의 핵심 — 본문만 갈면 목록 썸네일·og:image 는
  //   예전 이미지를 계속 가리킨다(대표는 글 메타로 따로 저장되기 때문).
  const rep = await setRepresentative(page);
  if (!rep) return { id, ok: false, why: '대표 이미지 지정 실패(본문은 바뀜) — 목록 썸네일이 안 바뀐다' };

  // 완료 → (공개 상태 유지) → 저장
  await page.locator('#publish-layer-btn, button:has-text("완료")').first().click();
  await page.waitForTimeout(1200);
  const save = page.locator('button:has-text("공개 발행"), #publish-btn, button:has-text("발행")').first();
  if (!await save.count()) return { id, ok: false, why: '저장 버튼 못 찾음' };
  await save.click();
  await page.waitForURL((u) => /\/\d+$/.test(u.pathname) || u.pathname.includes('/manage/posts'),
    { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { id, ok: true, url: `${BASE}/${pid}` };
}

const main = async () => {
  const posted = JSON.parse(await readFile(postedPath, 'utf8'));
  const skip = new Set((flag('skip') || '').split(',').map((s) => s.trim()).filter(Boolean));
  let ids = has('all') ? Object.keys(posted) : (onlyId ? [onlyId] : []);
  ids = ids.filter((i) => !skip.has(i));
  if (!ids.length) {
    console.error('사용법: node backend/scripts/blog-recover.mjs <id> | --all [--skip=a,b] [--dry]');
    process.exit(1);
  }

  if (has('dry')) {
    // 커버만 새로 만들어 본다 — 발행은 건드리지 않는다.
    for (const id of ids) {
      try {
        execFileSync(process.execPath, [join(repoRoot, 'backend', 'scripts', 'blog-publish.mjs'), id, '--cover'],
          { cwd: repoRoot, stdio: 'pipe' });
        console.log(`· dry ${id}: 커버 재생성 완료`);
      } catch (e) { console.log(`· dry ${id}: 실패 — ${String(e.message).split('\n')[0]}`); }
    }
    return;
  }

  if (!existsSync(profileDir)) {
    console.error('✗ 로그인 프로필이 없습니다:  node backend/scripts/blog-publish.mjs --login');
    process.exit(1);
  }

  // makeCover/uploadCover 를 blog-publish.mjs 에서 직접 가져온다(중복 구현 방지).
  const pub = await import('./blog-publish.mjs');
  const { makeCover, uploadCover, setRepresentative, uploadFigures } = pub;
  if (!makeCover || !uploadCover || !setRepresentative || !uploadFigures) {
    console.error('✗ blog-publish.mjs 가 makeCover/uploadCover/setRepresentative/uploadFigures 를 export 하지 않습니다.');
    process.exit(1);
  }

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.HEADLESS === '1', viewport: { width: 1440, height: 960 },
  });
  if (existsSync(statePath)) {
    const st = JSON.parse(await readFile(statePath, 'utf8'));
    await ctx.addCookies(st.cookies || []);
  }
  const page = ctx.pages()[0] || await ctx.newPage();

  const results = [];
  for (const id of ids) {
    const rec = posted[id];
    if (!rec) { results.push({ id, ok: false, why: 'posted.json 에 없음' }); continue; }
    try {
      const r = await recover(page, ctx, id, rec, makeCover, uploadCover, setRepresentative, uploadFigures);
      results.push(r);
      console.log(r.ok ? `✓ ${id} → ${r.url}` : `✗ ${id}: ${r.why}`);
    } catch (e) {
      const why = String(e.message).split('\n')[0];
      results.push({ id, ok: false, why });
      console.log(`✗ ${id}: ${why}`);
      if (/로그인 세션 만료/.test(why)) break;   // 나머지도 어차피 실패한다
    }
  }
  await ctx.close();

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n완료: ${ok}/${results.length} 교체`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) failed.forEach((r) => console.log(`  실패 ${r.id}: ${r.why}`));
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
