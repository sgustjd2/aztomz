# 홈 (오늘의 한끗)

## 목적
오늘 분석 된 트렌드를 1화면에 미리보기 형으로 제공. 광고·트렌드 전체 목록으로의 진입 버튼으로 유도.

## 진입·화면
- **파일:** `frontend/index.html`
- **섹션 1: Lead** — 서비스 소개 헤드라인 + 신선도 ("분석 N건 · 마지막 갱신 YYYY.MM.DD")
- **섹션 2: Featured** — 첫 신뢰분석 항목 (타입=='신뢰분석'의 첫 건) → 큰 카드 + 점수 배지
- **섹션 3: "광고일까 진짜일까"** — 신뢰분석 상위 6개만 랭킹 인덱스로 표시 + "광고 분석 전체보기 +N" 버튼 (→ `list.html?type=ad`)
- **섹션 4: "요즘 트렌드"** — 카테고리 필터 + 스트립 상위 8개만 표시 + "트렌드 전체보기 +N" 버튼 (→ `list.html?type=trend`)

## 표시 데이터
- `H.TRENDS` 전체 (trends.json에서 로드)
- 필드: id·title·cat·buzz·ad·trust·sat·label·analyzedAt·stage(트렌드만)·coverCat
- 신선도 칩: `H.freshness(analyzedAt)` (오늘/N일 전/갱신 필요)

## 현재 상태
구현됨. 마스트헤드 + 리드 + 피처드 + 광고 미리보기(상위 6개) + 트렌드 미리보기(상위 8개) + 카테고리 필터 + 더보기 버튼 전부 동작 확인 (2026-06-05).

## 관련 코드
- `frontend/index.html` : 마크업 + 스타일 + 더보기 로직 (L1~137)
  - L95~105: 광고 미리보기 (HOME_AD_MAX=6, adMore 버튼 렌더링)
  - L107~136: 트렌드 미리보기 (HOME_TREND_MAX=8, stripMore 버튼 + 카테고리 필터)
- `frontend/assets/app.js` : H.TRENDS, H.detailHref(), H.adRowHTML(), H.trendCardHTML(), H.coverHTML(), H.freshChip(), H.feedFreshness() (L12~24, L122~148)
- `backend/data/trends.json` : 데이터 원본

## 비고
- 광고 미리보기: 신뢰분석 타입 상위 6개만 표시 (전체는 list.html?type=ad로 이동)
- 트렌드 미리보기: 타입=='트렌드' 상위 8개만 표시, 활성 카테고리 기준 (전체는 list.html?type=trend로 이동)
- 카테고리 필터: "전체" + 고유 카테고리 동적 생성
- 요청 버튼('분석 요청하기'): 현재 # 링크, 추후 카카오 오픈채팅·구글폼으로 교체 필요 (미구현/2차)
