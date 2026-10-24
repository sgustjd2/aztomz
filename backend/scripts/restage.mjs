#!/usr/bin/env node
/* ============================================================
   한끗 · 이미 게시된 트렌드의 유행 단계 재판정 (판단은 봇, 쓰기는 이 스크립트)

   게시 뒤 몇 달 지나도 stage가 '상승'·'피크'로 남는 문제(2026-10-24: 트렌드 159건 중 상승 91·피크 36,
   85건은 8월 분석)를 매일 조금씩 고친다. Hermes(hangeut-restage)가 매일 오래된 항목 5건을 골라 최근 검색 신호로
   단계를 판단하고, 이 스크립트가 검증·반영·배포한다.

   사용:
     node backend/scripts/restage.mjs --pick=5 [--json]       재판정할 항목(분석일 오래된 순, 최근 14일 재판정분 제외)
     node backend/scripts/restage.mjs --apply=<judgments.json> [--no-git] [--dry]
       judgments: [{ "id", "stage", "stageMsg", "reason", "evidence": [{ "name", "url", "date"? }] }]
     node backend/scripts/restage.mjs --selftest

   --apply 규칙(신뢰 철칙):
     · stage는 정규 라벨만. 근거(evidence)는 인스타·X·틱톡·페북이 아닌, 지금 열리는(404/410 아님) URL 1개 이상.
     · 바뀌는 필드: stage·stageMsg·analyzedAt(오늘 — 실제로 재판정했으므로), 근거 1개를 src에 추가.
       하락·끝물로 가면 label/labelCls/buzz를 '이제는 늦은 느낌'/mid/'화제성 하락'으로, 밈화면 '밈으로만 즐겨요'/mid.
     · 본문(verdict·excerpt·article)은 고치지 않는다. 새 단계와 어긋나는 표현이 있으면 conflicts로 보고만 한다.
     · 기록: backend/out/pipeline/restage.jsonl (from→to·이유·근거). 마지막 줄 `SUMMARY {json}`.
   ============================================================ */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTrends } from './validate-trends.mjs';
import { acquireGitLock } from './lib/git-lock.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PATHS = {
  trends: join(repoRoot, 'backend', 'data', 'trends.json'),
  log: join(repoRoot, 'backend', 'out', 'pipeline', 'restage.jsonl'),
};
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };

export const STAGES = ['발견', '상승', '상승 → 피크', '피크', '피크 → 하락', '안정화', '안정화 → 끝물', '하락 (한물감)', '밈화'];
const FADING = new Set(['피크 → 하락', '안정화 → 끝물', '하락 (한물감)']);
const SNS = /(^|\.)(instagram\.com|x\.com|twitter\.com|tiktok\.com|facebook\.com|threads\.net)$/i;
// 하락 쪽으로 바뀌었는데 본문에 남아 있으면 화면에서 서로 모순되는 표현
const HOT_WORDS = /피크|지금 뜨|뜨는 중|급상승|상승 중|대유행|요즘 핫|난리/;

