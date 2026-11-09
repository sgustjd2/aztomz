' 블로그 일일 집필(티스토리 1 + 네이버 9, 서로 다른 글) — 스케줄작업 AZ2MZ_Blog_Daily(매일 07:00).
' 발행은 09:00~18:00 매시간 대기열 작업이 담당한다.
' Hermes 잡(50분 대기 한도)에서 옮겨옴(2026-09-24). 콘솔창 없이 실행.
' 로그: backend\out\blog\blog-daily.log, backend\out\blog\blog-queue.log
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c echo ===== %DATE% %TIME% >> backend\out\blog\blog-daily.log", 0, True
exitCode = sh.Run("cmd /c C:\Users\admin\AppData\Roaming\npm\claude.cmd -p --permission-mode acceptEdits ""/blog-daily"" >> backend\out\blog\blog-daily.log 2>&1", 0, True)
If exitCode = 0 Then
  sh.Run "cmd /c echo ===== daily drafting complete %DATE% %TIME% >> backend\out\blog\blog-daily.log", 0, True
Else
  sh.Run "cmd /c echo ===== daily drafting failed with exit code " & exitCode & " %DATE% %TIME% >> backend\out\blog\blog-daily.log", 0, True
End If
