# 한끗 (az2mz) — 프로젝트 가이드 (CLAUDE.md)

> 정식명: **AZ와 MZ는 한 끗 차이** · 서비스명: **한끗** · 레포: **az2mz**
> 요즘 유행(밈·신조어·음식·디저트·핫플)을 1분에 번역하고, SNS 맛집이 광고인지 실후기인지
> 분석해주는 모바일 웹. 의존성 0·빌드 0 정적 멀티페이지. (자세히는 [docs/architecture.md](docs/architecture.md))

---

## 구조 한눈에

| 경로 | 역할 |
|---|---|
| `frontend/` | ★ 배포 대상(Vercel `outputDirectory`). 브라우저가 받는 정적 파일 |
| `frontend/index.html` | 홈 — 오늘의 한끗·급상승·광고일까 진짜일까·요즘 트렌드 |
| `frontend/trend.html?id=` | 상세 — 점수(광고/신뢰)·만족도·한끗 판단·추천·출처·후기 |
| `frontend/list.html` | 카테고리별 트렌드 목록 |
| `frontend/dictionary.html` | MZ 사전 — 검증된 신조어 카드(뜻·예문·순화어·출처) 검색/열람 |
| `frontend/{login,signup,me,pulse}.html` | 인증 · 마이페이지(내 한끗) · 트렌드 펄스 |
| `frontend/assets/styles.css`·`app.js`·`pulse.js` | 디자인 시스템 / 목 스토어(`H.*`) / 펄스 |
| `frontend/data/trends.js`·`pulse.js` | **생성물 — 직접 편집 금지** (`refresh.mjs`·`pulse-refresh.mjs`가 생성) |
| `backend/` | 비공개(배포 안 됨) — 원본 데이터 + 스크립트 |
| `backend/data/trends.json`·`pulse.json` | ★ **canonical 데이터 원본** (사람·스크립트가 수정) |
| `backend/scripts/` | 아래 "스크립트" 표 참고 |
| `.github/workflows/` | `daily-refresh.yml`(주간 재생성) · `pulse-daily.yml`(펄스 일일 조사) · `youtube-summary.yml`(유튜브 새 영상 요약) — 아래 "크론 일람" |
| `youtube-summaries/` | 생성물 — AI Engineer 채널 영상 한국어 상세 요약 모음(영상별 `.md` + 인덱스). 배포 안 됨 |
| `docs/` · `README.md` · `learnings.md` · `summary.md` | 문서 (아래 정책으로 자동 최신화) |

### 스크립트 (`backend/scripts/`)