function kstISO(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const readJsonl = (p) => (existsSync(p) ? readFileSync(p, 'utf-8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);

// 재판정 후보: 트렌드형만, 분석일 오래된 순. 최근 14일 안에 재판정한 항목은 건너뛴다(같은 항목 반복 방지).
export function pick(trends, log, n, today = kstISO()) {
  const cut = new Date(`${today}T00:00:00+09:00`); cut.setDate(cut.getDate() - 14);
  const recent = new Set(log.filter((r) => r.date >= kstISO(cut)).map((r) => r.id));
  return trends.filter((t) => t.type === '트렌드' && !recent.has(t.id))
    .sort((a, b) => String(a.analyzedAt || '').localeCompare(String(b.analyzedAt || '')))
    .slice(0, n);
}

const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };

// 제목 핵심어(2자 이상) — 근거 페이지가 이 트렌드를 실제로 다루는지 확인용
const titleKeywords = (title) => [...new Set(String(title || '').replace(/[()'’"[\]]/g, ' ').split(/[\s·,/]+/).filter((w) => w.length >= 2))];

// 판정 1건 검증(네트워크는 get 함수로 주입 — selftest에서 대체). get(url) → { status, body }
export async function checkJudgment(j, trendsById, get) {
  const errs = [];
  const t = trendsById.get(j?.id);
  if (!t) errs.push('없는 id');
  else if (t.type !== '트렌드') errs.push('트렌드형이 아님(신뢰분석은 대상 아님)');
  if (!STAGES.includes(j?.stage)) errs.push(`정규 라벨 아님: ${j?.stage}`);
  if (!j?.stageMsg || !String(j.stageMsg).trim() || String(j.stageMsg).length > 40) errs.push('stageMsg 비었거나 40자 초과');
  const ev = (j?.evidence || []).filter((e) => e && /^https?:\/\//.test(e.url || '') && !SNS.test(hostOf(e.url)));
  const kws = titleKeywords(t?.title);
  const live = [];
  for (const e of ev) {
    const { status, body } = await get(e.url);
    if (status === 404 || status === 410 || status === 'ERR') continue;
    if (kws.length && !kws.some((k) => body.includes(k))) continue;   // 열리지만 이 트렌드를 안 다루는 페이지
    live.push(e);
  }
  if (!live.length) errs.push('살아 있고 제목 핵심어가 나오는 근거 URL 없음(인스타·X 등 SNS 제외)');
  return { ok: !errs.length, errs, live };
}

// 판정 1건 반영(순수 함수). 본문은 안 고치고, 어긋나는 표현만 conflict로 돌려준다.
export function applyOne(t, j, live, today) {
  const from = t.stage;
  t.stage = j.stage;
  t.stageMsg = String(j.stageMsg).trim();
  t.analyzedAt = today;
  if (FADING.has(j.stage)) { t.label = '이제는 늦은 느낌'; t.labelCls = 'mid'; t.buzz = '화제성 하락'; }
  else if (j.stage === '밈화') { t.label = '밈으로만 즐겨요'; t.labelCls = 'mid'; }
  const ev = live[0];
  const have = new Set((t.src || []).map((s) => (Array.isArray(s) ? s[1] : s?.url)));
  if (ev && !have.has(ev.url)) (t.src = t.src || []).push([`${ev.name || hostOf(ev.url)}${ev.date ? `(${ev.date})` : ''}`, ev.url]);
  const text = [t.verdict, t.excerpt, t.pull].filter(Boolean).join(' ');
  // 단계가 실제로 하락 쪽으로 바뀐 경우만 본다(이미 끝물이던 항목의 '과거 피크' 서술은 모순이 아님)
  const conflict = from !== t.stage && FADING.has(j.stage) && HOT_WORDS.test(text) ? (text.match(HOT_WORDS) || [])[0] : null;
  return { id: t.id, title: t.title, from, to: t.stage, conflict };
}

async function httpGet(url) {
  try {
    const c = new AbortController(); const tm = setTimeout(() => c.abort(), 15000);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' }, redirect: 'follow', signal: c.signal });
    const body = await r.text().catch(() => '');
    clearTimeout(tm); return { status: r.status, body };
  } catch { return { status: 'ERR', body: '' }; }
}

function sh(cmd, a) { return execFileSync(cmd, a, { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }); }

function gitPublish(n, today) {
  if (sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim() !== 'main') return 'git_deferred(main 아님)';
  if (!acquireGitLock(repoRoot, 'restage.mjs')) return 'git_deferred(다른 작업이 git 사용 중)';
  try {
    sh('git', ['add', 'backend/data/trends.json', 'frontend/data/trends.js']);
    sh('git', ['commit', '-m', `auto: 유행 단계 재판정 ${n}건 ${today}`]);
    try { sh('git', ['pull', '--rebase', '--autostash', 'origin', 'main']); }
    catch { try { sh('git', ['rebase', '--abort']); } catch {} return 'git_deferred(rebase 충돌 — abort함)'; }
    sh('git', ['push', 'origin', 'main']);
    return 'pushed';
  } catch (e) { return `git_deferred(${String(e.stderr || e.message || '').slice(0, 120)})`; }
}

async function apply(file) {
  const today = kstISO();
  const judgments = JSON.parse(readFileSync(file, 'utf-8'));
  const list = Array.isArray(judgments) ? judgments : (judgments.judgments || []);
  const base = JSON.parse(readFileSync(PATHS.trends, 'utf-8'));
  const byId = new Map((base.trends || base).map((t) => [t.id, t]));
  const checked = [];
  for (const j of list) checked.push({ j, ...(await checkJudgment(j, byId, httpGet)) });
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ id: c.j?.id, errs: c.errs }));
  for (const r of rejected) console.log(`✋ 반영 안 함 ${r.id}: ${r.errs.join(', ')}`);

  // 쓰기 직전에 다시 읽는다 — 그 사이 auto-build·recheck-ad가 쓴 내용을 덮지 않게.
  const data = JSON.parse(readFileSync(PATHS.trends, 'utf-8'));
  const trends = data.trends || data;
  const fresh = new Map(trends.map((t) => [t.id, t]));
  const changes = [];
  for (const c of checked.filter((x) => x.ok)) {
    const t = fresh.get(c.j.id); if (!t) continue;
    const ch = applyOne(t, c.j, c.live, today);
    changes.push({ ...ch, reason: c.j.reason || '', evidence: c.live });
    console.log(`${ch.from === ch.to ? '➖ 유지' : '✅'} ${ch.title}: ${ch.from} → ${ch.to}${ch.conflict ? `  ⚠ 본문에 '${ch.conflict}' 남음(사람 확인)` : ''}`);
  }
  let outcome = flag('dry') ? 'dry' : (changes.length ? 'applied' : 'no_change');
  if (changes.length && !flag('dry')) {
    const v = validateTrends(trends);
    if (!v.ok) { console.error('⛔ 스키마 검증 실패 — 반영 중단:\n' + v.errors.map((e) => '  · ' + e).join('\n')); outcome = 'schema_fail'; }
    else {
      writeFileSync(PATHS.trends, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      execFileSync('node', [join(repoRoot, 'backend', 'scripts', 'refresh.mjs')], { cwd: repoRoot, stdio: 'inherit', windowsHide: true });
      outcome = flag('no-git') ? 'files_only' : gitPublish(changes.length, today);
    }
  }
  if (!flag('dry')) {
    mkdirSync(dirname(PATHS.log), { recursive: true });
    for (const ch of changes) appendFileSync(PATHS.log, JSON.stringify({ date: today, ...ch, outcome }) + '\n', 'utf-8');
  }
  const moved = changes.filter((c) => c.from !== c.to).length;
  const summary = { date: today, outcome, judged: list.length, changed: moved, kept: changes.length - moved, rejected,
    changes: changes.map(({ id, title, from, to, conflict }) => ({ id, title, from, to, conflict })) };
  console.log('SUMMARY ' + JSON.stringify(summary));
  if (outcome === 'schema_fail') process.exitCode = 1;   // fetch 뒤 process.exit()는 Windows Node 24에서 exit 127
}

async function selftest() {
  const assert = (c, m) => { if (!c) throw new Error('selftest 실패: ' + m); };
  const T = (id, analyzedAt, extra = {}) => ({ id, type: '트렌드', title: id.toUpperCase(), stage: '상승', stageMsg: 'x', analyzedAt, src: [['a', 'https://a.kr/1']], label: '지금 써도 됨', labelCls: 'good', ...extra });
  const trends = [T('old', '2026-06-01'), T('mid', '2026-08-01'), T('new', '2026-10-20'), { id: 'shop', type: '신뢰분석', analyzedAt: '2026-01-01' }, T('recent', '2026-05-01')];
  const picked = pick(trends, [{ date: '2026-10-20', id: 'recent' }], 2, '2026-10-24');
  assert(picked.map((t) => t.id).join() === 'old,mid', '오래된 순·신뢰분석 제외·14일 내 재판정 제외');
  const byId = new Map(trends.map((t) => [t.id, t]));
  const status = async (u) => (u.includes('dead') ? { status: 404, body: '' } : u.includes('offtopic') ? { status: 200, body: '전혀 다른 기사' } : { status: 200, body: 'OLD 관련 기사 MID' });
  let r = await checkJudgment({ id: 'old', stage: '하락 (한물감)', stageMsg: '이제 늦음', evidence: [{ url: 'https://www.instagram.com/p/1' }, { url: 'https://dead.kr/x' }] }, byId, status);
  assert(!r.ok && r.errs.some((e) => e.includes('근거')), 'SNS·죽은 근거만 있으면 거부');
  r = await checkJudgment({ id: 'old', stage: '끝물', stageMsg: 'x', evidence: [{ url: 'https://news.kr/1' }] }, byId, status);
  assert(!r.ok && r.errs.some((e) => e.includes('정규 라벨')), '비정규 라벨 거부');
  r = await checkJudgment({ id: 'shop', stage: '피크', stageMsg: 'x', evidence: [{ url: 'https://news.kr/1' }] }, byId, status);
  assert(!r.ok, '신뢰분석형 거부');
  r = await checkJudgment({ id: 'old', stage: '하락 (한물감)', stageMsg: '9월이 정점', evidence: [{ name: '뉴스', url: 'https://news.kr/1', date: '2026-10-20' }] }, byId, status);
  assert(r.ok && r.live.length === 1, '정상 판정 통과');
  r = await checkJudgment({ id: 'old', stage: '피크', stageMsg: 'x', evidence: [{ url: 'https://offtopic.kr/1' }] }, byId, status);
  assert(!r.ok, '열리지만 제목 핵심어가 없는 근거는 거부');
  r = await checkJudgment({ id: 'old', stage: '하락 (한물감)', stageMsg: '9월이 정점', evidence: [{ name: '뉴스', url: 'https://news.kr/1', date: '2026-10-20' }] }, byId, status);
  const t = { ...trends[0], verdict: '지금 피크인 디저트' };
  const ch = applyOne(t, { stage: '하락 (한물감)', stageMsg: '9월이 정점' }, r.live, '2026-10-24');
  assert(t.stage === '하락 (한물감)' && t.analyzedAt === '2026-10-24' && t.label === '이제는 늦은 느낌' && t.labelCls === 'mid' && t.buzz === '화제성 하락', '하락이면 라벨·화제성 함께 정리');
  assert(t.src.length === 2 && t.src[1][1] === 'https://news.kr/1' && t.src[1][0] === '뉴스(2026-10-20)', '근거 1개를 src에 추가');
  assert(ch.from === '상승' && ch.conflict === '피크', '본문의 \'피크\' 표현을 충돌로 보고');
  const t2 = { ...trends[1] }; applyOne(t2, { stage: '피크', stageMsg: '지금이 정점' }, [{ url: 'https://a.kr/1' }], '2026-10-24');
  assert(t2.label === '지금 써도 됨' && t2.src.length === 1, '상승·피크 쪽은 라벨 유지, 이미 있는 출처는 중복 추가 안 함');
  const t3 = { ...trends[0], stage: '안정화 → 끝물', verdict: '과거 피크 뒤 스테디셀러' };
  assert(applyOne(t3, { stage: '안정화 → 끝물', stageMsg: 'x' }, r.live, '2026-10-24').conflict === null, '단계가 그대로면 본문 충돌로 보지 않음');
  console.log('✓ restage selftest 통과');
}

if (flag('selftest')) await selftest();
else if (flag('pick')) {
  const data = JSON.parse(readFileSync(PATHS.trends, 'utf-8'));
  const list = pick(data.trends || data, readJsonl(PATHS.log), (typeof flag('pick') === 'string' ? Number(flag('pick')) : 0) || 5);
  const rows = list.map((t) => ({ id: t.id, title: t.title, cat: t.cat, stage: t.stage, stageMsg: t.stageMsg, label: t.label,
    analyzedAt: t.analyzedAt, collectedAt: t.collectedAt, verdict: String(t.verdict || '').slice(0, 140) }));
  if (flag('json')) console.log(JSON.stringify(rows, null, 2));
  else for (const r of rows) console.log(`• [${r.cat}] ${r.title} (id: ${r.id}) — ${r.stage} · 분석 ${r.analyzedAt}`);
} else if (flag('apply')) await apply(String(flag('apply')));
else { console.log('사용: --pick=5 [--json] | --apply=<judgments.json> [--no-git] [--dry] | --selftest'); process.exitCode = 1; }
