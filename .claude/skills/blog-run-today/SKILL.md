---
name: blog-run-today
description: >
  오늘의 블로그 배치를 조사→집필→자체피드백→검증→티스토리 발행까지 한 번에 돌린다.
  사용자가 "오늘 작업 진행해줘", "오늘 블로그 진행", "오늘 글 N개", "블로그 오늘 작성",
  "오늘 게시물 5개" 처럼 이 프로젝트(한끗/az2mz)에서 오늘치 블로그 작업을 통째로 맡길 때 쓴다.
  기본 5편 이상. 티스토리 로그인이 되어 있다는 전제(없으면 검증까지만 하고 알린다).
---

# 오늘의 블로그 배치 — 조사→집필→selfreview→verify→발행

한끗(az2mz) 블로그 하루치를 5편 이상 만들어 티스토리(burning-go9me)에 올린다. 이 스킬은
개별 편 처리(조사/집필/검증)를 `blog-daily`·`blog-pipeline` 스킬 절차에 위임하고, 그 위에
**여러 편 선정 · 자체피드백 · 발행 · permalink 교정 · 커밋**을 얹는다.

## 전제
- **티스토리 로그인이 되어 있어야 발행된다**(카카오 로그인 자동화 금지 철칙). 첫 발행이 세션 만료로
  실패하면 거기서 멈추고 "로그인 후 다시" 를 알린 뒤, 나머지는 검증까지만 해 둔다.
- 표준 흐름·철칙은 `CLAUDE.md`, 반복결함 가드는 `structures/hangeut-*.md`·`_format.md`, 주제전략은
  `backend/blog/blogchart-plan.md`. 작업 전에 이 세 개와 최근 `posted.json` 을 훑는다.

## 1. 상태 파악
```bash
date +%Y-%m-%d
node backend/scripts/blog-pick-trend.mjs --list        # ⚠(신선도·출처) 없는 clean 후보 확인
ls -t backend/blog/research/dev-digest/*.json backend/blog/research/vlm-watch/*.json | head
```
`.git/az2mz-auto.lock` 이 있으면 몇 초 기다렸다 다시 확인(봇과 git 충돌 방지).

## 2. 주제 5편+ 선정 (품질 우선, 하루 4~6편)
우선순위:
1. **`blogchart-plan.md` 미소진 주제** — 이미 각도·템플릿·출처힌트가 정해져 있다. 같은 개념이
   `posted.json` 에 없으면 우선.
2. **`blog-pick-trend --list` 의 ⚠ 없는 fresh 후보**(trends.json 검증분).
3. **WebSearch 조사 주제** — 이번 주 AI 소식·개발 다이제스트, 또는 blogchart 정보성 카테고리.
- **묵은(⚠) trends.json 후보를 물량 채우려 긁지 마라** — 얇은 근거는 양산 신호다. 정직하게 못 쓸
  주제(인테리어·부동산·금융·의학 등 E-E-A-T 필요)는 뺀다.
- 카테고리·포맷을 겹치지 않게(신조어·맛집·디저트·패션·여행·IT/AI·미용·챌린지 등 분산).

## 3. 조사
- **소비자 트렌드(trends.json)**: `node backend/scripts/blog-pick-trend.mjs --id=<id>` → 즉시 조사 파일. (`blog-researcher` 부르지 마라 — 이미 검증됨.)
- **기술·정보성·blogchart 주제**: `blog-researcher`(WebSearch로 실출처 수집·본문 읽기) → `blog-curator`(각 URL 실재·관련성 검증, 사실↔추정 분리). Workflow 로 병렬 처리해도 된다. 실출처 3건 미만이면 그 편 스킵.

## 4. 집필
편마다: 카테고리 구조 템플릿 + `structures/_format.md` 양식(콜아웃·비교표·정리·참고) + 해요체.
기술 개념은 **eli5**("쉽게 말하면 …")로. `trend`/조사 근거 밖 사실 창작 금지, 수치는 "발표/기사에서 밝힌" 귀속.
(개별 절차는 `blog-daily` 스킬의 카테고리 분기·`blog-pipeline` 을 따른다. 여러 편은 Workflow 로 병렬.)

## 5. 자체 피드백 → 검증 (편마다)
```bash
node backend/scripts/blog-assemble.mjs <slug> --research=<slug>
node backend/scripts/blog-selfreview.mjs <slug>   # 자기비평→외과 수정→재조립 (비치명적)
node backend/scripts/blog-verify.mjs <slug>        # 최종 게이트. 반려 시 원문 대조해 교정→재조립→재검
```

## 6. 발행 (로그인 전제)
검증 통과분만 순차 발행:
```bash
node backend/scripts/blog-publish.mjs <slug>
```
- 결과 URL 이 `/manage/posts/`(RSS permalink 미조회)면, 방금 순번의 실제 `/NNN` 글을 `curl` 로
  제목 대조해 찾아 `backend/out/blog/posted.json` 의 그 slug url 을 `/NNN` 으로 고친다.
- 첫 발행이 로그인 벽/세션 만료로 실패하면 멈추고 사용자에게 알린다.

## 7. 커밋·푸시
```bash
git add backend/blog/research/<쓴 조사파일들>
git commit -m "auto: 블로그 N편 발행 — <요약> (/NNN~MMM)"
git pull --rebase origin main && git push origin main
```
`.git/az2mz-auto.lock` 확인 후. `backend/out/blog/` 는 gitignore 라 조사 파일·plan 갱신분만 커밋된다.
learnings.md 가 봇 자동추가로 dirty 하면(`|-` 접두어 깨짐이면 `- ` 로 교정) 함께 커밋한다.

## 8. 보고
발행한 편들의 `/NNN` URL·제목·근거(조사 출처 수), selfreview·verify가 잡은 것, 스킵·보류 사유.
blogchart-plan 을 썼으면 소진 현황도.

## 하지 말 것
- 로그인 없이 발행 강행(실패만 쌓인다). 묵은·얇은 근거로 물량 채우기. 정직하게 못 쓰는 카테고리 진입.
- 전면 재작성(selfreview는 외과적 find/replace). trends.json/조사 밖 사실 창작.
