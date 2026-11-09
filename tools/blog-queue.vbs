' 블로그 자동 발행 대기열(회차당 1편, T1/N9 일일 한도) — 스케줄작업 AZ2MZ_Blog_Queue(매일 09:00~18:00 매시간).
' 콘솔창 없이 실행. 로그: backend\out\blog\blog-queue.log
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\blog-queue.mjs --max-per-run=1 >> backend\out\blog\blog-queue.log 2>&1", 0, False
