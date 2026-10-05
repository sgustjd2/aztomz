---
title: "The Human Is an Async API — Melanie Warrick, Temporal"
videoId: jc3kbZkuHTo
url: https://www.youtube.com/watch?v=jc3kbZkuHTo
channel: "AI Engineer"
publishedAt: 2026-10-04
summarizedAt: 2026-10-05
model: gemini-2.5-flash
---

# The Human Is an Async API — Melanie Warrick, Temporal

🔗 https://youtu.be/jc3kbZkuHTo · 📅 2026-10-04 · 🎙 AI Engineer

## 한 줄 요약
Temporal은 Google ADK 및 LangGraph와 통합되어 에이전트 기반 시스템에서 인간-에이전트 상호작용을 위한 내구성 있는 비동기 API를 제공하여 시스템의 복원력과 확장성을 보장합니다.

## 발표자·소속
Melanie Warrick, AI & DevRel @ Temporal, Co-Founder @ Fight Health Insurance

## 핵심 주장
- Temporal은 에이전트 기반 시스템의 내구성을 보장하는 핵심 요소로, 워크플로우를 통해 상태를 추적하고 오류 발생 시 복구할 수 있게 합니다.
- 인간-에이전트 루프(Human-in-the-Loop, HITL)는 에이전트 시스템의 중요한 부분이며, Temporal은 인간의 개입을 비동기 API로 처리하여 시스템의 중단을 방지합니다.
- Temporal의 워크플로우(Workflow), 활동(Activity), 워커(Worker)라는 세 가지 기본 요소는 에이전트 시스템의 복잡한 상태 관리와 장애 처리를 표준화합니다.
- Google ADK 및 LangGraph와 같은 다양한 에이전트 프레임워크와 통합하여, Temporal은 여러 프레임워크에 걸쳐 에이전트의 내구성 있는 실행을 지원합니다.

## 세부 내용
발표는 아이스크림 배달 데모인 "Ziggy's Meltdown"을 통해 Temporal의 기능을 시연하며 시작됩니다. 이 데모는 여러 에이전트(Fleet Agent, Customer Agent, Dispatch Agent)가 아이스크림 배달을 조율하는 과정을 보여줍니다. Google ADK(Agent Development Kit)가 Temporal과 통합되어 에이전트의 활동을 오케스트레이션합니다.

데모의 첫 번째 시나리오에서는 고객이 배달 주소를 변경합니다. 이 변경 요청은 시스템에 입력되고, Temporal의 UI(사용자 인터페이스)는 이 요청이 워크플로우 내에서 어떻게 처리되는지 실시간으로 보여줍니다. 특히, 운전자 A(Driver A)의 배달 워크플로우는 주소 변경 승인을 기다리며 일시 중지됩니다. 발표자는 이 과정에서 시스템의 다른 부분은 계속 작동하며, 특정 변경 사항만 해당 워크플로우를 일시 중지시킨다는 점을 강조합니다. 인간 운영자가 변경을 승인하면, 운전자 A는 새로운 목적지(Oracle Park)로 이동하여 배달을 완료합니다.

발표자는 "인간은 비동기 API다(The Human is an Async API)"라는 핵심 주장을 제시합니다. 에이전트 시스템의 핵심은 '이유(Reason)', '행동(Act)', '관찰(Observe)'의 루프이지만, 프로덕션 환경에서 이 루프는 신뢰할 수 없으며 '하네스(harness)'가 필요하다고 설명합니다. 이 하네스는 도구, 메모리, 검색, 가드레일, 거버넌스, 관찰 가능성, 버전 관리, 그리고 인간-인-더-루프(Human-in-the-Loop)를 포함합니다. 이 모든 것의 기반이 되는 것이 "내구성 있는 실행(Durable execution)"입니다.

Temporal은 내구성 있는 실행을 위한 세 가지 기본 요소를 제공합니다:
1.  **워커(Worker):** 코드를 실행하는 프로세스입니다.
2.  **워크플로우(Workflow):** 프레임워크 및 에이전트의 내구성을 조율하는 결정론적(deterministic) 코드입니다.
3.  **활동(Activity):** 도구 호출이나 모델 호출과 같이 외부와 상호작용하는 비결정론적(non-deterministic) 코드입니다.
Temporal 서비스는 이벤트 히스토리를 저장하고 재시도 및 타임아웃을 관리하여 내구성 있는 백본 역할을 합니다.

