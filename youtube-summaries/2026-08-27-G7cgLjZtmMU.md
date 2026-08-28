---
title: "The Agentic Commerce Stack — Ahnaf Prio, Best Buy"
videoId: G7cgLjZtmMU
url: https://www.youtube.com/watch?v=G7cgLjZtmMU
channel: "AI Engineer"
publishedAt: 2026-08-27
summarizedAt: 2026-08-28
model: gemini-2.5-flash
---

# The Agentic Commerce Stack — Ahnaf Prio, Best Buy

🔗 https://youtu.be/G7cgLjZtmMU · 📅 2026-08-27 · 🎙 AI Engineer

## 한 줄 요약
발표자는 AI 에이전트가 상거래 여정을 지원하는 에이전트 상거래의 개념을 소개하고, 현재 인간 개입이 필요한 단계부터 완전 자율 쇼핑에 이르는 스펙트럼을 설명하며, 이를 가능하게 하는 5가지 핵심 프로토콜과 구현 방안을 공유합니다.

## 발표자·소속
Ahnaf Prio, Senior Engineering Manager, Best Buy

## 핵심 주장
- 에이전트 상거래는 AI가 쇼핑 여정을 지원하는 스펙트럼으로, 현재는 인간 개입이 필요한 단계에 있지만 궁극적으로는 자율 쇼핑을 목표로 합니다.
- 기존의 AI가 브라우저를 제어하는 방식은 느리고 취약하며 확장성이 떨어지는 문제가 있어, 구조화된 피드와 프로토콜 기반의 체크아웃 방식이 필요합니다.
- ChatGPT Shopping과 Google AI Mode는 이미 이러한 구조화된 피드와 프로토콜(ACP, UCP)을 통해 에이전트가 직접 쇼핑을 수행하는 방식을 구현하고 있습니다.
- 에이전트 상거래를 구축하기 위해서는 모델 컨텍스트 프로토콜(MCP), 에이전트-투-에이전트(A2A) 프로토콜, 에이전트 상거래 프로토콜(ACP), 범용 상거래 프로토콜(UCP), 에이전트 결제 프로토콜(AP2) 등 5가지 핵심 프로토콜을 이해하고 활용해야 합니다.
- 에이전트의 오작동을 방지하고 안정적인 서비스를 제공하기 위해 행동 평가(Behavior Evals), 프로토콜 준수(Protocol Compliance), 지연 시간 벤치마크(Latency Benchmarks), LLM 품질 평가(LLM Quality Judge) 등 철저한 테스트가 필수적입니다.

## 세부 내용
발표자는 AI 엔지니어 월드 페어에서 "에이전트 상거래 스택"이라는 주제로 강연했습니다. 그는 자신이 베스트바이의 시니어 엔지니어링 매니저로서 팀과 함께 에이전트 상거래의 의미와 고객을 만나는 방법을 연구하고 있다고 소개했습니다.

에이전트 상거래는 AI가 쇼핑 여정을 돕는 스펙트럼으로, 이진법적인 개념이 아닙니다. 현재는 '인간이 개입하는 루프' 단계에 있으며, 에이전트가 제품을 제시하고 장바구니를 미리 채우면 인간이 결제 전에 검토하고 확인하는 방식입니다. 이상적인 '자율 쇼핑' 단계에서는 에이전트가 무엇을, 언제, 얼마에 살지 결정하고, 인간의 개입 없이 체크아웃을 실행하며, 스케줄이나 트리거에 따라 작동하여 인간이 흐름에 개입할 필요가 없습니다.

초기 시도에서는 AI가 브라우저를 제어하는 방식이 있었습니다. AI가 스크린샷을 찍고 DOM 요소를 읽어 인간처럼 웹사이트를 탐색하고 양식을 채우며 체크아웃을 진행하는 방식입니다. 하지만 이는 느리고, UI 변경에 취약하며, 구조화되지 않은 데이터 스크래핑으로 오류가 발생하기 쉽고, CAPTCHA, 로그인, 세션 타임아웃 등의 문제로 인해 "투박하고 취약"했습니다.

현재 에이전트 상거래는 ChatGPT Shopping (ACP 기반), Google AI Mode (UCP 기반), Instagram/Facebook Shopping, Microsoft Copilot 등 다양한 플랫폼에서 작동하고 있습니다. 이들의 공통점은 '구조화된 피드'와 '프로토콜 기반의 체크아웃'입니다. 에이전트들은 픽셀이 아닌 API를 통해 통신합니다. 발표자는 2030년까지 에이전트 상거래 시장이 650억 달러 규모로 성장할 것으로 예상했습니다.

