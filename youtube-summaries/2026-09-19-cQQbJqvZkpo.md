---
title: "Vertical Mobility: Inference from MVP to Trillion-Parameter Workloads — Sitanshu Gupta, CoreWeave"
videoId: cQQbJqvZkpo
url: https://www.youtube.com/watch?v=cQQbJqvZkpo
channel: "AI Engineer"
publishedAt: 2026-09-19
summarizedAt: 2026-09-20
model: gemini-2.5-flash
---

# Vertical Mobility: Inference from MVP to Trillion-Parameter Workloads — Sitanshu Gupta, CoreWeave

🔗 https://youtu.be/cQQbJqvZkpo · 📅 2026-09-19 · 🎙 AI Engineer

## 한 줄 요약
CoreWeave는 다양한 AI 워크로드에 최적화된 단일 추론 플랫폼을 제공하며, 서버리스 및 전용 소비 모델을 통해 KV 캐시 최적화, 고급 양자화, 추론 병렬화 등의 기술로 성능과 비용 효율성을 극대화한다.

## 발표자·소속
Sitanshu Gupta, CoreWeave (Director, Inference Services)

## 핵심 주장
- CoreWeave는 서버리스와 전용(dedicated) 두 가지 소비 모델을 지원하는 단일 추론 플랫폼을 제공하여, 고객이 하드웨어 관리 부담 없이 다양한 AI 모델을 배포하고 운영할 수 있도록 한다.
- 플랫폼은 에이전트(agentic), 챗(chat), 배치(batch), 실시간/음성(realtime/voice) 등 다양한 워크로드 프로필을 효율적으로 처리하도록 설계되었으며, 각 워크로드의 고유한 지연 시간, 처리량, KV 캐시 재사용 요구 사항을 충족시킨다.
- KV(Key-Value) 캐시 최적화는 추론 비용 절감과 성능 향상에 핵심적인 요소로, 캐시 인식 라우팅, 캐시 재사용, 컨텍스트 오프로딩 등의 메커니즘을 통해 값비싼 프리필(prefill) 재계산을 방지한다.
- NVFP4 양자화, 추측 디코딩(speculative decoding), 그리고 모델 병렬화(TP, PP, EP)와 같은 고급 성능 최적화 기술들을 활용하여 모델의 출력 속도와 처리량을 크게 향상시킨다.
- CoreWeave는 인공적인 벤치마크뿐만 아니라 실제 사용자 트래픽(Open Router)에서도 경쟁사 대비 우수한 가격-성능 이점을 제공하며, 이는 플랫폼의 효율적인 설계와 최적화 노력의 결과이다.

## 세부 내용

발표는 CoreWeave의 AI 추론 플랫폼에 대한 소개로 시작되었다. 발표자 Sitanshu Gupta는 자신을 CoreWeave의 추론 서비스 담당 이사로 소개하며, 17년 이상의 소프트웨어 및 하드웨어 경험과 10개 이상의 특허를 보유하고 있다고 밝혔다.

**1. 제품 및 소비 모델**
CoreWeave는 크게 두 가지 추론 소비 모델을 제공한다:
-   **서버리스(Serverless):** 공유된 멀티테넌트 풀을 사용하며, 온디맨드 방식의 토큰당 요금제를 따른다. 유휴 시에는 스케일-투-제로(scale-to-zero)가 가능하다. 프로토타이핑, 스파이키(spiky)한 챗, 초기 에이전트, 또는 프로비저닝된 처리량을 통한 지속적인 처리량에 적합하다. 특히, 서버리스 환경에서 발생하는 '시끄러운 이웃(noisy neighbor)' 문제를 해결하기 위해 고객이 트래픽 프로필을 지정하면, CoreWeave가 이를 위한 용량을 할당하여 SLA를 보장하는 '프로비저닝된 처리량(provisioned throughput)' 옵션을 제공한다.
-   **전용(Dedicated):** 예약된 격리된 용량을 제공하며, 고객이 직접 모델 가중치(weights)를 가져와 배포할 수 있다. 처리량과 지연 시간이 보장된다. 지속적인 처리량, 낮은 지연 시간(SLO), 대규모 또는 프론티어 모델에 적합하다. 이 모델에서는 GPU 시간당 요금이 부과된다.

두 모델 모두 동일한 기본 플랫폼(오케스트레이션 -> 엔진 -> 성능)을 사용한다.

