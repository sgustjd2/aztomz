---
name: blog-daily
description: 오늘 쓸 블로그 주제를 스스로 고르고, /blog-pipeline 절차로 검증까지 돌린다. 발행(퍼블리시)은 하지 않는다 — 사람 로그인이 필요해서 자동화할 수 없다. Hermes 일일 크론이 이 스킬을 부른다.
---

# 블로그 일일 파이프라인 — 주제선정 → 검증까지 (발행 제외)

**이 스킬은 무인 실행을 전제로 한다.** 사람이 중간에 답할 수 없다. 판단이 갈리는 지점에서는
가장 보수적인 선택(그 항목을 보류하고 다음으로 넘어간다)을 해라 — 억지로 밀어붙이지 마라.

## 0단계 — 오늘의 주제 고르기

**기본 소스는 Hermes 가 수집한 한끗 트렌드다.** 정적 키워드 백로그가 아니다.

Hermes 는 매일 21:30 에 트렌드를 수집·분석하고 `auto-build.mjs` 가 출처 생존·본문관련성까지
검증해 `backend/data/trends.json` 에 넣는다. **이미 조사가 끝난 소재**이니 블로그가 같은 주제를
다시 검색할 이유가 없다.

### A. 한끗 트렌드에서 고르기 (기본)

```bash
node backend/scripts/blog-pick-trend.mjs
```

이 스크립트가 결정적으로(LLM 없이) 처리한다 — 발행 이력(`posted.json`) 제외, 끝물 제외,
출처·본문 없는 것 제외, 요일별 분야 로테이션, 최신순. 결과로 다음이 나온다:

- 고른 트렌드의 `id`(= 이번 글의 **slug**)
- 카테고리 프로파일: `hangeut-trust`(광고일까 진짜일까) 또는 `hangeut-trend`(트렌드 해설)
- 조사 파일 `backend/blog/research/<id>.json` 생성 — 파이프라인이 그대로 먹는다

후보가 없으면(전부 발행했거나 조건 미달) 스크립트가 exit 1 로 알려준다 → 아래 B 로 넘어간다.

### B. 키워드 백로그 (폴백)

트렌드 후보가 0건일 때만 `backend/blog/keywords.csv` 를 쓴다. 이건 트렌드와 무관한 기획 글
(AI 자동화 아이디어·프롬프트 팩·음악 등)을 위한 목록이다.

1. `priority` 가 가장 작은 행을 고른다. 동률이면 파일에서 먼저 나온 행.
2. 고른 행은 **즉시 `keywords.csv`에서 지우고** `backend/blog/keywords.done.csv`에 추가한다
   (헤더: `keyword,categoryId,priority,memo,pickedAt,slug`. `pickedAt`은 오늘 날짜, `slug`는
   글이 완성된 뒤 채운다 — 먼저 빈 값으로 옮겨서 중복 선택을 막는다).
   `keywords.done.csv`가 없으면 헤더부터 만들어라.
3. `keywords.csv` 마저 비었으면 아래 "주제 발굴" 로.

### 주제 발굴 (백로그가 빌 때만)

**먼저 `backend/blog/blogchart-plan.md` 를 본다** — 블로그차트 상위 카테고리 공략 10편 플랜(맛집·디저트·
패션·여행·IT/AI·미용·가전·반려·콘텐츠·건강)이 각도·템플릿·출처힌트까지 정해져 있다. 아직 안 쓴 주제
(같은 개념이 `posted.json` 에 없는 것)가 있으면 그걸 **우선** 쓰고, 그 편의 지침(원칙·주의)을 따른다.
플랜이 다 소진됐으면 아래 자유 발굴로 넘어간다.

자유 발굴: `backend/blog/categories/*.json` 을 전부 읽어 각 카테고리의 `persona`·`readerProfile`·`selection`
(있으면)을 참고해, 카테고리마다 최근 실제로 화제인 주제 후보를 WebSearch 로 확인한다.
**추측으로 채우지 마라** — 검색으로 실재를 확인한 것만 후보로 올린다.
카테고리당 최소 1개는 만들려고 하되, 억지로 채우지 말고 실제로 소재가 있는 카테고리만 채운다.
`backend/blog/keywords.done.csv` 에 이미 있는 키워드·비슷한 주제는 피한다(자기잠식 방지).

