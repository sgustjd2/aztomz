#!/usr/bin/env node
/* 블로그 자동 발행이 조용히 멈추는 일을 막는 점검(2026-11-15 — 검증 단계 로그인 만료로 하루 종일 0편이었던 사건).
   job.sh 가 naver-hourly 회차 끝마다 돌린다. 문제가 있으면 디스코드 홈 채널로 알린다(같은 내용은 3시간에 한 번).
   점검: ① 08~22시에 마지막 네이버 발행이 4시간을 넘었는가 ② GPT(codex)·Claude 로그인 둘 다 풀렸는가
   읽기 전용(발행·쓰기 없음). 알림 실패는 무시한다. 토큰은 출력하지 않는다. */
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'blog');
const PATH = `${join(homedir(), '.local/share/mise/installs/node/24/bin')}:${process.env.PATH || ''}`;
const problems = [];

const kst = new Date(Date.now() + 9 * 3600e3);
const hour = kst.getUTCHours();
if (!existsSync(join(outDir, '.naver-hold')) && hour >= 8 && hour < 22) {
  try {
    const posted = JSON.parse(readFileSync(join(outDir, 'posted-naver.json'), 'utf8'));
    const last = Math.max(...Object.values(posted).map((v) => Date.parse(String(v.at).replace(' ', 'T') + ':00Z')));   // at 은 UTC
    const hrs = (Date.now() - last) / 3600e3;
    if (hrs > 4) problems.push(`네이버 마지막 발행이 ${hrs.toFixed(1)}시간 전입니다(08~22시 기준 4시간 초과). blog-hourly-naver.log·blog-queue.log 확인`);
  } catch { /* 기록 없으면 건너뜀 */ }
}

const run = (bin, args) => { const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 20000, env: { ...process.env, PATH } }); return `${r.stdout || ''}${r.stderr || ''}`; };
const gptOk = /Logged in/i.test(run('codex', ['login', 'status']));
const claudeOk = /"loggedIn":\s*true/.test(run('claude', ['auth', 'status']));
if (!gptOk && !claudeOk) problems.push('GPT(codex)와 Claude 로그인이 모두 풀렸습니다 — 검증·집필이 멈춥니다(터미널에서 codex login / claude auth login)');
else if (!gptOk) problems.push('GPT(codex) 로그인이 풀렸습니다 — 지금은 Claude 로 대체 중(codex login 필요)');
else if (!claudeOk) problems.push('Claude 로그인이 풀렸습니다 — GPT 실패 시 폴백이 안 됩니다(claude auth login 필요)');

if (!problems.length) { console.log('✓ 블로그 자동화 점검 이상 없음'); process.exit(0); }
const msg = `⚠ 블로그 자동 발행 점검\n- ${problems.join('\n- ')}`;
console.log(msg);

const mark = join(outDir, '.health-alert.txt');
try { if (existsSync(mark) && Date.now() - statSync(mark).mtimeMs < 3 * 3600e3 && readFileSync(mark, 'utf8') === msg) process.exit(0); } catch {}
try {
  const home = process.env.HERMES_HOME;
  const envFile = home && join(home, '.env');
  if (!envFile || !existsSync(envFile)) process.exit(0);
  const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.trim().replace(/^['"]|['"]$/g, '')]));
  const ch = env.DISCORD_HOME_CHANNEL_THREAD_ID || env.DISCORD_HOME_CHANNEL;
  if (!env.DISCORD_BOT_TOKEN || !ch) process.exit(0);
  const r = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
    method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: msg, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(10000),
  });
  if (r.ok) writeFileSync(mark, msg);
} catch { /* 알림 실패는 무시 */ }
