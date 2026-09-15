---
title: "Every step you take, every call you make: the reliable agent stack — Giselle van Dongen, Restate"
videoId: cI7zfqusmFU
url: https://www.youtube.com/watch?v=cI7zfqusmFU
channel: "AI Engineer"
publishedAt: 2026-09-14
summarizedAt: 2026-09-15
model: gemini-2.5-flash
---

# Every step you take, every call you make: the reliable agent stack — Giselle van Dongen, Restate

🔗 https://youtu.be/cI7zfqusmFU · 📅 2026-09-14 · 🎙 AI Engineer

## 한 줄 요약
Restate는 에이전트 애플리케이션을 프로덕션 환경에서 안정적으로 실행하기 위한 유연하고 내구성 있는 백엔드 프레임워크로, 장기 실행, 상태 저장, 분산된 에이전트 시스템을 쉽게 구축하고 관리할 수 있도록 돕습니다.

## 발표자·소속
Giselle van Dongen, Restate

## 핵심 주장
-   **에이전트 스택의 진화:** LLM(대규모 언어 모델)과의 상호작용은 웹사이트 기반의 단일 질의응답에서, 컴퓨터에 다운로드하는 에이전트 앱을 거쳐, 이제는 조직 전반에 걸쳐 도구와 컨텍스트에 접근하며 인간 팀과 함께 비동기적으로 작동하는 장기 실행, 지속적인 에이전트 시스템으로 발전하고 있습니다.
-   **생산 환경에서의 에이전트 실행 난이도:** 에이전트 SDK는 개념 증명(PoC)을 빠르게 구현하는 데 유용하지만, 분산된 시스템에서 장기 실행되는 상태 저장 에이전트를 안정적으로 운영하기 위해서는 재시도 로직, 복구 로직, 세션 관리 등 복잡한 인프라 계층이 필요합니다.
-   **Restate의 내구성 있는 런타임:** Restate는 단일 에이전트 실행의 복원력(내구성 있는 실행), 수많은 동시 세션 관리(상태 및 세션 조정), 에이전트 간 통신(통신 및 흐름 제어), 그리고 에이전트의 행동 제어(관찰 가능성 및 제어)를 위한 네 가지 핵심 기능을 제공하여 이러한 인프라 문제를 해결합니다.
-   **이벤트 기반 분산 로그 아키텍처:** Restate는 코어 Meta 이벤트 인프라에서 영감을 받은 이벤트 기반 분산 로그를 기반으로 작동합니다. 이는 푸시 모델을 사용하여 낮은 지연 시간(10단계 워크플로우에 대해 P99 45ms)을 제공하며, 서버리스 환경에 적합하고 단일 바이너리로 외부 종속성 없이 쉽게 운영할 수 있습니다.

## 세부 내용

발표는 Andrej Karpathy의 트윗을 인용하며 LLM 및 에이전트 사용자 인터페이스(UI)의 세 가지 주요 변화를 설명했습니다. 첫 번째는 LLM이 웹사이트처럼 질문하고 답변을 받는 방식, 두 번째는 컴퓨터에 다운로드하는 앱처럼 도구를 활용하는 방식, 세 번째는 조직 내 도구와 컨텍스트에 접근하며 인간 팀과 함께 비동기적으로 작동하는 자율적이고 지속적인 에이전트 시스템으로의 발전입니다.

발표자는 에이전트 사용 사례가 단일 에이전트에서 에이전트 플랫폼으로 진화함에 따라, 인프라 계층도 함께 진화해야 한다고 강조했습니다. 현재 에이전트 SDK는 PoC 구현에 용이하지만, 분산된 환경에서 장기 실행되는 상태 저장 에이전트를 안정적으로 운영하기 위한 재시도 로직, 복구 로직, 세션 관리 등 복잡한 인프라 구축은 여전히 어렵습니다.

이러한 문제를 해결하기 위해 Restate라는 오픈소스 프레임워크를 소개했습니다. Restate는 Apache Flink 개발자와 Meta의 코어 이벤트 인프라 아키텍트들의 아이디어에서 출발했으며, 모든 백엔드를 구축할 수 있는 유연하고 내구성 있는 기반을 제공합니다. 특히 에이전트와 같은 백엔드 유형에 잘 작동합니다.

Restate의 핵심 기능은 네 가지입니다:
1.  **내구성 있는 실행(Durable Execution):** 에이전트가 장기간 실행 중 충돌하더라도 중단된 지점부터 정확히 재개할 수 있도록 합니다.
2.  **상태 및 세션 조정(State & Session Coordination):** 수천 개의 동시 에이전트 세션을 병렬로 실행하면서 상태 일관성을 보장하고 에이전트 간 간섭을 방지합니다.
3.  **통신 및 흐름 제어(Communication & Flow Control):** 에이전트 간, 에이전트와 MCP(영상에서 불명) 서버 및 기타 도구 간의 통신을 관리합니다.
4.  **관찰 가능성 및 제어(Observability & Control):** 에이전트의 비정상적인 동작(예: 무한 루프)을 감지하고 실행을 취소하거나 중지할 수 있는 기능을 제공합니다.

발표자는 Restate가 일반 함수를 장기 실행되고, 내구성이 있으며, 상태를 저장하는 엔티티로 전환한다고 설명했습니다. Restate 서버는 에이전트 서비스 앞에 프록시처럼 위치하며, 클라이언트의 요청을 에이전트 서비스로 푸시합니다. 에이전트가 작업을 수행할 때 발생하는 이벤트는 Restate로 전송되어 저널에 기록되고, 이 저널은 실패 시 실행을 복구하는 데 사용됩니다.

