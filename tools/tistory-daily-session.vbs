' Tistory pre-publish session check — visible only when saved login autofill needs human help.
' Run every day at 11:00 before the noon publishing queue.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\blog-publish.mjs --daily-session", 1, False
