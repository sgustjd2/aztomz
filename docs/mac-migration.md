# 맥미니 이전 가이드 (Windows PC → Mac mini)

> 2026-11-08 작성. 코드는 GitHub로, 비밀·로그인·기록은 직접 복사, 자동 실행은 맥에서 새로 등록한다.
> **두 PC가 동시에 자동 실행되면 안 된다** — 둘 다 `origin/main`에 push해서 충돌한다(6단계에서 Windows 쪽을 끈다).

## 0. 준비된 것 (Windows PC에서 끝남)

| 대상 | 상태 |
|---|---|
| `sgustjd2/aztomz` (공개) | **배포 원본** — Vercel이 여기서 배포하고, 봇(`auto-build`·`recheck-ad`)도 여기(`origin`)로 push한다 |
| `az2mz/aztomz` (조직, 비공개) | 2026-11-08 전체 이력 복사본. 로컬 remote 이름 `az2mz`. **자동 동기화 안 됨** — 맞추려면 `git push az2mz main` |
| `az2mz/hermes` (조직, 비공개) | Hermes 홈(`E:\workspace\side_project\hermes`, remote `origin`): `skills/`·`scripts/`·`cron/jobs.json`·`memories/`·`config.yaml`·`SOUL.md`·런처. **비밀·상태 DB·캐시·`hermes-agent/`는 허용 목록 `.gitignore`로 제외** |
| `hermes-agent` | 이미 포크 `sgustjd2/hermes-agent`에 있음 |

배포 원본을 조직 비공개 레포로 옮기려면 Vercel 연결부터 바꿔야 한다(Hobby 플랜은 조직 소유 비공개 레포 배포가 막혀 있는 것으로 안다 — 옮기기 전에 Vercel 플랜을 확인할 것, 미확인).

## 1. Hermes 홈 갱신 (Windows에서, 이전 직전에 한 번 더)

```powershell
cd E:\workspace\side_project\hermes
git -c safe.directory=E:/workspace/side_project/hermes add -A
git -c safe.directory=E:/workspace/side_project/hermes commit -m "이전 직전 상태"
git -c safe.directory=E:/workspace/side_project/hermes push
```

`config.yaml`의 `api_key`는 모두 빈 값이고 비밀은 `.env`·`auth.json`에만 있지만, 크론 프롬프트·메모리에 운영 정보가 있으니 레포는 비공개로 둔다.

## 2. 맥에서 받기

```bash
mkdir -p ~/workspace/side_project && cd ~/workspace/side_project
git clone https://github.com/sgustjd2/aztomz.git            # 배포 원본(봇 push 대상)
git -C aztomz remote add az2mz https://github.com/az2mz/aztomz.git
git clone https://github.com/az2mz/hermes.git hermes
git clone https://github.com/sgustjd2/hermes-agent.git hermes/hermes-agent
cd aztomz/backend && npm install && npx playwright install chromium
```

Hermes는 맥에서 새로 설치하고(`hermes-agent` README의 macOS 절차), `HERMES_HOME=~/workspace/side_project/hermes`로 둔다.

## 3. 직접 복사할 것 (GitHub에 없음 — USB·AirDrop 등)

