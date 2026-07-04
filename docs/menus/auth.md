# 로그인 / 회원가입
- 목적: 저장, 후기, 내 한끗 접근에 필요한 브라우저 로컬 계정 생성과 로그인을 제공한다.
- 진입/화면: `frontend/login.html`, `frontend/signup.html`, `frontend/me.html` 로그인 가드, 마스트헤드 인증 영역. `next` 파라미터는 `H.safeNext()`로 허용된 정적 페이지만 복귀시킨다.
- 표시 데이터: 회원가입은 `name`, `email`, `password`, 로그인은 `email`, `password`를 입력받는다. 저장소는 localStorage의 `hangeut.users`, `hangeut.session`, `hangeut.saves`, `hangeut.reviews`를 사용한다.
- 현재 상태: 구현됨. 회원가입, 중복 이메일 차단, 로그인, 로그아웃, 로그인 후 `next` 복귀, 이미 로그인한 사용자의 즉시 복귀가 localStorage 기반으로 동작한다.
- 관련 코드: `frontend/login.html`의 `next` 처리와 로그인 폼, `frontend/signup.html`의 `next` 처리와 가입 폼, `frontend/me.html`의 인증 가드, `frontend/assets/app.js`의 `H.safeNext()`, `H.loginHref()`, `H.signupHref()`, `H.signup()`, `H.login()`, `H.logout()`, `H.user()`.
- 비고: 로컬 계정 정보는 이 브라우저에만 남고 공개 서버에 저장되지 않으며 다른 기기와 동기화되지 않는다. 비밀번호 저장은 단순 해시이므로 중요한 비밀번호를 재사용하지 않도록 안내한다. `H.safeNext()` 허용 목록은 `index.html`, `list.html`, `trend.html`, `dictionary.html`, `login.html`, `signup.html`, `me.html`, `pulse.html`이다.
