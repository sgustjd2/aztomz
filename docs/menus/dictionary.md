# MZ어 / 밈 사전

## 목적
신조어·밈을 트렌드로 큐레이션. 유래·우리말 대체·쓰임새 설명.

## 진입·화면
- **파일:** 
  - `frontend/dictionary.html` (사전 홈: 검색·목록)
  - `frontend/trend.html?id=<신조어id>` (상세 페이지)
  - 마스트헤드 "MZ 사전" 링크
- **타입:** coverCat=='cat-slang' 또는 type=='신조어'
- **표시:** 검색창 + 단어 목록(단어·def·pureKorean·신선도·출처 링크)

## 표시 데이터
- `t.title` (신조어)
- **`t.def`** (필수) — 한 줄 뜻. 사전 목록과 퀴즈 힌트로 사용
- **`t.pureKorean`** (선택) — 예쁜 우리말 대체어. "🌸 예쁜 우리말 · ~" 뱃지로 표시
- `t.analyzedAt` (신선도) — "~일 전" / "오늘 분석" 칩
- `t.stage` (선택) — 유행 단계. 목록에 소형 뱃지로 표시
- `t.excerpt` / `t.verdict` (장문 설명) — 상세페이지에서 확인
- `t.src` (출처) — 상세페이지에서 확인

## 현재 상태
구현됨. `frontend/dictionary.html`에서 신조어 목록·검색·필터링 완성. 현재 신조어 4개(난리자베스·영크크·늙크크·샤갈) 모두 def 필드 포함.

## 관련 코드
- `frontend/dictionary.html` — 사전 화면 (L1~108)
  - 검색 엔진: `render(q)` (L93~103) — title·def·pureKorean·tags 모두 대상
  - 신조어 필터: `H.TRENDS.filter(t=>t.coverCat==='cat-slang' || t.cat==='신조어')`
  - 정렬: 가나다순
- `frontend/trend.html` — 상세 페이지 (단어 클릭 시 이동)
- `frontend/assets/app.js`
  - `H.share()` (L156~166) — 상세페이지 공유 (예정)
  - `H.freshChip()` 신선도 표시
- `backend/data/trends.json` — cat-slang 항목들의 def 필드

## 비고
- **def 필드:** 필수. 퀴즈의 힌트가 됨.
- **신조어 수명:** 2024년산 신조어는 2026.6 기준 한물. 출처에 "2024 신조어" 표시면 재검증 필수 (learnings.md 참고)
- **2026 상반기 신조어:** 난리자베스·영크크·늙크크·샤갈 등 (learnings.md 기록)
- **pureKorean 필드:** 선택사항. 없어도 사전 검색/표시는 정상 동작.
- **퀴즈 연계:** dictionary.html의 CTA ("🎮 내 MZ력은 몇 점?") → quiz.html로 이동. 같은 신조어 풀 사용.
