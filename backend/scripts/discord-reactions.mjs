#!/usr/bin/env node
// 디스코드 크론 보고에 이모지 선택지를 달고, 사람이 누른 이모지를 동작으로 바꾼다.
// Hermes 는 크론 실행 중 버튼(clarify)을 못 쓰고 사용자 반응도 입력으로 안 받는다 → 같은 봇 토큰으로
// 게이트웨이에 한 세션 더 붙어 반응만 처리하는 작은 감시 프로세스(의존성 0, Node 24 내장 WebSocket).
//
//   node backend/scripts/discord-reactions.mjs            상주 실행
//   node backend/scripts/discord-reactions.mjs --selftest
//
// 자격: HERMES_HOME(기본 E:\workspace\side_project\hermes)\.env 의 DISCORD_BOT_TOKEN · DISCORD_ALLOWED_USERS.
// 허용 사용자 목록이 비면 아무 반응도 실행하지 않는다.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERMES_HOME = process.env.HERMES_HOME || 'E:\\workspace\\side_project\\hermes';
// 맥/리눅스: HERMES_BIN(= `command -v hermes`)을 환경변수로 준다. 없으면 Windows 경로.
const HERMES = process.env.HERMES_BIN || join(HERMES_HOME, 'bin', process.platform === 'win32' ? 'hermes.exe' : 'hermes');
const API = 'https://discord.com/api/v10';

// 잡별 선택지. 잡 id 는 CLAUDE.md "크론 일람"·디스코드 보고의 (job_id: …) 와 같다.
const COLLECT = { '🔁': 'rerun', '📋': 'queue', '📊': 'stats' };
export const JOB_OPTIONS = {
  '9ddacd750b48': COLLECT,               // 한끗 자동 수집·게시 (21:30 슬롯2)
  '0a2ea7571c71': COLLECT,               // 한끗 자동 수집·게시 (13:30 슬롯0)
  '55a2adf74363': COLLECT,               // 한끗 자동 수집·게시 (17:30 슬롯1)
  'cb8938c4f951': COLLECT,               // 수집 재시도 게이트
  '2bfe2a1c0d40': { '🔁': 'rerun', '📊': 'stats' },  // 유행 단계 재판정
  'f0994a8787c9': { '🔁': 'rerun' },     // 광고/진짜 일일 재확인
};
const ITEM_OPTIONS = { '✅': 'approve', '🗑️': 'reject', '⏸️': 'later' };
const ITEM_HEAD = '📋 검수 대기';

// 보고 본문 끝에 붙이는 이모지 설명 줄. LEGEND_MARK 로 이미 붙였는지 판단한다.
const LABELS = { rerun: '지금 다시 실행', queue: '검수 대기 보기', stats: '2주 수치',
  approve: '게시', reject: '버리기', later: '나중에' };
const LEGEND_MARK = '👇 이모지를 누르면';
export const legend = (options) => `${LEGEND_MARK} — ${Object.entries(options).map(([e, a]) => `${e} ${LABELS[a]}`).join(' · ')}`;

// 봇 메시지 본문 → { kind, key, options }. 선택지 없는 메시지는 null.
export function classify(content = '') {
  const job = content.startsWith('Cronjob Response:') && content.match(/\(job_id:\s*([0-9a-f]+)\)/)?.[1];
  if (job) return JOB_OPTIONS[job] ? { kind: 'job', key: job, options: JOB_OPTIONS[job] } : null;
  const id = content.startsWith(ITEM_HEAD) && content.match(/id:\s*`([^`]+)`/)?.[1];
  return id ? { kind: 'item', key: id, options: ITEM_OPTIONS } : null;
}

const norm = (e) => e.replace(/\uFE0F/g, '');   // 디스코드가 보내는 이모지는 VS16 이 빠질 때가 있다
export const actionFor = (options, emoji) => Object.entries(options).find(([k]) => norm(k) === norm(emoji))?.[1] || null;

function selftest() {
  const a = classify('Cronjob Response: 한끗 자동 수집·게시\n(job_id: 9ddacd750b48)\n---');
  assert.ok(a?.kind === 'job' && a.key === '9ddacd750b48' && actionFor(a.options, '📋') === 'queue', 'collect');
  assert.ok(classify('Cronjob Response: 한끗 오늘의 분야\n(job_id: f3a0b6724fa4)') === null, 'unlisted job');
  assert.ok(classify('그냥 대화') === null, 'chat');
  const b = classify(`${ITEM_HEAD} · [맛집] 어떤 가게\nid: \`food-123\``);
  assert.ok(b?.kind === 'item' && b.key === 'food-123', 'item');
  assert.ok(actionFor(b.options, '🗑') === 'reject' && actionFor(b.options, '⏸') === 'later', 'vs16');
  assert.ok(actionFor(b.options, '👍') === null, 'unknown emoji');
  const H = 3600_000, q = [{ id: 'x' }, { id: 'y' }, { id: 'z' }, { id: 'n' }];
  const p = plan({ x: { shownAt: 0 }, y: { shownAt: 0, later: true }, z: { shownAt: 11 * H }, gone: { shownAt: 0 } }, q, 12 * H, 12);
  assert.deepStrictEqual(p.publish, ['x'], 'publish only expired, not later');
  assert.deepStrictEqual(p.show.map((h) => h.id), ['n'], 'show new');
  assert.ok(!('gone' in p.state), 'prune');
  assert.deepStrictEqual(plan({ x: { shownAt: 0, autoTried: true } }, [{ id: 'x' }], 99 * H).publish, [], 'no retry');
  assert.ok(legend(a.options) === `${LEGEND_MARK} — 🔁 지금 다시 실행 · 📋 검수 대기 보기 · 📊 2주 수치`, 'legend');
  console.log('selftest ok');
}