**2. 추론 워크로드 프로필**
다양한 추론 워크로드의 특성을 설명했다:
-   **에이전트(agentic):** TTTT(Time To First Token) + 루프(loop)가 특징이며, 높은 지연 시간, KV 캐시 재사용, 툴/JSON 출력, 버스티(bursty)한 트래픽(작은 것에서 큰 것까지)을 보인다.
-   **챗(chat):** TTTT가 중요하고, 높은 지연 시간, KV 캐시 재사용, 자유 형식 출력, 버스티한 트래픽(작은 것에서 큰 것까지)을 가진다. 에이전트와 챗은 멀티턴(multi-turn) 대화에서 지연 시간 요구 사항에 차이가 있다.
-   **배치(batch):** 처리량 중심이며, 낮은 지연 시간 요구 사항, 대량 출력, 오프라인(offline) 트래픽(수백만 건)을 처리한다.
-   **실시간/음성(realtime/voice):** 초저 지연 시간(ultra-low latency)이 필수적이며, 스트리밍 출력, 안정적인(steady) 트래픽(작은 것에서 중간 크기)을 가진다.

발표자는 이러한 다양한 워크로드 프로필을 효율적으로 처리하기 위해 플랫폼 설계가 중요하다고 강조했다.

**3. 전체 스택(The Full Stack)**
CoreWeave의 추론 스택은 다음과 같은 계층으로 구성된다:
-   **클라이언트(Clients):** 앱, 노트북, 에이전트 등 요청을 시작하는 주체.
-   **게이트웨이(Gateways):** 인증(auth), 속도 제한(rate limit), 사용량 추적(usage), 트래픽 분할(traffic splits)을 처리한다.
-   **서버리스/전용(Serverless/Dedicated) 레이어:** 위에서 설명한 소비 모델에 따라 요청을 라우팅한다.
-   **라우터(Router):** KV 캐시 지역성(locality)을 고려한 라우팅 결정을 내리고, 가장 부하가 적은(least-loaded) 폴백(fallback)을 제공한다. 프리필/디코드 분리(disaggregation)를 수행한다.
-   **프로필(Profile):** 컴퓨트 바운드(compute-bound) 작업인 청크된 프리필(chunked prefill)을 처리한다.
-   **디코드(Decode):** 메모리 바운드(memory-bound) 작업인 스트리밍(streaming) 및 스파스 도즈(spar doz)를 처리한다.
-   **엔진(Engines):** vLLM, SGLang, TensorRT-LLM과 같은 추론 엔진을 사용한다.
-   **하드웨어(Hardware):** GH200, H100, A100, A6000, B200, B400 등 다양한 NVIDIA GPU를 포함하며, NVLink 도메인, NVSwitch 패브릭, 구성 가능한 모델 스토어, 여러 지역 및 존(zone)에 걸친 글로벌 풋프린트를 갖는다.
-   **컨트롤 플레인(Control Plane):** GPU-모델 오토스케일러, 롤링 배포(rolling deploy), 카나리(canary), 롤백(rollback) 기능을 제공한다.
-   **관찰 가능성(Observability):** TTFT(Time To First Token), TPT(Tokens Per Second), GPU 활용률, 토큰당 비용, 비트당/날짜당 비용 등의 메트릭을 모니터링한다.

발표자는 KV 캐시가 매우 중요하며, 프리필은 컴퓨트 집약적이고 비용이 많이 들기 때문에 캐시 히트율을 높이는 것이 중요하다고 강조했다. 전용 고객의 경우, 동일한 GPU 용량을 낮에는 실시간 워크로드에, 밤에는 배치 워크로드에 할당하는 등 스케줄링을 통해 효율성을 높일 수 있다고 설명했다.

**4. KV 캐시 최적화 및 스케일링**
KV 캐시 최적화는 성능 향상과 비용 절감에 필수적이다.
-   **캐시 인식 라우팅:** 컨텍스트가 이미 존재하는 곳으로 요청을 라우팅한다.
-   **KV 캐시 재사용:** 여러 턴(turns), 세션(sessions), 테넌트(tenants)에 걸쳐 KV 캐시를 재사용한다.
-   **후속 요청 라우팅:** 상태를 이미 보유하고 있는 복제본으로 후속 요청을 라우팅한다.
-   **프리필 건너뛰기:** 캐시 히트 시 값비싼 프리필 재계산을 건너뛴다.
-   **KV 캐시 계층화/오프로딩:** GPU 메모리 고갈 없이 컨텍스트가 성장할 수 있도록 KV 캐시를 고대역폭 스토리지로 오프로드한다.
주요 메트릭은 캐시 히트율이며, 이는 챗, 에이전트, 긴 컨텍스트 워크로드에 특히 중요하다.