| 스크립트 | 역할 |
|---|---|
| `refresh.mjs` | `trends.json` → `frontend/data/trends.js` 재생성(+`generatedAt`) |
| `validate-trends.mjs` | **스키마 스모크 게이트** — id 누락·중복, cat 7분류 이탈, stage 비정규 라벨, 영문 placeholder verdict, `analyzedAt` 형식 오류를 배포 전에 잡음 |
| `check-links.mjs` | 출처 URL 상태(404) 점검 |
| `check-source.mjs [파일] [--only=id,id]` | 출처 **본문 관련성** 점검(정확✅/약함⚠️/무관❌/차단🚫, LLM 없음) |
| `auto-build.mjs [curate.json] [--no-git\|--dry\|--strict]` | 봇 수집분 자동검증 게이트 → 통과분만 `trends.json` 반영 → refresh → git push |
| `recheck-ad.mjs` | "광고일까 진짜일까" 최고령 1건 출처 재검증(결정적·LLM 없음) |
| `blog-build.mjs <id>\|--latest` | **한끗** 트렌드 1건 → 티스토리용 HTML + 메타(`backend/out/blog/`). 커버는 자체 생성 카드. `--selftest` 있음 |
| `post-build.mjs --category=<id>` | **다주제** 키워드 → 조사·초안·SEO·자가검수 → 같은 형식의 HTML+메타. `--research=<파일>`로 조사 결과 주입 · `--dry` |
| `blog-assemble.mjs <slug>` | **에이전트 산출물 조립** — 마크다운 + 메타 → 발행용 HTML. URL 살균·임베드 검증(relatedVideos 포함). `--research=<파일>`로 조사파일-slug 분리 지원 |
| `blog-verify.mjs <id>` | **발행 전 최종 검증** — `claude -p`가 원본 왜곡·단정·지어낸 사실·저작권을 본다. 반려 시 exit 1. `--warn` |
| `blog-publish.mjs <id>` | Playwright로 티스토리 자동 발행. `--login`(1회) · `--dry` · `--draft` · `--probe` · `--categories` · `--cover` |
| `blog-feedback.mjs` | 노래 추천 피드백 → 선곡 기준 교훈 적립(다음 글에 주입). `--list` · `--good=` · `--bad=` · `--lesson=` |
| `category-new.mjs` | 블로그 카테고리 프로파일 생성 마법사 |
| `dev-trending-fetch.mjs` | **개발/IT 소스 fetcher** — GitHub 주간 급상승 + HuggingFace 트렌딩 모델/데이터셋(최근 7일 신규만). `--source=github\|hf-models\|hf-datasets` · `--selftest`. 카테고리 `dev-trending` |
| `vlm-watch-fetch.mjs` | **개발/IT 소스 fetcher** — HuggingFace 경량 VLM(image-text-to-text, 파라미터 ≤8B, 3070/4070 구동) 후보 + int4 VRAM 추정·라이선스. `--mode=trending`(블로그, 최근 60일)·`--mode=popular`(프로젝트 후보, 다운로드순) · `--days=` · `--maxb=` · `--selftest`. 카테고리 `vlm-watch` |
| `dev-digest-fetch.mjs` | **개발/IT 소스 fetcher** — GeekNews(긱뉴스) Atom + inpa/goddaehee 티스토리 최근글 + GitHub 급상승 스킬/플러그인. `--source=` · `--days=`(기본 2) · `--selftest`. 카테고리 `dev-digest`. ⚠️ Threads(ToS)·Yozm(JS)은 자동 제외 — AI 이슈는 조사 단계 WebSearch 로 대체 |
| `pulse-research.mjs` / `pulse-refresh.mjs` | 펄스 일일 조사(Actions에서 실행) / `pulse.json` → `pulse.js` 재생성 |
| `youtube-summarize.mjs` | AI Engineer(@aiDotEngineer) 채널 새 영상 → Gemini 한국어 상세 요약(**URL만 넘김 — 자막 스크래핑·yt-dlp 없음**) → `youtube-summaries/<날짜>-<id>.md` + 인덱스. RSS로 신규 감지(쿼터·키 불필요), 파일 존재로 중복 스킵. `--dry`·`--limit=N`·`--lowres`·`--channel=`·`--selftest` |
| `fetch-images.mjs` · `merge-*.mjs` | 보조 — 이미지 수집, 필드(media·tags·articles·reasons·prompts) 병합 |

### 콘텐츠 데이터 수정 절차 (항상 이 순서)

```bash
# 1) backend/data/trends.json 만 수정 (frontend/data/*.js 는 절대 직접 편집 금지)
node backend/scripts/validate-trends.mjs   # 2) 스키마 검증
node backend/scripts/refresh.mjs           # 3) trends.js 재생성
node backend/scripts/check-links.mjs       # 4) 출처를 추가/변경했으면 — URL 생존
node backend/scripts/check-source.mjs backend/data/trends.json --only=<id>  # 5) 본문 관련성
```

---

## ⏰ 크론 일람 (전체 자동화 스케줄 — 시각의 유일한 기준)

