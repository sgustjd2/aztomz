' Tistory pre-publish session check — auto-login first, then watch the dedicated browser for human auth.
' Run every day at 11:00 before the noon publishing queue; keep the task attached until login finishes.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c (echo ===== %DATE% %TIME% & node backend\scripts\blog-publish.mjs --daily-session) >> backend\out\blog\tistory-daily-session.log 2>&1", 1, True