에이전트 상거래를 위한 5가지 프로토콜 스택은 다음과 같습니다:
1.  **MCP (Model Context Protocol):** 에이전트가 도구를 식별하고 호출하는 방식입니다. Anthropic에서 개발했으며 오픈 소스입니다.
2.  **A2A (Agent-to-Agent JSON-RPC 2.0):** 에이전트 간 통신을 위한 표준화된 방식입니다. 오픈 소스이며 에이전트의 기능, 스킬, 확장 기능을 정의하고 상태 기록을 통해 작업 수명 주기를 관리합니다.
3.  **ACP (Agentic Commerce Protocol):** OpenAI와 Stripe가 지원하는 발견 및 체크아웃 프로토콜입니다. 오픈 소스입니다.
4.  **UCP (Universal Commerce Protocol):** Google이 지원하는 발견 및 체크아웃 프로토콜입니다. 오픈 소스입니다.
5.  **AP2 (Agentic Payment Protocol):** Google이 지원하는 스코프가 지정된 결제 위임 프로토콜입니다. 에이전트가 카드 번호 대신 토큰을 사용하여 결제를 처리합니다.

발표자는 고양이 간식(Paw Print Shortbread)을 구매하는 데모를 통해 이러한 프로토콜의 작동 방식을 시연했습니다. 사용자가 "모든 제품에 대해 알려줘"라고 요청하면, 에이전트가 MCP `product_search` 도구 호출을 통해 제품 목록을 가져옵니다. "장바구니에 쇼트브레드를 추가해줘"라고 요청하면, 에이전트가 UCP 프로토콜을 사용하여 체크아웃 세션을 생성하고 제품을 장바구니에 추가합니다. 결제 단계에서는 AP2 토큰이 발급되어 결제가 완료됩니다. 이 모든 과정은 브라우저 클릭 없이 API 호출을 통해 이루어집니다.

발표자는 에이전트 개발 시 `evals`의 중요성을 강조했습니다. `evals` 없이는 에이전트가 잘못된 행동을 자신 있게 수행할 수 있으며, 이는 고객 경험에 부정적인 영향을 미칠 수 있습니다. 테스트 방법으로는 행동 평가(올바른 MCP 도구 호출 및 체크아웃 완료 상태 확인), 프로토콜 준수(MCP 도구 스키마, A2A JSON-RPC 2.0 구조, UCP 체크아웃 필드, ACP 피드 사양 검증), 지연 시간 벤치마크(MCP 도구 및 전체 A2A 왕복 시간 측정), LLM 품질 평가(에이전트 응답의 유용성, 정확성, 프로토콜 인식, 어조 평가)를 제시했습니다.

현재 MCP와 A2A는 널리 채택되고 잘 정비된 상태이며, ACP와 UCP 체크아웃도 라이브로 출시되어 있습니다. 하지만 AP2의 실제 판매자 사용, ACP와 UCP의 통합 또는 지속적인 분열, 에이전트 간 동의 표준 식별, 다중 에이전트 체크아웃 위임 등은 아직 형성 중인 영역입니다.

발표자는 청중에게 GitHub 저장소(`github.com/ahnafhyy/ai-engineer-2026-agentic-commerce-stack`)를 통해 제공되는 템플릿, `evals` 도구, 카탈로그 동기화 스크립트, 에이전트 스킬 등을 활용하여 에이전트 상거래를 직접 구축해 볼 것을 권장하며 강연을 마쳤습니다.

## 인상적인 대목
- "쇼핑은 새로운 것이 아니며, 경제가 존재한 이래로 사람들이 해야 할 가장 재미있는 일 중 하나이자 가장 필수적인 일 중 하나입니다." (Shopping isn't new, shopping is probably one of the most fun things one can do and one of the most essential things that people need to do ever since the economy existed.)
- "evals는 라이브로 출시되기 전에 어떻게 작동하는지 알 수 있는 방법입니다." (Evals are how you know it works before it's live.)
- "할인 코드를 알려주지 않으면, 심지어 때로는 누가 이 제품을 체크아웃하는지와 같은 더 민감한 정보도 알려줄 것입니다." (The discount code will be told, even sometimes more sensitive things like who else is checking out this product.)

## 실무 적용 포인트
- **프로토콜 기반 개발:** 에이전트 상거래 시스템 구축 시 MCP, A2A, ACP, UCP, AP2와 같은 표준화된 프로토콜을 활용하여 상호 운용성과 확장성을 확보해야 합니다.
- **피드-퍼스트 전략:** 제품 데이터를 실시간 검색 대신 미리 인덱싱된 제품 피드 형태로 플랫폼에 제공하여 에이전트의 효율적인 제품 발견 및 처리를 지원해야 합니다.
- **철저한 테스트 및 평가:** 에이전트의 행동, 프로토콜 준수, 시스템 지연 시간, LLM 응답 품질 등 다양한 측면에서 `evals`를 포함한 자동화된 테스트를 도입하여 프로덕션 배포 전 안정성과 정확성을 검증해야 합니다.
- **오픈 소스 활용:** 발표자가 공유한 GitHub 저장소의 템플릿과 도구들을 참고하여 에이전트 상거래 스택을 빠르게 시작하고 커스터마이징할 수 있습니다.
