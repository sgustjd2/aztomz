# 평가표 페이지 검증 (개인 중간 프로젝트 평가표) — 2026-10-29

읽기 전용 검증. 저장소 수정·git 쓰기·재제출 없음. 키/비밀 값은 기록하지 않음(파일명·해시·종류만).
평가표 전문은 **내장 브라우저**로 읽음(Chrome 확장은 `Owl extension-created tabs must be active`로 2회 실패 → 내장 브라우저 사용, 사용자가 로그인해 줌).

> 페이지 본문: 이 세션이 내장 브라우저로 라이브 페이지를 직접 읽음. 메인 세션 사본(`_pages/rubric-page.md`)과 핵심 문구(충족/부분 기준, 가산점 +2/+1/0) 일치 확인.

## 요약 표

### A. 2단계 구현물 15점 (제출 5판, 13장 기준)

| 항목 | 평가표 기준 (충족 / 부분) | 예상 점수 | 근거·감점 위험 |
|---|---|---|---|
| 1 동작하는 MVP (5) | 충족: "기획안의 핵심 기능이 실제로 동작하고, 그 장면을 데모(영상 또는 수업 중 라이브 시연)로 보였다" / 부분: "일부 기능만 동작하거나 데모가 화면 캡처뿐이다" | **5** (최악 2.5) | 1장·5장에 Drive 영상 링크(1분 46초) + 5장 시각표 + "수업 중 라이브 시연 가능" + 배포 URL. 2~4장은 영상 프레임이지만 영상·배포본이 따로 있어 '캡처뿐'은 아님. 위험: ① Drive 링크 공유 권한(링크 있는 모든 사용자?)을 확인 못 함 ② 2~4장에 "기획안의 핵심 기능"이 기획안 문구와 1:1로 대응되어 적혀 있지 않음(6장 "핵심 기능 3개 그대로"뿐) |
| 2 기획안과의 차이 (2) | 충족: "계획과 달라진 점과 그 이유를 적었다 (달라진 것이 없으면 그 사실)" / 부분: "차이는 있으나 이유가 없다" | **2** (최악 1) | 6장 표에 그대로 2·달라짐 2·덜 됨 2가 있고 '그 이유' 열이 있음. 위험: 마지막 행(수집·재판정 양) 이유가 "나머지는 원인 확인 중"으로 사실상 이유 없음, "그대로 핵심 기능 3개" 행 이유가 "—", 기획안 장·문구 인용 없음 |
| 3 검증 결과 (4) | 충족: "검증 3건 이상을 실제로 해 보고 결과와 근거(실행 결과, 화면, 수치)를 남겼다" / 부분: "1~2건이거나 결과만 있고 근거가 없다" | **4** (최악 2) | 7~9장: 출처 생존(366개 전수, 410/403 로그), Hermes 수집(커밋 해시·디스코드 보고), 설명=원문(10건 대조, 5·4·1) = 실제 실행 3건 + 4번째(1분 이해)는 '미실시, 대체 점검 11/11'로 정직하게 표기. 모두 '무엇을 했나·결과·근거' 3단 구성이고 로그 파일명·수치 있음. 위험: 3건 중 "Hermes 수집"의 근거가 커밋 제목·보고서 발췌라 '검증 실행'보다 '관찰'로 읽힐 수 있음. 1분 이해 테스트가 기획안 검증 계획에 있었다면 미실시가 눈에 띔 |
| 4 에이전트 작업 기록 (4) | 충족: "에이전트에게 시킨 주요 요청, 사람이 확인하거나 고친 것, 막힌 곳과 복구한 방법을 적었다" / 부분: "시킨 것만 있고 확인과 복구가 없다" | **4** (최악 3) | 10장 시킨 요청 4건, 11장 사람이 확인·고친 것 4건, 12장 막힌 곳·복구 4건 — 세 요소 모두 있고 각각 커밋·로그 근거. 위험: 10장은 "무엇을 자동화했나"이지 에이전트에게 준 요청문(프롬프트) 자체가 아님. 이번 중간고사 작업(증거 수집·덱 제작)에서 Claude Code에 시킨 일과 그 결과를 사람이 확인한 일이 없음 |
| **A 합계 (15)** | | **15 / 15** (엄격 기준 최악 약 9~11) | 아래 "부족한 점"의 1~3번을 고치면 최악 시나리오도 13~14로 올라감 |

