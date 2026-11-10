#!/usr/bin/env node
/* ============================================================
   한끗 — 트렌드 DB(Supabase) 입출력. 의존성 0, Node 내장 fetch 로 PostgREST 호출.
   backend/data/trends.json ⇄ public.trends (스키마: backend/supabase/trends.sql)

   node backend/scripts/trends-db.mjs --import [--file=경로]        trends.json → DB upsert (DB 에만 있는 행은 지우지 않음)
   node backend/scripts/trends-db.mjs --export [--out=파일]         DB → trends.json 형식(기본: 표준출력)
   node backend/scripts/trends-db.mjs --verify [--file=경로]        DB 를 내보낸 결과와 파일을 비교(다르면 exit 1)
   node backend/scripts/trends-db.mjs --mirror [--file=경로] [--force]  파일이 바뀌었을 때만 import(launchd 용 · P1). 파일 내용 해시를
                                                                      backend/out/pipeline/trends-mirror.json 에 기록, 항목 수가 DB 보다 10%+ 줄면 거부
   node backend/scripts/trends-db.mjs --selftest                    네트워크 없이 변환 로직 시험

   자격증명: 환경변수 또는 레포 루트 .env 의 SUPABASE_URL · SUPABASE_SECRET_KEY (secret 키는 출력하지 않는다).
   worktree 에 .env 가 없으면 메인 체크아웃의 .env 를 읽는다.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
export const DEFAULT_FILE = join(ROOT, 'backend', 'data', 'trends.json');

// JSON 필드 → DB 컬럼. kind: s=문자열 n=숫자 b=불리언 j=json(배열·객체, 키 순서 보존을 위해 jsonb 아님)
// 배열 순서 = 새 행을 내보낼 때의 표준 키 순서(원본 순서는 key_order 컬럼이 기억한다).
export const FIELDS = [
  ['id', 'id', 's'], ['type', 'type', 's'], ['cat', 'cat', 's'], ['coverCat', 'cover_cat', 's'],
  ['analyzedAt', 'analyzed_at', 's'], ['title', 'title', 's'], ['shops', 'shops', 'j'], ['buzz', 'buzz', 's'],
  ['ad', 'ad', 'n'], ['trust', 'trust', 'n'], ['sat', 'sat', 's'], ['satTxt', 'sat_txt', 's'],
  ['label', 'label', 's'], ['labelCls', 'label_cls', 's'], ['excerpt', 'excerpt', 's'], ['pull', 'pull', 's'],
  ['verdict', 'verdict', 's'], ['recs', 'recs', 'j'], ['src', 'src', 'j'], ['video', 'video', 'j'],
  ['images', 'images', 'j'], ['article', 'article', 'j'], ['reasons', 'reasons', 'j'], ['tags', 'tags', 'j'],
  ['collectedAt', 'collected_at', 's'], ['stage', 'stage', 's'], ['stageMsg', 'stage_msg', 's'],
  ['pureKorean', 'pure_korean', 's'], ['def', 'def', 's'], ['example', 'example', 's'], ['prompt', 'prompt', 's'],
  ['azNotice', 'az_notice', 's'], ['fresh', 'fresh', 'b'],
];
const BY_KEY = new Map(FIELDS.map((f) => [f[0], f]));
const TYPEOF = { s: (v) => typeof v === 'string', n: (v) => typeof v === 'number', b: (v) => typeof v === 'boolean', j: (v) => v !== null && typeof v === 'object' };

/** trends.json 의 항목 하나 → DB 행. 컬럼에 맞지 않는 필드(모르는 키·타입 불일치)는 extra 로. */
export function toRow(t, idx) {
  const row = { sort_idx: idx, key_order: Object.keys(t) };
  for (const [, col] of FIELDS) row[col] = null;
  const extra = {};
  for (const [k, v] of Object.entries(t)) {
    const f = BY_KEY.get(k);
    if (!f || v === null) { if (!f) extra[k] = v; continue; }  // null 은 key_order 로 기억 → 컬럼은 NULL
    if (TYPEOF[f[2]](v)) row[f[1]] = v; else extra[k] = v;
  }
  row.extra = Object.keys(extra).length ? extra : null;
  return row;
}

/** DB 행 → trends.json 항목. key_order 가 있으면 원본 키 순서·null 을 되살리고, 없으면(새 행) 표준 순서로 null 은 생략. */
export function fromRow(row) {
  const extra = row.extra || {};
  const val = (k) => (k in extra ? extra[k] : BY_KEY.has(k) ? row[BY_KEY.get(k)[1]] : undefined);
  const out = {};
  for (const k of row.key_order || []) { const v = val(k); out[k] = v === undefined ? null : v; }
  for (const [k] of FIELDS) { if (!(k in out)) { const v = val(k); if (v != null) out[k] = v; } }
  for (const k of Object.keys(extra)) if (!(k in out)) out[k] = extra[k];
  return out;
}

