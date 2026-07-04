# 오늘의 한끗 (홈)
- 목적: 오늘 기준으로 볼 만한 신뢰분석과 트렌드를 한 화면에서 미리 보여주고 전체 목록으로 연결한다.
- 진입/화면: `frontend/index.html`. 마스트헤드 메뉴의 "오늘의 한끗"이며, 리드/오늘의 한끗/광고일까 진짜일까/요즘 트렌드/분석 요청 영역으로 구성된다. `?tag=`와 `?date=`가 있으면 홈 대신 필터 결과 화면을 보여준다.
- 표시 데이터: `H.TRENDS` 전체. 신뢰분석은 `type`, `ad`, `trust`, `sat`, `label`, `analyzedAt`, `buzz`를 쓰고, 트렌드 카드는 `cat`, `stage`, `title`, `images`, `analyzedAt`와 `H.summary()`가 고른 짧은 설명(`excerpt`/`def`/`stageMsg`/`verdict`/`pull`)을 표시한다.
- 현재 상태: 구현됨. 홈은 광고 분석 상위 6개, 트렌드 상위 8개를 미리 보여주며 더보기는 `list.html?type=ad`와 `list.html?type=trend`로 이동한다.
- 관련 코드: `frontend/index.html`의 필터 모드/오늘의 한끗/미리보기 렌더링, `frontend/assets/app.js`의 `H.renderMast()`, `H.adRowHTML()`, `H.trendCardHTML()`, `H.summary()`, `H.freshChip()`, `backend/data/trends.json`.
- 비고: 오늘의 한끗은 가장 최근 재확인된 신뢰분석을 기준으로 회전한다. 정적 데이터 생성은 GitHub Actions `weekly-refresh` 또는 수동 `refresh.mjs` 실행으로 반영하고, 로컬 Hermes 재확인은 실제 출처 재검증이 된 항목만 `analyzedAt`을 갱신한다. 점수는 모두 추정치로 표기한다.