## 1단계 — 카테고리 분기

`backend/blog/categories/<categoryId>.json` 을 읽고 `pipeline` 필드를 보고 갈래를 정한다.

| 갈래 | 해당 카테고리 | 조사(researcher) | 팩트체크 |
|---|---|---|---|
| **T. 한끗 트렌드** | `hangeut-trust` · `hangeut-trend` | 안 함(이미 끝남) | 원본 왜곡 검증 |
| **A. 일반** | web-error · llm-howto · dev-tool · ai-trend · automation-idea · 음악 계열 | 함 | 함 |
| **B. 프롬프트 팩** | `ai-prompt-pack` | 트렌드 발굴용으로 함 | 안 함(원본성 체크) |

### T. 한끗 트렌드 계열 (`hangeut-trust` / `hangeut-trend`)

0단계 A 에서 `blog-pick-trend.mjs` 가 이미 조사 파일을 만들어 놨다. **`blog-researcher` 를 부르지
마라** — 조사가 끝났고, 여기에 새 검색을 덧붙이면 검증 안 된 사실이 섞인다.

1. 조사 파일 `backend/blog/research/<id>.json` 과 구조 문서
   (`backend/blog/structures/hangeut-trust.md` 또는 `hangeut-trend.md`), 카테고리 프로파일을 읽는다.
2. `blog-writer` 로 집필한다. 프롬프트에 반드시 넣을 것:
   - **`trend` 필드 밖으로 나가지 마라.** 새 검색·새 수치·새 가게/인물 금지.
   - **`trend.article` 을 그대로 복사하지 마라.** 같은 사실을 새 문장으로 — 한끗 사이트와 글자까지
     같으면 중복 콘텐츠가 된다.
   - 조사 파일의 `cannotSay` 를 그대로 전달.
   - 내부링크로 `trend.detailUrl`(한끗 상세페이지)을 걸게 한다 — 블로그 독자를 본 서비스로 보내는
     유일한 경로다.
3. `blog-seo` 로 메타. `internalLinks` 에 `trend.detailUrl` 을 넣어야 조립이 그 링크를 통과시킨다.
4. `blog-factchecker` 로 **원본 왜곡 검증**(외부 사실 검증이 아니다). 볼 것:
   - 점수를 부풀렸는지, 추정을 단정으로 바꿨는지(`확실히 광고다` 류)
   - 후기 신뢰도와 만족도를 섞었는지 — **별개 축이다**
   - `trend.stage` 보다 유행을 세게 썼는지
   - 원본에 없는 수치·가게·날짜가 있는지
   - 세대 비하가 섞였는지

### A. 일반 카테고리 (web-error·llm-howto·dev-tool·ai-trend·automation-idea·
jpop-hidden·pop-hidden·music-hidden·retro-revival 등)

`.claude/skills/blog-pipeline/SKILL.md` 의 절차를 **그대로** 따른다 — 조사(`blog-researcher`) →
정리(`blog-curator`) → 집필(`blog-writer`) → SEO(`blog-seo`) → 팩트체크(`blog-factchecker`).
중단 조건·재작성 1회 제한·"세 번 돌리지 마라" 규칙도 동일하게 적용한다.

