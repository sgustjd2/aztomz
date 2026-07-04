# 내 한끗 (마이페이지)
- 목적: 로컬 계정 사용자가 이 브라우저에 저장한 트렌드와 본인이 쓴 후기를 모아 보게 한다.
- 진입/화면: `frontend/me.html`. 로그인 상태에서는 마스트헤드의 사용자명/아바타 링크로 진입하고, 비로그인 상태에서는 `H.loginHref('me.html')`로 로그인 후 복귀한다.
- 표시 데이터: `H.user()`의 `name`, `email`, `H.saves()`의 저장 ID 목록, `H.myReviews()`의 후기 목록. 저장 목록은 `H.TRENDS`에서 `title`, `label`, `coverHTML()` 데이터를 찾아 표시하고 저장 해제를 제공한다.
- 현재 상태: 구현됨. localStorage 기반 로컬 계정/저장/후기 데이터로 프로필, 저장한 트렌드, 내가 쓴 후기, 로그아웃이 동작한다.
- 관련 코드: `frontend/me.html`의 로그인 가드/`renderSaved()`/`renderMyReviews()`, `frontend/assets/app.js`의 `H.user()`, `H.saves()`, `H.toggleSave()`, `H.myReviews()`, `H.logout()`, `H.loginHref()`.
- 비고: 내 한끗 데이터는 공개 서버에 저장되지 않고 다른 기기와 동기화되지 않는다. `H.*`는 로컬 스토어 추상화 계층으로 유지한다.
