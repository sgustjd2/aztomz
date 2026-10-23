# 한끗 반응형 UI 피드백 반영 계획

> 실행: 사용자 요청에 따라 조사 → UI 전문가 피드백 → 단계별 수정 → 실제 브라우저 재검증.

**Goal:** 중간 해상도의 빈 여백을 없애고, 접을 수 있는 사이드 메뉴·일관된 아이콘·읽기 쉬운 글자·정돈된 대표 이미지로 전체 화면을 정리한다.

**Architecture:** 기존 정적 HTML/CSS와 H 헬퍼를 유지한다. 공유 레이아웃은 body의 `--nav-width`와 padding으로 계산하고 화면 너비에서 임의 픽셀을 빼는 중복 calc를 없앤다. 데이터·점수·URL·로컬 저장 동작은 유지한다.

**Tech Stack:** HTML, CSS, Vanilla JS, 로컬 Pretendard·Lucide. 새 런타임 의존성 없음.

## 조사 및 결정 근거

- 증거: `backend/out/ui-audit/2026-10-23/`의 한끗 및 무신사·캐릿·요즘IT 1440/768/390px 캡처.
- 한끗 768px: nav 전환 900px와 본문 offset 전환 760px가 달라 빈244px와 가로 넘침 발생.
- 로고에 홈 아이콘: nav 안으로 제한하지 않은 링크 선택자가 로고를 먼저 선택.
- 제목/설명/메타가 모바일에서 9.5~15px로 축소. 대표 커버와 본문에 긴 제목이 두 번 등장.
- 비교 사이트는 인기도 순위를 입증한 표본이 아니다. 무신사는 사용자 지정 탐색 기준, 캐릿은 트렌드·사전 유사성, 요즘IT는 콘텐츠 카드 기준으로 선택했다.
- 무신사식 카테고리 탐색·일관된 아이콘을 채택한다. 과밀 배너·형광 브랜드색·다단 헤더는 복제하지 않는다.

## Task 1: 공유 메뉴와 폭 계산

**Files:** `frontend/assets/app.js`, `frontend/assets/styles.css`, `frontend/assets/icons/lucide/{menu,x,panel-left-open,panel-left-close}.svg`

- [x] `H.renderMast()`에서 메뉴 링크/아이콘을 같은 데이터로 렌더링하고 로고와 분리한다.
- [x] 1025px 이상: 기본224px 사이드바, 버튼으로76px 레일 전환. `hangeut.navCollapsed`로 사용자 선택을 기억한다. 레일에서도 5개 메뉴의 아이콘·접근 가능한 이름·툴팁을 유지한다.
- [x] 1024px 이하: 본문 offset을 즉시0으로 바꾸고 높이64px 브랜드바+왼쪽 drawer. 같은 메뉴 항목을 사용한다.
- [x] drawer는 scrim·닫기 버튼·Escape·Tab 순환·포커스 복원·배경 inert/스크롤 잠금을 지원한다. resize 시 drawer 상태를 정리한다.
- [x] 관련 카테고리를 기존 `list.html?type=trend&cat=` 링크로 탐색하게 한다. 새 화면/데이터 필드는 만들지 않는다.

## Task 2: 타이포·공간·카드

**Files:** `frontend/assets/styles.css`, `frontend/index.html`, `frontend/list.html`

- [x] root에 `--text-body:clamp(15px, .3vw + 13px, 17px)`, `--text-card:clamp(17px, .45vw + 14px, 21px)`, `--text-meta:clamp(12px, .15vw + 11px, 14px)`를 둔다. 기존 페이지별 작은 값은 해당 토큰으로 바꾼다.
- [x] 본문 컨테이너는 가용폭100%/최대1360px, 읽기폭840px. padding은16~40px. breakpoint와 sidebar offset은 한곳에서 관리한다.
- [x] 홈 소개는 짧은 한줄 제목/설명으로 압축한다. featured의 장식 테두리·그림자를 없애고 이미지·본문2열, 작은화면1열로 정돈한다.
- [x] 홈/목록 카드는 컨테이너 폭 기준 minmax 그리드로 1~4열에 적응한다. 작은 글자 대신 카드 수와 레이아웃을 바꾼다.
- [x] 긴 제목/메타·점수·날짜는 overflow를 일으키지 않으며 날짜를 과도한 배지로 강조하지 않는다. 리스트 필터는 일반 버튼+aria-pressed로 정리한다.

## Task 3: 대표 이미지

**Files:** `frontend/assets/app.js`, `frontend/assets/styles.css`, 필요 시 로컬 이미지 asset

- [x] 실제 이미지가 있으면 사진만 보이고 제목/판정은 본문에 한 번만 둔다. 원본사진의 크롭을 일정하게 한다.
- [x] 이미지 없는 경우 실제 장소인 척하지 않는 편집 커버를 사용한다. 긴 헤드라인·판정·화제성 문장을 이미지에 겹치지 않는다.
- [x] 실제 사진 로드 실패도 같은 편집 커버로 전환한다. 홈/분석/트렌드/상세/보관함에서 같은 기준을 쓴다.

## Task 4: 재사용 스킬과 문서

**Files:** `C:/Users/admin/.codex/skills/ui-expert-feedback/SKILL.md`, `docs/design/ui-review-2026-10-23.md`, `DESIGN.md`, 영향받는 메뉴 문서

- [x] gpt-6-luna 전문가가 비교 피드백과 재발방지 조건을 스킬로 작성한다.
- [x] 사용자 요청시 모델을 명시적으로 선택하고, 최신사이트·캡처·뷰포트·UA·증거한계를 남긴다.
- [x] 보고서에서 사실/해석/개선/검증상태를 구분한다. 실제 구현에 맞춰 DESIGN.md와 메뉴 설명을 갱신한다.
- [x] skill-creator의 quick_validate.py로 스킬 frontmatter와 구조를 검증한다.

## Task 5: 실제 브라우저 확인

- [x] 390/768/1024/1025/1280/1440/1920px에서 document scrollWidth≤clientWidth를 확인한다. 브라우저 기본 스크롤바 폭은 별도로 고려한다.
- [x] 홈·광고목록·트렌드목록·상세·사전·펄스·보관함·인증을 390/768/1440에서 순회한다.
- [x] 메뉴 접기/펼치기·라우트별 활성상태·drawer Escape/포커스/resize·테마·카테고리·페이지 이동·저장·사전 검색을 실제 UI로 확인한다.
- [x] 같은 조건의 전후 캡처를 저장하고 gpt-6-luna가 다시 확인한다. 자동 UI 테스트 코드를 새로 만들지 않는다.
- [x] 본 작업의 변경만 검토한다. 기존 다른 로컬 작업은 유지한다. 배포 상태는 실제 확인한 범위만 보고한다.