발표자는 인간의 개입을 처리하는 일반적인 "블로킹 인간 도구(blocking human tool)" 패턴의 문제점을 지적합니다. 이는 루프를 차단하고, 워커와 함께 죽을 수 있으며, 플랫폼에 보이지 않을 수 있습니다. Temporal은 `workflow.wait_condition`과 `workflow.signal`을 사용하여 이를 해결합니다. `wait_condition`은 특정 조건이 충족될 때까지 워크플로우를 일시 중지하고, `signal`은 외부에서 워크플로우에 데이터를 주입하여 일시 중지된 워크플로우를 재개합니다. 이 방식은 워크플로우가 충돌해도 상태를 잃지 않고 복구할 수 있도록 합니다.

두 번째 데모에서는 LangGraph 프레임워크와 Temporal의 통합을 보여줍니다. 이번에는 Dispatch Agent가 고가치 주문에 대한 인간의 승인을 요청합니다. Dispatch Agent는 LangGraph를 사용하고, Temporal은 LangGraph의 노드 실행을 활동으로 래핑하여 내구성을 제공합니다. 인간의 승인을 기다리는 동안, 발표자는 의도적으로 워커 서비스를 종료합니다. 서비스가 오프라인 상태가 된 후 다시 온라인으로 전환되면, Temporal은 이벤트 로그를 재생하여 워크플로우의 상태를 복구하고, 인간의 승인 요청이 여전히 대기 중임을 보여줍니다. 인간이 승인하면 워크플로우가 재개되어 주문이 처리됩니다.

발표자는 인간-인-더-루프를 언제 사용해야 하는지에 대한 판단 기준을 제시합니다: 잘못될 경우의 비용이 높을 때, 모델이 불확실할 때, 책임 소재가 명확해야 할 때입니다. 피해야 할 함정으로는 경고 피로(alert fatigue), 컨텍스트 붕괴(context collapse), 루틴 차단(blocking the routine)이 있습니다.

결론적으로, Temporal은 어떤 방식으로 에이전트 시스템을 구축하든, 인간의 개입을 비동기 API로 처리하여 시스템의 내구성을 보장하는 데 필수적인 역할을 합니다.

## 인상적인 대목
- "A loop alone isn't reliable. It needs a harness." (루프만으로는 신뢰할 수 없습니다. 하네스가 필요합니다.)
- "Workers die. Workflows don't." (워커는 죽지만, 워크플로우는 죽지 않습니다.) - Temporal의 내구성 핵심을 간결하게 표현한 문장.

## 실무 적용 포인트
- **내구성 있는 에이전트 시스템 구축:** Temporal의 워크플로우와 활동 프리미티브를 사용하여 에이전트의 상태를 관리하고, 시스템 충돌이나 네트워크 문제 발생 시에도 작업을 재개할 수 있도록 설계합니다.
- **비동기 인간-에이전트 상호작용:** 인간의 개입이 필요한 경우, `workflow.wait_condition`과 `workflow.signal`을 활용하여 에이전트 루프를 차단하지 않고 비동기적으로 처리합니다. 이는 시스템의 응답성과 전체적인 처리량을 향상시킵니다.
- **다양한 에이전트 프레임워크 통합:** Google ADK나 LangGraph와 같은 기존 에이전트 프레임워크를 Temporal과 함께 사용하여, 프레임워크가 제공하는 에이전트 기능을 활용하면서 Temporal의 내구성 및 상태 관리 이점을 얻을 수 있습니다.
- **인간 개입 시점의 전략적 판단:** 시스템의 오류 비용, 모델의 불확실성, 책임 소재의 필요성 등을 고려하여 인간-인-더-루프를 도입할 최적의 시점을 결정하고, 경고 피로와 같은 부작용을 최소화하기 위한 메커니즘을 함께 구축합니다.
