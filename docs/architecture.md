# 한끗 — 정적 멀티페이지 구조

## 현재 구조
의존성 0, 빌드 0. `frontend/`만 Vercel이 서빙하고, `backend/`는 데이터 원본과 운영 스크립트를 담는 비배포 영역이다.

```
frontend/  ← Vercel outputDirectory(이것만 배포)
backend/   ← canonical 데이터·검증·생성 스크립트(비공개)

frontend/index.html      홈 — 오늘의 한끗 · 광고일까 진짜일까 · 요즘 트렌드
frontend/list.html       전체 목록 — 광고분석/트렌드 목록 + 페이지네이션
frontend/trend.html?id=  상세 — 점수 · 만족도 · 판단 · 출처 · 공유 · 함께 보기
frontend/dictionary.html MZ 사전 — 신조어 검색/열람
frontend/pulse.html      트렌드 펄스 — 창업 트렌드 레이더
frontend/assets/styles.css  로컬 Pretendard 기반 에디토리얼 디자인 시스템
frontend/assets/app.js      H.* 공개 데이터 조회·공유·화면 설정 헬퍼
backend/data/trends.json ★ 트렌드 canonical 원본
frontend/data/trends.js  ← backend/scripts/refresh.mjs 생성물(직접 편집 금지)
```

## 운영 원칙
- 한끗은 현재 **정적 멀티페이지 + 정적 데이터 갱신 + 공개 콘텐츠 읽기/공유**로 운영한다.
- 로그인·계정·개인 저장·방문자 후기·보관함·개인 아이디어 저장 구현은 제거했다. 펄스는 공개 아이디어 펼침과 검색을 제공한다.
- localStorage는 테마·메뉴 접기 설정에만 사용한다. 기존 개인 데이터에 대한 삭제 명령은 실행하지 않는다.
- `H.*`는 공개 정적 데이터·화면·공유 헬퍼다. 인증·개인 저장소 API와 기능 플래그는 제거했다. `login.html`·`signup.html`·`me.html` 파일은 삭제했으며 Vercel은 기존 3개 주소를 홈으로 영구 리다이렉트한다.
- UI 톤은 `frontend/assets/styles.css`와 `DESIGN.md`의 에디토리얼 원칙을 따른다.
- 계정·인증 백엔드는 서비스 범위에 포함하지 않는다.

## 화면 설정과 데이터 계약
`frontend/assets/app.js`는 공개 정적 데이터와 화면 설정을 제공한다.

| 인터페이스 | 현재 저장소 | 역할 |
|---|---|---|
| `H.theme` | `hangeut.theme` | 라이트/다크 테마 설정 |
| `H.renderMast()` | `hangeut.navCollapsed` | 데스크톱 메뉴 접기 설정 |
| `H.TRENDS`, `H.trend(id)` | `frontend/data/trends.js` | 생성된 정적 트렌드 데이터 |

## 데이터 흐름
```
.pipeline/curate.json (선택: Hermes 후보)
    ↓
backend/scripts/auto-build.mjs (선택: 출처 검증 + 근거 대조(`lib/grounding.mjs`) + canonical 병합)
    ├─ 보류 후보 → .pipeline/review-queue.json → backend/scripts/pipeline-review.mjs (사람 검수: 게시=--approved / 버리기)
    └─ 실행 기록 → backend/out/pipeline/runs.jsonl (+ 결정은 reviews.jsonl) · stdout 마지막 줄 SUMMARY {json}
    ↓
backend/data/trends.json (canonical 원본)
    ↑ backend/scripts/restage.mjs (게시 트렌드 stage 재판정 — 매일 21:05, 검증 통과분만 반영 후 refresh·git push)
    ↓
backend/scripts/validate-trends.mjs (스키마 게이트; auto-build 내부/수동 점검)
    ↓
backend/scripts/refresh.mjs (generatedAt 갱신 + trends.js 생성)
    ↓
frontend/data/trends.js (브라우저 로드)
    ↓
frontend/*.html
```

`frontend/data/trends.js`는 생성물이므로 직접 편집하지 않는다. `backend/data/trends.json`을 수정한 뒤 사이트 데이터에 반영하려면 `node backend/scripts/refresh.mjs`를 실행한다.

## 신선도 원칙
- `analyzedAt`은 실제로 재분석한 항목만 갱신한다.
- `refresh.mjs`는 정적 데이터 파일을 다시 생성하고 `generatedAt`을 실행일로 찍지만, 개별 항목의 `analyzedAt`을 임의로 오늘로 바꾸지 않는다.
- 사이트는 브라우저의 `new Date()` 대비 각 항목 `analyzedAt`으로 신선도 칩을 계산한다.
- 오래된 분석은 숨기지 않고 "갱신 필요"로 노출한다. 거짓 신선도는 금지한다.

