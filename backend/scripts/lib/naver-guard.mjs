/* 네이버 계정 보호조치·세션 이상 신호를 감지하면 그날 네이버 발행을 멈춘다(2026-11-10 보호조치 사건).
   - backend/out/blog/.naver-hold 파일을 만든다(blog-queue 와 job.sh 가 이 파일이 있으면 네이버를 건너뛴다). 지우면 재개.
   - 디스코드 홈 채널로 알린다(Hermes .env 의 봇 토큰·채널, discord-reactions.mjs 와 같은 자격). 토큰은 출력하지 않는다. 실패해도 조용히 넘어간다. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'out', 'blog');
export const HOLD = join(outDir, '.naver-hold');

// 로그인 페이지 리다이렉트, 보호조치·스팸 경고, 이용 제한 문구
export const GUARD_TEXT = /스팸성|보호조치|이용이\s*제한되|비정상적인\s*(활동|접근)|계정\s*보호|자동\s*등록\s*방지/;

export function isHeld() { return existsSync(HOLD); }

export async function holdNaver(reason) {
  if (!existsSync(HOLD)) writeFileSync(HOLD, `${new Date().toISOString()} ${reason}\n`);
  try {
    const home = process.env.HERMES_HOME;
    const envFile = home && join(home, '.env');
    if (!envFile || !existsSync(envFile)) return;
    const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
      .map(([, k, v]) => [k, v.trim().replace(/^['"]|['"]$/g, '')]));
    const ch = env.DISCORD_HOME_CHANNEL_THREAD_ID || env.DISCORD_HOME_CHANNEL;
    if (!env.DISCORD_BOT_TOKEN || !ch) return;
    await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `⚠ 네이버 발행 자동 보류: ${reason}\n.naver-hold 를 지우면 재개됩니다(보호조치 해제 확인 후).`, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* 알림 실패는 무시 */ }
}
