# 맥미니 이전 런북 (Windows PC → Mac mini)

> 2026-11-09 작성. **위에서 아래로 명령만 순서대로 친다.** 판단할 일은 없다.
> 각 단계: ① 어디서 실행 ② 명령(블록 하나 = 명령 하나) ③ 확인 명령과 기대 출력.
> 기대 출력의 `…`는 날짜·번호처럼 매번 달라지는 부분이다. 기대 출력과 다르면 **다음 단계로 가지 말고** 멈춘다.
> **`미확인`** = 이 Windows PC에서는 확인할 수 없는 부분(맥에서 처음 돌려 보는 것). 그 단계는 출력이 달라도 정상일 수 있다.
> 값을 붙여 넣어야 하는 곳은 `<<<…>>>`로 표시했다(맥 계정 이름, 맥 IP 두 곳뿐. 비밀 값은 손으로 칠 일이 없다).

## 전체 순서

| 파트 | 어디서 | 하는 일 | Windows 자동화 |
|---|---|---|---|
| A | Windows | 코드 두 레포를 GitHub에 올림 | 가동 중 |
| B | 맥 | 도구 설치, 레포 받기 | 가동 중 |
| C | 맥 | Hermes 설치 | 가동 중 |
| D | 맥 | 경로 변환 미리 보기(아직 적용 안 함) | 가동 중 |
| **E** | Windows | **전환 시작: 자동화 전부 끄고 마지막 push, 비밀 묶음 만들기** | **정지** |
| F | 맥 | 최신화, 비밀 풀기, 경로 변환 적용, 로그인 | 정지 |
| G | 맥 | Hermes 게이트웨이·launchd 켜기 | 정지 → 맥 가동 |
| H | 맥 | 첫날 확인 | 맥 가동 |
| I | 맥→Windows | 문제 생겼을 때 롤백 | — |

- **E는 21:55 이후**(21:50 재시도 게이트가 끝난 뒤)에 시작한다. 13:30·17:30·21:30 수집 도중에 끄면 반쪽 기록이 남는다.
- E~G 사이(약 30~60분)만 자동화가 멈춘다. 두 대가 동시에 도는 구간은 없다.
- 한 번에 못 끝내도 A~D까지는 몇 번을 쉬어도 된다(Windows는 그대로 돈다).

---

## A. Windows — 코드 올리기 (Windows 계속 가동 중)

모든 A 명령은 **Windows PowerShell**에서 실행한다.

### A1. 다른 git 작업이 없는지 확인

```powershell
Test-Path E:\workspace\side_project\aztomz\.git\az2mz-auto.lock
```

확인: `False`가 나와야 한다. `True`면 봇이 push 중이니 1분 뒤 다시 친다.

### A2. aztomz 커밋 대기 중인 변경 보기

```powershell
git -C E:\workspace\side_project\aztomz status -s
```

확인: 파일 목록이 나온다. **다른 Claude 세션이 아직 편집 중인 파일**(예: `backend/scripts/blog-assemble.mjs`, `post-build.mjs`, `learnings.md`)이 있으면 그 세션이 끝난 뒤에 A3로 간다(다음 단계가 전부 커밋한다).

### A3. aztomz 커밋 + push (두 레포로 동시에)

```powershell
git -C E:\workspace\side_project\aztomz add -A
```

```powershell
git -C E:\workspace\side_project\aztomz commit -m "맥 이전 직전 상태"
```

```powershell
git -C E:\workspace\side_project\aztomz pull --rebase origin main
```

```powershell
git -C E:\workspace\side_project\aztomz push origin main
```

확인: push 출력에 `To https://github.com/sgustjd2/aztomz.git` 와 `To https://github.com/az2mz/aztomz.git` 두 줄이 모두 있어야 한다. 설정 자체는 이렇게 보인다.

```powershell
git -C E:\workspace\side_project\aztomz remote -v
```

기대 출력:

```text
az2mz   https://github.com/az2mz/aztomz.git (fetch)
az2mz   https://github.com/az2mz/aztomz.git (push)
origin  https://github.com/sgustjd2/aztomz.git (fetch)
origin  https://github.com/sgustjd2/aztomz.git (push)
origin  https://github.com/az2mz/aztomz.git (push)
```

세 곳의 최신 커밋이 같은지 확인한다(셋 다 같은 40자리).

```powershell
git -C E:\workspace\side_project\aztomz rev-parse HEAD
```

```powershell
gh api repos/sgustjd2/aztomz/commits/main -q .sha
```

```powershell
gh api repos/az2mz/aztomz/commits/main -q .sha
```

### A4. Hermes 홈 커밋 + push

Hermes 홈은 허용 목록 `.gitignore`라 비밀·DB·캐시는 `add -A`를 해도 올라가지 않는다. 이 폴더는 소유자가 달라 `-c safe.directory=…`가 항상 필요하다. 크론 프롬프트(`cron/jobs.json`)와 맥 경로 변환 스크립트(`scripts/mac_rewrite.py`)가 이때 함께 올라간다.

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes add -A
```

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes commit -m "맥 이전 직전 상태"
```

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes push origin main
```

확인: 작업 트리가 깨끗하고, 로컬과 GitHub의 커밋이 같아야 한다.

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes status -s
```

