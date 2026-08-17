/* 한끗 · git 작업 락
   여러 프로세스(Hermes 크론의 auto-build.mjs·recheck-ad.mjs, 인터랙티브 세션의 수동 git)가
   같은 작업 디렉토리에서 동시에 git add/commit/pull --rebase/push 를 하면 rebase가 중간에
   깨진 채 남는다(실측: 2026-08-16 21:15경 recheck-ad.mjs 추정 프로세스와 인터랙티브 세션이
   충돌해 .git/rebase-merge 에 autostash 만 남고 --continue/--abort 둘 다 실패하는 상태가 됨).

   .git/ 안에 락 파일을 둬서(트래킹 대상 아님 — git status에 안 뜬다) 이 두 스크립트끼리는
   서로 겹치지 않게 막는다. 인터랙티브 세션의 수동 git 명령까지는 강제할 수 없으니,
   CLAUDE.md에 "이 락이 걸려 있으면 git 작업을 피하라"는 안내를 별도로 둔다. */
import { openSync, closeSync, writeSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STALE_MS = 10 * 60 * 1000; // 10분 — 정상적인 git 단계가 이만큼 걸릴 일은 없다. 넘으면 죽은 락으로 간주.

function lockPath(repoRoot) {
  return join(repoRoot, '.git', 'az2mz-auto.lock');
}

/* 락을 얻으면 true, 다른 프로세스가 쥐고 있으면(신선하면) false.
   얻는 데 성공하면 process 종료 시(process.exit() 경로 포함) 자동으로 락을 풀도록 등록한다 —
   git 단계 곳곳에 process.exit()가 흩어져 있어 try/finally만으론 못 잡는다. */
export function acquireGitLock(repoRoot, scriptName) {
  const p = lockPath(repoRoot);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(p, 'wx'); // 이미 있으면 EEXIST로 실패 — 원자적 획득
      writeSync(fd, JSON.stringify({ pid: process.pid, script: scriptName, startedAt: new Date().toISOString() }));
      closeSync(fd);
      process.on('exit', () => { try { unlinkSync(p); } catch {} });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const info = JSON.parse(readFileSync(p, 'utf-8'));
        const age = Date.now() - new Date(info.startedAt).getTime();
        if (age > STALE_MS) {
          console.warn(`⚠ 오래된 git 락 발견(${Math.round(age / 1000)}초 전, ${info.script} pid ${info.pid}) — 정리하고 재시도`);
          unlinkSync(p);
          continue; // 재시도 — 이번엔 내가 얻는다
        }
        console.error(`⛔ 다른 프로세스(${info.script}, pid ${info.pid})가 ${Math.round(age / 1000)}초 전부터 git 작업 중 — 이번 실행은 git 단계를 건너뜀.`);
      } catch {
        console.error('⛔ git 락 파일이 있는데 읽을 수 없음 — 다른 프로세스가 작업 중인 것으로 간주하고 건너뜀.');
      }
      return false;
    }
  }
  return false;
}