감점(-1) 확인: `GET /assignments/76d58af9-.../submission` → `versionNumber: 5, isLate: false, createdAt 2026-10-28T21:50:53Z`. 과제 `dueAt 2026-11-06T14:59:00Z`(= 11/6 23:59 KST), `latePolicy: mark`. 마감 8일 전 제출이라 **-1 없음**. 마감 전에 더 올려도 새 판이 쌓일 뿐(마감 시각에 올라가 있는 판으로 채점). 평가표: "디자인과 장 구성은 점수에 넣지 않습니다. 위 내용이 슬라이드 어디에 있든 찾아서 봅니다."

### B. 비밀정보

| 대상 | 방법 | 결과 |
|---|---|---|
| 슬라이드 본문(5판 html) | 키 패턴(AIza·sk-·ghp_·xox·AKIA·Bearer·PEM·api_key= 류) grep, 이메일·전화 패턴 | 0건. 외부 URL은 az2mz·github·Drive·출처 2개·Pretendard CDN뿐 |
| 저장소 전체 이력(782 커밋) | `git log --all --diff-filter=A --name-only` 파일명 검사: `.env*`·`*.pem`·`*.key`·cookie·state.json·settings.local·`*profile*` 등 | 위험 파일명 추가 이력 **0건**. 이름만 걸린 4개(`backend/blog/research/context-engineering-token-save.json`, `kakao-ai-profile-decoration.json`, `tools/register-tistory-daily-session.ps1`, `tools/tistory-daily-session.vbs`)는 'token/profile/session' 단어가 이름에 든 블로그 조사·스케줄러 등록 스크립트(비밀 아님으로 판단, 내용 정독은 안 함) |
| 이력 pickaxe | `git log --all -S"AIza"` | 0커밋 |
| 추적 중인 민감 폴더 | `.claude/`·`.codex/` | agents/skills 정의(.md/.toml)만 추적, settings.local.json 없음. `.gitignore`가 `.claude/*` 차단 후 skills/agents만 허용 |
| 과거 추가된 `.pipeline/*`(8개: collect/curate/review.json 등) | 파일명 | 현재 `.gitignore`로 차단 중. 이력에 남은 건 수집 후보·디스코드 문안(값 점검은 메인 세션 스캔과 중복이라 생략) |
| 도구 | gitleaks / trufflehog | **미설치** → 파일명·패턴 기반만 수행 |
| 주의 | `backend/out/blog/posted.json` | `backend/out/`가 ignore인데 **추적 중**(예전에 add됨). 현재 수정(M) 상태. 발행 기록이라 비밀은 아닐 것으로 보이나 `git rm --cached` 대상 후보 |

결론: 비밀정보 의심 항목 없음. 단 gitleaks류 도구로 한 번 더 돌린 게 아니므로 '없음 확인'이 아니라 '발견 못 함'.

### C. 소스 공개 가산점 (+2 / +1 / 0)

| 요건 | 현재(origin/main 68bacf0 = 로컬 HEAD) | 판정 |
|---|---|---|
| 공개 GitHub 저장소 | `gh repo view sgustjd2/aztomz` → PUBLIC, 기본 브랜치 main | ✅ |
| README.md (문제, 실행 방법) | origin/main README에 있음. **'문제' 절은 없음**(로컬 수정본에만 추가, 미커밋). 실행 방법 절은 origin에 있으나 방법 1이 깨짐(아래) | ⚠️ 부분 |
| LICENSE | origin/main에 없음(로컬 `LICENSE` MIT, 미커밋 `??`). `gh`의 licenseInfo = null | ❌ |
| .gitignore | origin에 있음. `.env`·`.env.*`·`backend/out/`·`.tistory/.naver-profile`·state.json·`.claude/*` 차단 확인(`git check-ignore`). 로컬 수정은 `!.env.example` **중복 줄** 1개뿐 | ✅ (중복 줄만 정리) |
| .env.example | origin에 없음(로컬 미커밋) | ❌ |
| README대로 실행 | 새 임시 폴더에 clone → README 방법 2 `python -m http.server 8123 -d frontend`(8000 대신 8123): `/`·`/trend.html?id=yareu`·`/dictionary.html`·`styles.css`·`trends.js` 전부 200, 종료 확인. **방법 1 `node .claude/static-server.cjs`는 origin에 파일이 없어 실패**(`.claude/*` ignore로 추적 안 됨) | ⚠️ 방법 2만 가능 |
| 비밀정보 없음 | 위 B | ✅ |