기대 출력: 아무것도 안 나옴(빈 줄).

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes rev-parse HEAD
```

```powershell
gh api repos/az2mz/hermes/commits/main -q .sha
```

기대 출력: 위 두 줄이 같은 40자리.

---

## B. 맥 — 도구 설치와 레포 받기

모든 B 명령은 **맥 Terminal**(기본 zsh)에서 실행한다. 맥 칩은 Apple Silicon(arm64)을 기준으로 썼다. 인텔이면 `/opt/homebrew` 대신 `/usr/local`로 나오며 `미확인`이다.

### B1. 시간대를 서울로

크론(`0 21 * * *` 등)과 launchd 시각이 모두 맥의 현지 시간 기준이다.

```bash
sudo systemsetup -settimezone Asia/Seoul
```

```bash
date +%Z
```

기대 출력: `KST`. (`systemsetup`이 권한 오류면 시스템 설정 → 일반 → 날짜 및 시간 → 시간대를 서울로. `미확인`)

### B2. Xcode 명령줄 도구(git 포함)

```bash
xcode-select --install
```

설치 창이 뜨면 끝날 때까지 기다린 뒤:

```bash
git --version
```

기대 출력: `git version 2.…`. (이미 설치돼 있으면 B2의 첫 명령은 "already installed" 오류를 내지만 정상이다.)

### B3. Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 끝에 안내되는 대로 PATH를 영구 등록한다.

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
```

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

```bash
brew --version
```

기대 출력: `Homebrew 4.…` 이상.

### B4. git · gh · node(24) · python · uv

Windows의 Node가 `v24.16.0`이라 같은 메이저 24를 쓴다.

```bash
brew install git gh node@24 python uv
```

```bash
brew link --overwrite --force node@24
```

```bash
node -v
```

기대 출력: `v24.…` (메이저 24면 통과). `미확인`: `node@24`가 Homebrew에 없다고 나오면 `brew search node` 결과에서 24가 들어간 이름으로 바꾼다.

```bash
python3 --version && uv --version && gh --version | head -1
```

기대 출력: `Python 3.1…`, `uv 0.…`, `gh version 2.…` 세 줄.

### B5. GitHub 로그인 (손으로 하는 첫 번째 로그인)

```bash
gh auth login
```

질문에 순서대로: `GitHub.com` → `HTTPS` → `Y`(git에 인증 사용) → `Login with a web browser` → 화면의 코드를 브라우저에 입력 → **`sgustjd2` 계정**으로 승인.

```bash
gh auth setup-git
```

```bash
gh api user -q .login
```

기대 출력: `sgustjd2`

이 계정은 `sgustjd2/aztomz`, `az2mz/aztomz`, `az2mz/hermes` 세 곳에 모두 push 권한이 있어야 한다(Windows에서 확인함: 세 곳 모두 `push: true`).

```bash
git config --global user.name sgustjd2
```

```bash
git config --global user.email shin1133@naver.com
```

### B6. aztomz 받기 + push 주소 둘 설정

```bash
mkdir -p ~/workspace/side_project
```

```bash
git clone https://github.com/sgustjd2/aztomz.git ~/workspace/side_project/aztomz
```

`origin`의 push를 두 곳으로 만든다. (`--push`로 먼저 덮어쓰고, 두 번째를 `--add`로 더한다.)

```bash
git -C ~/workspace/side_project/aztomz remote set-url --push origin https://github.com/sgustjd2/aztomz.git
```

```bash
git -C ~/workspace/side_project/aztomz remote set-url --add --push origin https://github.com/az2mz/aztomz.git
```

```bash
git -C ~/workspace/side_project/aztomz remote add az2mz https://github.com/az2mz/aztomz.git
```

```bash
git -C ~/workspace/side_project/aztomz remote -v
```

기대 출력: A3의 기대 출력과 **똑같은 5줄**.

### B7. Hermes 홈 받기

```bash
git clone https://github.com/az2mz/hermes.git ~/workspace/side_project/hermes
```

```bash
ls ~/workspace/side_project/hermes
```

기대 출력: `SOUL.md  config.yaml  cron  gateway-service  memories  scripts  skills` 등이 보이면 정상. `.env`·`auth.json`은 아직 없다(F에서 푼다).

### B8. 환경변수 등록 (`HERMES_HOME`, `DDGS_EXE` 등)

환경은 `tools/mac/env.sh` 한 파일에 모아 두었다. `~/.zshrc`가 이 파일을 읽고, launchd 작업도 같은 파일을 읽는다.

```bash
echo 'source "$HOME/workspace/side_project/aztomz/tools/mac/env.sh"' >> ~/.zshrc
```

```bash
source ~/.zshrc
```

```bash
echo "$HERMES_HOME" "$DDGS_EXE"
```

기대 출력: `/Users/<맥계정>/workspace/side_project/hermes /Users/<맥계정>/.local/bin/ddgs`

### B9. 백엔드 의존성 + Playwright 크로미엄

```bash
cd ~/workspace/side_project/aztomz/backend && npm install
```

```bash
cd ~/workspace/side_project/aztomz/backend && npx playwright install chromium
```

```bash
cd ~/workspace/side_project/aztomz/backend && npx playwright --version
```

기대 출력: `Version 1.62.0`

```bash
cd ~/workspace/side_project/aztomz && node backend/scripts/validate-trends.mjs
```

기대 출력: `✓ 스키마 검증 통과: …  trends, cat 7분류 준수, id 유니크`

### B10. ddgs (웹 검색 도구, Hermes 수집용)

```bash
uv tool install "ddgs==9.16.0"
```

```bash
"$DDGS_EXE" --help | head -2
```

기대 출력의 첫 줄: `Usage: ddgs [OPTIONS] COMMAND1 [ARGS]...`

### B11. Claude Code 설치 (로그인은 F에서)

Windows도 npm 전역 설치(`claude.cmd`, 버전 2.1.308)다.

```bash
npm install -g @anthropic-ai/claude-code
```

```bash
claude --version
```

기대 출력: `2.… (Claude Code)`

---

## C. 맥 — Hermes 설치

공식 설치 스크립트(`hermes-agent/scripts/install.sh`, macOS·Linux용)를 쓴다. Windows의 `install.ps1`과 같은 단계 구조다. 설치 위치는 `$HERMES_HOME/hermes-agent`로 Windows와 같다. Hermes 홈에는 B7에서 받은 `config.yaml`·`cron/jobs.json`이 이미 있으므로 스크립트는 그것을 덮어쓰지 않는다. (`미확인`: macOS에서 이 스크립트를 이 프로젝트로 돌려 본 적 없음. 중간에 관리자 암호를 물을 수 있다.)

