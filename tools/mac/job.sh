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
  naver-hourly)   # 하루 7개 시각마다 글 1편(2026-11-10 보호조치 후 조정): 조사·집필·검증(/blog-hourly-naver) → 성공이면 네이버 큐 발행. 새벽 제외, 피크 직전 발행 시각(2026-11-12)
    # 보호조치·세션 이상을 감지하면 .naver-hold 가 생기고, 있으면 쓰지도 올리지도 않는다(지우면 재개).
    [ -e $B/.naver-hold ] && { echo "===== $(date) skip: .naver-hold(네이버 발행 보류 중)" >> $B/blog-hourly-naver.log; exit 0; }
    # 시작 시각에 가장 가까운 지난 슬롯으로 카테고리를 정한다: 장소·핫플은 11:05·19:35(하루 2편), 나머지는 생활·제철
    hm=$(date +%H%M); slot=07:05; cat=life-info
    for s in 0705:07:05:life-info 0905:09:05:life-info 1105:11:05:hangeut-trend 1315:13:15:life-info 1725:17:25:life-info 1935:19:35:hangeut-trend 2135:21:35:life-info; do
      [ "${s%%:*}" -le "$hm" ] && { slot=$(echo "$s" | cut -d: -f2-3); cat=${s##*:}; }
    done
    # 정각에 박히지 않게 0~25분 무작위로 늦춘다(사람이 쓴 것처럼). 락 대기는 그 뒤부터 센다.
    sleep $((RANDOM % 1500))
    acquire_writer_lock 3600 || { echo "===== $(date) skip: 이전 집필 작업이 계속 돌고 있음" >> $B/blog-hourly-naver.log; exit 0; }
    echo "$slot" > $B/.run-slot.txt
    echo "$cat" > $B/.run-category.txt
    echo "===== $(date) [$cat] slot $slot" >> $B/blog-hourly-naver.log
    node backend/scripts/blog-hot-keywords.mjs > $B/.hot-keywords.txt 2>&1 || echo "UNAVAILABLE: 실행 실패" > $B/.hot-keywords.txt
    claude -p --permission-mode acceptEdits "/blog-hourly-naver $cat" >> $B/blog-hourly-naver.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then
      echo "===== naver queue after hourly drafting [$cat] $(date)" >> $B/blog-queue.log
      node backend/scripts/blog-queue.mjs --only=naver --max-per-run=1 >> $B/blog-queue.log 2>&1
    else
      echo "===== hourly drafting failed [$cat] with exit code $rc $(date)" >> $B/blog-hourly-naver.log
    fi ;;
  blog-queue)             node backend/scripts/blog-queue.mjs --max-per-run=1 >> $B/blog-queue.log 2>&1 ;;
  discord-reactions)      exec node backend/scripts/discord-reactions.mjs >> backend/out/discord-reactions.log 2>&1 ;;
  tistory-daily-session)  { echo "===== $(date)"; node backend/scripts/blog-publish.mjs --daily-session; } >> $B/tistory-daily-session.log 2>&1 ;;
  tistory-keepalive)      node backend/scripts/blog-publish.mjs --keepalive >> $B/tistory-keepalive.log 2>&1 ;;
  hermes-autoupdate)      { echo "===== $(date)"; hermes update; } >> "$HERMES_HOME/logs/autoupdate.log" 2>&1 ;;
  *) echo "usage: job.sh blog-daily|naver-hourly|blog-queue|discord-reactions|tistory-daily-session|tistory-keepalive|hermes-autoupdate" >&2; exit 2 ;;
esac
