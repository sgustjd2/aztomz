#!/bin/bash
# launchd 작업 하나를 실행한다: tools/mac/job.sh <작업이름>. 로그는 Windows 때와 같은 파일에 쌓인다.
. "$(cd "$(dirname "$0")" && pwd)/env.sh"
cd "$AZ" || exit 1
mkdir -p backend/out/blog "$HERMES_HOME/logs"
B=backend/out/blog

# 집필 계열 작업(blog-daily, naver-hourly)은 한 번에 하나만 돈다 — 주제 선정이 겹치지 않게 순서대로 기다린다. $1 = 최대 대기 초
acquire_writer_lock() {
  local d=/tmp/az2mz-blog-writer.lock waited=0 pid
  while ! mkdir "$d" 2>/dev/null; do
    pid=$(cat "$d/pid" 2>/dev/null)
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$d"; continue; fi
    [ "$waited" -ge "$1" ] && return 1
    sleep 30; waited=$((waited+30))
  done
  echo $$ > "$d/pid"
  trap 'rm -rf /tmp/az2mz-blog-writer.lock' EXIT
}

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
  naver-hourly)   # 하루 8개 시각(07:30·08:30·11:30·12:30·17:30·19:00·20:30·21:30)에 네이버 1편: 조사·집필·검증(/blog-hourly-naver) → 성공이면 네이버 큐 발행
    acquire_writer_lock 2400 || { echo "===== $(date) skip: 이전 집필 작업이 계속 돌고 있음" >> $B/blog-hourly-naver.log; exit 0; }
    echo "===== $(date)" >> $B/blog-hourly-naver.log
    # 급상승 검색어 후보를 미리 파일로 떠 둔다(무인 claude 가 새 스크립트를 실행할 권한이 없어도 읽을 수 있게). 실패해도 회차는 계속.
    # 스킬이 시각별 글 유형을 고를 수 있게 실제 시작 시각(HH:MM)도 파일로 남긴다(무인 claude 는 date 명령 권한이 없다).
    date +%H:%M > $B/.run-slot.txt
    node backend/scripts/blog-hot-keywords.mjs > $B/.hot-keywords.txt 2>&1 || echo "UNAVAILABLE: 실행 실패" > $B/.hot-keywords.txt
    claude -p --permission-mode acceptEdits "/blog-hourly-naver" >> $B/blog-hourly-naver.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then
      echo "===== naver queue after hourly drafting $(date)" >> $B/blog-queue.log
      node backend/scripts/blog-queue.mjs --only=naver --max-per-run=1 >> $B/blog-queue.log 2>&1
    else
      echo "===== hourly drafting failed with exit code $rc $(date)" >> $B/blog-hourly-naver.log
    fi ;;
  blog-queue)             node backend/scripts/blog-queue.mjs --max-per-run=1 >> $B/blog-queue.log 2>&1 ;;
  discord-reactions)      exec node backend/scripts/discord-reactions.mjs >> backend/out/discord-reactions.log 2>&1 ;;
  tistory-daily-session)  { echo "===== $(date)"; node backend/scripts/blog-publish.mjs --daily-session; } >> $B/tistory-daily-session.log 2>&1 ;;
  tistory-keepalive)      node backend/scripts/blog-publish.mjs --keepalive >> $B/tistory-keepalive.log 2>&1 ;;
  hermes-autoupdate)      { echo "===== $(date)"; hermes update; } >> "$HERMES_HOME/logs/autoupdate.log" 2>&1 ;;
  *) echo "usage: job.sh blog-daily|naver-hourly|blog-queue|discord-reactions|tistory-daily-session|tistory-keepalive|hermes-autoupdate" >&2; exit 2 ;;
esac
