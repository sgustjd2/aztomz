---
name: blog-pipeline
description: 블로그 글 하나를 조사 → 정리 → 집필 → SEO → 팩트체크 순서로 전문 에이전트에게 순차 처리시킨다. 티스토리(burning-go9me) 발행까지 이어진다. "블로그 써줘", "<주제>로 글 하나" 같은 요청에 쓴다.
---

# 블로그 파이프라인 — 전문 에이전트 순차 처리

글 하나를 5개 에이전트가 이어서 만든다. **각 단계는 파일로 넘긴다** —
중간에 끊겨도 그 단계부터 다시 돌릴 수 있고, 사람이 파일을 열어 확인할 수 있다.

## 왜 나눴나

한 모델이 조사·집필·검수를 다 하면 **자기가 지어낸 걸 자기가 검수한다.**
실측에서 그렇게 통과한 것들: 존재하지 않는 곡 8개, 가짜 출처 URL, `example.com` 링크,
그리고 링크를 전부 삭제했는데 적합성 9/10을 받은 글.
역할을 나누고 **뒷 단계가 앞 단계 산출물을 의심하게** 만드는 게 핵심이다.

## 실행 순서

시작 전에 `--category=<id>` 에 해당하는 프로파일이 `backend/blog/categories/` 에 있는지 확인한다.
없으면 `node backend/scripts/category-new.mjs` 로 만들라고 안내하고 멈춘다.

`<slug>` 는 영문 kebab-case 로 정해서 5단계 내내 같은 값을 쓴다.

| # | 에이전트 | 입력 | 출력 |
|---|---|---|---|
| 1 | `blog-researcher` | 키워드 · 카테고리 | `backend/blog/research/<slug>.raw.json` |
| 2 | `blog-curator` | 1의 출력 | `backend/blog/research/<slug>.json` |
| 3 | `blog-writer` | 2의 출력 + 프로파일 + 구조 | `backend/out/blog/<slug>.md` |
| 4 | `blog-seo` | 3의 출력 | `backend/out/blog/<slug>.json` |
| 5 | `blog-factchecker` | 3·4의 출력 + 2의 근거 | `backend/out/blog/<slug>.check.json` |

**순차로 돌린다.** 앞 단계 산출 파일이 없으면 다음을 시작하지 마라.
각 에이전트를 부를 때 `<slug>`, `<categoryId>`, 키워드를 프롬프트에 분명히 넣는다.

## 단계별 중단 조건

- **1 조사** — official/data 등급 출처가 2건 미만이면 멈추고 사람에게 보고.
  자료가 없는 주제는 좋은 글이 안 나온다. 억지로 진행하지 마라.
- **2 정리** — `claims` 가 3개 미만이면 멈춘다. 조사부터 다시.
- **5 팩트체크** — `pass: false` 면 `problems[].fix` 를 들고 **3(집필)부터** 다시 돌린다.
  두 번째도 반려면 멈추고 사람에게 보고. 세 번 돌리지 마라.

## 조립·발행

팩트체크 통과 후:

```bash
node backend/scripts/blog-assemble.mjs <slug>    # md+meta → HTML, 링크 기계검사
node backend/scripts/blog-verify.mjs <slug>      # claude -p 최종 검증(CLAUDE.md 철칙)
node backend/scripts/blog-publish.mjs <slug>     # 티스토리 발행 (--draft 로 비공개)
```

`blog-assemble` 은 조사 파일에 없는 URL 이 본문에 있으면 **조립 자체를 거부한다.**
LLM 판단이 아니라 문자열 대조라서 우회가 안 된다.

## 원칙

- 에이전트가 앞 단계 파일을 못 찾으면 **만들어내지 말고** 그 단계를 다시 돌려라.
- 조사 없이 집필로 건너뛰지 마라. 그게 환각의 유일한 원인이다.
- 한끗 트렌드 글은 이 파이프라인이 아니라 `blog-build.mjs` 를 쓴다(데이터가 이미 있다).
