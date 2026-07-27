/* ============================================================
   웹 검색 (ddgs) — 뉴스·동향 글의 사실 근거

   LLM 은 학습 시점 이후를 모른다. 그런데 "2026년 AI 동향" 을 쓰라고 하면
   **존재하지 않는 출처를 지어낸다**(2026-07-25 실측: 검수가 "미래의 자료를 출처로 제시" 로 반려).
   음악에서 유튜브로 실존 곡을 먼저 찾았듯이, 뉴스도 **실제 기사를 먼저 찾아** 넘겨야 한다.

   auto-build.mjs 가 쓰는 것과 같은 ddgs 실행파일을 재사용한다.
   ⚠ PYTHONIOENCODING/PYTHONUTF8 를 반드시 준다 — 없으면 Windows cp949 로 한글 질의가 깨진다.
   ============================================================ */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const tmpDir = join(repoRoot, 'backend', 'out', 'search');

const DDGS = process.env.DDGS_EXE
  || 'E:/workspace/side_project/hermes/hermes-agent/venv/Scripts/ddgs.exe';
const PYENV = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };

/**
 * 웹 검색. ddgs 는 stdout 이 아니라 -o 로 준 **파일**에 JSON 을 쓴다.
 * @param {string} query
 * @param {{timelimit?:'d'|'w'|'m'|'y', max?:number, region?:string}} opt
 * @returns {Array<{title:string, href:string, body:string}>}
 */
export function search(query, { timelimit = 'm', max = 8, region = null } = {}) {
  mkdirSync(tmpDir, { recursive: true });
  const out = join(tmpDir, `q-${Buffer.from(query).toString('hex').slice(0, 24)}.json`);
  if (existsSync(out)) unlinkSync(out);
  const args = ['text', '-q', query, '-t', timelimit, '-m', String(max), '-o', out, '-nc'];
  if (region) args.push('-r', region);
  try {
    execFileSync(DDGS, args, { env: PYENV, timeout: 90000, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    console.warn(`  ⚠ 검색 실패("${query}"): ${String(e.message).slice(0, 80)}`);
    return [];
  }
  if (!existsSync(out)) return [];
  try {
    const rows = JSON.parse(readFileSync(out, 'utf8'));
    unlinkSync(out);
    return Array.isArray(rows) ? rows.filter((r) => r.href && r.title) : [];
  } catch { return []; }
}

/** 페이지 본문을 읽는다. 못 읽으면 빈 문자열(로그인벽·JS앱). */
export function extract(url, { maxChars = 2500 } = {}) {
  try {
    const t = execFileSync(DDGS, ['extract', '-u', url, '-f', 'text'],
      { env: PYENV, timeout: 60000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return String(t || '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
  } catch { return ''; }
}

/**
 * 뉴스 근거 묶음을 만든다 — 검색 → 본문 확인 → 못 읽는 건 버린다.
 * 본문을 실제로 읽은 것만 남기므로, LLM 이 "출처는 있는데 내용은 모르는" 상태가 되지 않는다.
 */
export function gatherSources(queries, { timelimit = 'w', perQuery = 6, want = 6 } = {}) {
  const seen = new Set();
  const hits = [];
  for (const q of queries) {
    for (const r of search(q, { timelimit, max: perQuery })) {
      let host;
      try { host = new URL(r.href).hostname.replace(/^www\./, ''); } catch { continue; }
      if (seen.has(r.href) || seen.has(host)) continue;   // 같은 매체 도배 방지
      seen.add(r.href); seen.add(host);
      hits.push({ ...r, host });
    }
  }

  const sources = [];
  for (const h of hits) {
    if (sources.length >= want) break;
    const body = extract(h.href);
    if (body.length < 300) { console.log(`  · 본문 못 읽음, 제외 — ${h.host}`); continue; }
    sources.push({ title: h.title, url: h.href, host: h.host, snippet: h.body, body });
    console.log(`  ✅ ${h.host} — ${h.title.slice(0, 60)}`);
  }
  return sources;
}
