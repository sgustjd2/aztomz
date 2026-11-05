' 디스코드 크론 보고 이모지 선택지 감시(backend/scripts/discord-reactions.mjs) — 콘솔창 없이 상주 실행
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\discord-reactions.mjs >> backend\out\discord-reactions.log 2>&1", 0, False
