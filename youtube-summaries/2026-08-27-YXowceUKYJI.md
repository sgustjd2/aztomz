---
title: "KV Cache-Aware Routing and P/D Disaggregation on Kubernetes — Yuchen Fama & Ashish Kamra, Red Hat"
videoId: YXowceUKYJI
url: https://www.youtube.com/watch?v=YXowceUKYJI
channel: "AI Engineer"
publishedAt: 2026-08-27
summarizedAt: 2026-08-28
model: gemini-2.5-flash
---

# KV Cache-Aware Routing and P/D Disaggregation on Kubernetes — Yuchen Fama & Ashish Kamra, Red Hat

🔗 https://youtu.be/YXowceUKYJI · 📅 2026-08-27 · 🎙 AI Engineer

## 한 줄 요약
이 발표는 대규모 언어 모델(LLM) 추론의 Pre-fill 및 Decode 단계를 분리(P/D Disaggregation)하고, KV 캐시를 인식하는 라우팅 기법을 Kubernetes 환경에 적용하여 GPU 자원 활용률을 극대화하고 추론 비용을 절감하는 방안을 제시합니다.

## 발표자·소속
*   Yuchen Fama, Red Hat
*   Ashish Kamra, Red Hat

## 핵심 주장
-   **LLM 추론 단계별 자원 요구사항 불일치**: LLM 추론은 프롬프트 처리(Pre-fill)와 토큰 생성(Decode) 두 단계로 나뉘며, Pre-fill은 컴퓨트 집약적이고 Decode는 KV 캐시로 인해 메모리 집약적입니다. 기존 모놀리식 배포는 이 두 단계의 자원 요구사항을 동시에 충족시키려다 비효율적인 자원 활용을 초래합니다.
-   **P/D 분리를 통한 자원 최적화**: Pre-fill 서버(P-server)와 Decode 서버(D-server)를 분리하여 각 단계에 최적화된 하드웨어(예: P-server는 고성능 컴퓨트 GPU, D-server는 대용량 메모리 GPU)를 할당함으로써 GPU 활용률을 높이고 추론 비용을 절감할 수 있습니다.
-   **외부 KV 캐시 저장소의 필요성**: P/D 분리 환경에서 Pre-fill 단계에서 생성된 KV 캐시를 Decode 단계에서 효율적으로 공유하고 접근하기 위해 고성능의 분산 KV 캐시 저장소가 필수적입니다. 이는 D-server 간의 KV 캐시 공유 및 재사용을 가능하게 합니다.
-   **KV 캐시 인식 라우팅의 중요성**: 라우터는 요청을 D-server로 보낼 때, 이미 해당 KV 캐시를 로드하고 있는 D-server를 우선적으로 선택하거나, KV 캐시를 효율적으로 로드할 수 있는 D-server로 라우팅하여 캐시 전송 및 로딩 오버헤드를 최소화해야 합니다.
-   **Kubernetes 기반의 유연한 관리 및 확장성**: Kubernetes를 활용하여 P-server, D-server, 라우터, KV 캐시 저장소 등 분리된 컴포넌트들을 유연하게 배포, 관리, 스케일링할 수 있으며, 이는 LLM 추론 시스템의 운영 효율성과 확장성을 크게 향상시킵니다.

## 세부 내용
발표는 LLM 추론의 높은 비용과 비효율적인 GPU 자원 활용 문제를 제기하며 시작합니다. LLM 추론은 크게 두 단계로 나뉩니다: 프롬프트를 처리하고 KV 캐시를 생성하는 **Pre-fill** 단계와, 생성된 KV 캐시를 사용하여 한 번에 한 토큰씩 생성하는 **Decode** 단계입니다. Pre-fill은 컴퓨트 집약적인 반면, Decode는 KV 캐시의 크기가 커짐에 따라 메모리 집약적이 됩니다. 기존의 모놀리식 배포 방식은 이 두 단계를 동일한 GPU에서 처리하므로, Decode 단계에서 KV 캐시가 GPU 메모리를 대부분 차지하여 컴퓨트 자원이 유휴 상태가 되는 비효율이 발생합니다.

이러한 문제를 해결하기 위해 발표자들은 **P/D 분리(Disaggregation)** 아키텍처를 제안합니다. Pre-fill은 P-server에서, Decode는 D-server에서 처리하도록 분리하는 것입니다. P-server는 컴퓨트 최적화된 GPU를, D-server는 메모리 최적화된 GPU를 사용할 수 있어 자원 활용률을 극대화할 수 있습니다. P-server에서 생성된 KV 캐시는 **외부 KV 캐시 저장소**에 저장되며, D-server는 이 저장소에서 필요한 KV 캐시를 로드하여 Decode를 수행합니다.

