# 검색
- 목적: 사용자가 단어, 뜻, 트렌드, 태그, 수집일 기준으로 콘텐츠를 좁혀 찾게 한다.
- 진입/화면: 통합 `search.html`은 없다. 현재 검색/필터 진입점은 `frontend/dictionary.html`의 사전 검색, `frontend/pulse.html`의 펄스 검색, `frontend/index.html?tag=`/`?date=` 필터 결과, `frontend/list.html?type=trend&cat=` 카테고리 필터다.
- 표시 데이터: 사전 검색은 `title`, `def`, `pureKorean`, `tags`를 대상으로 하고, 펄스 검색은 `kw`, `why`, `angle`, `tags` 성격의 펄스 데이터를 대상으로 한다. 홈 필터는 `backend/data/trends.json`의 `tags`와 `collectedAt`을 사용한다.
- 현재 상태: 2차 / 부분 구현. 통합 검색 페이지는 미구현이고, 메뉴별 검색·필터는 구현되어 있다.
- 관련 코드: `frontend/dictionary.html`의 `render(q)`, `frontend/pulse.html`/`frontend/assets/pulse.js`의 `#tpSearch`, `frontend/index.html`의 `?tag=`/`?date=` 필터 모드, `frontend/list.html`의 카테고리 필터·`syncURL()`·`popstate` 복원, `frontend/assets/app.js`의 `H.normalizeCategory()`/`H.NAV_CATEGORIES`/`H.syncMastCurrent()`.
- 비고: 목록 카테고리 필터는 공통 메뉴 순서를 따르며 `음식`/`핫플`/`밈`/`유행어` 별칭을 정규 분류로 바꾼다. 잘못된 분류는 전체로 정리하고, 뒤로/앞으로 이동 시 필터·페이지·메뉴 선택을 복원한다. PRD의 전역 검색 요구사항은 아직 별도 화면으로 구현되지 않았다. 현재는 목록/사전/펄스 내 검색으로 대체한다.