**5. 기타 성능 레버**
-   **프리필/디코드 분리(disaggregation):** 프리필과 디코드 단계를 분리하여 최적화한다.
-   **NVFP4 양자화:** EZM1 및 마이크로스케일링(microscaling)을 통해 모델을 NVFP4 형식으로 양자화하여 메모리 사용량과 계산량을 줄인다.
-   **추측 디코딩(speculative decoding):** MTP(Multi-Tree Prediction) 및 스페큘레이터(speculators)를 사용하여 디코딩 속도를 향상시킨다. 고객 데이터셋에 맞춰 스페큘레이터를 훈련시켜 수용 길이(acceptance length)를 높이고 출력 처리량을 개선한다.
-   **병렬화(parallelism):** 텐서 병렬화(TP), 파이프라인 병렬화(PP), 전문가 병렬화(EP)를 신중하게 선택하여 최적의 성능을 달성한다.

발표자는 Kimi 2.6 및 Kimi 2.7 모델의 출력 속도 벤치마크와 GLM 5.2의 처리량 그래프를 제시하며, CoreWeave(Weights & Biases)가 Fireworks Fast와 유사한 성능을 보인다고 언급했다. 이는 인공적인 벤치마크가 아닌 실제 사용자 트래픽(Open Router)을 기반으로 한 결과로, CoreWeave의 기술이 실제 환경에서 우수한 가격-성능 이점을 제공함을 강조했다.

## 인상적인 대목
- "Vertical Mobility"라는 용어가 "꽤 멋진 주제"라고 언급했지만, 실제로는 "작은 모델부터 큰 모델까지, 그리고 다양한 유형의 워크로드를 서비스하기 위한 추론 플랫폼"에 대한 이야기라고 설명한 부분.
- 서버리스 모델에서 "시끄러운 이웃(noisy neighbor) 문제"를 언급하며, 이를 해결하기 위해 고객이 트래픽 프로필을 알려주면 "프로비저닝된 처리량(provisioned throughput)"을 제공하여 SLA를 유지하는 접근 방식.
- "KV 캐시가 히트하면 프리필(prefill)이라는 값비싼 재계산을 건너뛸 수 있다"고 강조하며 KV 캐시 최적화의 중요성을 역설한 부분.
- 인공적인 벤치마크와 실제 사용자 트래픽(Open Router)의 차이를 명확히 구분하고, 실제 트래픽에서의 성능을 강조한 점.

## 실무 적용 포인트
-   **워크로드별 소비 모델 선택:** AI 모델 배포 시, 워크로드의 특성(스파이키, 지속적, 지연 시간 민감도)에 따라 서버리스(온디맨드/프로비저닝)와 전용(dedicated) 모델 중 적합한 것을 선택하여 비용 효율성과 성능 목표를 달성할 수 있다.
-   **KV 캐시 최적화 전략:** 멀티턴 대화형 AI(챗봇, 에이전트) 또는 긴 컨텍스트 모델의 경우, KV 캐시 재사용, 캐시 인식 라우팅, 그리고 KV 캐시 오프로딩을 통해 프리필 재계산 비용을 최소화하고 추론 지연 시간을 줄이는 것이 중요하다.
-   **성능 최적화 기술 활용:** LLM 추론 성능 향상을 위해 NVFP4 양자화, 추측 디코딩, 그리고 텐서/파이프라인/전문가 병렬화와 같은 고급 기술들을 적극적으로 검토하고 적용하여 모델의 출력 속도와 처리량을 개선할 수 있다.
-   **유연한 하드웨어 스케줄링:** 전용 GPU 자원을 사용하는 경우, 낮에는 실시간 워크로드에, 밤에는 배치 워크로드에 할당하는 등 시간대별로 GPU 사용 목적을 전환하는 스케줄링 전략을 통해 하드웨어 활용률을 극대화하고 운영 비용을 절감할 수 있다.
