/* ============================================================
   한끗 — 트렌드 저장소 (P2). 봇 스크립트(restage·recheck-ad·auto-build)가 trends.json 을 직접
   읽고 쓰는 대신 이 모듈로 load()/save() 한다. DB(Supabase)가 원본, trends.json 은 항상 같은
   내용으로 함께 써지는 결과물(git·사이트·읽기 쪽 스크립트는 그대로).

   load()  DB 에서 읽는다. 단, trends.json 이 이 모듈 밖에서 바뀌었으면(사람 수정·git pull)
           파일이 이긴다 → DB 를 파일로 맞춘 뒤 파일 내용을 돌려준다.
           DB 가 안 되면 경고만 하고 파일로 폴백.
   save()  바뀐 행만 DB 에 upsert·delete(이력은 트리거가 남김) → trends.json 을 예전과 똑같은 형식으로 씀.
           DB 쓰기가 실패해도 파일은 쓴다(봇 흐름이 안 끊기게) — 상태 해시를 갱신하지 않으므로 다음 load() 가 파일로 DB 를 맞춘다.
   "파일이 밖에서 바뀌었나"는 backend/out/pipeline/trends-mirror.json 의 해시(P1 미러와 공유)로 판단.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { client, fetchAll, toRow, fromRow, serialize, MIRROR_STATE, DEFAULT_FILE } from '../trends-db.mjs';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const MAX_SHRINK = 0.1;  // 한 번에 DB 행의 10% 넘게 지우는 저장은 거부(깨진 데이터 방지)

function readState(statePath) { try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return {}; } }
function writeState(statePath, hash, count) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify({ hash, count, at: new Date().toISOString() }));
}
const inList = (ids) => `in.(${ids.map((i) => `"${String(i).replace(/"/g, '\\"')}"`).join(',')})`;

/** DB 를 data({generatedAt,trends}) 로 맞춘다 — 바뀐 행만 upsert, 없어진 행 delete. 반환: {upserted, deleted} */
export async function syncToDb(api, data) {
  const { rows: dbRows } = await fetchAll(api);
  const dbById = new Map(dbRows.map((r) => [r.id, r]));
  const ids = new Set(data.trends.map((t) => t.id));
  if (ids.size !== data.trends.length || data.trends.some((t) => !t.id)) throw new Error('id 누락/중복');
  const gone = dbRows.filter((r) => !ids.has(r.id)).map((r) => r.id);
  if (gone.length > Math.max(3, dbRows.length * MAX_SHRINK)) throw Object.assign(new Error(`DB 행 ${gone.length}/${dbRows.length}건 삭제 요청 — 거부`), { guard: true });
  const changed = [];
  data.trends.forEach((t, i) => {
    const r = dbById.get(t.id);
    if (!r || r.sort_idx !== i || JSON.stringify(fromRow(r)) !== JSON.stringify(t)) changed.push({ id: t.id, ...toRow(t, i) });
  });
  for (let i = 0; i < changed.length; i += 100)
    await api('POST', 'trends?on_conflict=id', { body: changed.slice(i, i + 100), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  if (gone.length) await api('DELETE', `trends?id=${inList(gone)}`, { headers: { Prefer: 'return=minimal' } });
  await api('POST', 'trends_meta?on_conflict=key', { body: [{ key: 'generatedAt', value: data.generatedAt }], headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  return { upserted: changed.length, deleted: gone.length };
}

/** 저장소 만들기. 기본값은 실제 DB·실제 파일. 시험용으로 api·file·statePath 를 바꿀 수 있다. */
export function createStore({ api, file = DEFAULT_FILE, statePath = MIRROR_STATE, log = console.warn } = {}) {
  const getApi = () => api || (api = client());
  const readFile = () => {
    const raw = readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.trends)) throw new Error(`${file}: trends 배열이 없음`);
    return { raw, data };
  };

  async function load() {
    const { raw, data: fileData } = readFile();
    const hash = sha1(raw);
    let a;
    try { a = getApi(); } catch (e) { log(`[trends-store] DB 설정 없음 — 파일 사용 (${e.message})`); return { data: fileData, source: 'file' }; }
    try {
      if (readState(statePath).hash !== hash) {  // 파일이 밖에서 바뀜 → 파일이 이긴다
        const r = await syncToDb(a, fileData);
        writeState(statePath, hash, fileData.trends.length);
        if (r.upserted || r.deleted) log(`[trends-store] trends.json 이 밖에서 바뀌어 DB 를 맞춤 (upsert ${r.upserted}, delete ${r.deleted})`);
        return { data: fileData, source: 'file→db' };
      }
      const { rows, generatedAt } = await fetchAll(a);
      if (!rows.length) { log('[trends-store] DB 가 비어 있음 — 파일 사용'); return { data: fileData, source: 'file' }; }
      return { data: { generatedAt, trends: rows.map(fromRow) }, source: 'db' };
    } catch (e) {
      if (e.guard) log(`[trends-store] 파일이 DB 보다 크게 줄어 DB 에 반영 안 함 — 파일 사용 (${e.message})`); else
      log(`[trends-store] DB 읽기 실패 — 파일 사용 (${e.message})`);
      return { data: fileData, source: 'file' };
    }
  }

  async function save(data) {
    if (!data || !Array.isArray(data.trends) || !data.trends.length) throw new Error('save: trends 가 비었음');
    let dbOk = false, r = { upserted: 0, deleted: 0 };
    try { r = await syncToDb(getApi(), data); dbOk = true; } catch (e) { if (e.guard) throw e; log(`[trends-store] DB 쓰기 실패 — 파일만 씀, 다음 load 가 DB 를 맞춤 (${e.message})`); }
    const text = serialize(data.generatedAt, data.trends);
    writeFileSync(file, text, 'utf8');
    if (dbOk) writeState(statePath, sha1(text), data.trends.length);
    return { dbOk, ...r };
  }

  return { load, save };
}

const def = createStore();
export const load = (...a) => def.load(...a);
export const save = (...a) => def.save(...a);

// ---------- selftest (가짜 DB, 네트워크 없음) ----------
export async function selftest(check) {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'tstore-'));
  const file = join(dir, 'trends.json'), statePath = join(dir, 'state.json');
  const db = new Map(), meta = {};
  let fail = false;
  const fake = async (method, path, { body } = {}) => {
    if (fail) throw new Error('db down');
    if (method === 'GET' && path.startsWith('trends?')) return [...db.values()].sort((a, b) => a.sort_idx - b.sort_idx);
    if (method === 'GET') return meta.generatedAt ? [{ value: meta.generatedAt }] : [];
    if (method === 'POST' && path.startsWith('trends?')) { for (const r of body) db.set(r.id, JSON.parse(JSON.stringify(r))); return null; }
    if (method === 'POST') { meta.generatedAt = body[0].value; return null; }
    if (method === 'DELETE') { for (const id of [...path.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])) db.delete(id); return null; }
    throw new Error('unhandled ' + method + path);
  };
  const logs = [];
  const st = createStore({ api: fake, file, statePath, log: (m) => logs.push(m) });
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, cat: '디저트', title: `제목${i}`, ad: i % 2 ? null : 1, tags: ['a'], src: [{ n: 'x', u: 'http://x' }] }));
  try {
    writeFileSync(file, serialize('2026-01-01', mk(20)));
    let r = await st.load();
    check('load: 파일이 처음이면 파일이 이겨 DB 를 채움', r.source === 'file→db' && db.size === 20);
    r = await st.load();
    check('load: 다음엔 DB 에서 읽고 파일과 동일', r.source === 'db' && serialize(r.data.generatedAt, r.data.trends) === readFileSync(file, 'utf8'));
    r.data.trends[3].title = '바뀜'; r.data.trends.unshift({ id: 'new', title: '새 항목', tags: [] });
    let s = await st.save(r.data);
    check('save: 바뀐 행만 upsert(수정 1 + 신규 1 + 순서 이동 전체)', s.dbOk && db.get('new') && db.get('t3').title === '바뀜' && s.deleted === 0);
    check('save: 파일도 같은 내용', JSON.parse(readFileSync(file, 'utf8')).trends[0].id === 'new');
    s = await st.save(r.data);
    check('save: 변경 없으면 DB 쓰기 0건', s.upserted === 0);
    r = await st.load(); r.data.trends.splice(5, 1);
    s = await st.save(r.data);
    check('save: 항목 삭제 반영', s.deleted === 1 && !db.has('t4'));
    r = await st.load(); r.data.trends.splice(2, 10);
    let threw = false; try { await st.save(r.data); } catch (e) { threw = /거부/.test(e.message); }
    check('save: 한 번에 10%+ 삭제는 거부', threw);
    // 사람이 파일을 직접 고침
    const f = JSON.parse(readFileSync(file, 'utf8')); f.trends[1].title = '사람이 고침'; writeFileSync(file, serialize(f.generatedAt, f.trends));
    r = await st.load();
    check('load: 파일이 밖에서 바뀌면 파일 승 + DB 반영', r.source === 'file→db' && db.get(f.trends[1].id).title === '사람이 고침');
    // DB 장애
    fail = true;
    r = await st.load(); r.data.trends[0].title = '장애중';
    s = await st.save(r.data);
    check('DB 장애: load 는 파일 폴백, save 는 파일만 씀', r.source === 'file' && !s.dbOk && JSON.parse(readFileSync(file, 'utf8')).trends[0].title === '장애중');
    fail = false;
    r = await st.load();
    check('DB 복구 후 load: 파일이 이겨 DB 를 따라잡음', r.source === 'file→db' && db.get(r.data.trends[0].id).title === '장애중');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href && process.argv.includes('--selftest')) {
  let bad = 0;
  await selftest((name, ok) => { if (!ok) bad++; console.log(`${ok ? '✓' : '✗'} ${name}`); });
  console.log(bad ? `selftest 실패 ${bad}건` : 'selftest 통과');
  if (bad) process.exitCode = 1;
}