**조사 단계 전에 카테고리 프로파일의 `pipeline` 필드를 확인해라.** `researchFocus`/`trendResearch`
같은 하위 필드가 있으면(예: `automation-idea` 는 "n8n 노드명은 docs.n8n.io 로 확인, 완전한 워크플로
JSON을 지어내지 말 것") 그 지시를 `blog-researcher` 호출 프롬프트에 반영해라 — 카테고리마다 조사가
검증해야 할 대상이 다르다(음악은 유튜브 실재, 자동화는 n8n 노드 실재, 뉴스는 1차 출처).

**차이점 — 반려 시 사람에게 못 묻는다**: 2차 팩트체크도 반려되면, 오늘 세션에서 해온 것처럼
원본을 직접 열어 대조 후 코디네이터가 직접 교정을 시도해라(오늘 세션에서 佐藤博·吉田美奈子 사례가
정확히 이 경우였다 — 조사 파일의 근거를 원문 링크로 다시 열어 확인하고 본문·조사 파일을 함께 고쳤다).
그래도 안 되면 **그 주제는 포기하고 `keywords.done.csv` 에 `slug` 대신 "보류: <사유>"를 적은 뒤,
다음 우선순위 키워드로 새로 시작한다.** 하루에 반드시 1건을 억지로 내지 마라 — 품질이 우선이다.

### B. `ai-prompt-pack` 계열 (skipFactcheck:true — 팩트체크만 건너뛴다)

정리(curator)·팩트체크(factchecker)는 없다. 조사(researcher)는 **한다** — 단 목적이 다르다.

1. **트렌드 조사** — `blog-researcher` 에이전트를 부르되, 이 카테고리 전용으로 완전히 다른 프롬프트를
   준다(기본 blog-researcher.md 의 "sources/facts 스키마"는 안 맞는다). 지시할 내용:
   - 카테고리 프로파일의 `pipeline.trendResearch` 를 그대로 따르게 한다: WebSearch 로 Threads·
     인스타그램·블로그·유튜브를 **다루는 공개 검색결과**에서 AI 이미지 생성/잡지컷 프롬프트
     스타일을 찾는다. **인스타그램·틱톡·페이스북 직접 스크래핑 금지** — 계정 접근·로그인 없이
     검색엔진에 잡힌 것만.
   - **신선도는 오늘(실행일) 기준 30일 이내로 좁힌다** — "몇 달 전에 시작해서 아직 명맥만 있다"는
     부족하다. `trendResearch.volumeSignal` 의 4개 신호(최근 30일 내 다수 게시물 · 여러 계정이
     같은 스타일 · 언론이 현재형으로 "요즘/최근/급증" 서술 · 최근 30일 안의 재점화 계기) 중
     **최소 2개를 충족하는지 후보마다 명시**하게 한다. "언급이 있다" 수준과 "지금 많이 올라온다"
     수준을 구분해서 보고하게 해라 — 전자만으로는 채택하지 마라.
   - `backend/blog/keywords.done.csv` 와 이미 발행된 테마(반려동물犬·여행·일상·음식·육아·제품·
     풍경·야구장 직관)를 피하게 한다.
   - 출력: `backend/blog/research/<slug>.json` 에 `{ candidates: [{theme, evidence, sourceUrl,
     freshness, volumeSignalsMet}], chosen: <가장 근거 확실한 것>, sources: [{title,url,host,body}] }`
     형태로 Write. (`sources` 를 채워야 `blog-assemble.mjs` 의 URL 허용목록에 걸려, 이후 단계가
     없는 URL을 지어내면 조립이 막힌다.)
   - **30일 이내 고볼륨 후보가 0개면 그대로 보고하고 멈추지 마라** — 차선(기원은 오래됐지만 최근
     재점화된 것)이 있으면 그걸 쓰고 한계를 정직하게 밝힌다. 그마저 없으면 `keywords.csv` 에 남은
     ai-prompt-pack 폴백 행을 대신 테마로 쓰고, 조사 파일의 `chosen.evidence` 에 "조사 근거 없음
     — 폴백 테마 사용"이라고 정직하게 남긴다.
2. `backend/blog/structures/prompt-pack.md` 와 카테고리 프로파일을 읽는다.
3. `blog-writer` 에이전트를 불러 쓰게 한다 — "조사 파일에서 정한 `chosen` 테마로, 프로파일·구조
   문서 규칙대로 창작해라"를 지시한다. 이번 카테고리는 **프롬프트 자체는 조사 파일에 없다** —
   구조 문서 규칙대로 새로 짓되, 테마 선택과 "왜 지금인지" 한 줄만 조사 파일 근거를 쓰게 한다.
   **변형마다 프롬프트 전체를 코드블록(```) 안에 담게 — 공통 디자인 룰북도 별도 코드블록 1개**
   (구조 문서에 정확한 형식이 있다). `backend/blog/categories/ai-prompt-pack.json` 의 `_note` 에
   있는 기존 예시(/273, /274) 링크도 같이 주고 "형식만 참고, 문구는 새로 쓸 것"이라고 명시해라.
4. `blog-seo` 에이전트로 메타를 만든다.
5. **팩트체크 대신 원본성 체크** — 별도 에이전트를 부르지 말고 코디네이터가 직접 확인한다:
   - 카테고리 프로파일 `pipeline.originalityCheck` 4항목(트렌드 근거 대조 포함)을 본문과 대조
   - 변형마다 프롬프트 전체가 코드블록 안에 있는지, 공통 룰북도 코드블록인지(마크다운 파일에서
     세 개짜리 백틱 펜스가 변형 개수+1번 쌍으로 열리고 닫혔는지 세어 확인해도 된다)
   - 프롬프트 변형끼리 포인트컬러·타이틀후보·서브코멘트가 겹치지 않는지
   - 완결된 문장인지(조각 아님)
   - 실존 인물·브랜드 등장 여부
   문제가 있으면 코디네이터가 직접 고친다(별도 에이전트 왕복 불필요할 만큼 기계적인 확인이다).

## 2단계 — 조립·검증 (모든 카테고리 공통)

```bash
node backend/scripts/blog-assemble.mjs <slug> --research=<조사파일명>   # 조사 파일명이 slug와 다르면(곡별 글처럼) 명시
node backend/scripts/blog-selfreview.mjs <slug>   # 자체 피드백→반영(외과적 수정 후 재조립). 비치명적 — 실패해도 계속
node backend/scripts/blog-verify.mjs <slug>
```

`ai-prompt-pack` 도 이제 조사 파일이 있으니 `--research=` 를 생략하지 마라 — 생략하면 본문에 실수로
들어간 URL이 있어도 조립이 걸러주지 못한다.

`blog-assemble.mjs` 가 반려하면(지어낸 URL 등) 해당 단계로 돌아가 고친다.
`blog-verify.mjs` 가 blocker 를 내면, 오늘 세션처럼 원문 대조 후 직접 교정 → 재조립 → 재검증.

## 3단계 — 로컬 커밋 (푸시는 하지 않는다)

검증까지 통과한 뒤:

```bash
git add backend/blog/ backend/out/blog/<slug>.* 2>/dev/null
git commit -m "$(cat <<'EOF'
auto: 블로그 일일 초안 — <제목> (<categoryId>)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

`backend/out/` 은 gitignore 대상이라 `git add` 가 조용히 무시한다 — 그래도 명령은 그대로 둬라
(다른 파일이 커밋 대상이면 그것까지 잡아준다). **`git push` 는 하지 마라** — 이 저장소는 이
카테고리 콘텐츠를 배포와 묶어두지 않았고, 푸시는 사람이 검토 후 하는 게 안전하다.

`keywords.done.csv` 의 방금 넣은 행에 `slug` 값을 채워 넣고(0단계에서 비워뒀던 자리), 위 커밋에
같이 포함시켜라.

## 4단계 — 보고

마지막 응답(=Hermes 가 배달할 내용)은 다음만 담아라. **[일일 블로그 초안]** 을 맨 위에 붙여라.

- 오늘 고른 키워드·카테고리·최종 제목
- `backend/out/blog/<slug>.html` 경로
- 검증 결과(blocker/warn 개수, 있었던 재작성 라운드)
- **"발행하려면: `node backend/scripts/blog-publish.mjs <slug>` (로그인 필요)"** 안내를 마지막 줄에
- 실패/보류했다면 사유와, 다음엔 어느 키워드가 시도될지

## 실패 시

- 어느 단계에서든 도저히 진행이 안 되면(조사 자료 자체가 없다·프로파일이 모순된다 등) 그 사실을
  그대로 보고하고 멈춰라. 억지로 채워 넣지 마라 — 오늘 세션 내내 지켜온 원칙과 같다.
- 예외가 나면 사람이 다음 날 확인할 수 있게 에러 메시지를 요약해서 보고에 포함해라.
