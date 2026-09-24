' 네이버 블로그 순차 발행 대기열(하루 1회, 스케줄작업 AZ2MZ_Naver_Queue) — 콘솔창 없이 실행.
' 로그: backend\out\blog\naver-queue.log
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\blog-publish-naver.mjs --queue >> backend\out\blog\naver-queue.log 2>&1", 0, False