| 시각 (KST) | 작업 | 실행 위치 | 진입점 |
|---|---|---|---|
| 매일 07:00 | 펄스 일일 조사(요일 로테이션) | **GitHub Actions** (PC 무관) | `pulse-daily.yml` → `pulse-research.mjs` (시크릿 `GEMINI_API_KEY`) |
| 매일 08:00 | **YouTube 새 영상 한국어 요약**(AI Engineer 채널) | **GitHub Actions** (PC 무관) | `youtube-summary.yml` → `youtube-summarize.mjs` (시크릿 `GEMINI_API_KEY`) |
| 월 06:00 | 트렌드 주간 재생성 | **GitHub Actions** (PC 무관) | `daily-refresh.yml`(내부 이름 `weekly-refresh`) → `refresh.mjs` |
| 매일 09:00 | **블로그 일일 초안**(검증까지, 발행 제외) | Hermes(로컬, no-agent) | `aztomz_blog_daily.py` → `claude -p /blog-daily` 스킬 |
| 매일 21:00 | 펄스/수집 분야 안내 | Hermes(로컬) | — |
| 월 21:00 | 주간 갱신 | Hermes(로컬) | — |
| 매일 21:15 | 광고/진짜 일일 재확인 | Hermes(로컬, no-agent) | `recheck_ad.py` → `recheck-ad.mjs` |
| 매일 21:30 | **한끗 자동 수집·게시** (목=신조어 주간 사전) | Hermes(로컬, 에이전트) | hangeut-run → `auto-build.mjs`(`.pipeline/curate.json`) |
| 매일 21:50 | 수집 재시도 게이트(21:30이 503/429로 죽었을 때만 1회 재실행) | Hermes(로컬, no-agent) | `hangeut_retry_gate.py` |

- ⚠️ **Hermes 크론은 그 시각에 PC+게이트웨이가 켜져 있어야 실행됨**(`tools/start-hermes.bat`).
  PC는 보통 ~22:30까지만 켜짐 — 게이트를 22:00→**21:50**으로 당긴 이유(2026-06-23, 22:00엔 PC가 꺼져 미실행 잦았음).
- GitHub Actions 2개는 클라우드라 PC 상태와 무관하게 돈다.
- ⚠️ **티스토리 블로그 발행은 자동화돼 있지 않다.** `auto-build.mjs`는 `--blog` 플래그를 지원하지만, 실제
  Hermes 잡 프롬프트(`hermes/cron/jobs.json`)에는 이 플래그가 없다 — 트렌드 데이터 게시(`trends.json`
  → git push → Vercel)까지만 매일 밤 자동으로 돈다. 카카오 로그인을 자동화하지 않는다는 철칙(아래
  "블로그 발행" 항목 참고) 때문에 티스토리 세션이 주기적으로 만료되고, 무인 실행에서 이걸 복구할
  방법이 없어 **의도적으로 발행 단계는 자동화 대상에서 뺀 상태로 보인다**(2026-08-19 확인 — 지금까지
  발행된 글은 전부 인터랙티브 세션에서 사람이 트리거함). 자동 발행을 원하면 `--blog`를 잡 프롬프트에
  추가하면 되지만, 그러면 세션 만료 시 매번 조용히 실패만 하고(`backend/out/blog/publish-failures.json`
  에 기록은 남는다) 실제 발행은 여전히 안 된다 — 근본 해결은 티스토리 세션 자체를 안 끊기게 하는 것.
- 크론이 안 돈 날은 수동 백필: `hermes cron run 9ddacd750b48`.

---

## 📌 문서 자동 최신화 정책 (필수)

**작업의 범위·기능·메뉴·데이터 스키마·배포 방식이 바뀌면, 마무리 단계에서 반드시
`docs-organizer` 서브에이전트(haiku 모델)를 호출해 문서를 최신화한다.** 본 작업과 분리해
저렴한 haiku로 돌려서 비용을 아끼고, 메인 작업의 컨텍스트를 흐리지 않는다.

호출 방법 — `Agent` 도구:

```
Agent(
  subagent_type: "docs-organizer",   // .claude/agents/docs-organizer.md (haiku 고정)
  description: "문서 최신화",
  prompt: "이번 변경 요약: <무엇이 어떻게 바뀌었는지 2~5줄>. 변경 파일: <목록>."
)
```

