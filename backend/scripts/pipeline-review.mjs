#!/usr/bin/env node
/* ============================================================
   한끗 · 보류 후보 사람 검수 + 수집 수치 통계

   auto-build.mjs가 보류한 후보는 .pipeline/review-queue.json 에 쌓인다. 사람이 디스코드에서
   "검수"라고 하면 Hermes(hangeut-approve 스킬)가 후보마다 버튼 카드를 띄우고, 누른 버튼에 따라
   이 스크립트를 부른다. 결정은 backend/out/pipeline/reviews.jsonl 에 남는다.

   사용:
     node backend/scripts/pipeline-review.mjs --list [--json]     보류 대기열(사유·출처 점검 결과)
     node backend/scripts/pipeline-review.mjs --approve=<id> [--note=코멘트]  사람 승인 → auto-build --approved 로 게시
     node backend/scripts/pipeline-review.mjs --reject=<id> [--note=코멘트]   버리기(게시 안 함)
     node backend/scripts/pipeline-review.mjs --stats [--days=14] [--json]  날짜별 후보·게시·보류·중복 표
     node backend/scripts/pipeline-review.mjs --selftest
   승인도 '살아 있는 출처 1개+'는 지킨다 — 사람이 대신하는 건 관련성·근거 대조 판단뿐이다.
   코멘트(--note)는 결정 기록에 남고, learnings.md 에도 한 줄로 쌓여 다음 21:30 수집이 0단계에서 읽는다.
   ============================================================ */
import { writeFileSync, appendFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pipelinePaths, loadQueue, removeFromQueue, appendDecision, readRuns, readDecisions, appendRun, enqueueHeld,
} from './lib/pipeline-log.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };   // 코멘트 안의 '=' 보존
const JSON_OUT = !!flag('json');

// 사람 코멘트를 수집 봇의 교훈 파일에 쌓는다(0단계에서 읽음). 빈 코멘트·'코멘트 없음'은 남기지 않는다.
const NO_NOTE = /^(|코멘트 없음|없음|\(코멘트 없음\))$/;
function learn(decision, title, note, p) {
  const n = String(note || '').trim();
  if (NO_NOTE.test(n)) return false;
  appendFileSync(p.learnings || join(repoRoot, 'learnings.md'), `- [${kstISO()}] (검수/${decision === 'approve' ? '승인' : '버림'}) 「${title}」 — ${n}\n`, 'utf-8');
  return true;
}

const CODE_LABEL = { grounding: '근거 대조 실패', no_valid_source: '검증 통과 출처 없음', no_id: 'id 없음' };

