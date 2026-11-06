---
title: "AI Agents Will Upend Investing Even More Than Coding - Frank Long, Coatue"
videoId: AYFcmnQrZCg
url: https://www.youtube.com/watch?v=AYFcmnQrZCg
channel: "AI Engineer"
publishedAt: 2026-11-06
summarizedAt: 2026-11-06
model: gemini-2.5-flash
---

# AI Agents Will Upend Investing Even More Than Coding - Frank Long, Coatue

🔗 https://youtu.be/AYFcmnQrZCg · 📅 2026-11-06 · 🎙 AI Engineer

## 한 줄 요약
AI 에이전트는 투자 분야에서 코딩 분야보다 훨씬 더 큰 혁신을 가져올 것이며, 이를 위해서는 정보 수집, 분석, 의사 결정 과정을 세분화하고 각 단계에 최적화된 실행자(코드, 머신러닝, LLM, 사람)를 활용하는 복잡한 시스템 구축이 필요합니다.

## 발표자·소속
Frank Long, Coatue (Head of AI)

## 핵심 주장
*   **AI 에이전트의 투자 산업 혁신:** AI 에이전트가 코딩 분야에서 보여준 변혁적인 영향력보다 투자 분야에서 훨씬 더 큰 영향을 미 미칠 것이라고 주장합니다.
*   **투자 펀드를 기능으로 모델링:** 투자 펀드를 외부 및 내부 컨텍스트를 입력받아 종목 선택, 규모, 타이밍을 출력하는 `fund(c_external, c_internal)` 함수로 개념화하여 문제 해결의 프레임워크를 제시합니다.
*   **정보 접근성의 중요성:** 인간이 화면에서 볼 수 있는 모든 정보(뉴스, 가격, 공시 등 외부 컨텍스트 및 내부 포지션, 유동성 요구사항, 과거 사례 연구 등 내부 컨텍스트)는 AI 모델이 API를 통해 접근할 수 있어야 한다고 강조합니다.
*   **문제 분해 및 최적화:** 복잡한 투자 의사 결정 과정을 `gather`, `analyze`, `decide`와 같은 작은 기능들로 분해하고, 각 기능 내의 세부 단계(예: 뉴스 수집, 필터링, 번역/추출, 검증)에 대해 코드, 머신러닝, LLM, 사람 등 최적의 "실행자(runner)"를 선택하여 절대적인 품질을 극대화해야 합니다.
*   **사람의 역할 유지:** 자동화 자체가 목표가 아니라, 각 단계에서 절대적인 품질을 최대화하는 것이 목표이므로, 판단력과 실제 세계를 탐색하는 능력이 필요한 부분에서는 사람이 여전히 가장 중요한 실행자(runner)라고 강조합니다.

## 세부 내용
발표자는 자신을 Coatue의 AI 책임자인 Frank Long이라고 소개하며, Coatue가 기술 투자 회사로서 공개 및 비공개 시장 전반에 걸쳐 활동한다고 설명합니다. 그는 AI 에이전트가 코딩 분야보다 투자 분야에서 더 큰 영향을 미칠 것이라는 믿음을 가지고 있으며, 이를 실현하기 위한 프레임워크를 공유합니다.

발표자는 헤지펀드를 `def fund(c_external, c_internal): return selection, size, timing`이라는 함수로 비유합니다. 여기서 `c_external`은 외부 컨텍스트(뉴스, 주가 이력, 공시 등)를, `c_internal`은 내부 컨텍스트(현재 포지션, 유동성 요구사항, 과거 사례 연구 등)를 의미합니다. 출력은 `selection`(어떤 주식), `size`(얼마나), `timing`(언제)으로 구성된 튜플입니다.

그는 인간이 화면에서 픽셀로 볼 수 있는 모든 정보는 모델이 API를 통해 볼 수 있어야 한다고 강조합니다. 예를 들어, 삼성에 대한 뉴스 검색, 특정 주식의 가격 이력, 분기별 공시 등이 API를 통해 접근 가능해야 합니다. 내부 컨텍스트 역시 중요하며, 현재 포지션, 특정 종목에 대한 유동성 및 위험 요구사항, 과거 사례 연구 등이 포함됩니다. Coatue는 10년 이상 데이터 과학 팀과 시스템을 통해 이러한 정보를 수집하고 있으며, 모든 거래 및 의사 결정에 대한 기록을 남겨 AI에 노출할 준비가 되어 있다고 말합니다.

이어서 `fund` 함수를 더 작은 조각으로 나눕니다.
1.  `info = gather(c_external, c_internal)`: 정보 수집
2.  `view = analyze(info)`: 정보 분석
3.  `selection, size, timing = decide(view)`: 의사 결정 (사람이 투자 판단을 소유)