**현재 판정: +1** (저장소는 공개, LICENSE·.env.example이 origin에 없고 README '문제' 절이 origin에 없음). 로컬 파일을 전부 커밋·push하면 +2 요건 충족 가능.

README 로컬 수정본 vs origin 차이: ① `## 문제` 절 추가(대상 사용자·불편·한끗이 하는 일·데모 URL·LICENSE/.env.example 안내) ② 실행 방법에서 깨진 `node .claude/static-server.cjs` 제거, `git clone … && python -m http.server 8000 -d frontend`로 교체. 즉 로컬 수정본이 맞는 방향.

.env.example ↔ 코드가 읽는 변수 대조(`process.env.*`, `.github/workflows` secrets):
- 파일에 있고 코드도 읽음: GEMINI_API_KEY, GEMINI_MODEL, PEXELS_API_KEY, NAVER_AD_API_KEY/SECRET/CUSTOMER, TISTORY_BLOG/CATEGORY, DDGS_EXE, CLAUDE_BIN, HERMES_HOME, HERMES_ADMIN_TOKEN/PORT
- **코드가 읽는데 파일에 없음**: `YOUTUBE_API_KEY`(youtube-summary.yml Secrets, 권장), `ANTHROPIC_API_KEY`·`HERMES_ANTHROPIC_KEY`(pulse-refresh.mjs), `GEMINI_BASE_URL`(pulse-research.mjs), `HANGEUT_SITE`(blog-build/pick-trend), `MODEL_DRAFT`·`MODEL_REVIEW`(lib/llm.mjs), `BLOG_CAPTCHA_MS`·`BLOG_OFFSCREEN`·`BLOG_WIN_POS`
- 사이트 자체는 환경변수 불필요(정적) — 파일 첫 주석에 이미 적혀 있음.

## 부족한 점 (심각도 순)

1. **[A-1/C] 소스 공개 가산점 파일이 origin/main에 없음.** LICENSE·.env.example·README 수정이 미커밋 → 지금은 +1. 아래 체크리스트로 커밋·push (12/11 전).
2. **[A-1] 데모 영상 재생·권한 미확인.** Drive 링크가 '링크 있는 모든 사용자' 보기인지 로그아웃 상태로 확인. 5장에 "재생이 안 되면 az2mz.vercel.app에서 위 시각표 순서로 확인" 한 줄 추가.
3. **[A-2] 6장 마지막 행 이유가 "원인 확인 중".** 이유를 한 문장으로 확정(예: "10/26은 기존 항목과 겹쳐 보류, 10/24·25·27은 수집 후보 자체가 0건 — 소스 쿼리 점검 필요"). "그대로" 행의 "—"에는 "기획안 MVP 범위 1·2·3 그대로" 처럼 기획안 항목 번호를 쓰면 '기획안과 연결' 근거가 강해짐.
4. **[A-1] 2~4장 제목에 기획안 기능 이름을 그대로 쓰기.** 현재 "기능 1·2·3"을 기획안 MVP 범위 3개의 이름(예: 기획안 문구)으로 바꾸면 "기획안의 핵심 기능이 동작"이 한눈에 대응됨(기획안 본문은 이번에 대조하지 않음).
5. **[A-4] 10장에 실제 요청문 한 줄씩.** 예: Hermes 스킬 hangeut-run에 준 지시 한 줄, Claude Code에 준 요청("출처 366개 전수 점검 스크립트 만들어 줘" 등) — 지금은 결과 요약이고 요청문은 없음. 이번 중간고사 증거 수집에서 에이전트가 낸 결과를 사람이 다시 확인한 사례 1건 추가(예: 자동 근거대조 10/10 통과였지만 사람 대조에서 1건 어긋남 — 8장 내용을 11장에도 한 줄로).
6. **[C] .env.example에 누락 변수 추가:** YOUTUBE_API_KEY, ANTHROPIC_API_KEY, HERMES_ANTHROPIC_KEY, GEMINI_BASE_URL, HANGEUT_SITE, MODEL_DRAFT, MODEL_REVIEW(+선택 BLOG_*). `.gitignore`의 `!.env.example` 중복 줄 삭제.
7. **[C] `backend/out/blog/posted.json`이 ignore 대상인데 추적 중.** 비밀은 아니나 `git rm --cached`로 정리하면 '런타임 산출물 비공개' 원칙과 일치.
8. **[B] gitleaks 등 도구로 이력 전체 재스캔 1회** (이번에는 미설치라 못 함, 기말 제출 전 권장).