이 분리된 아키텍처에서 중요한 것은 **KV 캐시 인식 라우팅(KV Cache-Aware Routing)**입니다. 클라이언트 요청은 먼저 라우터로 전달됩니다. 새로운 프롬프트 요청은 P-server로 라우팅되어 KV 캐시를 생성하고 외부 저장소에 저장합니다. 이후의 Decode 요청은 라우터가 KV 캐시 ID를 기반으로 D-server로 라우팅합니다. 이때 라우터는 어떤 D-server가 이미 해당 KV 캐시를 로드하고 있는지, 또는 어떤 D-server가 캐시를 효율적으로 로드할 수 있는지 파악하여 최적의 D-server로 요청을 보냅니다. 이를 통해 KV 캐시 전송 및 로딩 시간을 최소화합니다.

전체 시스템은 **Kubernetes** 기반으로 구축됩니다.
*   **Router**: 클라이언트 요청을 받아 P-server 또는 D-server로 라우팅합니다. KV 캐시 상태를 추적하여 최적의 D-server를 선택합니다.
*   **P-server**: LLM Pre-fill을 수행하고 생성된 KV 캐시를 KV Cache Store에 저장합니다.
*   **D-server**: LLM Decode를 수행하고 KV Cache Store에서 KV 캐시를 로드합니다.
*   **KV Cache Store**: 분산 메모리 저장소로, P-server와 D-server 간에 KV 캐시를 공유합니다. 발표에서는 고성능을 위해 커스텀 솔루션을 사용한다고 언급했습니다.
*   **Kubernetes**: P-server, D-server, Router, KV Cache Store의 배포, 관리, 스케일링을 담당합니다. 네트워크는 Kube-OVN을, 모니터링은 Kube-Prometheus를 사용합니다.

데모에서는 `llama-2-7b` 모델을 사용하여 P/D 분리 아키텍처의 동작을 시연했습니다. P-server와 D-server가 독립적으로 스케일링되며, 라우터가 KV 캐시를 로드한 D-server로 요청을 효율적으로 라우팅하는 과정을 보여주었습니다. 특히, 동일한 KV 캐시를 사용하는 여러 Decode 요청이 하나의 D-server로 라우팅되어 효율성을 높이는 시나리오를 강조했습니다. 모놀리식 방식과 비교하여, P/D 분리 방식은 P-server의 높은 컴퓨트 활용률과 D-server의 높은 메모리 활용률을 통해 전체 GPU 자원 활용률을 개선하고 추론 비용을 절감할 수 있음을 Prometheus 메트릭을 통해 시각적으로 보여주었습니다.

향후 연구 방향으로는 더욱 정교한 KV 캐시 관리 정책(예: 캐시 제거, 계층화), vLLM 또는 TGI와 같은 기존 LLM 서빙 프레임워크와의 통합, 더 많은 모델 및 양자화 지원, 워크로드 기반의 동적 스케일링 등을 언급했습니다.

## 인상적인 대목
-   "The KV cache is a huge memory consumer." (KV 캐시는 엄청난 메모리 소비원입니다.)
-   "P/D disaggregation allows us to match the right resources to the right phase." (P/D 분리는 올바른 자원을 올바른 단계에 일치시킬 수 있게 해줍니다.)
-   "The router needs to be KV cache-aware." (라우터는 KV 캐시를 인식해야 합니다.)

## 실무 적용 포인트
-   **LLM 추론 워크로드 분석**: 현재 LLM 추론 시스템의 Pre-fill 및 Decode 단계별 자원 활용 패턴을 분석하여, GPU 컴퓨트와 메모리 간의 병목 현상이 있는지 파악하고 P/D 분리 아키텍처 도입의 필요성을 검토할 수 있습니다.
-   **P/D 분리 아키텍처 도입**: 대규모 LLM 추론 환경에서 GPU 자원 활용률을 최적화하고 비용을 절감하기 위해 Pre-fill과 Decode 단계를 분리하여 별도의 서버(P-server, D-server)에 배포하는 것을 고려할 수 있습니다.
-   **고성능 KV 캐시 저장소 설계/선택**: 분리된 아키텍처에서 KV 캐시의 효율적인 공유와 빠른 접근을 위해 Redis와 같은 인메모리 데이터베이스나 커스텀 분산 메모리 저장소를 활용하여 고성능 KV 캐시 저장소를 구축해야 합니다.
-   **KV 캐시 인식 라우터 구현**: 요청을 D-server로 라우팅할 때, KV 캐시의 위치와 D-server의 캐시 로드 상태를 고려하여 최적의 라우팅 결정을 내리는 라우터 컴포넌트를 개발하거나 기존 로드 밸런서에 기능을 추가하여 추론 지연 시간을 최소화할 수 있습니다.
