# 내 보관함
- 목적: 보관함 기능의 기존 구현과 현재 비노출 상태를 기록한다.
- 진입/화면: `frontend/me.html`은 현재 직접 접근하면 `index.html`로 이동한다. 공통 메뉴의 "내 보관함" 링크도 표시하지 않는다.
- 표시 데이터: 현재 화면에는 보관함 데이터를 표시하지 않는다. 기존 `H.saves()`·`H.myReviews()`·`H.pulseIdeas.list()`의 데이터와 렌더 함수는 내부에 보존한다.
- 현재 상태: 일시 제외. `H.FEATURES.personalCollection === false`이며 상세 저장 버튼과 펄스의 저장 버튼·저장 아이디어 탭도 표시하지 않는다. 펄스 아이디어 펼침은 유지한다.
- 관련 코드: `frontend/me.html`의 `renderSaved()`/`renderMyReviews()`/`renderPulseIdeas()`, `frontend/assets/app.js`의 `H.saves()`, `H.toggleSave()`, `H.myReviews()`, `H.pulseIdeas`.
- 비고: 기존 내 보관함 데이터는 삭제하지 않는다. 공개 서버에 저장되지 않고 다른 기기와 동기화되지 않는다. `H.*`는 로컬 스토어 추상화 계층으로 유지한다.