`gather` 단계의 예시로 "한국 언론 매체의 뉴스 해석"을 들며, 이 단계조차 여러 세부 기능으로 나눌 수 있다고 설명합니다.
*   `articles = collect(korean_news)`: 한국 뉴스 기사를 수집합니다. (코드)
*   `relevant = filter(articles, question)`: 질문에 따라 관련 기사를 필터링합니다. (LLM)
*   `notes = translate_extract(relevant)`: 관련 기사에서 관찰 내용을 영어로 번역하고 추출합니다. (LLM)
*   `check(notes, against_articles)`: 추출된 내용이 원본 기사와 일치하는지 확인합니다. (코드)
*   `update = propose(notes)`: 새로운 데이터 포인트를 제안하거나 변경 사항이 없음을 제안합니다. (LLM)
*   `review(update)`: 제안된 업데이트를 수락, 수정 또는 거부합니다. (사람)

각 단계에는 "실행자(runner)"가 필요하며, 발표자는 네 가지 유형의 실행자를 제시합니다.
*   **코드 (검은색 사각형):** 빠르고, 저렴하며, 신뢰할 수 있습니다. 예를 들어, "주가수익비율(PE)이 15 미만이면 유지"와 같은 결정론적 로직에 적합합니다.
*   **ML (녹색 다이아몬드):** 통계 및 고전적인 머신러닝 모델로, 더 복잡한 관계를 모델링하는 데 사용됩니다.
*   **LLM (회색 원):** 대규모 언어 모델로, 텍스트 요약과 같은 복잡한 비정형 데이터 처리에 적합합니다.
*   **사람 (빨간색 원):** 판단력과 실제 세계를 탐색하는 능력이 필요한 경우(예: CEO와의 미팅)에 가장 적합한 실행자입니다.

발표자는 자동화 자체가 목적이 아니라, 각 기능의 절대적인 품질을 최대화하는 것이 목표라고 강조합니다. 실제 `gather` 함수는 단순한 선형 흐름이 아니라, 중복 제거, 필터링, 번역, 인용문 추출, 소스 확인, 과거 뷰와 비교, 보유 종목과 비교 등 복잡한 분기 로직과 여러 실행자가 얽혀 있는 그래프 형태를 띨 것이라고 설명합니다. 각 노드(기능)에는 모델 선택, 사고 노력(thinking effort), 하네스(harness) 및 스킬 로드 방식 등 10개 이상의 하이퍼파라미터가 존재하며, 이는 사실상 무한한 탐색 공간을 형성합니다.

결론적으로, 투자 분야에서 AI를 적용하는 진정한 도전은 세상의 정보를 이해하고 일관된 의사 결정을 내릴 수 있는 "상태 기계(state machine)"를 만드는 것이며, 이는 투자 회사뿐만 아니라 정책, 비영리 단체, 신약 개발, 기업 전략 등 다양한 분야에 적용될 수 있다고 말하며 발표를 마칩니다.

## 인상적인 대목
*   "I think honestly a career is the same way, and last year when I joined Coatue, the bet that I wanted to make was, I think that agents will have an even bigger impact in investing than they did at coding." (0:27)
*   "Everything a human can see in pixels on the screen, an agent in your building should be able to see via API." (1:38)
*   "There is no glory in automating things for the sake of automating things. The goal is not to take as many things and make them LLM as possible. For us, the goal is for any given piece of this function, what can I do to maximize absolute quality." (9:09)
*   "What we're really talking about is creating a state machine that can take information from the world and understand it well enough to make coherent decisions." (13:20)

## 실무 적용 포인트
*   **API 중심의 데이터 접근:** 모든 중요한 데이터 소스(내부 및 외부)를 AI 모델이 직접 접근할 수 있는 API 형태로 구축하여, 수동적인 데이터 처리(드래그 앤 드롭, 복사-붙여넣기)를 최소화해야 합니다.
*   **기능 분해 및 모듈화:** 복잡한 비즈니스 프로세스를 작고 검증 가능한 기능 단위로 분해하고, 각 기능의 입력과 출력을 명확히 정의하여 AI 에이전트 시스템의 설계 기반을 마련합니다.
*   **다양한 실행자(Runner) 활용:** 코드, 머신러닝 모델, LLM, 그리고 인간 전문가의 강점을 이해하고, 각 작업의 특성과 요구되는 품질 수준에 따라 가장 적합한 실행자를 선택하여 조합하는 하이브리드 시스템을 구축합니다.
*   **하이퍼파라미터 최적화:** 각 기능 및 실행자 조합에서 성능을 최적화하기 위한 다양한 하이퍼파라미터(모델 크기, 사고 노력, 하네스, 스킬 등)를 식별하고, 지속적인 실험과 튜닝을 통해 시스템의 효율성과 정확도를 향상시킵니다.
