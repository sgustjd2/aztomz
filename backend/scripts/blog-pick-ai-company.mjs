#!/usr/bin/env node
/* ============================================================
   AI 동향 — 이번 주 회사 선정 (결정적 · LLM 없음)

   ai-company-watch 카테고리는 주 1회, 회사(anthropic/google/openai/xai) 로테이션으로
   나간다. 요일이 아니라 "이번 주(월요일 기준) 아직 안 쓴 회사 중 순번이 가장 빠른 회사"를
   고른다 — posted.json 에서 slug 가 `ai-watch-<company>-<날짜>` 인 항목을 이번 주 범위로
   걸러서 판단한다. 그래서 이 시리즈로 발행하는 글은 반드시 이 slug 패턴을 써야 로테이션이
   맞물린다(blog-researcher/curator 가 research.json 의 slug 필드를 이 패턴으로 채울 것).

   xAI 는 도메인 전체가 403 이라(ai-watch-fetch.mjs 확인, 2026-08-08) 후보가 0건이면 그
   회사는 이번 주 건너뛰고 다음 회사로 자동 대체한다 — 빈 소재로 억지로 쓰지 않는다
   (ai-company-watch.json 의 _publishNote 게이트 (3) 그대로 구현).

   실행:
     node backend/scripts/blog-pick-ai-company.mjs            # 이번 주 회사 골라 후보까지 fetch
     node backend/scripts/blog-pick-ai-company.mjs --company=openai  # 회사 지정(로테이션 무시)
     node backend/scripts/blog-pick-ai-company.mjs --list     # 이번 주 상태만 보여주고 fetch 안 함
     node backend/scripts/blog-pick-ai-company.mjs --dry      # 고르되 fetch 안 함
   ============================================================ */
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const postedPath = join(repoRoot, 'backend', 'out', 'blog', 'posted.json');
const categoryPath = join(repoRoot, 'backend', 'blog', 'categories', 'ai-company-watch.json');
const fetchScript = join(repoRoot, 'backend', 'scripts', 'ai-watch-fetch.mjs');
const watchDir = join(repoRoot, 'backend', 'blog', 'research', 'ai-watch');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

/* 월요일 기준 이번 주 시작일(YYYY-MM-DD). posted.json 의 at 은 로컬시각 문자열이라
   문자열 비교로 충분하다 — 타임존 변환까지 갈 필요 없다. */
function weekStartISO(d = new Date()) {
  const day = d.getDay(); // 0=일 ... 1=월 ... 6=토
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function companiesPostedThisWeek(posted, monday) {
  const set = new Set();
  for (const [id, p] of Object.entries(posted)) {
    const m = id.match(/^ai-watch-([a-z]+)-\d{4}-\d{2}-\d{2}$/);
    if (m && String(p.at || '').slice(0, 10) >= monday) set.add(m[1]);
  }
  return set;
}

function fetchCandidates(company) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    execFileSync('node', [fetchScript, `--company=${company}`], { stdio: 'pipe' });
  } catch {
    return null; // 네트워크 오류 등 진짜 실패 — 후보 없음으로 처리하고 다음 회사로
  }
  const outPath = join(watchDir, `${company}-${today}.json`);
  return existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : null;
}

const main = async () => {
  const category = JSON.parse(await readFile(categoryPath, 'utf8'));
  const order = category.sourcing.rotation.order;

  const posted = existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  const monday = weekStartISO();
  const done = companiesPostedThisWeek(posted, monday);

  if (has('list')) {
    console.log(`이번 주(${monday}~) 로테이션 상태:`);
    order.forEach((c) => console.log(`  ${c.padEnd(10)} ${done.has(c) ? '✓ 이번 주 발행됨' : '대기'}`));
    return;
  }

  const queue = flag('company') ? [flag('company')] : order.filter((c) => !done.has(c));

  if (!queue.length) {
    console.log(`✓ 이번 주(${monday}~) 4사 모두 발행 완료. 다음 주까지 대기.`);
    return;
  }

  if (has('dry')) {
    console.log(`· dry: 이번 주 다음 차례 → ${queue[0]} (남은 대기열: ${queue.join(' → ')})`);
    return;
  }

  const skipped = [];
  for (const company of queue) {
    const result = fetchCandidates(company);
    if (!result || !result.fetchedOk || !result.items.length) {
      skipped.push(`${company}(${result ? result.note || '후보 0건' : '조회 실패'})`);
      continue;
    }

    console.log(`✓ 이번 주 회사: ${result.name} (${company})`);
    if (skipped.length) console.log(`  건너뜀: ${skipped.join(' · ')}`);
    console.log(`  후보 ${result.items.length}건 (전체 목록: backend/blog/research/ai-watch/${company}-${new Date().toISOString().slice(0, 10)}.json)`);
    result.items.slice(0, 5).forEach((it) => console.log(`    ${it.publishedAt || '(날짜 미상)'} | ${it.title}`));
    console.log(`\n  다음: blog-researcher 에이전트가 이 중 신모델·신기능 발표로 보이는 1~2건을 WebFetch 로 본문까지 읽어`);
    console.log(`  research.json (slug: ai-watch-${company}-${new Date().toISOString().slice(0, 10)}) 을 만든다.`);
    console.log(`  이 slug 패턴을 지켜야 로테이션 추적이 맞물린다.`);
    return;
  }

  console.log(`✗ 이번 주 후보를 가진 회사가 없습니다 — 전부 건너뜀: ${skipped.join(' · ')}`);
  console.log('  이번 주는 AI 동향 발행을 보류합니다(빈 소재로 억지로 쓰지 않음).');
  process.exitCode = 1;
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