> `docs-organizer`가 등록 안 됐으면 `subagent_type: "general-purpose"` + `model: "haiku"`로
> 같은 작업을 시키고, 에이전트 정의 파일([.claude/agents/docs-organizer.md](.claude/agents/docs-organizer.md))의
> 지침을 그대로 전달한다.

### 대상 문서

- **`README.md`** (루트) — 개요·구조·로컬 실행·배포·문서 인덱스
- **`docs/prd.md`** — 사실 변동(메뉴·네이밍·콘텐츠 수량·기능 포함여부 등)만 반영.
  기획 스펙 본문은 **함부로 재작성하지 않고** 드리프트만 교정 (큰 변경은 제안으로 보고)
- **`docs/menus/*.md`** — 메뉴별 문서. 각 문서: 목적 · 진입 화면 · 표시 데이터 필드 ·
  현재 구현 상태 · 관련 코드/데이터 위치
- 기타: `docs/architecture.md`(구조) · `docs/hermes.md`(봇 연동) · `docs/local-first.md` ·
  `summary.md`(고구미봇 채점·검증 로직 원문 정리) — 해당 영역이 바뀌었을 때만

### 트리거 (호출하는 경우)

- 메뉴·화면 추가/삭제/이름 변경
- `data/trends.json` 필드(스키마) 변경
- 기능(검색·저장·후기·광고분석·공유 등) 추가/변경
- 배포·파이프라인·cron·스크립트 변경
- 네이밍·전략 변경

### 호출하지 않는 경우

- 오타·미세 스타일 수정, 콘텐츠 1~2건 추가 등 **문서에 영향 없는 변경**
- 진행 중(미완성) 작업 — 완료·검증 후 한 번만 호출

### 메뉴별 문서 목록 (`docs/menus/`)

| 파일 | 메뉴 |
|---|---|
| `home.md` | 오늘의 한끗 (홈) |
| `dictionary.md` | MZ 사전 (dictionary.html) |
| `food.md` | 요즘 음식 |
| `dessert.md` | 요즘 디저트 |
| `hotplace.md` | 요즘 핫플 |
| `ad-or-real.md` | 광고일까 진짜일까 |
| `search.md` | 검색 |
| `share.md` | 공유 |
| `mypage.md` | 내 한끗 (마이페이지) |
| `auth.md` | 로그인 / 회원가입 |

---

## 🎨 UI 디자인 검증 정책

**CSS/레이아웃을 손댄 뒤(디자인 리프레시·컴포넌트 추가·반응형 수정 등) 시각적으로 문제가
있어 보이면 `design-reviewer` 서브에이전트를 호출해 실제 브라우저 프리뷰로 검증한다.**
코드만 읽고 짐작하지 말고, 반드시 스크린샷·inspect로 확인 후 고치게 한다.

호출 방법 — `Agent` 도구:

```
Agent(
  subagent_type: "design-reviewer",   // .claude/agents/design-reviewer.md
  description: "UI 디자인 검증",
  prompt: "확인할 페이지/증상: <스크린샷·설명 요약>. 의심 파일: <있으면>."
)
```

`design-reviewer`가 등록 안 됐으면 에이전트 정의 파일
([.claude/agents/design-reviewer.md](.claude/agents/design-reviewer.md))의 지침을 그대로 전달한다.

---

## 🚫 철칙 (Rules) — 다시는 반복하지 않기

> 작업 전 [learnings.md](learnings.md)를 **먼저 읽고** 적용한다. 아래는 반복 사고를 막는 고정 규칙.
> 새 교훈이 생기면 `learnings.md`에 한 줄 추가하고, 영구·치명적인 것은 이 절에도 올린다.

### 데이터 · 생성물

- `frontend/data/trends.js`·`pulse.js`는 **생성물 → 손대지 않는다.** canonical 원본은 항상
  `backend/data/trends.json`·`pulse.json`. 수정 후 위 "콘텐츠 데이터 수정 절차" 순서대로 재생성.