### C1. 설치

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --hermes-home "$HERMES_HOME" --non-interactive
```

```bash
source ~/.zshrc
```

```bash
hermes --version
```

기대 출력: `Hermes Agent v0.23.0 …` (Windows가 `v0.23.0 (2026.9.24)`. 맥은 최신 stable이 깔려 더 높은 번호일 수 있음 — `미확인`, 숫자가 높아도 진행한다.)

### C2. 실행 파일 위치 확인

```bash
command -v hermes
```

기대 출력: `/Users/<맥계정>/.local/bin/hermes` 또는 `…/hermes/bin/hermes`. 아무것도 안 나오면 `source ~/.zshrc`를 한 번 더 한다.

```bash
echo "$HERMES_BIN"
```

기대 출력: 바로 위 `command -v hermes`와 같은 경로. (비어 있으면 `source ~/.zshrc`를 한 번 더 치고 다시 본다.)

---

## D. 맥 — 경로 변환 미리 보기 (아직 적용하지 않는다)

Hermes 크론 프롬프트·스킬·스크립트에 Windows 경로(`E:/workspace/...`, `node.exe`, `venv/Scripts/python.exe`)가 박혀 있다. 변환 스크립트는 `~/workspace/side_project/hermes/scripts/mac_rewrite.py`(표준 라이브러리만 사용)다. 변환 대상: `cron/jobs.json`, `scripts/*.py`, `skills/hangeut/**`, `skills/aztomz-blog/**`, `memories/`, `SOUL.md`. `*.bak*`와 `.env`·`auth.json`은 건드리지 않는다.

### D1. 미리 보기

```bash
python3 ~/workspace/side_project/hermes/scripts/mac_rewrite.py
```

기대 출력의 끝: `2x file(s) would change (add --apply)` — 20여 개. 파일 목록에 `cron\jobs.json`이 있어야 한다(Windows가 만든 목록이면 `\`, 맥에서는 `/`).

### D2. 변환 전 상태에서 남은 Windows 경로 수

```bash
python3 ~/workspace/side_project/hermes/scripts/mac_rewrite.py --check | wc -l
```

기대 출력: 90~100 근처 숫자(변환 전이라 많은 것이 정상). **F에서 적용 후 이 검사가 `OK`가 되어야 한다.**

---

## E. Windows — 전환 시작 (여기부터 Windows 자동화가 멈춘다)

**21:55 이후, 아무 작업도 도는 중이 아닐 때** 시작한다. E1은 **관리자 권한 PowerShell**(시작 → PowerShell 우클릭 → 관리자 권한으로 실행)에서, 나머지는 일반 PowerShell에서 실행해도 된다(관리자 창 하나로 전부 해도 된다).

### E1. 지금 도는 작업이 없는지 확인

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'blog-queue|blog-publish|blog-daily|claude(\.cmd)? -p|auto-build|restage' } | Select-Object ProcessId, Name
```

기대 출력: 아무것도 안 나옴. 나오면 끝날 때까지 기다렸다가 다시 친다(블로그 발행 도중이면 수십 분 걸릴 수 있다).

### E2. Windows 예약 작업 8개 전부 끄기 (관리자 PowerShell)

게이트웨이·워치독을 **먼저** 끈다(워치독이 10분마다 게이트웨이를 되살리기 때문).

```powershell
schtasks /Change /TN Hermes_Gateway_Watchdog /Disable
```

```powershell
schtasks /Change /TN Hermes_Gateway /Disable
```

```powershell
schtasks /Change /TN Hermes_Auto_Update /Disable
```

```powershell
schtasks /Change /TN AZ2MZ_Discord_Reactions /Disable
```

```powershell
schtasks /Change /TN AZ2MZ_Blog_Daily /Disable
```

```powershell
schtasks /Change /TN AZ2MZ_Blog_Queue /Disable
```

```powershell
schtasks /Change /TN AZ2MZ_Tistory_Daily_Session /Disable
```

```powershell
schtasks /Change /TN AZ2MZ_Tistory_Keepalive /Disable
```

각 명령의 기대 출력: `성공: "…" 작업의 매개 변수를 변경했습니다.` (영문 Windows면 `SUCCESS: The parameters of scheduled task "…" have been changed.`)

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'AZ2MZ_*' -or $_.TaskName -like 'Hermes_*' } | Select-Object TaskName, State
```

기대 출력: 8줄 모두 `State`가 `Disabled`.

### E3. 돌고 있는 Hermes 게이트웨이·디스코드 감시 끄기

공식 명령을 먼저 시도한다. Windows에서는 `Access denied`가 나는 경우가 있다(CLAUDE.md "Hermes 업데이트" 항목의 알려진 버그).

```powershell
$env:HERMES_HOME='E:\workspace\side_project\hermes'; & E:\workspace\side_project\hermes\hermes-agent\venv\Scripts\hermes.exe gateway stop
```

남아 있는 프로세스를 직접 끈다(아무것도 없어도 오류 없이 끝난다).

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'hermes_cli|gateway run|discord-reactions\.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

확인: 같은 조건으로 다시 찾아 아무것도 안 나와야 한다.

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'hermes_cli|gateway run|discord-reactions\.mjs' } | Select-Object ProcessId, Name
```

기대 출력: 아무것도 안 나옴.

### E4. 마지막 기록까지 포함해 한 번 더 commit·push

A1 → A3 → A4를 **그대로 다시** 한다(그 사이 봇이 쓴 기록과 `jobs.json`의 마지막 실행 상태가 올라간다). 명령은 A 파트와 같고, 기대 출력도 같다. 끝에서 세 곳의 해시가 같은지 다시 본다.

```powershell
git -C E:\workspace\side_project\aztomz add -A
```

```powershell
git -C E:\workspace\side_project\aztomz commit -m "전환 직전 마지막 상태"
```

```powershell
git -C E:\workspace\side_project\aztomz pull --rebase origin main
```

```powershell
git -C E:\workspace\side_project\aztomz push origin main
```

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes add -A
```

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes commit -m "전환 직전 마지막 상태"
```

```powershell
git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes push origin main
```

(커밋할 게 없으면 `nothing to commit`이 나온다. 정상이며 다음 명령으로 넘어간다.)

```powershell
git -C E:\workspace\side_project\aztomz rev-parse HEAD
```

```powershell
gh api repos/az2mz/aztomz/commits/main -q .sha
```

기대 출력: 두 해시가 같다.

### E5. 비밀·상태 묶음 만들기 (파일 하나)

Git에 없는 것만 `Desktop\az2mz-secrets.tgz` 하나로 묶는다. 묶는 스크립트는 `tools/mac/pack-secrets.ps1`이다.

```powershell
powershell -ExecutionPolicy Bypass -File E:\workspace\side_project\aztomz\tools\mac\pack-secrets.ps1
```

기대 출력: `OK: C:\Users\admin\Desktop\az2mz-secrets.tgz (… MB)` — 약 30MB. `MISSING (skipped): …` 줄이 나오면 그 파일만 빠진 것이다(아래 표에서 선택 항목이면 무시).

묶이는 것(전부 이 PC에서 존재를 확인한 경로):

| 경로 (`E:\workspace\side_project\` 아래) | 내용 |
|---|---|
| `hermes\.env` | `DISCORD_BOT_TOKEN`·`DISCORD_ALLOWED_USERS`·`DISCORD_HOME_CHANNEL*`·`GEMINI_API_KEY`·`YOUTUBE_API_KEY`·`GOOGLE_API_KEY`·`ANTHROPIC_*` |
| `hermes\auth.json`, `hermes\auth\google_oauth.json` | 모델 provider 로그인(openai-codex·anthropic), 구글 OAuth |
| `aztomz\.env` | `PEXELS_API_KEY` |
| `aztomz\.claude\settings.json`, `settings.local.json`, `launch.json` | Claude Code 프로젝트 설정(권한 허용 목록 포함) |
| `aztomz\backend\out\pipeline\` | `runs.jsonl`·`reviews.jsonl`·`restage.jsonl`·`discord-review-state.json` (수집 기록·검수 기록) |
| `aztomz\.pipeline\` | `review-queue.json`(검수 대기열)과 수집 중간 파일 |
| `aztomz\backend\out\blog\` 의 `posted-naver.json`·`queue-skipped.json`·`cover-refresh.json` + 최근 10일 파일 | 네이버 발행 기록, 대기열 제외 목록, 발행 대기 중 원고 |
| `%USERPROFILE%\.claude\CLAUDE.md`와 이 프로젝트의 `memory\` | 전역 지침 · Claude 기억(`settings.json`은 Windows 전용 훅이라 **일부러 안 묶음**) |

묶지 않는 것: `backend\.tistory-profile`·`.naver-profile`·`*-state.json`(브라우저 로그인 세션 — F에서 다시 로그인), `hermes\state.db`(165MB 대화 이력 — 없어도 동작), `posted.json`(이미 git에 있음).

기록 줄 수를 적어 둔다(맥에서 같은 숫자가 나와야 한다).

```powershell
(Get-Content E:\workspace\side_project\aztomz\backend\out\pipeline\runs.jsonl | Measure-Object -Line).Lines
```

### E6. 맥으로 보내기

맥에서 SSH를 켠다: 시스템 설정 → 일반 → 공유 → **원격 로그인** 켜기. 그다음 **맥 Terminal**에서 계정 이름과 IP를 본다.

```bash
whoami
```

```bash
ipconfig getifaddr en0
```

**Windows PowerShell**에서 (`<<<맥계정>>>`·`<<<맥IP>>>`에 위 두 값을 넣는다):

```powershell
scp "$env:USERPROFILE\Desktop\az2mz-secrets.tgz" <<<맥계정>>>@<<<맥IP>>>:~/
```

확인(맥 Terminal):

```bash
ls -lh ~/az2mz-secrets.tgz
```

기대 출력: 약 30MB 파일 한 줄. (USB 드라이브로 옮겨도 된다. 그 경우 맥의 홈 폴더에 `az2mz-secrets.tgz`라는 이름으로 복사한다.)

---

## F. 맥 — 최신화, 비밀 풀기, 경로 변환 적용, 로그인

### F1. 최신 코드 받기

```bash
git -C ~/workspace/side_project/aztomz pull --ff-only
```

```bash
git -C ~/workspace/side_project/hermes pull --ff-only
```

```bash
git -C ~/workspace/side_project/aztomz rev-parse HEAD
```

```bash
gh api repos/sgustjd2/aztomz/commits/main -q .sha
```

기대 출력: 위 두 해시가 같다.

### F2. 비밀·상태 풀기

```bash
mkdir -p /tmp/az2mz-unpack && tar -xzf ~/az2mz-secrets.tgz -C /tmp/az2mz-unpack
```

```bash
rsync -a /tmp/az2mz-unpack/side_project/ ~/workspace/side_project/
```

Claude Code 전역 지침과 기억:

```bash
mkdir -p ~/.claude && cp /tmp/az2mz-unpack/claude-home/CLAUDE.md ~/.claude/CLAUDE.md
```

```bash
M="$HOME/.claude/projects/$(echo "$HOME/workspace/side_project/aztomz" | sed 's#[^A-Za-z0-9]#-#g')/memory"; mkdir -p "$M" && cp -R /tmp/az2mz-unpack/claude-home/memory/. "$M/"
```

(기억 폴더 이름 규칙은 Windows의 `E--workspace-side-project-aztomz`에서 추정한 것이다 — `미확인`. 틀려도 Claude Code 동작에는 영향이 없다.)

권한을 좁히고 임시 파일을 지운다.

```bash
chmod 600 ~/workspace/side_project/hermes/.env ~/workspace/side_project/hermes/auth.json ~/workspace/side_project/aztomz/.env
```

```bash
rm -rf /tmp/az2mz-unpack ~/az2mz-secrets.tgz
```

확인 — 값을 출력하지 않고 키가 있는지만 센다.

```bash
grep -c '^DISCORD_BOT_TOKEN=' ~/workspace/side_project/hermes/.env
```

기대 출력: `1`

```bash
wc -l < ~/workspace/side_project/aztomz/backend/out/pipeline/runs.jsonl
```

기대 출력: E5에서 적어 둔 숫자와 같다.

**Windows PC의 `Desktop\az2mz-secrets.tgz`도 지운다** (Windows PowerShell):

```powershell
Remove-Item "$env:USERPROFILE\Desktop\az2mz-secrets.tgz"
```

### F3. 경로 변환 적용

```bash
python3 ~/workspace/side_project/hermes/scripts/mac_rewrite.py --apply
```

기대 출력의 끝: `2x file(s) rewritten`

```bash
python3 ~/workspace/side_project/hermes/scripts/mac_rewrite.py --check
```

기대 출력: `OK: no Windows path left`

같은 것을 스크립트 없이 grep으로도 증명한다(스크립트 자신과 `.bak` 백업은 제외).

```bash
grep -rnE 'E:/|E:\\|node\.exe|Scripts/python\.exe|Scripts\\python\.exe' ~/workspace/side_project/hermes/cron/jobs.json ~/workspace/side_project/hermes/scripts ~/workspace/side_project/hermes/skills/hangeut ~/workspace/side_project/hermes/skills/aztomz-blog ~/workspace/side_project/hermes/memories ~/workspace/side_project/hermes/SOUL.md --exclude=mac_rewrite.py --exclude='*.bak*' --exclude-dir=__pycache__ | wc -l
```

기대 출력: `0`

`cron/jobs.json`이 여전히 올바른 JSON이고 열네 개 잡을 담고 있는지:

```bash
python3 -c "import json,os; print(len(json.load(open(os.path.expanduser('~/workspace/side_project/hermes/cron/jobs.json'),encoding='utf-8'))['jobs']))"
```

기대 출력: `14`

(남는 것: `scripts/aztomz_blog_daily.py`와 `skills/aztomz-blog/` 안의 `cmd.exe` 언급. 이 Hermes 잡 `c49cb13870e0`는 일시정지 상태로 두는 옛 구성이라 영향이 없다.)

`discord-reactions.mjs`의 `hermes.exe` 하드코딩은 이미 코드에서 고쳐 두었다 — `HERMES_BIN` 환경변수(B8의 `env.sh`가 설정)를 쓰고, 없으면 OS에 맞는 이름을 쓴다.

```bash
grep -n "HERMES_BIN" ~/workspace/side_project/aztomz/backend/scripts/discord-reactions.mjs
```

기대 출력: `const HERMES = process.env.HERMES_BIN || …` 줄이 나옴.

> 맥에서 변환한 hermes 파일은 **커밋하지 않는다**(Windows로 롤백할 때 충돌하지 않게). 롤백이 필요해지면 I2에서 `git checkout -- .`로 되돌린다.

### F4. 모델 provider 로그인 확인 (Hermes)

```bash
hermes auth list
```

기대 출력: `openai-codex`와 `anthropic` 항목이 보인다(Windows의 `auth.json`을 복사했기 때문). 목록이 비었거나 만료로 나오면 `hermes model`을 실행해 해당 provider로 다시 로그인한다 — 브라우저 로그인은 손으로 한다. `미확인`: 토큰이 다른 머신에서 그대로 통하는지.

### F5. 손으로 하는 나머지 로그인

**Claude Code** (구독 계정으로 로그인):

```bash
claude
```

열린 화면에서 `/login`을 입력해 브라우저로 승인하고 `/exit`로 나온다. 확인:

```bash
claude -p "OK 한 단어만 답해"
```

기대 출력: `OK`

**티스토리** — 전용 브라우저가 뜬다. 카카오 로그인(CAPTCHA·추가 인증이 있으면 직접)을 마치고 **글쓰기 화면**까지 가면 엔터 없이 자동 감지해 세션을 저장한다(최대 10분 대기).

```bash
cd ~/workspace/side_project/aztomz && node backend/scripts/blog-publish.mjs --login
```

```bash
cd ~/workspace/side_project/aztomz && node backend/scripts/blog-publish.mjs --keepalive
```

기대 출력: `✓ 세션 살아있음 — 갱신 완료 (…)` (참고: Windows는 2026-11-08 23:00 keepalive 로그에서 이미 `세션 만료`였다. 맥에서 새로 로그인해야 하는 것이 맞다.)

**네이버 블로그** — 전용 브라우저에서 로그인하고, 터미널로 돌아와 **엔터**를 친다(네이버는 엔터가 필요).

```bash
cd ~/workspace/side_project/aztomz && node backend/scripts/blog-publish-naver.mjs --login
```

```bash
ls -l ~/workspace/side_project/aztomz/backend/.naver-state.json
```

기대 출력: 파일 한 줄. (`미확인`: 맥에서 Playwright 창, 클립보드 붙여넣기 `ControlOrMeta+V`(⌘V)를 처음 쓴다. 첫 실제 발행은 `--draft`로 지켜본다.)

---

## G. 맥 — 자동 실행 켜기

### G1. Hermes 게이트웨이를 launchd 서비스로 등록·시작

Hermes가 macOS에서는 launchd 에이전트(`ai.hermes.gateway…`)를 직접 만든다. Windows의 `Hermes_Gateway`와 `Hermes_Gateway_Watchdog`을 이것이 대신한다(launchd가 죽으면 다시 띄운다).

```bash
hermes gateway install --start-now --start-on-login
```

```bash
hermes gateway status
```

기대 출력: `Gateway is running` 계열 문구와 launchd 서비스 표시. `미확인`: 정확한 문구.

```bash
hermes cron status
```

기대 출력: `✓ Gateway is running — cron jobs will fire automatically`

### G2. 크론 잡이 모두 그대로 올라왔는지

```bash
hermes cron list | grep -c '\[active\]'
```

기대 출력: `9`

```bash
hermes cron list | grep -c '\[paused\]'
```

기대 출력: `5`

```bash
hermes cron list | grep -E '^[[:space:]]+[0-9a-f]{12} \[active\]'
```

기대 출력(순서 무관, 12자리 id 9개):

```text
  dc54cec90b5e [active]   # 한끗 주간 갱신        월 21:00
  f3a0b6724fa4 [active]   # 오늘의 분야 안내      매일 21:00
  2bfe2a1c0d40 [active]   # 유행 단계 재판정      매일 21:05
  f0994a8787c9 [active]   # 광고/진짜 재확인      매일 21:15
  0a2ea7571c71 [active]   # 수집 슬롯0           매일 13:30
  55a2adf74363 [active]   # 수집 슬롯1           매일 17:30
  9ddacd750b48 [active]   # 수집 슬롯2           매일 21:30
  cb8938c4f951 [active]   # 수집 재시도 게이트    매일 21:50
  441ad100e8b3 [active]   # 개발/IT 소스 fetch   수 20:00
```

(우측 `#` 설명은 출력에 없다. id만 맞으면 된다. 일시정지 5개: `2753130fafb2` `f4629bdac6dc` `fb0e99933a2e` `bc1a98451fb7` `c49cb13870e0`.)

다음 실행 시각이 `+09:00`(서울)인지:

```bash
hermes cron list | grep 'Next run' | head -3
```

기대 출력: `Next run:  2026-…T…+09:00` 형태 세 줄.

### G3. launchd 작업 5개 복사·등록

Windows 작업 ↔ 맥 launchd 대응은 아래와 같다. 파일은 `tools/mac/`에 있고 시각·명령은 Windows 작업과 같다.

| Windows 작업 | 시각 (KST) | 맥 plist (`tools/mac/`) | 실제 명령 (`tools/mac/job.sh <이름>`) |
|---|---|---|---|
| `AZ2MZ_Blog_Daily` | 매일 09:00 | `com.az2mz.blog-daily.plist` | `claude -p --permission-mode acceptEdits "/blog-daily"` → 성공(exit 0)이면 곧바로 `blog-queue.mjs` |
| `AZ2MZ_Blog_Queue` | 12:00 · 15:00 · 18:00 | `com.az2mz.blog-queue.plist` | `node backend/scripts/blog-queue.mjs` |
| `AZ2MZ_Tistory_Daily_Session` | 매일 11:00 | `com.az2mz.tistory-daily-session.plist` | `node backend/scripts/blog-publish.mjs --daily-session` |
| `AZ2MZ_Tistory_Keepalive` | 08:00부터 2시간마다 → 08·10·12·14·16·18·20·22시 | `com.az2mz.tistory-keepalive.plist` | `node backend/scripts/blog-publish.mjs --keepalive` |
| `AZ2MZ_Discord_Reactions` | 로그온 시 상주 | `com.az2mz.discord-reactions.plist` (`RunAtLoad`+`KeepAlive`) | `node backend/scripts/discord-reactions.mjs` |
| `Hermes_Gateway` + `Hermes_Gateway_Watchdog` | 로그온 / 10분마다 | G1의 `hermes gateway install` | — |
| `Hermes_Auto_Update` | 매일 20:00 | `com.az2mz.hermes-autoupdate.plist` — **지금은 안 켠다**(K 참고) | `hermes update` |

로그는 Windows 때와 같은 파일에 쌓인다: `backend/out/blog/blog-daily.log`·`blog-queue.log`·`tistory-daily-session.log`·`tistory-keepalive.log`, `backend/out/discord-reactions.log`.

```bash
mkdir -p ~/Library/LaunchAgents
```

```bash
cp ~/workspace/side_project/aztomz/tools/mac/com.az2mz.{blog-daily,blog-queue,tistory-daily-session,tistory-keepalive,discord-reactions}.plist ~/Library/LaunchAgents/
```

형식 검사(다섯 줄 모두 `OK`):

```bash
plutil -lint ~/Library/LaunchAgents/com.az2mz.*.plist
```

기대 출력: 각 파일마다 `…plist: OK`. (`hermes-autoupdate`는 복사하지 않았으니 5개다.)

```bash
for n in blog-daily blog-queue tistory-daily-session tistory-keepalive discord-reactions; do launchctl load -w ~/Library/LaunchAgents/com.az2mz.$n.plist; done
```

```bash
launchctl list | grep com.az2mz
```

기대 출력: 5줄. `com.az2mz.discord-reactions`는 첫 열에 PID 숫자가 있고, 나머지 4개는 `-`(정해진 시각까지 대기).

```bash
pgrep -fl discord-reactions.mjs
```

기대 출력: `… node …/discord-reactions.mjs` 한 줄.

### G4. 맥이 잠들지 않게

launchd·Hermes 크론은 맥이 자는 동안 돌지 않는다.

```bash
sudo pmset -a sleep 0
```

```bash
pmset -g | grep -w sleep
```

기대 출력: ` sleep                0` 형태. 추가로 **재부팅 뒤에도 에이전트가 돌려면 자동 로그인**이 필요하다: 시스템 설정 → 사용자 및 그룹 → 자동 로그인(FileVault가 켜져 있으면 선택 불가 — `미확인`).

---

## H. 맥 — 첫날 확인

### H1. 크론이 맥에서 도는지 (13:30 슬롯 이후)

```bash
tail -1 ~/workspace/side_project/aztomz/backend/out/pipeline/runs.jsonl | cut -c1-200
```

기대 출력: 오늘 날짜의 한 줄. 예: `{"date":"2026-11-09","at":"2026-11-09T04:3…","mode":"auto","outcome":"pushed","candidates":…,"passed":…,"published":…`. 이 줄이 이전 날짜(전날)면 13:30 수집이 아직 안 돈 것이다 — `hermes cron list`로 `0a2ea7571c71`의 `Last run`을 본다.

### H2. 디스코드 보고

13:30 잡 보고(`Cronjob Response`)가 홈 채널에 오고, 맥의 디스코드 감시(`discord-reactions`)가 그 보고 끝에 `👇 이모지를 누르면 — …` 줄과 이모지(🔁 📋 📊)를 단다. 안 달리면:

```bash
tail -5 ~/workspace/side_project/aztomz/backend/out/discord-reactions.log
```

기대 출력: 오류 없이 접속·반응 로그가 찍힌다. (같은 봇 토큰으로 Windows의 감시도 켜져 있으면 이모지가 두 번 달린다 — E3에서 꺼 두었는지 다시 확인.)

### H3. 봇이 push한 커밋이 Vercel에 배포됐는지

```bash
SHA=$(git -C ~/workspace/side_project/aztomz log -1 --format=%H --grep='^auto: 트렌드 자동 게시') && echo $SHA
```

```bash
gh api repos/sgustjd2/aztomz/commits/$SHA/status -q '.statuses[] | {context, state, description}'
```

기대 출력: `{"context":"Vercel","description":"Deployment has completed","state":"success"}` (push 직후 1~2분은 `pending`일 수 있어 다시 친다). `git log` 결과가 비면 오늘 아직 게시된 건이 없는 것이다.

사본 레포에도 같은 커밋이 갔는지:

```bash
gh api repos/az2mz/aztomz/commits/$SHA -q .sha
```

기대 출력: 위 `SHA`와 같다.

### H4. 다음 날 09:00 이후: 블로그 집필·발행

```bash
tail -5 ~/workspace/side_project/aztomz/backend/out/blog/blog-daily.log
```

```bash
tail -5 ~/workspace/side_project/aztomz/backend/out/blog/blog-queue.log
```

기대 출력: 09:00 구분선(`===== …`)과 이어지는 집필·큐 로그. `미확인`: 맥에서 `claude -p`가 프로젝트 스킬 `/blog-daily`를 찾는지(스킬은 레포의 `.claude/skills/`에 있다). `unknown command`가 나오면 `claude`를 `~/workspace/side_project/aztomz`에서 열고 `/blog-daily`가 보이는지 확인한다.

### H5. Windows가 꺼진 채인지 (Windows PowerShell)

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'AZ2MZ_*' -or $_.TaskName -like 'Hermes_*' } | Select-Object TaskName, State
```

기대 출력: 8줄 모두 `Disabled`.

---

## I. 롤백 (맥을 멈추고 Windows를 다시 켠다)

### I1. 맥 정지 (맥 Terminal)

```bash
for n in blog-daily blog-queue tistory-daily-session tistory-keepalive discord-reactions; do launchctl unload -w ~/Library/LaunchAgents/com.az2mz.$n.plist; done
```

```bash
hermes gateway stop
```

```bash
launchctl list | grep -c com.az2mz
```

기대 출력: `0`

```bash
pgrep -fl 'discord-reactions|hermes_cli|gateway run' | wc -l
```

기대 출력: `0` (남아 있으면 `pkill -f discord-reactions` 후 다시 확인.)

### I2. 맥에서 생긴 상태를 Windows로 돌려보내기 (맥 → Windows)

코드(`aztomz`)는 봇이 이미 push했으므로 Windows에서 `git pull`만 하면 된다. `cron/jobs.json`은 **맥 경로로 바뀌었으니 복사하지 않는다.** 기록 파일만 묶는다.

```bash
tar -czf ~/mac-state-back.tgz -C ~/workspace/side_project aztomz/backend/out/pipeline aztomz/.pipeline aztomz/backend/out/blog/posted-naver.json aztomz/backend/out/blog/queue-skipped.json aztomz/backend/out/blog/cover-refresh.json
```

```bash
scp ~/mac-state-back.tgz <<<Windows계정>>>@<<<WindowsIP>>>:C:/Users/<<<Windows계정>>>/Desktop/
```

(Windows에서 OpenSSH 서버가 꺼져 있으면 USB로 옮긴다. `scp` 대신 USB 복사로 대체.)

Windows PowerShell:

```powershell
& "$env:SystemRoot\System32\tar.exe" -xzf "$env:USERPROFILE\Desktop\mac-state-back.tgz" -C E:\workspace\side_project
```

```powershell
git -C E:\workspace\side_project\aztomz pull --ff-only
```

Windows의 hermes 폴더에는 맥 변환이 들어간 적이 없으므로 `git -c safe.directory=E:/workspace/side_project/hermes -C E:\workspace\side_project\hermes status -s`가 비어 있어야 한다(비어 있지 않으면 `git … checkout -- .`로 되돌린다).

### I3. Windows 작업 다시 켜기 (관리자 PowerShell)

```powershell
schtasks /Change /TN Hermes_Gateway /Enable
```

```powershell
schtasks /Change /TN Hermes_Gateway_Watchdog /Enable
```

```powershell
schtasks /Change /TN Hermes_Auto_Update /Enable
```

```powershell
schtasks /Change /TN AZ2MZ_Discord_Reactions /Enable
```

```powershell
schtasks /Change /TN AZ2MZ_Blog_Daily /Enable
```

```powershell
schtasks /Change /TN AZ2MZ_Blog_Queue /Enable
```

```powershell
schtasks /Change /TN AZ2MZ_Tistory_Daily_Session /Enable
```

```powershell
schtasks /Change /TN AZ2MZ_Tistory_Keepalive /Enable
```

게이트웨이와 디스코드 감시를 지금 바로 띄운다(다음 로그온을 기다리지 않는다).

```powershell
schtasks /Run /TN Hermes_Gateway
```

```powershell
schtasks /Run /TN AZ2MZ_Discord_Reactions
```

확인:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'AZ2MZ_*' -or $_.TaskName -like 'Hermes_*' } | Select-Object TaskName, State
```

기대 출력: 8줄 모두 `Ready`(실행 중인 두 개는 `Running`일 수 있음).

```powershell
$env:HERMES_HOME='E:\workspace\side_project\hermes'; & E:\workspace\side_project\hermes\hermes-agent\venv\Scripts\hermes.exe cron status
```

기대 출력: `✓ Gateway is running — cron jobs will fire automatically`

주의: 맥에서 모델 로그인(OAuth) 토큰이 갱신됐을 수 있다. Windows에서 `hermes auth list`가 만료를 표시하면 `hermes model`로 다시 로그인한다 (`미확인`).

---

## J. 부록 — crontab 대안 (쓰지 않는다)

launchd를 쓰므로 실행하지 않는다. 크론탭으로 하려는 경우의 줄이다. **티스토리 로그인 창(Playwright가 화면에 띄움)은 로그인한 GUI 세션이 있어야 하는데 cron 작업에는 그것이 없다** — 그래서 launchd를 골랐다.

```text
0 9 * * *       /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh blog-daily
0 12,15,18 * * * /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh blog-queue
0 11 * * *      /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh tistory-daily-session
0 8-22/2 * * *  /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh tistory-keepalive
0 20 * * *      /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh hermes-autoupdate
@reboot         /bin/bash $HOME/workspace/side_project/aztomz/tools/mac/job.sh discord-reactions
```

## K. 부록 — 1주일 뒤: Hermes 자동 업데이트 켜기 (맥 Terminal)

Windows의 `Hermes_Auto_Update`(매일 20:00)에 해당한다. 맥에서 `hermes update`가 게이트웨이를 안전하게 다시 띄우는지 `미확인`이라 **첫 1주일은 켜지 않는다.** 1주일 동안 H 확인이 정상이었으면:

```bash
cp ~/workspace/side_project/aztomz/tools/mac/com.az2mz.hermes-autoupdate.plist ~/Library/LaunchAgents/ && launchctl load -w ~/Library/LaunchAgents/com.az2mz.hermes-autoupdate.plist
```

## L. 부록 — Vercel: 맥에서 할 일 없음

| 확인한 것 | 결과 |
|---|---|
| 배포 방식 | 배포 원본 `sgustjd2/aztomz`(공개)의 `main`에 push하면 Vercel이 자동 배포한다. GitHub 배포 기록에 `Production` 배포가 push마다 남는다(최신 두 건 2026-11-08·11-09 확인). |
| `vercel.json` | 있음 — `framework: null`, `outputDirectory: frontend`, 캐시 헤더와 `/login.html`·`/signup.html`·`/me.html` → `/` 리다이렉트. **레포 안**에 있어서 `git clone`으로 맥에 그대로 온다. |
| `.vercel/` 폴더 | 이 PC에 없다(`.gitignore` 대상). `vercel link`를 한 적이 없다는 뜻이다. |
| Vercel CLI | 이 PC에 설치 안 됨(`vercel` 명령 없음). 레포의 어느 스크립트도 호출하지 않는다. |
| 환경변수 | 정적 사이트라 Vercel 환경변수 사용 흔적 없음(`vercel env pull` 불필요). |

**결론: 맥에 `vercel` CLI 설치·`vercel login`·`vercel link`·`vercel env pull` 모두 필요 없다. Vercel 설정은 건드리지 않는다.** 맥이 push만 하면 배포되고, 확인은 H3의 `gh api …/status`다. 한 가지 전제: 맥의 `gh` 계정이 `sgustjd2/aztomz`에 push 권한이 있어야 한다(B5에서 확인).

## M. 부록 — 미확인 목록 (맥에서 처음 돌려 보는 것)

- Hermes `install.sh`가 이 프로젝트 홈(`HERMES_HOME`에 이미 `config.yaml`·`cron/jobs.json`이 있는 상태)에서 정상 설치되는지, 그리고 `hermes` 실행 파일 위치(`~/.local/bin` 또는 `$HERMES_HOME/bin`).
- `hermes gateway install --start-now --start-on-login`의 launchd 등록 결과와 `hermes gateway status`의 정확한 문구.
- Windows `auth.json`(OAuth 토큰)이 맥에서 그대로 통하는지.
- `node@24` Homebrew 포뮬러 이름, 인텔 맥의 `/usr/local` 경로.
- 맥에서 Playwright 크로미엄 창 위치(`lib/window.mjs`)·네이버 붙여넣기(⌘V)·티스토리 자동 로그인.
- `claude -p "/blog-daily"`가 맥 Claude Code에서 프로젝트 스킬과 `settings.local.json` 권한 규칙을 그대로 읽는지.
- `auto-build.mjs`의 Windows 전용 우회(`process.exit()` 회피 등)와 `PYTHONIOENCODING` 지정은 맥에서 필요 없지만 해롭지도 않다.
- 맥의 `~/.claude/projects/<인코딩 폴더>` 이름 규칙.
