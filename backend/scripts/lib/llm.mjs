/* 검증·피드백용 LLM 호출 — GPT(codex) 를 먼저 쓰고, 실패하면 Claude Sonnet 5.5 로 넘어간다(2026-11-14).
   반환값은 `claude -p --output-format json` 과 같은 모양의 JSON 문자열({"result": "..."})이라 호출한 쪽 파서를 그대로 쓴다.
   왜: 무인(launchd) 실행에서 claude CLI 로그인이 풀리면 검증이 전부 실패해 글이 한 편도 발행되지 않았다. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const WIN = process.platform === 'win32';

export function runLLM(prompt, cwd) {
  const errs = [];
  if (!WIN && !process.env.NO_CODEX) {
    const dir = mkdtempSync(join(tmpdir(), 'az2mz-llm-'));
    const out = join(dir, 'last.txt');
    try {
      const PATH = `${join(homedir(), '.local/share/mise/installs/node/24/bin')}:${process.env.PATH || ''}`;
      execFileSync('codex', ['exec', '-m', 'gpt-6-luna', '-s', 'read-only', '--skip-git-repo-check', '-o', out, '-'], {
        cwd, encoding: 'utf8', timeout: 600000, maxBuffer: 20 * 1024 * 1024,
        input: prompt, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PATH },
      });
      const text = readFileSync(out, 'utf8').trim();
      if (text) return JSON.stringify({ result: text });
      errs.push('codex 빈 응답');
    } catch (e) {
      errs.push(`codex: ${String(e.message).slice(0, 120)}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.warn(`⚠ GPT(codex) 실패 → Claude 로 대체 (${errs.join(' / ')})`);
  }
  const CLI = process.env.CLAUDE_BIN || (WIN ? 'claude.cmd' : 'claude');
  const [bin, pre] = WIN ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', CLI]] : [CLI, []];
  return execFileSync(bin, [...pre, '-p', '--model', 'claude-sonnet-5-5', '--output-format', 'json'], {
    cwd, encoding: 'utf8', timeout: 600000, maxBuffer: 20 * 1024 * 1024, windowsHide: true,
    input: prompt, stdio: ['pipe', 'pipe', 'pipe'],
  });
}
