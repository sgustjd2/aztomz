#!/usr/bin/env node
/* ============================================================
   한끗 — 대시보드 편집 자동 반영 (P2). launchd 가 몇 분마다 실행한다.
   DB 를 내보낸 결과가 trends.json 과 다르면(= Supabase 대시보드에서 고쳤다는 뜻)
   export → validate → trends.js 재생성(refresh) → git commit·pull --rebase·push.

   · 같으면 아무것도 안 한다(조용히 종료).
   · trends.json 이 store 밖에서 바뀐 상태(해시 불일치: 사람 수정·git pull)면 파일이 이긴다 → DB 를 파일로 맞추고 끝.
   · 검증 실패 시 파일을 건드리지 않고 로그만. main 이 아니거나 git 락이 있으면 파일만 쓰고 push 는 미룬다.

   node backend/scripts/trends-sync.mjs [--dry] [--no-git]
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { client, fetchAll, fromRow, serialize, MIRROR_STATE, DEFAULT_FILE } from './trends-db.mjs';
import { createStore } from './lib/trends-store.mjs';
import { validateTrends } from './validate-trends.mjs';
import { acquireGitLock } from './lib/git-lock.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry'), NO_GIT = args.includes('--no-git');
const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const sh = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const stamp = () => new Date().toISOString();
const say = (m) => console.log(`[${stamp()}] ${m}`);

async function main() {
  const fileText = readFileSync(DEFAULT_FILE, 'utf8');
  let state = {}; try { state = JSON.parse(readFileSync(MIRROR_STATE, 'utf8')); } catch {}
  if (state.hash !== sha1(fileText)) {   // 파일이 밖에서 바뀜 → 파일이 이긴다
    if (DRY) { say('파일이 store 밖에서 바뀜 — (dry) DB 를 파일로 맞출 예정'); return; }
    const r = await createStore().load();
    say(`파일이 store 밖에서 바뀜 → DB 를 파일로 맞춤 (${r.source})`);
    return;
  }
  const { rows, generatedAt } = await fetchAll(client());
  if (!rows.length) { say('DB 가 비어 있음 — 건너뜀'); return; }
  const trends = rows.map(fromRow);
  const text = serialize(generatedAt, trends);
  if (text === fileText) return;   // 변경 없음(조용히)

  const v = validateTrends(trends);
  if (!v.ok) { say('⛔ DB 내용이 스키마 검증 실패 — 파일·배포 안 건드림:\n' + v.errors.slice(0, 10).map((e) => '  · ' + e).join('\n')); process.exitCode = 1; return; }
  const old = new Map(JSON.parse(fileText).trends.map((t) => [t.id, JSON.stringify(t)]));
  const changed = trends.filter((t) => old.get(t.id) !== JSON.stringify(t)).map((t) => t.id);
  const removed = [...old.keys()].filter((id) => !trends.some((t) => t.id === id));
  say(`대시보드 변경 감지: 수정/추가 ${changed.length}건(${changed.slice(0, 5).join(', ')}) · 삭제 ${removed.length}건`);
  if (DRY) { say('[DRY] 파일·git 변경 없이 종료'); return; }

  writeFileSync(DEFAULT_FILE, text, 'utf8');
  writeFileSync(MIRROR_STATE, JSON.stringify({ hash: sha1(text), count: trends.length, at: stamp() }));
  execFileSync('node', [join(ROOT, 'backend', 'scripts', 'refresh.mjs')], { cwd: ROOT, stdio: 'inherit' });
  if (NO_GIT) { say('--no-git: 파일만 갱신'); return; }
  if (sh(['rev-parse', '--abbrev-ref', 'HEAD']).trim() !== 'main') { say('⛔ main 브랜치가 아님 — git 단계 보류(파일은 반영됨)'); return; }
  if (!acquireGitLock(ROOT, 'trends-sync.mjs')) { say('git 단계 보류(다른 작업이 git 사용 중) — 파일은 반영됨'); return; }
  try {
    sh(['add', 'backend/data/trends.json', 'frontend/data/trends.js']);
    sh(['commit', '-m', `auto: 대시보드 편집 반영 ${changed.length + removed.length}건 (${changed.slice(0, 3).join(', ')})`]);
    try { sh(['pull', '--rebase', '--autostash', 'origin', 'main']); }
    catch { try { sh(['rebase', '--abort']); } catch {} say('git 보류(rebase 충돌 — abort함)'); return; }
    sh(['push', 'origin', 'main']);
    say('pushed');
  } catch (e) { say(`git 보류(${String(e.stderr || e.message || '').slice(0, 150)})`); }
}

try { await main(); } catch (e) { say('오류: ' + e.message); process.exitCode = 1; }
