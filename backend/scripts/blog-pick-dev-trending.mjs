#!/usr/bin/env node
/* ============================================================
   개발 트렌드 — 이번 주 발행 여부 확인 + 후보 일괄 수집 (결정적 · LLM 없음)

   dev-trending 카테고리는 주 1회, GitHub 급상승(주간) + HuggingFace 트렌딩 모델·데이터셋을
   한 편에 묶어 낸다. ai-company-watch 처럼 회사 로테이션이 아니라 매주 같은 3개 소스를
   다시 훑는다 — "이번 주 이미 냈는가"만 확인하면 된다(posted.json 의 slug 가
   `dev-trending-<날짜>` 패턴인지로 판단). 이 slug 패턴을 지켜야 이번 주 발행 여부 추적이
   맞물린다(blog-researcher/curator 가 research.json 의 slug 필드를 이 패턴으로 채울 것).

   실행:
     node backend/scripts/blog-pick-dev-trending.mjs           # 이번 주 상태 확인 + 후보 일괄 fetch
     node backend/scripts/blog-pick-dev-trending.mjs --list    # 이번 주 상태만
     node backend/scripts/blog-pick-dev-trending.mjs --force   # 이번 주 이미 냈어도 다시 fetch
   ============================================================ */
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const postedPath = join(repoRoot, 'backend', 'out', 'blog', 'posted.json');
const fetchScript = join(repoRoot, 'backend', 'scripts', 'dev-trending-fetch.mjs');
const outDir = join(repoRoot, 'backend', 'blog', 'research', 'dev-trending');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);

/* 월요일 기준 이번 주 시작일(YYYY-MM-DD). ai-company-watch 의 blog-pick-ai-company.mjs 와
   동일한 방식 — posted.json 의 at 은 로컬시각 문자열이라 문자열 비교로 충분하다. */
function weekStartISO(d = new Date()) {
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function fetchOne(source) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    execFileSync('node', [fetchScript, `--source=${source}`], { stdio: 'pipe' });
  } catch {
    return null; // 네트워크 오류 등 진짜 실패(0건은 exit 0 이라 여기 안 걸림)
  }
  const outPath = join(outDir, `${source}-${today}.json`);
  return existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : null;
}

const main = async () => {
  const posted = existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  const monday = weekStartISO();
  const doneThisWeek = Object.entries(posted).some(
    ([id, p]) => id.startsWith('dev-trending-') && String(p.at || '').slice(0, 10) >= monday
  );

  if (has('list')) {
    console.log(`이번 주(${monday}~) 개발 트렌드: ${doneThisWeek ? '✓ 이미 발행됨' : '대기'}`);
    return;
  }

  if (doneThisWeek && !has('force')) {
    console.log(`✓ 이번 주(${monday}~) 이미 발행됨. 다음 주까지 대기(--force 로 강제 재수집 가능).`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const slug = `dev-trending-${today}`;
  console.log(`이번 주 개발 트렌드 후보 수집 — slug: ${slug}\n`);

  const summary = [];
  for (const source of ['github', 'hf-models', 'hf-datasets']) {
    const result = fetchOne(source);
    if (!result) { console.log(`✗ ${source}: 조회 실패`); summary.push(`${source} 조회실패`); continue; }
    console.log(`${result.items.length ? '✓' : '⚠'} ${source}: 후보 ${result.items.length}건`);
    summary.push(`${source} ${result.items.length}건`);
  }

  console.log(`\n다음: blog-researcher 에이전트가 backend/blog/research/dev-trending/*-${today}.json 3개에서`);
  console.log(`GitHub 3~4개 · HF 모델 2~3개(데이터셋 있으면 0~2개)를 골라 README/모델카드를 WebFetch 로 읽고`);
  console.log(`research.json (slug: ${slug}) 을 만든다. 항목 합계가 3개 미만이면 발행을 보류한다(카테고리 프로파일 게이트).`);
  console.log(`\n요약: ${summary.join(' · ')}`);
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
