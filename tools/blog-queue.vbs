' 블로그 자동 발행 대기열(티스토리+네이버, 서로 다른 글) — 스케줄작업 AZ2MZ_Blog_Queue(매일 12:00·15:00·18:00).
' 콘솔창 없이 실행. 로그: backend\out\blog\blog-queue.log
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\blog-queue.mjs >> backend\out\blog\blog-queue.log 2>&1", 0, False