function kstISO(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// 날짜별 집계. 같은 날 여러 번 돌면(보충·재시도·사람 승인) 합산하되 실행 횟수도 같이 보인다.
export function aggregate(runs, decisions, days, today = kstISO()) {
  const from = new Date(`${today}T00:00:00+09:00`); from.setDate(from.getDate() - (days - 1));
  const fromISO = kstISO(from);
  const byDate = new Map();
  const row = (d) => byDate.get(d) || byDate.set(d, { date: d, runs: 0, candidates: 0, published: 0, held: 0, duplicate: 0,
    approved: 0, rejected: 0, failures: 0, reasons: {} }).get(d);
  for (const r of runs) {
    if (r.date < fromISO || r.date > today) continue;
    const x = row(r.date);
    x.runs += 1;
    if (r.mode !== 'approved') { x.candidates += r.candidates || 0; x.held += r.held || 0; x.duplicate += r.duplicate || 0; }
    x.published += r.published || 0;
    if (['schema_fail', 'curate_parse_error'].includes(r.outcome)) x.failures += 1;
    for (const h of r.heldItems || []) if (r.mode !== 'approved') x.reasons[h.code || 'unknown'] = (x.reasons[h.code || 'unknown'] || 0) + 1;
  }
  const recent = [];
  for (const d of decisions) {
    const day = kstISO(new Date(d.at));
    if (day < fromISO || day > today) continue;
    recent.push({ date: day, decision: d.decision, ok: d.ok, title: d.title, note: d.note || null });
    const x = row(day);
    if (d.decision === 'approve' && d.ok) x.approved += 1;
    if (d.decision === 'reject') x.rejected += 1;
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((t, r) => {
    for (const k of ['runs', 'candidates', 'published', 'held', 'duplicate', 'approved', 'rejected', 'failures']) t[k] += r[k];
    return t;
  }, { runs: 0, candidates: 0, published: 0, held: 0, duplicate: 0, approved: 0, rejected: 0, failures: 0 });
  // 기록이 없는 날 = 수집 자체가 안 돈 날(PC 꺼짐·모델 한도 등). 0건 게시와 구분해 센다.
  // 기록을 시작하기 전 날짜는 '안 돈 날'이 아니라 '모르는 날'이라 빼고 센다.
  const firstRun = runs.reduce((m, r) => (r.date && (!m || r.date < m) ? r.date : m), null);
  const missing = [];
  for (let d = new Date(from); kstISO(d) <= today; d.setDate(d.getDate() + 1)) {
    const day = kstISO(d);
    if (firstRun && day >= firstRun && !byDate.has(day)) missing.push(day);
  }
  return { from: fromISO, to: today, rows, total, missing, recordedSince: firstRun, decisions: recent.slice(-10) };
}

function printStats(s) {
  console.log(`한끗 수집 수치 ${s.from} ~ ${s.to} (출처: backend/out/pipeline/runs.jsonl)\n`);
  console.log('날짜        실행 후보 게시 보류 중복 승인 버림  보류 사유');
  for (const r of s.rows) {
    const reasons = Object.entries(r.reasons).map(([k, v]) => `${CODE_LABEL[k] || k} ${v}`).join(', ');
    console.log(`${r.date}  ${[r.runs, r.candidates, r.published, r.held, r.duplicate, r.approved, r.rejected].map((n) => String(n).padStart(4)).join(' ')}  ${reasons}`);
  }
  const t = s.total;
  console.log(`\n합계: 실행 ${t.runs} · 후보 ${t.candidates} · 게시 ${t.published} · 보류 ${t.held} · 중복 ${t.duplicate} · 사람 승인 ${t.approved} · 버림 ${t.rejected}`);
  console.log(`기록 없는 날(수집이 안 돈 날): ${s.missing.length ? s.missing.join(', ') : '없음'}` +
    (s.recordedSince ? ` · 기록 시작 ${s.recordedSince}` : ' · 아직 기록 없음'));
  if (s.decisions.length) {
    console.log('\n최근 사람 검수(최대 10건)');
    for (const d of s.decisions) {
      const what = d.decision === 'approve' ? (d.ok ? '승인·게시' : '승인·게시 실패') : '버림';
      console.log(`  ${d.date}  ${what}  「${d.title}」${d.note ? ` — ${d.note}` : ''}`);
    }
  }
}

function listQueue(p) {
  const q = loadQueue(p);
  if (JSON_OUT) {
    console.log(JSON.stringify(q.map(({ id, title, code, reason, heldAt, checks, cand }) =>
      ({ id, title, cat: cand?.cat, code, reason, heldAt, checks })), null, 2));
    return;
  }
  if (!q.length) { console.log('검수 대기 0건.'); return; }
  console.log(`검수 대기 ${q.length}건\n`);
  for (const h of q) {
    console.log(`• [${h.cand?.cat || '?'}] ${h.title}  (id: ${h.id}, 보류 ${h.heldAt})`);
    console.log(`  사유: ${h.reason}`);
    for (const c of h.checks || []) console.log(`  └ ${c.verdict}${c.note ? `(${c.note})` : ''} ${c.status} ${c.name}: ${c.url}`);
  }
}

function approve(id, note, p) {
  const item = loadQueue(p).find((x) => x.id === id);
  if (!item) { console.error(`✗ 대기열에 없는 id: ${id}`); process.exit(1); }
  writeFileSync(p.approved, JSON.stringify({ trends: [item.cand] }, null, 2) + '\n', 'utf-8');
  let out = '', ok = false;
  try {
    out = execFileSync('node', [join(repoRoot, 'backend', 'scripts', 'auto-build.mjs'), p.approved, '--approved'],
      { cwd: repoRoot, encoding: 'utf-8', windowsHide: true });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  process.stdout.write(out);
  const line = out.split('\n').reverse().find((l) => l.startsWith('SUMMARY '));
  const summary = line ? JSON.parse(line.slice(8)) : null;
  ok = !!summary && summary.published > 0;
  // 살아 있는 출처가 0개라 승인으로도 못 올린 후보는 대기열에 남겨 둔다(사람이 버리기로 정리).
  if (ok) removeFromQueue(id, p);
  appendDecision({ at: new Date().toISOString(), id, title: item.title, decision: 'approve', ok, outcome: summary?.outcome || 'unknown', note: note || null }, p);
  if (ok) learn('approve', item.title, note, p);
  console.log(ok ? `\n✓ 승인 게시: ${item.title}` : `\n✗ 승인했지만 게시 못 함: ${item.title} (${summary?.heldItems?.[0]?.reason || summary?.outcome || '결과 없음'})`);
  process.exit(ok ? 0 : 1);
}

function reject(id, note, p) {
  const item = loadQueue(p).find((x) => x.id === id);
  if (!item) { console.error(`✗ 대기열에 없는 id: ${id}`); process.exit(1); }
  removeFromQueue(id, p);
  appendDecision({ at: new Date().toISOString(), id, title: item.title, decision: 'reject', note: note || null }, p);
  learn('reject', item.title, note, p);
  console.log(`✓ 버림: ${item.title}${note ? ` — ${note}` : ''}`);
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'hangeut-review-'));
  const p = { runs: join(dir, 'runs.jsonl'), reviews: join(dir, 'reviews.jsonl'), queue: join(dir, 'q.json'), approved: join(dir, 'a.json'), learnings: join(dir, 'learnings.md') };
  const assert = (c, m) => { if (!c) { rmSync(dir, { recursive: true, force: true }); throw new Error('selftest 실패: ' + m); } };
  try {
    appendRun({ date: '2026-10-20', mode: 'auto', outcome: 'no_candidates', candidates: 0, published: 0, held: 0, duplicate: 0, heldItems: [] }, p);
    appendRun({ date: '2026-10-21', mode: 'auto', outcome: 'pushed', candidates: 3, published: 1, held: 2, duplicate: 0,
      heldItems: [{ code: 'grounding' }, { code: 'no_valid_source' }] }, p);
    appendRun({ date: '2026-10-21', mode: 'approved', outcome: 'pushed', candidates: 1, published: 1, held: 0, duplicate: 0, heldItems: [] }, p);
    appendDecision({ at: '2026-10-21T13:00:00Z', id: 'a', decision: 'approve', ok: true }, p);
    appendDecision({ at: '2026-10-21T13:01:00Z', id: 'b', title: 'B', decision: 'reject', note: '뜻이 틀림: a=b 아님' }, p);
    const s = aggregate(readRuns(p), readDecisions(p), 3, '2026-10-22');
    assert(s.from === '2026-10-20' && s.to === '2026-10-22', '기간');
    const d21 = s.rows.find((r) => r.date === '2026-10-21');
    assert(d21.runs === 2 && d21.candidates === 3 && d21.published === 2 && d21.held === 2, '승인 실행은 후보·보류를 이중으로 세지 않음');
    assert(d21.reasons.grounding === 1 && d21.reasons.no_valid_source === 1, '사유 코드 집계');
    assert(d21.approved === 1 && d21.rejected === 1, '결정 집계');
    assert(s.missing.length === 1 && s.missing[0] === '2026-10-22', '기록 없는 날 = 수집이 안 돈 날');
    assert(s.rows.find((r) => r.date === '2026-10-20').runs === 1, '후보 0건인 날도 실행으로 셈');
    enqueueHeld([{ id: 'x', title: 'X', code: 'grounding' }, { id: 'y', title: 'Y' }], p);
    enqueueHeld([{ id: 'x', title: 'X2', code: 'no_valid_source' }], p);
    const q = loadQueue(p);
    assert(q.length === 2 && q.find((i) => i.id === 'x').title === 'X2', '같은 id 재보류는 교체');
    assert(removeFromQueue('y', p) && loadQueue(p).length === 1, '대기열 제거');
    assert(s.decisions.length === 2 && s.decisions[1].note === '뜻이 틀림: a=b 아님', '최근 결정에 코멘트 포함(= 보존)');
    assert(learn('reject', 'B', '이미 지난 유행', p) === true && learn('approve', 'A', '코멘트 없음', p) === false, '코멘트만 교훈으로');
    const lf = readFileSync(p.learnings, 'utf-8');
    assert(/\(검수\/버림\) 「B」 — 이미 지난 유행/.test(lf) && !lf.includes('「A」'), 'learnings 한 줄 형식');
    console.log('✓ pipeline-review selftest 통과');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const p = pipelinePaths();
if (flag('selftest')) selftest();
else if (flag('list')) listQueue(p);
else if (flag('approve')) approve(String(flag('approve')), flag('note'), p);
else if (flag('reject')) reject(String(flag('reject')), flag('note'), p);
else if (flag('stats')) {
  const s = aggregate(readRuns(p), readDecisions(p), Number(flag('days')) || 14);
  if (JSON_OUT) console.log(JSON.stringify(s, null, 2)); else printStats(s);
} else {
  console.log('사용: --list | --approve=<id> [--note=] | --reject=<id> [--note=] | --stats [--days=14] | --selftest');
  process.exit(1);
}
