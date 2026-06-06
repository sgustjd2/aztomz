# 공유

## 목적
개별 트렌드 분석을 SNS·메시지로 공유. 추천 링크 생성·OG 메타데이터 활용.

## 진입·화면
- **파일:** 
  - `frontend/quiz.html` (결과 화면: "📤 점수 자랑하기" 버튼)
  - `frontend/trend.html` (상세 페이지: 향후 추가 예정)
- **UI:** 공유 버튼 클릭 시 네이티브 공유 시트 (또는 링크 복사 폴백)

## 표시 데이터
- **퀴즈 결과 공유:**
  - 제목: "한끗 유행어 퀴즈"
  - 본문: "나 요즘 유행어 `score`/`maxQ`점 (MZ력 `percent`%) — `grade`! 너도 해봐"
  - URL: `quiz.html`
- **상세 페이지 공유 (향후):**
  - `t.id` (트렌드 ID)
  - `t.title` (제목)
  - `t.excerpt` (요약)
  - URL: `trend.html?id=<id>`

## 현재 상태
구현됨. `H.share()` 함수로 navigator.share (네이티브 공유 시트) → 링크 복사 폴백 구현. 현재 퀴즈 결과 공유에서 동작 중.

## 관련 코드
- `frontend/quiz.html` (L179~183) — 결과 화면의 "📤 점수 자랑하기" 버튼 핸들러
  ```javascript
  H.share({
    title: '한끗 유행어 퀴즈',
    text: `나 요즘 유행어 ${score}/${quiz.length}점 (MZ력 ${p}%) — ${grade}! 너도 해봐 👇`,
    url: SHARE_URL,
  });
  ```
- `frontend/assets/app.js` (L156~166) — H.share() 구현
  - `navigator.share()` (모바일 네이티브) → 성공
  - 실패 또는 미지원 → `navigator.clipboard.writeText()` (링크 복사) + 토스트

## 비고
- **네이티브 공유:** `navigator.share()` 지원 환경(iOS Safari 13+, Chrome for Android 61+)에서 OS 공유 시트 표시
- **폴백:** navigator.share 미지원 또는 AbortError(사용자 취소) → 링크 클립보드 복사 + "링크를 복사했어요" 토스트
- **OG 메타데이터:** `quiz.html` 및 `trend.html`의 `<meta property="og:*">` 태그로 카카오톡·링크 프리뷰 개선 가능
- **2차 구현 후보:**
  - trend.html 상세페이지에 공유 버튼 추가
  - "점수 대결" 모드 (URL 인자로 상대 점수 전달)
  - 카카오톡 공유 링크 (카카오 API 사용 시)
