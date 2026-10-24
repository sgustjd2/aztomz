# 요즘IT 에디토리얼 리프레시 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한끗의 홈, 목록, 상세, 사전, 펄스, 보관함, 인증 화면을 요즘IT의 절제된 매거진 톤을 참고한 일관된 콘텐츠 중심 디자인으로 개편한다.

**Architecture:** 정적 멀티페이지 구조와 `H.*` 헬퍼를 유지한다. 페이지별 중복 스타일을 `frontend/assets/styles.css`의 공통 토큰·컴포넌트로 옮기고, 공통 상단 내비게이션은 `H.renderMast()`에서 제공한다. 각 페이지는 기존 URL과 데이터 렌더링을 유지하면서 공유 카드·헤더 패턴을 사용한다.

**Tech Stack:** HTML, CSS, Vanilla JavaScript, 현재 `frontend/data/*.js` 생성 데이터. 새 라이브러리나 빌드 도구는 추가하지 않는다.

---

## 파일 구조와 책임

- `frontend/assets/styles.css` — 공통 Pretendard 토큰, 상단 메뉴, 매거진 컨테이너, 카드, 폼, 반응형/다크 테마.
- `frontend/assets/app.js` — 공통 메뉴와 링크 상태, 공용 콘텐츠/분석 카드 HTML 헬퍼.
- `frontend/index.html` — 홈 구조 및 데이터 기반 피처드/최신/인기 섹션. 페이지 고유 인라인 CSS를 공통 스타일로 이전한다.
- `frontend/list.html` — 광고 분석/트렌드의 검색·필터·페이지 카드 렌더링.
- `frontend/trend.html` — 상세 분석의 대표 이미지, 점수, 근거, 추천, 후기, 출처 순서.
- `frontend/dictionary.html` — 용어 탐색 및 사전 카드.
- `frontend/pulse.html`, `frontend/assets/pulse.js` — 펄스 목록과 펼친 상세 정보.
- `frontend/me.html`, `frontend/login.html`, `frontend/signup.html` — 보관함·인증 화면에서 공유 레이아웃/폼을 사용한다.
- `DESIGN.md` — 최종 토큰·컴포넌트 규칙을 구현 결과에 맞게 기록한다.

## Task 1: 공통 디자인 토큰과 상단 내비게이션

**Files:** `frontend/assets/styles.css`, `frontend/assets/app.js`, 모든 HTML의 CSS/JS 버전 query.

- [ ] **Step 1: 공통 토큰 정의**

  `styles.css`의 `:root`에 매거진 팔레트와 크기를 모은다. 배경은 흰색, 본문은 짙은 네이비/차콜, 선은 옅은 중성 회색, 브랜드 액션은 한끗 코럴, 신뢰 점수는 초록으로 제한한다. Pretendard 로컬 폰트를 계속 사용한다.

  ```css
  :root {
    --paper: #fff;
    --paper-2: #f7f8fa;
    --ink: #172540;
    --body: #4c5b70;
    --muted: #718096;
    --line: #e5e9ef;
    --accent: #e54756;
    --trust: #21885a;
    --content-max: 1200px;
    --card-radius: 10px;
  }
  ```

- [ ] **Step 2: 공통 상단 메뉴 마크업/렌더링 변경**

  `H.renderMast()`의 고정 좌측 메뉴를 화면 상단의 가로 메뉴로 바꾼다. 주요 링크는 `오늘의 한끗`, `광고 분석`, `요즘 트렌드`, `MZ 사전`, `내 보관함`으로 유지하고, 테마 전환을 보조 동작으로 둔다. 현재 경로에 해당하는 메뉴에 `aria-current="page"`를 표시한다.

- [ ] **Step 3: 상단 메뉴 반응형 규칙 작성**

  넓은 화면은 단일 헤더 안에 메뉴를 배치한다. 760px 이하에서는 브랜드와 메뉴 버튼만 남기고 메뉴를 접는다. 메뉴 열림/닫힘 상태는 기존 nav toggle 코드를 재사용한다. 키보드 focus-visible과 reduced-motion을 유지한다.

- [ ] **Step 4: 페이지 버전 갱신**

  `frontend/*.html`에서 공용 CSS/JS 참조에 새 `v=yozm-editorial-20261021` 값을 적용해 브라우저 캐시가 이전 레이아웃을 재사용하지 않게 한다.

## Task 2: 홈을 매거진형 첫 화면으로 재구성

**Files:** `frontend/index.html`, `frontend/assets/styles.css`, `DESIGN.md`.

- [ ] **Step 1: 홈의 인라인 디자인 규칙 공통 CSS로 이전**

  `.home-redesign` 전용 대형 스타일 블록을 정리하고 홈 고유 레이아웃만 `styles.css`의 홈 섹션 규칙으로 이동한다. 인라인 폰트·배경 값이 공통 토큰을 덮지 않게 한다.

- [ ] **Step 2: 첫 화면 정보 위계 적용**

  서비스 소개를 짧은 헤더로 배치한다. 최신 재확인 광고 분석을 현재 `#featured` 데이터 선택 방식 그대로 큰 피처드 카드로 두고, 이미지·분류·제목·짧은 설명·세 점수 요약을 제공한다.

