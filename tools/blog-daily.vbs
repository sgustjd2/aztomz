' 블로그 일일 집필(티스토리 5 + 네이버 5, 서로 다른 글) — 스케줄작업 AZ2MZ_Blog_Daily(매일 09:00).
' Hermes 잡(50분 대기 한도)에서 옮겨옴(2026-09-24). 시간 제한 없이 claude -p /blog-daily 를 콘솔창 없이 실행.
' 로그: backend\out\blog\blog-daily.log  → 발행은 AZ2MZ_Blog_Queue(12:00·15:00·18:00)가 이어받는다.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c (echo ===== %DATE% %TIME% & C:\Users\admin\AppData\Roaming\npm\claude.cmd -p --permission-mode acceptEdits ""/blog-daily"") >> backend\out\blog\blog-daily.log 2>&1", 0, False