- **거짓 신선도 금지.** `analyzedAt`은 **실제로 재분석한 항목만** 오늘 날짜로 갱신.
  안 한 항목은 그대로 둬서 "갱신 필요"로 정직하게 노출되게 한다. (신뢰가 제품의 본질)
- **트렌드 `cat`은 정규 7분류만**: 디저트 · 맛집 · 카페·핫플 · 신조어 · 노래·챌린지 · 패션 · AI 프롬프트.
  "디저트·음료" 같은 세분 카테고리 신설 금지(홈 필터가 1개짜리 칩으로 파편화). 지역·세부는 title/tags로.
- **`stage`는 정규 라벨만**(발견 / 상승 / 상승 → 피크 / 피크 / 피크 → 하락 / 안정화 / 안정화 → 끝물 /
  하락 (한물감) / 밈화), **`verdict`는 한국어 한 줄 판단 문장.** 파이프라인 내부값("curate")이나
  영문 placeholder("provisional")가 새면 화면에 원문 그대로 노출된다(WORD-2026-00xx 실제 사고).
  `validate-trends.mjs`가 잡아주니 데이터 수정 후 반드시 돌린다.

### 출처 · 검증

- **출처 URL 추측·단축·조립 금지.** 검색 결과에 **실제로 나온 URL만** 쓴다.
  반영 전 `node backend/scripts/check-links.mjs`로 상태(404) 점검.
- **200 OK여도 본문이 그 트렌드를 안 다루면 가짜 출처.**
  `node backend/scripts/check-source.mjs [파일] [--only=id,id]`로 본문 관련성을 확인한다.
- **출처는 제목에 메뉴/가게/트렌드 핵심어가 명시된 상세 리뷰·기사만.** "○○ 맛집 10선" 같은
  목록형 아티클·일반 제목 블로그는 `auto-build.mjs` 검증에서 '무관' 판정 → 자동 보류된다.
- ddgs·파이썬 호출 시 **`PYTHONIOENCODING=utf-8`(또는 `PYTHONUTF8=1`) 강제.**
  안 하면 Windows cp949 크래시로 한글 키워드가 0으로 잡혀 멀쩡한 출처를 '무관'으로 오판한다.
- 다이닝코드 `profile.php`·인스타그램 페이지는 본문을 못 읽는다(JS앱/로그인벽).
  출처는 **본문이 실제로 읽히는 링크**(tistory·언론기사·trip.com 등)로 쓴다.

### 콘텐츠 판단

- 모든 점수(광고 의심도·후기 신뢰도)는 **추정치이며 확정 판정이 아니다.** 단정 표현 금지.
- **후기 신뢰도(믿을 만한가) ≠ 만족도(좋은가)** — 별개 축으로 분리해서 표기한다.
- **트렌드·신조어도 빨리 늙는다.** 출처가 "2024 신조어" 류면 한물 의심.
  지금(2026 상반기) 기준으로 재검증한다.
- 세대 비하 금지. "아재" 표현은 유머로만, 공격적으로 쓰지 않는다.
- **영상(`video`)은 임베드 가능한 것만.** 상세페이지에 넣는 유튜브 영상은 oembed가 200이어야 한다
  (`youtube.com/oembed?url=...` → 401/404면 '재생 없음'으로 떠 안 쓴다). `youtube_search.py`가 `✅임베드` 표시.

### 파이프라인 · 운영

- **로컬 작업은 `main` 브랜치에서 직접 한다.** `auto-build.mjs`·`recheck-ad.mjs`(Hermes 자동화)는
  `origin/main`에 pull --rebase → push 하도록 고정돼 있고, 현재 브랜치가 main이 아니면 스스로
  중단한다(2026-08-15부터). 인터랙티브 세션이 별도 feature 브랜치에 오래 머물면 봇의 자동 push가
  거기 쌓이고 origin/main은 조용히 정체된다 — 실제로 2026-08-09~08-15 사이 `blog-pipeline-automation`
  브랜치에서 6일간 작업하는 동안 라이브 사이트(`generatedAt`)가 08-09에 멈춰 있었다(사람이 직접
  확인하기 전까지 아무도 몰랐음). feature 브랜치가 꼭 필요하면 작업 끝나는 대로 바로 main에 merge.
