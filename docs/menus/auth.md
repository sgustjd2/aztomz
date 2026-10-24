# 로그인 / 회원가입 안내
- 목적: 과거 정적 링크 안정성을 위해 `login.html`, `signup.html`을 유지하되, 현재 한끗은 로그인 없이 사용할 수 있음을 안내한다.
- 진입/화면: 일반 서비스 플로우에서는 노출하지 않는다. 사용자가 직접 `frontend/login.html` 또는 `frontend/signup.html`에 접근하면 noindex 안내 페이지와 "홈으로 이동", "요즘 트렌드 보기" 버튼을 보여준다.
- 표시 데이터: 별도 입력 폼 없음. 트렌드와 분석 콘텐츠를 로그인 없이 읽을 수 있다는 안내 문구를 표시한다.
- 현재 상태: 로그인/회원가입 UI 제거됨. 방문자 후기와 보관함·저장 UI는 현재 기능 플래그로 비노출하며, 기존 로컬 스토어 함수와 데이터는 보존한다.
- 관련 코드: `frontend/login.html`, `frontend/signup.html`, `frontend/assets/app.js`의 deprecated `H.signup()`, `H.login()`, `H.logout()`, `H.user()`.
- 비고: `login.html`과 `signup.html`은 직접 접근 안정성용 파일이며 검색 노출을 막기 위해 `noindex,nofollow`를 둔다.