## 자동/수동 갱신
- 트렌드 정적 데이터 생성: GitHub Actions `weekly-refresh`가 매주 월요일 06:00 KST에 `backend/scripts/refresh.mjs`를 실행한다. 수동 `workflow_dispatch`도 가능하다.
- 펄스 데이터: GitHub Actions `pulse-daily`가 매일 07:00 KST에 펄스 데이터를 갱신한다.
- 블로그 티스토리·네이버 일일 발행: 09:00 `AZ2MZ_Blog_Daily` → `claude -p /blog-daily` 스킬이 4편(T2+N2, 각각 다른 글 — 2026-10-07 토큰 절약으로 5+5에서 축소) 집필·검증 → 12:00·15:00·18:00 `AZ2MZ_Blog_Queue` → `node backend/scripts/blog-queue.mjs`가 플랫폼 교대 순차 발행(20~40분 간격, 각 5편/일). 로그: `backend/out/blog/blog-daily.log`, `blog-queue.log`.
  - 발행 세부(네이버): 붙여넣기 전 `naverize()`로 가독성 양식 변환 — 왼쪽 정렬·문장 2개씩 짧은 문단(16px·줄간격 1.8)·문단 사이 빈 줄, h2 → 밑줄형 인용구(변환 실패 시 발행 중단), 콜아웃은 굵은 머리말+문단(기울임 인용구 금지), 목록은 네이버 목록 그대로. 티스토리 본문은 변환 없이 발행한다.
  - 발행 창 위치: `backend/scripts/lib/window.mjs`가 정한다 — 기본 `--window-position=230,0`(고정 좌표, 가운데 근사), `BLOG_OFFSCREEN=1`이면 화면 밖, `BLOG_WIN_POS="x,y"`로 덮어쓴다. 티스토리 캡차 대기 시간은 `BLOG_CAPTCHA_MS`(기본 180000ms = 3분).
  - ⚠ 검토 필요: `tools/blog-queue.vbs`(AZ2MZ_Blog_Queue)는 `BLOG_OFFSCREEN`을 설정하지 않으므로, 2026-10-11 커밋(842a8aa) 이후 무인 대기열 창도 화면에 뜬다. 이전에는 `blog-queue.mjs`가 기본값 `BLOG_OFFSCREEN=1`을 자식 프로세스에 강제했다. 화면 밖을 원하면 스케줄 실행 환경에 변수를 넣어야 하며, 어느 쪽으로 할지는 미결정.
- 로컬 Hermes 운영과 검증 게이트의 자세한 흐름은 [docs/hermes.md](hermes.md)를 따른다.

- 한끗 자동 수집·게시: 매일 21:30 Hermes(로컬)가 `hangeut-run`으로 후보를 만들고 `backend/scripts/auto-build.mjs`가 검증·게시한다(검증 통과분만 `trends.json` 반영 후 git push). 재시도 게이트는 21:50, 광고/진짜 재확인은 21:15. 보류분은 사람이 디스코드 "검수"로 `pipeline-review.mjs`를 통해 게시 또는 버리기를 정한다(이유 코멘트는 `reviews.jsonl`·`learnings.md`에 남는다).
- 게시된 트렌드의 유행 단계 재판정: 매일 21:05 Hermes(로컬, `hangeut-restage`)가 분석일 오래된 5건을 골라 `backend/scripts/restage.mjs`로 반영한다. 정규 stage 라벨과 살아 있는 비SNS 근거 URL 1개 이상만 통과하며, `stage`·`stageMsg`·`analyzedAt`(실제 재판정한 항목만)·근거 `src`를 바꾼다. 본문은 고치지 않고, 어긋나는 표현은 conflict로 보고한다. 기록은 `backend/out/pipeline/restage.jsonl`.
- `auto-build.mjs`와 `restage.mjs`는 `trends.json`을 쓰기 직전에 다시 읽어, 서로(및 `recheck-ad.mjs`)의 변경을 덮어쓰지 않는다.
## 보안 메모
- 로그인·회원가입 기능은 도입하지 않는다. 인증/계정 API와 `login.html`·`signup.html`·`me.html` 파일은 제거했으며, Vercel에서 기존 주소를 홈으로 영구 리다이렉트한다.
- 개인 저장·방문자 후기·개인 아이디어 저장 기능은 제거했다. 과거 localStorage 데이터의 삭제 명령은 실행하지 않으며 현재 코드는 테마·메뉴 접기 설정만 사용한다.