- **git 동시 작업 락.** `auto-build.mjs`·`recheck-ad.mjs`는 git 단계(add/commit/pull --rebase/push)
  진입 전 `.git/az2mz-auto.lock`을 얻는다(`backend/scripts/lib/git-lock.mjs`). 다른 프로세스가
  이미 쥐고 있으면(10분 이내 = 신선) 이번 실행은 git 단계를 건너뛰고 조용히 종료한다(파일 반영은
  이미 끝난 상태라 다음 실행이나 수동 push가 따라잡는다). 10분 넘은 락은 죽은 것으로 보고 자동
  정리 후 재시도한다. 이 락은 두 스크립트끼리만 서로 보호한다 — **인터랙티브 세션의 수동 git
  명령은 이 락을 안 본다.** 그러니 사람이 이 저장소에서 직접 `git commit`/`push`를 할 때도
  `.git/az2mz-auto.lock`이 있는지 먼저 확인하는 습관을 들일 것(있으면 몇 초 기다렸다 다시 확인).
  이 락이 생긴 이유: 2026-08-16 21:15경 인터랙티브 세션과 recheck-ad.mjs로 추정되는 프로세스가
  동시에 이 저장소에서 git 작업을 하다 rebase가 깨진 채 남아(`.git/rebase-merge`에 autostash만
  남고 `--continue`/`--abort` 둘 다 실패) 수동 복구가 필요했다.
- **자동 게시(검증 통과분만).** 일일 파이프라인(21:30)은 봇이 수집·분석 후 `auto-build.mjs`로
  **출처를 자동검증**해 통과한 항목만 `backend/data/trends.json`에 반영하고 **git push(자동 배포)**한다.
  사람 승인 대신 **자동 검증이 게이트** — 죽음(404)·무관·못읽음 출처만 있는 항목은 자동 보류(미게시).
  · 검증·JSON병합·git은 **결정적 스크립트가 전담**(봇이 trends.json·git을 직접 만지지 않는다).
  · 잘못 올라간 게 있으면 **사후에** 사람이 수정·삭제(자동은 검증 통과까지, 최종 책임은 사람).
- **503 자동복구.** 메인 수집(21:30)이 Gemini 용량초과(503/429)로 죽은 날은 21:50 재시도 게이트가
  같은 모델로 1회 재실행(성공·미실행이면 no-op). 게이트까지 못 돈 날(PC 꺼짐)은 수동 백필.
  근본 대책은 **PC를 22:30까지 켜두기**. 503은 모델 무관 — GA(2.5-pro)·유료키로도 21:30엔 남.
- **광고/진짜 일일 재확인(21:15).** 카테고리와 무관하게 **매일 1건**(가장 오래된 신뢰분석)을
  `recheck-ad.mjs`로 출처 재검증(결정적·LLM 없음). 살아있는 출처가 1개+면 `analyzedAt`을 오늘로
  갱신 → **홈 '오늘의 한끗'이 그 항목으로 회전**(고정 아님). 0개면 갱신 안 하고 '사람 확인 필요' 보고.
  메인 수집(21:30)보다 먼저 끝나 trends.json 쓰기 충돌 없음.
