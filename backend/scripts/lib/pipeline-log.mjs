/* ============================================================
   한끗 · 수집 파이프라인 기록 (결정적 수치의 단일 원본)

   - runs.jsonl     : auto-build 실행 1회 = 1줄. 후보·게시·보류·중복 수와 보류 사유 코드.
                      후보 0건인 날도 남긴다 — LLM 보고문이 아니라 이 파일이 수치의 기준이다.
   - reviews.jsonl  : 사람이 디스코드 버튼으로 내린 결정(게시/버리기) 1건 = 1줄.
   - review-queue   : 보류된 후보 원본(.pipeline/review-queue.json). 사람이 결정할 때까지 대기.
   전부 gitignore 영역(backend/out/, .pipeline/)이라 자동 커밋에 섞이지 않는다.
   ============================================================ */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function pipelinePaths(root = repoRoot) {
  return {
    runs: join(root, 'backend', 'out', 'pipeline', 'runs.jsonl'),
    reviews: join(root, 'backend', 'out', 'pipeline', 'reviews.jsonl'),
    queue: join(root, '.pipeline', 'review-queue.json'),
    approved: join(root, '.pipeline', 'approved.json'),
  };
}

function appendJsonl(path, rec) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(rec) + '\n', 'utf-8');
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8').split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }   // 깨진 줄 하나가 통계 전체를 막지 않게
  });
}

export const appendRun = (rec, p = pipelinePaths()) => appendJsonl(p.runs, rec);
export const readRuns = (p = pipelinePaths()) => readJsonl(p.runs);
export const appendDecision = (rec, p = pipelinePaths()) => appendJsonl(p.reviews, rec);
export const readDecisions = (p = pipelinePaths()) => readJsonl(p.reviews);

export function loadQueue(p = pipelinePaths()) {
  try { return JSON.parse(readFileSync(p.queue, 'utf-8')).items || []; } catch { return []; }
}

export function saveQueue(items, p = pipelinePaths()) {
  mkdirSync(dirname(p.queue), { recursive: true });
  writeFileSync(p.queue, JSON.stringify({ items }, null, 2) + '\n', 'utf-8');
}

// 같은 id가 다시 보류되면 최신 후보·사유로 교체(중복 카드 방지)
export function enqueueHeld(entries, p = pipelinePaths()) {
  const q = loadQueue(p);
  for (const e of entries) {
    const i = q.findIndex((x) => x.id === e.id);
    if (i >= 0) q[i] = e; else q.push(e);
  }
  saveQueue(q, p);
  return q.length;
}

export function removeFromQueue(id, p = pipelinePaths()) {
  const q = loadQueue(p);
  const next = q.filter((x) => x.id !== id);
  saveQueue(next, p);
  return q.length !== next.length;
}