// ── 디스코드 REST ──
const env = Object.fromEntries(readFileSync(join(HERMES_HOME, '.env'), 'utf-8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(([, k, v]) => [k, v.trim().replace(/^['"]|['"]$/g, '')]));
const TOKEN = env.DISCORD_BOT_TOKEN;
const ALLOWED = new Set((env.DISCORD_ALLOWED_USERS || '').split(',').map((s) => s.trim()).filter(Boolean));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function rest(method, path, body) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(API + path, { method, body: body && JSON.stringify(body),
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' } });
    if (res.status === 429) { await sleep(((await res.json()).retry_after || 1) * 1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }
}
const react = (ch, m, e) => rest('PUT', `/channels/${ch}/messages/${m}/reactions/${encodeURIComponent(e)}/@me`);
const send = (ch, content, replyTo) => rest('POST', `/channels/${ch}/messages`,
  { content: content.slice(0, 1990), allowed_mentions: { parse: [] }, ...(replyTo && { message_reference: { message_id: replyTo } }) });
async function addOptions(ch, m, options) { for (const e of Object.keys(options)) { await react(ch, m, e); await sleep(300); } }

// 크론 보고(같은 봇이 보낸 메시지라 수정 가능) 끝에 설명 줄을 붙이고 이모지를 단다. 이미 한 건 건너뛴다.
async function attach(ch, m, options) {
  if (!m.content.includes(LEGEND_MARK)) {
    const next = `${m.content}\n\n${legend(options)}`;
    // ponytail: 2000자 넘는 보고는 답글로 설명 — 그 경우 재시작 시 소급에서 답글이 한 번 더 붙을 수 있다.
    if (next.length <= 2000) await rest('PATCH', `/channels/${ch}/messages/${m.id}`, { content: next });
    else await send(ch, legend(options), m.id);
  }
  if (!m.reactions?.some((r) => r.me)) await addOptions(ch, m.id, options);
}

const run = (cmd, args, timeout = 15 * 60_000) => new Promise((resolve) =>
  execFile(cmd, args, { cwd: repoRoot, encoding: 'utf-8', windowsHide: true, timeout, maxBuffer: 8 << 20 },
    (err, stdout, stderr) => resolve({ ok: !err, out: `${stdout || ''}${stderr || ''}`.trim() })));
const tail = (s, n = 1500) => (s.length > n ? '…' + s.slice(-n) : s);
const node = (script, ...args) => run(process.execPath, [join(repoRoot, 'backend', 'scripts', script), ...args]);

// ── 무응답 자동 게시 ──
// 보류 후보를 디스코드에 띄운 뒤 AUTO_HOURS 동안 ✅/🗑️/⏸️ 반응이 없으면 승인 게시한다(사용자 지시 2026-11-05).
// 승인 게시도 "살아 있는 출처 1개+"는 auto-build --approved 가 여전히 확인한다 — 못 올리면 대기열에 남고 다시 시도하지 않는다.
const AUTO_HOURS = 12;   // ponytail: 고정값. 바꾸려면 이 숫자만.
const STATE = join(repoRoot, 'backend', 'out', 'pipeline', 'discord-review-state.json');
const loadState = () => { try { return JSON.parse(readFileSync(STATE, 'utf-8')); } catch { return {}; } };
const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n', 'utf-8');

// 대기열·상태 → 새로 띄울 항목 / 자동 게시할 id / 정리된 상태(대기열에서 빠진 건 지움)
export function plan(state, queue, now, hours = AUTO_HOURS) {
  const ids = new Set(queue.map((h) => h.id));
  const next = Object.fromEntries(Object.entries(state).filter(([id]) => ids.has(id)));
  const show = queue.filter((h) => !next[h.id]);
  const publish = Object.entries(next)
    .filter(([, s]) => !s.later && !s.autoTried && now - s.shownAt >= hours * 3600_000).map(([id]) => id);
  return { show, publish, state: next };
}

const homeChannel = () => env.DISCORD_HOME_CHANNEL_THREAD_ID || env.DISCORD_HOME_CHANNEL;
async function readQueue() {
  const r = await node('pipeline-review.mjs', '--list', '--json');
  return r.ok ? JSON.parse(r.out || '[]') : null;
}
async function showItem(ch, h) {
  const srcs = (h.checks || []).slice(0, 3).map((c) => `└ ${c.verdict} ${c.status} <${c.url}>`).join('\n');
  const m = await send(ch, `${ITEM_HEAD} · [${h.cat || '?'}] ${h.title}\n사유: ${h.reason}\n${srcs}\nid: \`${h.id}\`\n` +
    `${legend(ITEM_OPTIONS)}\n⏰ ${AUTO_HOURS}시간 안에 반응이 없으면 자동 게시돼요(⏸️ 누르면 안 함)`);
  await addOptions(ch, m.id, ITEM_OPTIONS);
}

let ticking = false;
async function tick() {
  const ch = homeChannel();
  if (ticking || !ch) return;
  ticking = true;
  try {
    const q = await readQueue();
    if (!q) return;
    const p = plan(loadState(), q, Date.now());
    for (const h of p.show) { await showItem(ch, h); p.state[h.id] = { shownAt: Date.now() }; }
    saveState(p.state);
    for (const id of p.publish) {
      p.state[id].autoTried = true; saveState(p.state);   // 실패해도 반복 시도하지 않게 먼저 기록
      log('auto-approve', id);
      const r = await node('pipeline-review.mjs', `--approve=${id}`);
      const last = r.out.split('\n').filter(Boolean).pop() || '';
      await send(ch, `⏰ ${AUTO_HOURS}시간 무응답 → 자동 게시 시도 \`${id}\`\n${r.ok ? last : `✗ 실패 — 대기열에 남겨요\n\`\`\`${tail(r.out, 800)}\`\`\``}`);
    }
  } catch (e) { log('tick error', e.message); }
  finally { ticking = false; }
}

// ── 동작 ──
const busy = new Set();   // 같은 메시지·같은 동작 중복 클릭 무시(승인은 수 분 걸림)
async function handle(ch, msg, target, action) {
  const lock = `${msg.id}:${action}`;
  if (busy.has(lock)) return;
  busy.add(lock);
  try {
    if (action === 'rerun') {
      const r = await run(HERMES, ['cron', 'run', target.key], 60_000);
      await send(ch, r.ok ? `🔁 \`${target.key}\` 다시 실행을 예약했어요(다음 틱). 결과는 새 보고로 와요.` : `✗ 재실행 실패\n\`\`\`${tail(r.out)}\`\`\``, msg.id);
    } else if (action === 'stats') {
      const r = await node('pipeline-review.mjs', '--stats', '--days=14');
      await send(ch, `\`\`\`\n${tail(r.out, 1900)}\n\`\`\``, msg.id);
    } else if (action === 'queue') {
      const q = await readQueue();
      if (!q) return void await send(ch, '✗ 대기열을 못 읽었어요', msg.id);
      if (!q.length) return void await send(ch, '📋 검수 대기 0건이에요.', msg.id);
      await send(ch, `📋 검수 대기 ${q.length}건 — 항목마다 ✅ 게시 · 🗑️ 버리기 · ⏸️ 나중에`, msg.id);
      const s = loadState();
      for (const h of q) { await showItem(ch, h); s[h.id] = { ...s[h.id], shownAt: s[h.id]?.shownAt || Date.now() }; }
      saveState(s);   // 다시 띄워도 자동 게시 시계는 처음 띄운 때부터
    } else if (action === 'later') {
      const s = loadState(); s[target.key] = { shownAt: s[target.key]?.shownAt || Date.now(), later: true }; saveState(s);
      await send(ch, `⏸️ 「${target.key}」 대기열에 그대로 두고 자동 게시도 안 할게요. 나중에 이 메시지에서 ✅/🗑️를 누르면 돼요.`, msg.id);
    } else {   // approve | reject — 코멘트는 남기지 않는다(learnings.md 에 빈 줄 안 쌓임)
      await send(ch, `⏳ ${action === 'approve' ? '게시' : '버리기'} 처리 중…`, msg.id);
      const r = await node('pipeline-review.mjs', `--${action}=${target.key}`);
      const last = r.out.split('\n').filter(Boolean).pop() || '';
      await send(ch, r.ok ? last : `✗ 실패\n\`\`\`${tail(r.out)}\`\`\``, msg.id);
    }
  } catch (e) { log('handle error', e.message); }
  finally { busy.delete(lock); }
}

// 꺼져 있던 사이(PC 재시작 등) 올라온 보고에도 선택지를 단다 — 홈 채널 최근 30개 중 아직 안 단 것만.
async function backfill() {
  const ch = env.DISCORD_HOME_CHANNEL_THREAD_ID || env.DISCORD_HOME_CHANNEL;
  if (!ch) return;
  for (const m of await rest('GET', `/channels/${ch}/messages?limit=30`)) {
    const target = m.author?.id === botId && classify(m.content);
    if (target?.kind === 'job') await attach(ch, m, target.options);
  }
}

// ── 게이트웨이 ──
const INTENTS = (1 << 0) | (1 << 9) | (1 << 10) | (1 << 12) | (1 << 13) | (1 << 15);
let botId = null;

function connect(url) {
  const ws = new WebSocket(`${url}?v=10&encoding=json`);
  let hb, seq = null, acked = true;
  ws.onmessage = async ({ data }) => {
    const { op, d, s, t } = JSON.parse(data);
    if (s) seq = s;
    if (op === 10) {
      hb = setInterval(() => {
        if (!acked) return ws.close();   // 응답 없는 연결 → 재접속
        acked = false; ws.send(JSON.stringify({ op: 1, d: seq }));
      }, d.heartbeat_interval);
      ws.send(JSON.stringify({ op: 2, d: { token: TOKEN, intents: INTENTS, properties: { os: 'windows', browser: 'az2mz-reactions', device: 'az2mz-reactions' } } }));
    } else if (op === 11) acked = true;
    else if (op === 1) ws.send(JSON.stringify({ op: 1, d: seq }));
    else if (op === 7 || op === 9) ws.close();
    else if (op === 0) {
      try {
        if (t === 'READY') { botId = d.user.id; log('ready as', d.user.username); backfill().catch((e) => log('backfill error', e.message)); tick(); }
        else if (t === 'MESSAGE_CREATE' && d.author?.id === botId) {
          const target = classify(d.content);
          if (target?.kind === 'job') { await attach(d.channel_id, d, target.options); if (target.options.queue) tick(); }
        } else if (t === 'MESSAGE_REACTION_ADD' && d.user_id !== botId) {
          if (!ALLOWED.has(d.user_id)) return;
          const msg = await rest('GET', `/channels/${d.channel_id}/messages/${d.message_id}`);
          if (msg.author?.id !== botId) return;
          const target = classify(msg.content);
          const action = target && actionFor(target.options, d.emoji.name || '');
          if (action) { log('action', action, target.key); handle(d.channel_id, msg, target, action); }
        }
      } catch (e) { log('dispatch error', t, e.message); }
    }
  };
  // ponytail: 끊기면 resume 없이 새로 identify(하루 1000회 한도라 충분). 끊긴 사이 반응은 놓친다 — 다시 누르면 됨.
  ws.onclose = (e) => { clearInterval(hb); log('closed', e.code, e.reason); if (e.code === 4004) process.exit(1); setTimeout(() => connect(url), 5000); };
  ws.onerror = () => {};
}

if (process.argv.includes('--selftest')) selftest();
else {
  if (!TOKEN) { console.error('DISCORD_BOT_TOKEN 없음'); process.exit(1); }
  if (!ALLOWED.size) log('⚠ DISCORD_ALLOWED_USERS 비어 있음 — 반응을 실행하지 않습니다');
  const { url } = await rest('GET', '/gateway/bot');
  connect(url);
  setInterval(tick, 10 * 60_000);
}