- **블로그 발행(티스토리).** 티스토리 Open API는 2024-02 종료 — 공식 글쓰기 API가 없다. 유일한 경로는
  Playwright이며, **카카오 로그인은 자동화하지 않는다**(전용 프로필 `backend/.tistory-profile`에
  사람이 1회 로그인 → 세션 재사용). 본문은 타이핑하지 말고 `tinymce.activeEditor.setContent()`로 한 번에 주입.
  · 대표 이미지 **핫링크 금지** — 나무위키 403·언론사 무응답이 흔하다. `blog-build.mjs`가 내려받아
    `blog-publish.mjs`가 티스토리 CDN에 업로드한다(`<!--COVER-->` 마커 자리).
  · 발행 실패는 **비치명적** — trends.json 게시·배포는 이미 끝난 상태이므로 롤백하지 않고 경고만 남긴다.
  · 제목을 매번 같은 템플릿으로 찍지 않는다(양산글 신호 → 저품질·색인제외). `hangeut-blog` 스킬이 담당.
  · **발행 전 `blog-verify.mjs` 를 반드시 통과시킨다.** `claude -p` 가 CLAUDE.md 철칙을 알고 검증한다
    (원본 왜곡·추정치 단정·신뢰도/만족도 혼동·지어낸 사실·가사/이미지 저작권). 호출당 약 $0.2~0.4.
- **LLM 단독 생성 금지 — 조사가 먼저다.** 모르는 영역을 시키면 **전량 환각**이다
  (실측: 무명 J-POP 후보 8곡 전부 가짜 · 2026 AI 동향 출처 전부 가짜).
  · 음악 = 유튜브 검색으로 실존 곡을 먼저 모은다(`lib/youtube.mjs` `discoverSongs`).
  · 뉴스 = ddgs 로 기사를 찾아 **본문까지 읽어** 넘긴다(`lib/websearch.mjs` `gatherSources`).
  · 더 나은 조사는 **Claude Code 의 WebSearch** — 결과를 `backend/blog/research/<이름>.json` 에 넣고
    `post-build.mjs --research=<이름>` 으로 주입하면 ddgs·유튜브 발굴을 건너뛴다. **hermes 와 무관하다.**
  · **LLM 검수는 누락에 약하다.** 링크 개수·출처 URL 일치 같은 사실은 `hardChecks` 로 문자열 대조한다.
  · 링크할 이전 글이 없는데 "내부링크 2개" 를 요구하면 `example.com` 을 지어낸다 — 모순된 지시를 주지 말 것.
- 인스타/틱톡/페북 **직접 스크래핑 금지(ToS).** ddgs 공개검색 + 유튜브 API만 사용.
- 실서비스(Supabase) 전환 시 **UI/페이지는 손대지 말고** `app.js`의 `H.*` 내부 구현만 교체.

### 비밀 · 보안

- 목 인증은 **데모 전용.** 실서비스 비밀번호 운영에 절대 쓰지 않는다.
- **API 키·토큰을 코드·문서·커밋에 남기지 않는다.** 비밀은 `.claude/`·`.env`(둘 다 gitignore)에만.
  (예외: GitHub Actions용 `GEMINI_API_KEY`는 레포 Settings → Secrets에 등록.)

---

## 환경 메모

- OS: Windows 11 / 셸: PowerShell (Bash 도구도 사용 가능)
- 배포: GitHub `GO9ME/aztomz`(public) → Vercel 정적 배포, push마다 자동 재배포
- **Hermes(고구미봇)**: 별도 레포 `E:\workspace\side_project\hermes`. 크론 시각은 위 "크론 일람" 표가 유일한 기준.
  - **모델: `gemini-2.5-pro`(GA) · provider `gemini`(API키, 유료 Tier-1) 단독 — 폴백 없음**
    (`fallback_providers: []`, 2026-06-23 확정). 이전 구성은 전부 폐기:
    프리뷰(`gemini-3-flash-preview`)는 21:30 503 잦음 · 무료 OAuth(cloudcode)는 병렬 툴콜 400 버그 ·
    OpenRouter 키는 크레딧 $0라 유료 모델 불가(해지, 백업 `auth.json.bak.20260611_openrouter`) ·
    Anthropic OAuth는 서드파티 앱 크레딧 필요 · lite 계열은 리서치를 대충 해 기본 모델 부적합.
  - 크론이 죽은 날 수동 재실행: `hermes cron run 9ddacd750b48`.
