#!/usr/bin/env node
/* Scheduled blog jobs call this only after the outer writer CLI exits.
   Nested Codex CLI calls from inside codex exec are blocked by app-server permissions. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const args = process.argv.slice(2);
const getArg = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const platform = getArg('platform');
const sinceMs = Number(getArg('since-ms'));
const dry = args.includes('--dry');
const onlyId = getArg('id');   // 지정하면 그 글만 검증·수정(반려돼 남은 초안 되살리기)
const isoToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

if (!['naver', 'tistory'].includes(platform) || (!Number.isFinite(sinceMs) && !onlyId)) {
  console.error('사용법: node backend/scripts/blog-finalize-latest.mjs --platform=naver|tistory --since-ms=<epoch-ms> [--dry]');
  process.exit(2);
}

const candidates = [];
for (const name of await readdir(outDir)) {
  if (!name.endsWith('.json') || name === 'posted.json' || name === 'posted-naver.json') continue;
  const jsonPath = join(outDir, name);
  const fileStat = await stat(jsonPath);
  if (!onlyId && fileStat.mtimeMs < sinceMs) continue;
  if (onlyId && name !== `${onlyId}.json`) continue;
  let meta;
  try { meta = JSON.parse(await readFile(jsonPath, 'utf8')); } catch { continue; }
  if (!meta?.id || meta.platform !== platform || meta.builtAt !== isoToday) continue;
  const htmlPath = join(outDir, `${meta.id}.html`);
  const mdPath = join(outDir, `${meta.id}.md`);
  if (!existsSync(htmlPath) || !existsSync(mdPath)) continue;
  candidates.push(meta.id);
}

if (candidates.length !== 1) {
  console.error(`✗ 새 ${platform} 초안을 하나로 특정할 수 없습니다(검색 ${candidates.length}개): ${candidates.join(', ') || '없음'}`);
  process.exit(1);
}

const id = candidates[0];
console.log(`🧾 집필 프로세스 종료 후 검증 — ${id}`);
if (dry) {
  console.log(`✓ dry: ${id}`);
  process.exit(0);
}

const run = (script) => spawnSync(process.execPath, [join(repoRoot, 'backend', 'scripts', script), id], {
  cwd: repoRoot, env: { ...process.env, BLOG_DEFER_MODEL_GATES: '' }, stdio: 'inherit',
});

const review = run('blog-selfreview.mjs');
if (review.error || review.status !== 0) {
  console.warn(`⚠ 자체 리뷰는 통과하지 못했지만 최종 검증은 계속합니다: ${review.error?.message || review.status}`);
}

/* 검증 반려(사실 오류)는 글을 버리지 말고 고쳐서 다시 검증한다 — 2026-11-19 하루 종일 3회차가 반려로 0편이었다.
   차단 사유(⛔ 줄)를 집필 모델에 넘겨 본문(.md)만 최소 수정 → 재조립 → 재검증, 최대 MAX_REPAIR 번. */
const MAX_REPAIR = 4;   // 3번째부터는 문제 문장을 지우는 쪽으로 강하게 고친다(고쳐서 통과시키는 게 목적 — 틀린 채로 올리지는 않는다)
const runVerify = () => {
  const r = spawnSync(process.execPath, [join(repoRoot, 'backend', 'scripts', 'blog-verify.mjs'), id], {
    cwd: repoRoot, env: { ...process.env, BLOG_DEFER_MODEL_GATES: '' }, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  const blockers = `${r.stdout || ''}\n${r.stderr || ''}`.split('\n').filter((l) => /^\s*⛔/.test(l)).map((l) => l.trim());
  return { ok: !r.error && r.status === 0, blockers, error: r.error?.message || (r.status ? `exit ${r.status}` : '') };
};
const { notifyDiscord } = await import('./lib/discord-notify.mjs');
const claudeBin = process.env.CLAUDE_BIN || 'claude';

let verify = runVerify();
let repairs = 0;
while (!verify.ok && verify.blockers.length && repairs < MAX_REPAIR) {
  repairs++;
  console.log(`🛠 검증 반려 자동 수정 ${repairs}/${MAX_REPAIR} — 차단 ${verify.blockers.length}건`);
  const prompt = `블로그 초안 backend/out/blog/${id}.md 가 발행 전 사실 검증에서 반려됐다. 아래 차단 사유만 고쳐라.
규칙: 반려 사유가 가리키는 문장만 최소한으로 수정한다(링크된 원문 URL 을 직접 열어 확인하고, 원문에 있는 사실로 바꾼다. 원문에서 확인 안 되는 건 쓰지 말고 지운다).${repairs >= 3 ? '\n이번이 ' + repairs + '번째 수정이다. 같은 지적이 반복되니 반려된 문장·문단을 고치려 하지 말고 통째로 삭제하고, 삭제로 어색해진 앞뒤 연결만 다듬어라. 글이 짧아져도 괜찮다.' : ''}
다른 문장·구조·그림 정의는 건드리지 않는다. 숫자·날짜는 원문 그대로만 쓴다. 수정 뒤 \`node backend/scripts/blog-assemble.mjs ${id}\` 를 실행해 재조립한다.
발행·git 커밋은 하지 않는다. 끝나면 한 줄로 무엇을 고쳤는지만 출력한다.

차단 사유:
${verify.blockers.join('\n')}`;
  const fix = spawnSync(claudeBin, ['-p', '--model', 'claude-sonnet-5-5', '--permission-mode', 'acceptEdits'], {
    cwd: repoRoot, input: prompt, encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, BLOG_DEFER_MODEL_GATES: '1' },
  });
  console.log(`   ${String(fix.stdout || fix.stderr || fix.error?.message || '').trim().split('\n').slice(-2).join(' ').slice(0, 300)}`);
  verify = runVerify();
}

if (!verify.ok) {
  const why = verify.blockers.length ? verify.blockers.map((b) => `• ${b.replace(/^⛔\s*/, '').slice(0, 220)}`).join('\n') : `• ${verify.error || '검증 응답 오류'}`;
  console.error(`✗ 최종 검증 실패 — 큐 발행을 중단합니다: ${verify.error || '반려'}`);
  if (await notifyDiscord(`🚨 네이버 글 발행 실패 — ${id}\n자동 수정 ${repairs}회 후에도 검증 반려\n${why}\n(다음 회차에 새 글로 계속합니다)`)) console.log('📣 디스코드 보고함');
  process.exit(1);
}

const meta = JSON.parse(await readFile(join(outDir, `${id}.json`), 'utf8'));
const html = await readFile(join(outDir, `${id}.html`));
const hash = createHash('sha1').update(html).digest('hex');
if (meta.verified?.html !== hash) {
  console.error('✗ 검증 뒤 본문이 바뀌었습니다 — 큐 발행을 중단합니다.');
  if (await notifyDiscord(`🚨 네이버 글 발행 실패 — ${id}\n검증 뒤 본문이 바뀌어 발행을 중단했어요.`)) console.log('📣 디스코드 보고함');
  process.exit(1);
}
console.log(`✓ 집필 종료 후 자체 리뷰·최종 검증 완료 — ${id}`);
