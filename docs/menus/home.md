# 오늘의 한끗 (홈)
- 목적: 오늘 기준으로 볼 만한 신뢰분석과 트렌드를 한 화면에서 미리 보여주고 전체 목록으로 연결한다.
- 진입/화면: `frontend/index.html`. 공통 메뉴의 "오늘의 한끗"이며, 짧은 리드/오늘의 분석/지금 주목할 한끗/최근 분석/분석 요청 영역으로 구성된다. `?tag=`와 `?date=`가 있으면 홈 대신 필터 결과 화면을 보여준다.
- 표시 데이터: `H.TRENDS` 전체. 신뢰분석은 `type`, `ad`, `trust`, `sat`, `label`, `analyzedAt`, `buzz`를 쓰고, 트렌드 카드는 `cat`, `stage`, `title`, `images`, `analyzedAt`와 `H.summary()`가 고른 짧은 설명(`excerpt`/`def`/`stageMsg`/`verdict`/`pull`)을 표시한다.
- 현재 상태: 구현됨. 홈은 광고 분석 상위 6개, 트렌드 상위 8개를 미리 보여준다. 트렌드 카드는 가용 폭에 따라 열 수를 조절한다. CSS subgrid 지원 환경에서 홈·전체 목록의 트렌드 카드는 같은 행의 이미지·분류·제목·설명·선택 정보·날짜 영역을 공유해 내용 길이나 선택 항목 유무에 관계없이 다음 영역의 시작선을 맞춘다. 또한 공통 메뉴는 데스크톱 사이드바 하단 접기 버튼과 좁은 화면 상단 오른쪽 메뉴 버튼·슬라이드 메뉴를 제공한다. 공통 카드의 대표 이미지가 없거나 로드에 실패하면 카테고리별 기본 일러스트 SVG를 표시한다. 더보기는 `list.html?type=ad`와 `list.html?type=trend`로 이동한다.
- 관련 코드: `frontend/index.html`의 필터 모드/오늘의 한끗/미리보기 렌더링, `frontend/assets/app.js`의 `H.renderMast()`, `H.adRowHTML()`, `H.trendCardHTML()`, `H.coverHTML()`, `H.coverDefault()`, `H.summary()`, `H.freshChip()`, `backend/data/trends.json`.
- 비고: 오늘의 한끗은 가장 최근 재확인된 신뢰분석을 기준으로 회전한다(같은 날짜가 여럿이면 날짜 기준으로 순환). 재확인 때 출처 생존·관련성은 통과해도 서술의 수치·매체·확산 표현이 출처 본문에 없으면(근거 대조 실패) `analyzedAt`이 갱신되지 않아 홈에 올라가지 않는다(이번 회차에 본문을 못 읽은 출처만 남았으면 대조를 건너뛴다). 정적 데이터 생성은 GitHub Actions `weekly-refresh` 또는 수동 `refresh.mjs` 실행으로 반영하고, 로컬 Hermes 재확인은 실제 출처 재검증이 된 항목만 `analyzedAt`을 갱신한다. 점수는 모두 추정치로 표기한다.
