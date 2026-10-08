# 광고일까 진짜일까
- 목적: SNS 맛집·디저트·핫플의 광고 의심도, 후기 신뢰도, 만족도를 분리해 보여준다.
- 진입/화면: `frontend/index.html`의 광고 미리보기, `frontend/list.html?type=ad` 전체 목록, `frontend/trend.html?id=<신뢰분석id>` 상세. 광고 목록은 페이지당 10개이며 카테고리 필터는 노출하지 않는다.
- 표시 데이터: `type === '신뢰분석'` 항목. 목록은 `title`, `cat`, `buzz`, `label`, `ad`, `trust`, `analyzedAt`, `H.summary()`를 쓰고, 상세는 `sat`, `satTxt`, `pull`, `verdict`, `reasons`, `recs`, `src`, `shops`, `reviews`를 표시한다.
- 현재 상태: 구현됨. 현재 데이터 기준(2026-10-08) 신뢰분석 32건이 있으며 홈 상위 6개와 전체 목록/상세가 동작한다.
- 관련 코드: `frontend/index.html`의 광고 미리보기, `frontend/list.html`의 `type=ad` 분기와 페이지네이션, `frontend/assets/app.js`의 `H.adRowHTML()`/`H.summary()`, `frontend/trend.html`의 `scoresBlock()`, `shopsBlock()`, `renderReviews()`, `backend/data/trends.json`.
- 비고: 광고 의심도와 후기 신뢰도는 독립 추정치이며 만족도와도 별개다. 확정 판정처럼 쓰지 않는다.
- 재확인: `recheck-ad.mjs`는 출처 생존·관련성과 근거 대조(`lib/grounding.mjs`, 서술의 수치·매체·확산 표현이 출처 본문에 있는지)를 통과한 항목만 `analyzedAt`을 오늘로 갱신한다. 근거 대조 실패 항목은 갱신하지 않고 '사람 확인 필요'로 보고한다. 근거 대조는 신규 게시분과 재확인 대상에만 걸리며 기존 항목 전체를 일괄 재검사하지 않는다. 2026-10-08 전수 감사에서 182항목 중 139항목에 출처 밖 서술이 확인됐다(정정 현황은 `learnings.md` 2026-10-08 항목).
