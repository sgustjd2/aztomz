# 한끗 (az2mz) — AGENTS.md

이 저장소의 규칙·구조·스크립트·크론은 모두 **[CLAUDE.md](CLAUDE.md)** 에 있다. 작업 전에 **CLAUDE.md → [learnings.md](learnings.md)** 순으로 읽고 그대로 따른다.
이 파일은 포인터이며 내용을 복제하지 않는다(복제하면 낡는다). 충돌하면 CLAUDE.md가 이긴다.

## Codex에서 읽는 법

- CLAUDE.md의 `claude -p`, `Agent(subagent_type=…)`, `/blog-daily` 같은 언급은 Claude Code 전용이다. 절차는 `.claude/skills/<이름>/SKILL.md`와 `.claude/agents/<이름>.md`를 **직접 읽고 그 순서대로** 수행한다(Codex엔 자동 로딩 없음).
- 스케줄작업·Hermes 크론·`blog-selfreview.mjs`/`blog-verify.mjs` 내부 호출은 `claude -p`를 쓴다. 사용자가 시키지 않으면 `codex exec`로 바꾸지 않는다.
- 커밋·푸시는 사용자가 시킬 때만. 로컬 작업은 `main`에서 한다(CLAUDE.md "파이프라인·운영").

## CLAUDE.md에 없는 사용자 지침 (메모리에서 옮김)

**블로그 물량·품질**
- 하루 총량은 사용자가 정한 수(기본 티스토리 2 + 네이버 2 = 4편)를 **넘기지 않는다.** 예비 편·"5편 이상" 관성 금지. 늘리려면 먼저 묻는다. 줄여야 하면 조사 상한·curator 생략·SEO와 집필 통합 같은 파이프라인 다이어트를 먼저 제안한다. (2026-10-07: 10편 배치가 약 1,470만 토큰이라 사용자가 축소 지시. 사용자가 편수를 직접 말하면 그 수 우선.)
- **2026-10-17부터 일일 목표는 티스토리 1편 + 네이버 5편(최대 6편)**이다(2026-10-16 사용자 지시). 품질 기준을 못 넘기면 더 적게 쓴다.
- 주제는 `blog-pick-trend --list`에서 **⚠ 없는 후보 우선**. 근거 얇은 단일출처 트렌드로 물량을 채우지 말고 조사된 글을 섞는다.
- 반복 결함은 배치 프롬프트로 때우지 말고 영구 가드(`blog-pick-trend`·`blog-assemble`·`structures/hangeut-*.md`)에 박는다.
- **중복 주제 방지**: pick-trend는 의미상 준중복을 못 거른다. 주제 확정 전 `posted.json` **전체 제목**을 개념 단위(핵심어 정규식)로 대조한다. 최근 N편만 보면 몇 주 전 시즌 글을 놓친다.
- 기술 개념을 설명하는 글은 eli5 방식(큰 그림 먼저·일상 비유·용어 풀이·"쉽게 말하면" 문단)으로 초보 눈높이에서 자세히 쓴다.
- 블로그 커버에 **주황 금지**(2026-09-26~): 사진 커버는 흰 패널 + 파랑(`#1a56db`) 제목. 새 테마색도 주황(색상각 15~45°) 제외 — `blog-publish.mjs --selftest`의 `isOrange`가 막는다.

**발행 운영**
- 티스토리·네이버 발행은 **메인 체크아웃**(`E:\workspace\side_project\aztomz`, main)에서. worktree엔 로그인 프로필(`backend/.tistory-profile`, `.naver-profile`)과 `backend/out/blog/posted.json`이 없다(둘 다 gitignore). worktree에서 일하면 주제 선정 **전에** 메인의 `posted.json`을 복사하고, 완성 원고(`out/blog/<slug>.{html,json}`)는 메인 `out/blog/`로 직접 복사한다. 발행 스크립트는 메인 것을 절대경로로 호출.
- 티스토리 발행 후 DKAPTCHA가 뜨면 **사람이 푼다**(우회 구현·시도 금지). 연속 실패는 봇감지를 키우니 무한 재시도 금지. `이동 확인 실패`로 죽으면 다음 `/NNN`이 404인지 curl로 확인한 뒤에만 재시도(중복 발행 방지).
- 제목에 `·`가 있으면 RSS permalink 조회가 실패해 `posted.json`에 `/manage/posts/`가 남을 수 있다 → 실제 `/NNN`을 대조해 수동 교정.
- 집필 어미가 합니다체로 나와 assemble 말투 게이트에 걸리면 해요체로만 외과적으로 바꿔 재조립한다.

**브라우저**
- 유튜브·틱톡 등 영상 페이지를 브라우저로 **열지 않는다**(소리 재생). 출처 확인은 `https://www.youtube.com/oembed?url=…` 호출이나 헤드리스 fetch로 대체. 열려 있으면 탭을 닫는다.
