#!/usr/bin/env node
/* ============================================================
   한끗 — 티스토리 카테고리 추가 (Playwright)

   왜 필요한가: 카테고리 프로파일(backend/blog/categories/*.json)에 tistoryCategory 를
   새로 정의해도, 실제 티스토리 블로그에 그 이름의 카테고리가 없으면 blog-publish.mjs 가
   "카테고리 선택 실패"로 조용히 "카테고리 없음"에 발행해버린다(2026-08-08 dev-trending
   첫 편에서 실측 — #307이 카테고리 없음으로 나갔다가 사후에 수동으로 고침). 새 주간
   시리즈를 만들 때마다 한 번씩 필요한 부트스트랩 작업이라 스크립트로 남겨둔다.

   ── 로그인은 자동화하지 않는다 ── blog-publish.mjs 와 동일하게 backend/.tistory-profile
   (사람이 1회 로그인해 둔 전용 크롬 프로필)을 그대로 재사용한다. 카카오 로그인 자동화 아님 —
   이미 인증된 세션으로 "카테고리 추가" 버튼만 누른다.

   실측으로 확인한 함정(2026-08-08):
   · "카테고리 추가" 버튼은 일반 click() 이 다른 레이어에 가로채여 타임아웃난다
     → element.click() 을 DOM 에서 직접 evaluate 해야 한다.
   · 새로 생기는 이름 입력창은 플레이스홀더가 없어 흔한 셀렉터로 못 찾는다
     → 실제 클래스는 input.tf_blog(단, 페이지에 다른 tf_blog 가 없을 때만 안전 — 폼 범위로 좁혀 찾는다).
   · "확인" 버튼도 같은 클릭 가로채기 문제가 있어 타임아웃나기 쉽다
     → 입력 후 Enter 로 폼을 제출하는 쪽이 안정적이다(<form class="edit_item"> 이 감싸고 있음).
   · 트리에 이름이 실제로 추가됐는지 확인하지 않고 "변경사항 저장"을 누르면, 실패를 성공으로
     착각한다 — 반드시 저장 전에 트리에서 이름을 세어 확인한다.

   실행 (레포 루트에서):
     node backend/scripts/tistory-add-category.mjs --name="개발 트렌드"   # 카테고리 추가
     node backend/scripts/tistory-add-category.mjs --name="..." --dry     # 입력까지만, 저장 안 함

   환경변수: TISTORY_BLOG(기본 burning-go9me) · HEADLESS=1(로그인 이후에만 권장)
   중첩(하위) 카테고리는 지원하지 않는다 — 최상위 카테고리 추가만. 카테고리 목록 조회는
   `node backend/scripts/blog-publish.mjs --categories` 를 쓴다(중복 구현 안 함).
   ============================================================ */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const profileDir = join(repoRoot, 'backend', '.tistory-profile');

const BLOG = process.env.TISTORY_BLOG || 'burning-go9me';
const BASE = `https://${BLOG}.tistory.com`;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const name = flag('name');
if (!name) {
  console.error('사용법: node backend/scripts/tistory-add-category.mjs --name="카테고리명" [--dry]');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('✗ playwright 가 없습니다. 한 번만:\n    cd backend && npm i && npx playwright install chromium');
  process.exit(1);
}

const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: process.env.HEADLESS === '1', viewport: { width: 1400, height: 1000 },
});
const page = ctx.pages()[0] || await ctx.newPage();

try {
  await page.goto(`${BASE}/manage/category`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const already = await page.locator('text=' + name).count();
  if (already) {
    console.log(`✓ "${name}" 카테고리가 이미 있습니다 — 추가하지 않습니다.`);
    await ctx.close();
    process.exit(0);
  }

  const addBtn = page.locator('input.btn_g[value="카테고리 추가"]').first();
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.evaluate((el) => el.click());
  await page.waitForTimeout(1000);

  const nameInput = page.locator('input.tf_blog').last();
  await nameInput.click();
  await nameInput.fill(name);
  await page.waitForTimeout(300);
  if ((await nameInput.inputValue()) !== name) {
    console.error('✗ 입력값이 기대와 다릅니다 — 셀렉터가 잘못된 필드를 찾았을 수 있습니다. 중단합니다.');
    await ctx.close();
    process.exit(1);
  }

  if (has('dry')) {
    console.log(`· dry: "${name}" 입력까지 확인. 저장은 하지 않았습니다(브라우저에서 직접 취소하세요).`);
    await ctx.close();
    process.exit(0);
  }

  await nameInput.press('Enter');
  await page.waitForTimeout(1200);

  const added = await page.locator('text=' + name).count();
  if (!added) {
    console.error(`✗ "${name}" 이 카테고리 트리에 나타나지 않았습니다 — 저장하지 않고 중단합니다.`);
    await ctx.close();
    process.exit(1);
  }

  const saveBtn = page.locator('button:has-text("변경사항 저장"), input[value*="변경사항 저장"]').first();
  await saveBtn.evaluate((el) => el.click());
  await page.waitForTimeout(2000);

  // 새로고침으로 실제 저장됐는지 재확인 — DOM 상태만 믿지 않는다.
  await page.goto(`${BASE}/manage/category`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const persisted = await page.locator('text=' + name).count();

  if (persisted) {
    console.log(`✓ "${name}" 카테고리 추가 완료(새로고침으로 확인함).`);
    console.log(`  다음: 카테고리 프로파일의 tistoryCategory 를 "${name}" 과 정확히 맞추고, 이미 발행된 글이 있다면`);
    console.log('  티스토리 글 편집 화면에서 카테고리를 다시 선택해 저장해야 소급 반영됩니다(자동 이관 없음).');
  } else {
    console.error(`✗ 저장 버튼은 눌렀지만 새로고침 후 "${name}" 이 안 보입니다 — 수동으로 확인하세요.`);
    process.exitCode = 1;
  }
} finally {
  await ctx.close();
}
