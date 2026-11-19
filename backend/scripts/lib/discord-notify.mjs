/* 디스코드 홈 채널로 알림을 보낸다(블로그 자동화 오류 보고용). 토큰은 출력하지 않고, 실패는 조용히 false 를 돌려준다.
   자격은 $HERMES_HOME/.env 의 DISCORD_BOT_TOKEN + DISCORD_HOME_CHANNEL(_THREAD_ID) — blog-health-check.mjs 와 같은 곳. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function notifyDiscord(content) {
  try {
    const home = process.env.HERMES_HOME;
    const envFile = home && join(home, '.env');
    if (!envFile || !existsSync(envFile)) return false;
    const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
      .map(([, k, v]) => [k, v.trim().replace(/^['"]|['"]$/g, '')]));
    const ch = env.DISCORD_HOME_CHANNEL_THREAD_ID || env.DISCORD_HOME_CHANNEL;
    if (!env.DISCORD_BOT_TOKEN || !ch) return false;
    const r = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
      method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: String(content).slice(0, 1900), allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch { return false; }
}