**데모 시연:**
발표자는 Slack 연구 에이전트를 시연했습니다.
1.  Slack 채널에서 "What is new in AI?"라고 질문합니다.
2.  Restate UI(콕핏)에서 `DeepResearchAgent`의 실행 상태를 확인합니다. 에이전트는 LLM을 호출하여 연구 계획을 세우고, Slack을 통해 사용자에게 계획을 보냅니다.
3.  사용자가 Slack에서 "Approve" 버튼을 누르면, Restate UI에서 워크플로우가 재개되고 여러 병렬 연구 에이전트가 시작되는 것을 볼 수 있습니다.
4.  Restate UI의 저널 섹션에서는 에이전트의 실행 단계(LLM 호출, 웹 검색 등)가 기록됩니다. 웹 검색 API 오류가 발생했을 때 Restate가 자동으로 재시도하여 성공적으로 완료하는 과정을 보여주며 내구성 있는 실행을 시연했습니다.
5.  코드 설명을 통해 `@restate.handler` 데코레이터와 `restate.run_typed`를 사용하여 일반 Python 함수를 내구성 있게 만드는 방법을 보여주었습니다. 또한 `restate.awakeable`을 사용하여 인간의 승인과 같이 장기간 대기해야 하는 작업을 일시 중단하고 재개하는 방법을 시연했습니다.
6.  에이전트가 실행 중일 때 "Focus on frontier models"와 같은 추가 정보를 입력하여 기존 에이전트 루프에 새로운 정보를 주입하고, 에이전트가 이를 반영하여 새로운 연구를 시작하도록 하는 상호작용 기능을 보여주었습니다. 이는 `restate.resolve_signal`을 통해 구현되며, 기존 실행을 취소하고 새로운 실행을 시작하는 방식으로 작동합니다.

**Restate의 내부 구현:**
Restate는 코어 Meta 이벤트 인프라에서 영감을 받은 이벤트 기반 분산 로그(event-driven distributed log)를 사용합니다. 클라이언트의 요청은 Ingress를 통해 Log에 기록되고, Event Loop가 Log의 이벤트를 처리하여 Processor(RocksDB를 사용하여 상태 저장)를 통해 서비스를 호출하거나 타이머를 설정합니다. 이는 푸시 모델(Push model)로 작동하여 낮은 지연 시간(P99 45ms for 10 steps)을 제공하며, 서버리스 환경에 적합하고 단일 바이너리로 쉽게 운영할 수 있습니다.

**지원 및 확장성:**
Restate는 TypeScript/JavaScript, Go, Java, Python, Kotlin, Rust 등 6가지 언어용 SDK를 제공하며, Vercel AI SDK, Google ADK, Pydantic AI, LangChain, OpenAI Agents 등 다양한 LLM SDK와 통합됩니다. 사용자는 오픈소스(OSS)로 자체 호스팅하거나, BYOC(Bring Your Own Cloud) 옵션을 통해 Restate를 자신의 클라우드 계정에 배포하여 데이터가 클라우드 계정을 벗어나지 않도록 할 수 있습니다. 또한 관리형 클라우드 서비스도 제공됩니다.

## 인상적인 대목
-   "Imo this is the 3rd major redesign of LLM UI/UX. The first paradigm was that the LLM is a website you go to, the second was that it is an app you download to your computer. This third one is that it is a self-contained, persistent, asynchronous entity, working alongside teams of humans." (Andrej Karpathy의 트윗 인용)
-   "Agent SDKs are really cool to implement PoCs and get started quickly, but they don't necessarily help with like connecting the distributed bits around an organization."
-   "Restate: a flexible, durable foundation to build any backend."
-   "This journal is what will be used to recover the execution to the point where it failed."
-   "You can actually also suspend a function and bring it back when it's able to make progress."

## 실무 적용 포인트
-   **장기 실행 에이전트의 안정성 확보:** Restate의 내구성 있는 실행 기능을 활용하여 에이전트가 장기간 실행 중 발생할 수 있는 실패(네트워크 파티션, 좀비 실패 등)에도 중단 없이 작업을 재개하도록 보장할 수 있습니다.
-   **상태 저장 에이전트의 동시성 관리:** 수천 개의 에이전트 세션을 병렬로 실행해야 하는 경우, Restate의 세션 조정 기능을 통해 각 에이전트의 상태가 일관되게 유지되고 서로 간섭하지 않도록 관리하여 복잡한 동시성 문제를 해결할 수 있습니다.
-   **인간-에이전트 협업 워크플로우 구현:** `restate.awakeable`과 같은 기능을 사용하여 에이전트가 인간의 승인이나 추가 입력을 기다리며 일시 중단되고, 입력이 들어오면 다시 작업을 재개하는 하이브리드 워크플로우를 효율적으로 구축할 수 있습니다.
-   **유연한 에이전트 아키텍처 설계:** Restate는 다양한 언어 SDK와 LLM SDK 통합을 지원하며, 특정 워크플로우 모델에 얽매이지 않고 개발자가 원하는 방식으로 에이전트 애플리케이션을 설계하고 확장할 수 있는 유연한 프로그래밍 모델을 제공합니다.