export function serialize(generatedAt, trends) {
  return JSON.stringify({ generatedAt, trends }, null, 2) + '\n';
}

// ---------- 환경·HTTP ----------
function loadEnv() {
  const dirs = [ROOT];
  try {  // worktree 면 메인 체크아웃도
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
    dirs.push(dirname(resolve(ROOT, common)));
  } catch {}
  const env = {};
  for (const d of dirs) {
    const p = join(d, '.env');
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...env, ...Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
}

export function client() {
  const env = loadEnv();
  const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('.env 에 SUPABASE_URL · SUPABASE_SECRET_KEY 가 필요합니다');
  return async (method, path, { body, headers } = {}) => {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} → HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res.status === 204 ? null : res.text().then((s) => (s ? JSON.parse(s) : null));
  };
}

function readTrendsFile(file) {
  const d = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(d.trends)) throw new Error(`${file}: trends 배열이 없음`);
  return d;
}

export async function fetchAll(api) {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const page = await api('GET', `trends?select=*&order=sort_idx.asc.nullslast,id.asc&limit=1000&offset=${off}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const meta = await api('GET', 'trends_meta?select=value&key=eq.generatedAt');
  return { rows, generatedAt: meta[0]?.value ?? new Date().toISOString().slice(0, 10) };
}

// ---------- 명령 ----------
async function cmdImport(file) {
  const { generatedAt, trends } = readTrendsFile(file);
  const api = client();
  const ids = new Set();
  for (const t of trends) { if (!t.id || ids.has(t.id)) throw new Error(`id 누락/중복: ${t.id}`); ids.add(t.id); }
  const rows = trends.map(toRow);
  for (let i = 0; i < rows.length; i += 100)
    await api('POST', 'trends?on_conflict=id', { body: rows.slice(i, i + 100).map((r, j) => ({ id: trends[i + j].id, ...r })), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  await api('POST', 'trends_meta?on_conflict=key', { body: [{ key: 'generatedAt', value: generatedAt }], headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  const { rows: dbRows } = await fetchAll(api);
  const extra = dbRows.filter((r) => !ids.has(r.id)).map((r) => r.id);
  console.log(`import: ${trends.length}건 upsert (DB 총 ${dbRows.length}건)` + (extra.length ? ` · DB에만 있는 ${extra.length}건: ${extra.slice(0, 5).join(', ')}` : ''));
}

// P1: 봇이 trends.json 을 쓰면 DB 로 한 방향 미러. 바뀐 게 없으면 네트워크 호출 없이 끝난다.
export const MIRROR_STATE = join(ROOT, 'backend', 'out', 'pipeline', 'trends-mirror.json');
async function cmdMirror(file, force) {
  const raw = readFileSync(file, 'utf8');
  const hash = createHash('sha1').update(raw).digest('hex');
  let prev = {};
  try { prev = JSON.parse(readFileSync(MIRROR_STATE, 'utf8')); } catch {}
  if (!force && prev.hash === hash) return;  // 변경 없음
  let d;
  try { d = JSON.parse(raw); } catch { console.log(`mirror: ${file} 파싱 실패(쓰는 중일 수 있음) — 건너뜀`); return; }
  if (!Array.isArray(d.trends) || !d.trends.length) { console.log('mirror: trends 배열이 비었음 — 건너뜀'); return; }
  if (!force && prev.count && d.trends.length < prev.count * 0.9) {
    console.log(`mirror: 항목이 ${prev.count} → ${d.trends.length}건으로 크게 줄어 거부(의도한 것이면 --force)`);
    process.exitCode = 1; return;
  }
  await cmdImport(file);
  mkdirSync(dirname(MIRROR_STATE), { recursive: true });
  writeFileSync(MIRROR_STATE, JSON.stringify({ hash, count: d.trends.length, at: new Date().toISOString() }));
}

async function exportText() {
  const { rows, generatedAt } = await fetchAll(client());
  return { text: serialize(generatedAt, rows.map(fromRow)), count: rows.length };
}

async function cmdExport(out) {
  const { text, count } = await exportText();
  if (out) { writeFileSync(out, text); console.error(`export: ${count}건 → ${out}`); } else process.stdout.write(text);
}

async function cmdVerify(file) {
  const { text, count } = await exportText();
  const orig = readFileSync(file, 'utf8');
  if (text === orig) { console.log(`verify: OK — DB ${count}건이 ${file} 와 바이트 단위로 동일`); return; }
  const a = JSON.parse(orig), b = JSON.parse(text);
  const A = new Map(a.trends.map((t) => [t.id, t])), B = new Map(b.trends.map((t) => [t.id, t]));
  console.log(`verify: 불일치 — 파일 ${A.size}건 / DB ${B.size}건 · generatedAt ${a.generatedAt} / ${b.generatedAt}`);
  const only = (x, y) => [...x.keys()].filter((k) => !y.has(k));
  if (only(A, B).length) console.log('  파일에만:', only(A, B).slice(0, 10).join(', '));
  if (only(B, A).length) console.log('  DB에만:', only(B, A).slice(0, 10).join(', '));
  let n = 0;
  for (const [id, t] of A) {
    const u = B.get(id);
    if (!u) continue;
    if (JSON.stringify(t) !== JSON.stringify(u)) {
      if (n++ < 10) console.log(`  다름: ${id} — ${isDeepStrictEqual(t, u) ? '키 순서만' : Object.keys({ ...t, ...u }).filter((k) => !isDeepStrictEqual(t[k], u[k])).join(',')}`);
    }
  }
  console.log(`  내용이 다른 항목 ${n}건 · 순서${a.trends.map((t) => t.id).join() === b.trends.map((t) => t.id).join() ? ' 동일' : ' 다름'}`);
  process.exitCode = 1;
}

// ---------- selftest ----------
function selftest() {
  let fail = 0;
  const check = (name, ok) => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${name}`); };
  const dbTrip = (row) => JSON.parse(JSON.stringify(row)); // DB 왕복: undefined 제거·JSON 직렬화

  const samples = [
    { id: 'a', type: '트렌드', cat: '디저트', title: 'T', ad: null, trust: null, sat: null, video: null, reasons: null, tags: ['x', 'y'], stage: '상승' },
    { tags: [], src: [{ u: 'http://x', t: 'z', k: 1 }], id: 'b', cat: '맛집', recs: [], images: [], ad: 3, trust: 0.5, fresh: true, title: '키 순서가 다른 항목' },
    { id: 'c', mystery: { z: 1, a: [1, { q: null }] }, title: '모르는 필드', ad: '문자열이면 extra', future: null, video: { youtube: 'abc', cap: 'c' } },
    { id: 'd', article: [{ t: 'h', x: '제목' }, { t: 'ul', i: ['a', 'b'] }], pull: '', def: '뜻', example: '예문' },
  ];
  const src = { generatedAt: '2026-01-01', trends: samples };
  const back = samples.map((t, i) => fromRow(dbTrip(toRow(t, i))));
  check('왕복: 값·키 순서 동일(직렬화 비교)', serialize('2026-01-01', back) === serialize('2026-01-01', samples));
  check('왕복: 모르는 필드는 extra 로 보존', toRow(samples[2], 2).extra.mystery.z === 1 && toRow(samples[2], 2).extra.future === null);
  check('타입 불일치(ad 문자열)는 extra 로', toRow(samples[2], 2).ad === null && toRow(samples[2], 2).extra.ad === '문자열이면 extra');
  check('null 값은 key_order 로 보존', 'ad' in back[0] && back[0].ad === null && 'video' in back[0]);
  check('없는 키는 생기지 않음', !('stage' in back[1]) && !('fresh' in back[0]));
  const fresh = fromRow({ id: 'n', title: '새', cat: '디저트', ad: null, tags: ['t'], key_order: null, extra: null, stage: null });
  check('key_order 없는 새 행: 표준 순서·null 생략', JSON.stringify(Object.keys(fresh)) === JSON.stringify(['id', 'cat', 'title', 'tags']));
  check('serialize: 들여쓰기 2칸 + 끝 줄바꿈', serialize('d', []).endsWith('\n') && serialize('d', samples).includes('\n    {\n      "id": "a"'));
  const f = DEFAULT_FILE;
  if (existsSync(f)) {
    const d = readTrendsFile(f), raw = readFileSync(f, 'utf8');
    const rt = d.trends.map((t, i) => fromRow(dbTrip(toRow(t, i))));
    check(`실데이터 ${d.trends.length}건 변환 왕복 바이트 동일`, serialize(d.generatedAt, rt) === raw);
  }
  if (fail) { console.log(`selftest 실패 ${fail}건`); process.exitCode = 1; } else console.log('selftest 통과');
}

// ---------- main (직접 실행했을 때만) ----------
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || null;
  const file = opt('file') ? resolve(opt('file')) : DEFAULT_FILE;
  try {
    if (args.includes('--selftest')) selftest();
    else if (args.includes('--import')) await cmdImport(file);
    else if (args.includes('--mirror')) await cmdMirror(file, args.includes('--force'));
    else if (args.includes('--export')) await cmdExport(opt('out') && resolve(opt('out')));
    else if (args.includes('--verify')) await cmdVerify(file);
    else console.log('사용법: trends-db.mjs --import|--export [--out=파일]|--verify|--mirror [--force]|--selftest [--file=trends.json]');
  } catch (e) {
    console.error('오류:', e.message);
    process.exitCode = 1;
  }
}