- [ ] **Step 3: 탐색 섹션 카드 정리**

  요즘 트렌드는 이미지와 분류/제목/짧은 설명이 붙은 카드 그리드로 구성한다. 최신 분석은 썸네일·제목·요약과 광고 의심/후기 신뢰 게이지가 함께 있는 편집 피드로 둔다. 수집일 링크는 별도 아카이브 탐색 행으로 유지한다.

- [ ] **Step 4: 홈 필터·기록 경로 보존 확인**

  `?tag=`, `?date=`, `?date=all`, 카테고리 선택, 전체 보기 링크가 새 레이아웃에서도 동일한 결과를 렌더링하도록 현재 스크립트 바인딩을 보존한다.

## Task 3: 목록·상세 카드 패턴 통일

**Files:** `frontend/list.html`, `frontend/trend.html`, `frontend/assets/app.js`, `frontend/assets/styles.css`.

- [ ] **Step 1: 목록용 공용 카드 헬퍼 분리**

  `H.thumbHTML()`과 `H.scoreMetersHTML()`을 유지하고, 트렌드 카드와 분석 피드의 메타 순서를 공통 규칙으로 맞춘다. 썸네일이 없는 항목은 카테고리 커버를 사용하고 실제 촬영 이미지처럼 오해될 요소를 넣지 않는다.

- [ ] **Step 2: 광고 분석/트렌드 목록 레이아웃 변경**

  목록 제목과 건수, 검색/카테고리 조작을 목록 바로 위에 모은다. 기존 검색 입력, 카테고리 탭, 페이지 이동의 이벤트 핸들러와 URL 파라미터를 보존한다. 넓은 화면은 3열 카드, 중간 화면은 2열, 좁은 화면은 1열로 배치한다. 광고 분석 카드에는 라벨·점수 두 개를 항상 텍스트와 함께 표시한다.

- [ ] **Step 3: 상세 분석 정보 순서 재구성**

  `trend.html`의 기존 데이터 바인딩을 유지하고, 제목/대표 이미지 다음에 점수와 분석 요약, 근거/만족도/추천/후기/출처를 읽기 폭 안에 순서대로 배치한다. 링크와 저장 동작은 보존한다.

## Task 4: 사전과 보조 페이지를 같은 체계에 맞춤

**Files:** `frontend/dictionary.html`, `frontend/pulse.html`, `frontend/assets/pulse.js`, `frontend/me.html`, `frontend/login.html`, `frontend/signup.html`, `frontend/assets/styles.css`.

- [ ] **Step 1: 사전 카드 정리**

  용어 제목은 눈에 띄게 유지하되 기존보다 작은 카드 타이포를 적용한다. 뜻, 예문, 순화 표현, 출처를 일정한 순서로 보여주고 날짜는 보조 메타로 낮춘다.

- [ ] **Step 2: 펄스 카드와 펼침 상태 정리**

  펄스의 제목·플랫폼·성장 지표를 카드 상단에 모으고, 상세 아이디어는 펼친 영역에 표시한다. 저장과 펼침 핸들러는 유지한다.

- [ ] **Step 3: 보관함/로그인/가입 화면 통일**

  공통 헤더와 중앙 콘텐츠 폭을 적용한다. 보관함의 저장/후기/아이디어 탭과 로컬 저장 동작, 인증 폼과 유효성 처리, 비어 있는 상태의 안내를 그대로 둔다.

## Task 5: 디자인 문서와 시각 확인

**Files:** `DESIGN.md`, `frontend/*.html`, `frontend/assets/styles.css`.

- [ ] **Step 1: 디자인 문서를 최종 구현과 대조**

  `DESIGN.md`에서 제안 상태 문구를 제거하고 실제 토큰, 상단 메뉴, 카드 비율, 화면별 레이아웃과 반응형 기준을 기록한다.

- [ ] **Step 2: 모든 주요 경로를 브라우저에서 확인**

  로컬 프리뷰에서 `/`, `/list.html?type=ad`, `/list.html?type=trend`, `/trend.html?id=<현재 데이터 id>`, `/dictionary.html`, `/pulse.html`, `/me.html`, `/login.html`, `/signup.html`을 열어 각 화면이 정상 렌더링되는지 확인한다.

- [ ] **Step 3: 데스크톱/모바일 시각 확인**

  1440px 안팎과 390px 화면에서 메뉴, 피처드, 카드 수, 제목 줄바꿈, 썸네일, 점수, 폼의 겹침/가로 넘침을 확인한다. 문제가 보이면 CSS를 고친 뒤 해당 화면을 다시 캡처한다. 자동화 테스트는 추가하거나 실행하지 않는다.

## 범위 검토

- 화면별 요구는 Tasks 1–5에서 다룬다: 공통 시각 언어(1), 홈(2), 목록/상세(3), 사전 및 보조 화면(4), 문서/시각 확인(5).
- 기존 경로, 필터, 검색, 저장, 테마, 데이터 스키마를 유지하고 새 기능을 추가하지 않는다.
- 사용자 지시대로 구현 전 테스트를 추가/실행하지 않으며, 최종 확인은 브라우저의 시각 검토로 한다.
- 사용자 지정으로 커밋·푸시는 하지 않는다.
