' 티스토리 세션 유지(2시간마다) — 스케줄작업 AZ2MZ_Tistory_Keepalive. 콘솔창 없이 실행(headless).
' 인증 쿠키가 세션 쿠키라 한동안 안 쓰면 끊긴다 → 주기적으로 관리페이지를 열어 갱신. 이미 끊겼으면 로그에 남기고 끝(자동 로그인 안 함).
' 로그: backend\out\blog\tistory-keepalive.log
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\workspace\side_project\aztomz"
sh.Run "cmd /c node backend\scripts\blog-publish.mjs --keepalive >> backend\out\blog\tistory-keepalive.log 2>&1", 0, False
