#!/bin/bash
# launchd 작업 하나를 실행한다: tools/mac/job.sh <작업이름>. 로그는 Windows 때와 같은 파일에 쌓인다.
. "$(cd "$(dirname "$0")" && pwd)/env.sh"
cd "$AZ" || exit 1
mkdir -p backend/out/blog "$HERMES_HOME/logs"
B=backend/out/blog
case "$1" in
  blog-daily)   # tools/blog-daily.vbs 와 같은 흐름(2026-11-09~): 집필만 한다. 발행은 blog-queue(09~18시 매시간)가 맡는다
    echo "===== $(date)" >> $B/blog-daily.log
    claude -p --permission-mode acceptEdits "/blog-daily" >> $B/blog-daily.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then
      echo "===== daily drafting complete $(date)" >> $B/blog-daily.log
    else
      echo "===== daily drafting failed with exit code $rc $(date)" >> $B/blog-daily.log
    fi ;;
  blog-queue)             node backend/scripts/blog-queue.mjs --max-per-run=1 >> $B/blog-queue.log 2>&1 ;;
  discord-reactions)      exec node backend/scripts/discord-reactions.mjs >> backend/out/discord-reactions.log 2>&1 ;;
  tistory-daily-session)  { echo "===== $(date)"; node backend/scripts/blog-publish.mjs --daily-session; } >> $B/tistory-daily-session.log 2>&1 ;;
  tistory-keepalive)      node backend/scripts/blog-publish.mjs --keepalive >> $B/tistory-keepalive.log 2>&1 ;;
  hermes-autoupdate)      { echo "===== $(date)"; hermes update; } >> "$HERMES_HOME/logs/autoupdate.log" 2>&1 ;;
  *) echo "usage: job.sh blog-daily|blog-queue|discord-reactions|tistory-daily-session|tistory-keepalive|hermes-autoupdate" >&2; exit 2 ;;
esac