| Windows 경로 | 내용 | 비고 |
|---|---|---|
| `hermes\.env` | `DISCORD_BOT_TOKEN`·`DISCORD_ALLOWED_USERS`·`DISCORD_HOME_CHANNEL*`·`GEMINI_API_KEY`·`YOUTUBE_API_KEY`·`GOOGLE_API_KEY` 등 | 비밀. 레포에 넣지 않는다 |
| `hermes\auth.json` | 모델 provider 인증(openai-codex·anthropic) | 비밀. 옮기지 않고 맥에서 `hermes` 로그인을 다시 해도 됨 |
| `aztomz\.env` | `PEXELS_API_KEY` | 비밀 |
| `aztomz\.claude\settings.json`·`settings.local.json`·`launch.json` | Claude Code 권한·프리뷰 설정 | |
| `aztomz\backend\out\` | 수집 기록(`pipeline/runs.jsonl`·`reviews.jsonl`·`restage.jsonl`), 블로그 산출물·발행 기록 | 기록을 이어 쓰려면 복사(`posted.json`은 레포에 있음) |
| `aztomz\.pipeline\` | 검수 대기열 `review-queue.json` | |
| `hermes\state.db`·`cron\executions.db` 등 | 대화·실행 이력 | 선택 — 없어도 동작 |

**옮기지 않는 것**: `backend\.tistory-profile`·`.naver-profile`·`*-state.json`(브라우저 로그인 세션). 맥에서 다시 로그인한다:
`node backend/scripts/blog-publish.mjs --login` · `node backend/scripts/blog-publish-naver.mjs --login`

## 4. 경로를 맥 기준으로 바꿀 곳

환경변수로 덮을 수 있는 곳(코드 수정 불필요):

| 변수 | 쓰는 곳 | 맥 값 예 |
|---|---|---|
| `HERMES_HOME` | `lib/env.mjs`·`discord-reactions.mjs` | `~/workspace/side_project/hermes` |
| `DDGS_EXE` | `lib/websearch.mjs`·`fetch-images.mjs` | `…/hermes-agent/venv/bin/ddgs` |

하드코딩이라 고쳐야 하는 곳:

- `discord-reactions.mjs` — Hermes 실행 파일이 `bin/hermes.exe`로 고정 → 맥에선 `which hermes` 경로.
- Hermes `cron/jobs.json`의 수집 잡 프롬프트, `skills/hangeut/*`(12개 파일), `scripts/`(8개) — `E:/workspace/...`, `node.exe`, `venv/Scripts/python.exe` → `~/workspace/...`, `node`, `venv/bin/python`. (`node.exe`로 부르게 한 이유는 Windows Git Bash의 winpty 별칭 문제라 맥에선 `node`면 된다.)
- `tools/*.vbs`·`*.ps1`(10개) — 맥에선 안 쓴다(5단계로 대체).

## 5. 자동 실행 다시 등록 (Windows 작업 스케줄러 → 맥 launchd/cron)

| Windows 작업 | 하는 일 | 맥 대체 |
|---|---|---|
| `Hermes_Gateway`(로그온) | Hermes 게이트웨이(크론·디스코드) | launchd `KeepAlive` 에이전트로 `hermes gateway` |
| `Hermes_Gateway_Watchdog`(10분) | 게이트웨이 죽으면 재기동 | launchd `KeepAlive`가 대신함 → 불필요 |
| `Hermes_Auto_Update`(20:00) | hermes 업데이트 | 맥에선 Windows 버그 우회 래퍼가 필요 없음 — 맨 `hermes update`를 cron으로 |
| `AZ2MZ_Discord_Reactions`(로그온) | 디스코드 이모지 감시 | launchd `KeepAlive`로 `node backend/scripts/discord-reactions.mjs` |
| `AZ2MZ_Blog_Daily`(09:00) | `claude -p /blog-daily` → 끝나면 `blog-queue.mjs` | cron `0 9 * * *` |
| `AZ2MZ_Blog_Queue`(12·15·18시) | 발행 대기열 | cron `0 12,15,18 * * *` |
| `AZ2MZ_Tistory_Daily_Session`(11:00) | 티스토리 세션 확인·자동로그인 | cron `0 11 * * *` — **로그인한 사용자 세션에서** 돌아야 함(브라우저 창) |
| `AZ2MZ_Tistory_Keepalive`(08~23시 2시간마다) | 세션 유지 | cron `0 8-23/2 * * *` |

Hermes 크론(수집 13:30·17:30·21:30, 재판정 21:05, 광고 재확인 21:15, 재시도 21:50 등)은 `jobs.json`에 들어 있어 Hermes가 그대로 돌린다 — 4단계 경로만 바꾸면 된다. 시각 기준은 CLAUDE.md "크론 일람".

맥미니는 항상 켜 두기 쉬우니, "PC가 22:30에 꺼져서 21:50 재시도를 당겼다" 같은 Windows 시절 제약은 풀린다. 잠자기만 끈다: 시스템 설정 → 에너지 → "디스플레이가 꺼져 있을 때 자동으로 잠자기 방지".

## 6. 전환 순서 (충돌 방지)

1. 맥에서 2~5단계를 마치고, 크론은 아직 **멈춘 상태**로 둔다(`hermes cron pause <id>` 또는 게이트웨이 미기동).
2. Windows에서 끈다: `schtasks /Change /TN <작업> /Disable`(위 표 8개), Hermes 게이트웨이 종료.
3. Windows에서 생긴 마지막 기록을 맥으로 다시 복사(`backend/out/`·`.pipeline/`), `git pull`.
4. 맥에서 게이트웨이·launchd·cron을 켠다.
5. 첫날 확인: `hermes cron list`(다음 실행 시각), 13:30 수집 뒤 `tail -1 backend/out/pipeline/runs.jsonl`, 디스코드 보고.

## 7. 맥에서 확인할 것 (아직 모름)

- Windows 전용 우회가 맥에서 필요 없는지: `auto-build.mjs`의 `process.exit()` 회피(Node 24 Windows libuv assert), cp949 대비 `PYTHONIOENCODING` — 둘 다 그대로 둬도 해는 없다.
- `blog-publish.mjs`의 창 위치(`lib/window.mjs`)와 네이버 클립보드 붙여넣기 — 붙여넣기 키는 `ControlOrMeta+V`(맥 ⌘V)로 이미 바꿔 뒀지만 맥에서 실제로 돌려 본 적은 없다. 첫 발행은 `--draft`로 사람이 지켜본다.
- `claude -p`가 맥 Claude Code에서 같은 스킬(`.claude/skills/blog-daily`)을 찾는지.