## 커밋·push 체크리스트 (제안만 — 실행 안 함, 사용자 승인 필요)

주의: 작업 트리에 `data/`·`output/`·`tmp/`·`design-qa*`·`.codex-*` 등 무관한 미추적 파일이 많으므로 `git add -A`/`git add .` 금지. `.git/az2mz-auto.lock` 유무 확인 후 진행(CLAUDE.md 철칙).

```bash
cd E:/workspace/side_project/aztomz
git branch --show-current                 # main 확인
ls .git/az2mz-auto.lock 2>/dev/null       # 있으면 몇 초 뒤 재확인
# 1) .env.example 누락 변수 보강, .gitignore 중복 줄 삭제 (파일 편집)
# 2) 비밀 재확인: 스테이징 대상에 값이 들어갔는지
grep -nE "=.{8,}" .env.example            # 값이 채워진 줄이 없어야 함(빈 값만)
# 3) 필요한 파일만 스테이징
git add LICENSE .env.example .gitignore README.md
git rm --cached backend/out/blog/posted.json   # (선택) 산출물 추적 해제
git diff --cached --stat                  # 4개(+1) 파일만인지 확인
git commit -m "docs: README 문제 절·실행 방법 정리, LICENSE(MIT)·.env.example 추가"
git pull --rebase origin main
git push origin main
# 4) 확인
gh repo view sgustjd2/aztomz --json licenseInfo
git ls-tree --name-only origin/main | grep -E "LICENSE|\.env\.example|README"
# 5) 새 폴더에서 README 그대로 따라 하기
git clone https://github.com/sgustjd2/aztomz.git /tmp/verify && cd /tmp/verify && python -m http.server 8123 -d frontend
```

## 후속 확인 (기획안 `docs/midterm/mvp-plan.html` 대조)

- 기획안 MVP 기능 3개(목록에서 발견 · 1분 상세 · 신선도 표시) = 덱 2·3·4장과 이름·순서 일치. '하지 않을 것'(광고·후기 분석, SNS 직접 수집, 앱·푸시) = 6장 "범위 밖"과 일치. → 부족한 점 4번은 장 제목에 기획안 기능명이 이미 들어 있어 사실상 해소.
- 기획안 검증 계획 4개(1분 이해 / Hermes 수집 / 출처 생존 / 설명=원문) = 덱 7~9장 검증 1~4와 1:1 대응. 기획안은 "테스트 3명"을 약속했고 덱은 미실시 → 정직하게 적은 점은 유리하나 13장의 기말 전 실시 계획은 유지할 것.
- 기획안의 "갱신 필요" 표시는 덱에서 "오래된 분석"으로 바뀌었고 6장에 이유(10/21 디자인 개편)가 있음.

## 확인 못 한 점

- Drive 영상의 실제 재생(화면·음성). 로그인 없는 `curl`로는 200 + 제목 `hangeut-demo-upload.mp4`가 나와 **비로그인 접근은 가능**(부족한 점 2번은 권한 문제가 아니라 재생 보강만 남음).
- 제출된 5판을 클래스룸 보기 화면에서 실제로 열어 → ← 넘김과 레이아웃 확인(이 세션 담당 아님).
- gitleaks/trufflehog 미설치로 전 이력 패턴 스캔은 메인 세션 결과에 의존. 위 4개 '이름만 걸린' 파일의 내용은 읽지 않음.
- Chrome 확장 경유 확인은 연결 오류로 불가, 내장 브라우저로 대체.
- 채점자의 실제 해석(예: '검증 4번째 미실시'를 감점으로 볼지)은 알 수 없음. 점수는 평가표 문구 기준 추정.
