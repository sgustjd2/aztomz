---
title: "Can LLMs Write Fast Multi-GPU Kernels? — Simran Arora, Together AI"
videoId: pOvWgX7IJsc
url: https://www.youtube.com/watch?v=pOvWgX7IJsc
channel: "AI Engineer"
publishedAt: 2026-08-27
summarizedAt: 2026-08-28
model: gemini-2.5-flash
---

# Can LLMs Write Fast Multi-GPU Kernels? — Simran Arora, Together AI

🔗 https://youtu.be/pOvWgX7IJsc · 📅 2026-08-27 · 🎙 AI Engineer

## 한 줄 요약
발표자는 멀티-GPU AI 커널 개발의 복잡성을 단순화하기 위한 연구를 소개하며, 소수의 핵심 원칙과 프로그래밍 프리미티브를 제시하고, 현재의 대규모 언어 모델(LLM)이 이러한 원칙을 이해하고 활용하는 데 어려움을 겪고 있음을 보여줍니다.

## 발표자·소속
심란 아로라(Simran Arora), 투게더 AI(Together AI) 수석 과학자. 스탠포드 크리스 레이(Chris Ré) 연구실에서 박사 학위를 취득했으며, 칼텍(Caltech)의 신임 교수입니다.

## 핵심 주장
-   **네트워킹이 AI 성능의 병목 현상으로 부상:** 과거에는 GPU 내 메모리 접근 및 단일 GPU 커널이 병목이었으나, 플래시 어텐션(Flash Attention)과 같은 효율적인 커널 및 DSL(Domain-Specific Language)의 발전으로 이제는 멀티-GPU 간 통신이 주요 병목이 되었습니다.
-   **멀티-GPU 커널 개발의 어려움과 트레이드오프:** 고성능 멀티-GPU 커널을 작성하는 것은 매우 어려우며, 통신 메커니즘, 오버랩 스케줄링, 추상화 수준 등 여러 트레이드오프를 이해하고 최적화해야 합니다.
-   **LLM은 아직 알고리즘 혁신에 한계:** 현재의 파운데이션 모델(LLM)은 구문 오류나 형태 오류를 수정하는 데는 도움을 줄 수 있지만, 멀티-GPU 커널 프로그래밍의 근본적인 트레이드오프를 이해하고 알고리즘적으로 혁신적인 커널을 생성하는 능력은 아직 부족합니다.

## 세부 내용

발표는 AI 엔지니어링의 미래를 주제로, 멀티-GPU AI 커널 개발의 단순화에 대한 투게더 AI의 기여를 다룹니다.

**1. 동기: 왜 지금 GPU 네트워킹인가?**
발표자는 GPU 활용이 과거에는 GPU 내 메모리 접근과 단일 GPU 커널에 의해 제한되었으나, 플래시 어텐션, 딥시크(DeepSeek), 스파스 어텐션, 맘바(Mamba)와 같은 메모리 효율적인 아키텍처 및 타일랭(TileLang), 모조(Mojo)와 같은 DSL의 발전으로 병목 현상이 멀티-GPU 통신으로 이동했다고 설명합니다. 현대 AI 워크로드는 매우 커서 여러 GPU에 걸쳐 커널을 필요로 하며, 분산 학습 및 추론 워크로드에서 통신이 런타임의 대부분을 차지하여 낮은 모델 FLOPs 활용률을 초래합니다.

**2. 하드웨어 메커니즘 및 병렬화 전략의 기초**
발표자는 엔비디아 H100 GPU를 예시로 하드웨어 구조를 설명합니다. GPU는 스트리밍 멀티프로세서(SM)라는 프로세서에서 연산을 수행하며, 이 SM 주변에는 L2 캐시와 HBM(High Bandwidth Memory)이 있습니다. 연산을 위해서는 데이터가 레지스터 메모리(가장 빠르고 용량이 적음)에서 HBM(느리지만 용량이 큼)으로 이동해야 합니다. 멀티-GPU 시스템에서는 PCIe(CPU-GPU 통신), NVLink/NVswitch(GPU-GPU 통신), InfiniBand/TCP(멀티-노드 통신)와 같은 계층적 상호 연결이 존재합니다. NVswitch는 NVLink 엔드포인트를 논블로킹 패브릭으로 연결하여 GPU-GPU 통신을 가능하게 하며, 멀티캐스트 및 리덕션(reduction)과 같은 인-네트워크(in-network) 가속을 지원합니다.

네트워킹은 빠르게 발전하고 있으며, TPU 칩 간 상호 연결(토러스), 엔비디아 NVLink/NVswitch(스위치드 애니투애니), AMD XGMI(점대점) 등 다양한 접근 방식이 있습니다. 또한 계층적 캐싱(GPU, CPU, 디스크), 이기종 하드웨어(Vera + LPU), 디바이스 시작 통신(TMA, TDM) 등 새로운 추론 알고리즘(분리)의 최전선이 형성되고 있습니다.

**3. 문제: 하드웨어 활용 극대화 및 개발 단순성**
고성능 멀티-GPU 커널을 작성하는 것은 어렵습니다. 통신은 대규모 언어 모델 워크로드에서 실행 시간의 50% 이상을 차지하여 GPU 컴퓨팅 유휴 상태를 초래할 수 있습니다. A100에서 B200으로 가면서 BF16 텐서 코어는 7.2배 개선되었지만, NVLink를 통한 노드 내 통신은 3배, PCIe/InfiniBand를 통한 노드 간 통신은 2배만 개선되었습니다.

현재 멀티-GPU 커널 개발에는 세 가지 주요 접근 방식이 있습니다.
1.  **기성 API(Off-the-shelf APIs):** NCCL, RCCL과 같은 라이브러리는 주로 대량의 데이터 전송에 최적화되어 있으며, 세분화된 통신이나 비정형 집합(non-trivial collectives)에는 비효율적입니다.
2.  **컴파일러(Compilers):** Triton Distributed와 같은 컴파일러는 특정 아키텍처에 최적화되어 있어 다른 아키텍처(예: H800에서 H100)로의 효율적인 적응이 어렵습니다.
3.  **저수준 프리미티브(Low-level primitives):** Comet, CUTLASS와 같은 도구는 수동으로 커널을 튜닝하여 최고 성능을 달성하지만, 개발 복잡성이 높고 다른 정밀도나 아키텍처로 확장하기 어렵습니다.

이러한 문제에 대응하여 발표자의 연구팀은 `ParallelKittens`라는 최소한의 멀티-GPU 프로그래밍 프리미티브 및 패턴 세트를 개발하여 멀티-GPU 커널의 트레이드오프를 이해하고, `ParallelKernelBench`라는 벤치마크를 통해 파운데이션 모델의 커널 생성 능력을 평가했습니다.

**4. `ParallelKittens` 및 `ParallelKernelBench`**
`ParallelKittens`는 멀티-GPU 커널 프로그래밍을 위한 단순한 원칙과 프리미티브를 제공합니다. 주요 트레이드오프는 다음과 같습니다.
-   **전송 메커니즘:**
    1.  **복사 엔진(Copy engine):** 호스트(CPU)가 시작하는 대량 통신으로, GPU 프로세서 자원을 사용하지 않아 대규모 메시지 전송에 효율적입니다.
    2.  **TMA(Tensor Memory Accelerator):** 디바이스(GPU)가 시작하는 세분화된 통신으로, 적은 GPU 프로세서와 레지스터를 사용하여 NVLink 대역폭을 포화시킬 수 있습니다.
    3.  **레지스터 명령어(Register instructions):** 디바이스가 시작하는 세분화된 통신으로, 많은 GPU 프로세서와 레지스터를 사용하며 대역폭 포화에 어려움을 겪을 수 있습니다. 레지스터 명령어는 NVswitch의 인-네트워크 리덕션(in-network reduction)을 고유하게 활성화합니다.
-   **오버랩 스케줄링:**
    1.  **Intra-SM 오버랩핑:** 단일 SM 내에서 통신, 컴퓨팅, 메모리 작업을 병렬화합니다. 세분화된 동기화가 필요하며 SM 자원을 완전히 활용합니다.
    2.  **Inter-SM 오버랩핑:** 여러 SM에 걸쳐 통신, 컴퓨팅, 메모리 작업을 분리하여 병렬화합니다. 통신과 컴퓨팅 작업이 정렬되지 않을 때 유연하며, NVswitch 및 L2 캐시 프리페칭(prefetching)을 활용할 수 있습니다.
-   **추상화 수준:** NCCL/NVSHMEM과 같은 고수준 API는 단순하지만 느리고, 저수준 개발은 복잡하지만 최고 성능을 이끌어냅니다.

`ParallelKittens`는 이러한 아이디어를 캡슐화하며, 단일 GPU 커널에 약 12줄의 코드를 추가하여 멀티-GPU 프리미티브를 삽입할 수 있습니다. 이를 통해 데이터, 시퀀스, 전문가 병렬화 전반에 걸쳐 강력한 기준선 대비 최첨단 결과를 달성했습니다.

`ParallelKernelBench`는 멀티-GPU 설정에서 높은 커버리지를 제공하기 위해 병렬화 스키마의 분류 체계를 식별하고 각 설정에 대한 문제를 제안합니다. 이 벤치마크는 PyTorch 참조 구현과 네트워크 토폴로지를 입력으로 받아, 언어 모델이 CUDA 커널을 생성하도록 하고, 이를 정확성, 성능, 통신 측면에서 평가합니다.

**5. 결과**
단일 샷(single-shot) LLM은 `ParallelKernelBench`에서 어려움을 겪습니다. GPT-4, Claude 2.1, Gemini 3 Pro 등 최신 모델들도 87개 문제 중 28개만 정확하게 해결했으며, 이 중 22개만이 PyTorch + NCCL 기준선보다 빨랐습니다. 반복 샘플링을 통해 정확한 솔루션의 수는 36개로 증가했지만, 성능 개선은 여전히 31% 수준에서 정체되었습니다.

LLM의 실패 모드를 분석한 결과, 구문 오류나 형태 오류보다는 알고리즘적 혁신 능력 부족이 주요 원인이었습니다. 에이전트 루프(Agentic loops)는 구문 및 형태 오류를 수정하는 데는 도움이 되지만, 모델이 알고리즘적으로 혁신하는 데는 도움이 되지 않았습니다.

그럼에도 불구하고, `ParallelKernelBench`를 통해 네트워킹 스택의 진화에 맞춰 새로운 아키텍처를 설계하고, 노드 간 통신 및 멀티-실리콘 통신을 개선하는 데 필요한 새로운 커널을 얻을 수 있었습니다. 예를 들어, NeMo vocab-parallel log-prob 커널, Hyena forward context parallelism 커널, SAM3 IoU suppression 커널 등은 기준선 대비 상당한 속도 향상을 보였습니다.

## 인상적인 대목
-   "네트워킹은 나머지 병목 현상입니다." (Networking is the remaining bottleneck.)
-   "모델은 이러한 트레이드오프를 현재 이해하지 못하거나 맥락에서 트레이드오프에 대해 추론하는 능력을 보여주지 못합니다." (Models do not currently understand these tradeoffs or demonstrate an ability to reason about the tradeoffs in-context.)
-   "에이전트 루프는 구문 및 형태 오류를 수정하는 데 도움이 되지만, 모델이 알고리즘적으로 혁신하는 데는 도움이 되지 않습니다." (Agentic loops help correct syntax and shape errors, but does not help the model innovate algorithmically.)

## 실무 적용 포인트
-   **멀티-GPU 커널 개발 시 하드웨어 트레이드오프 이해:** `ParallelKittens`에서 제시된 전송 메커니즘(복사 엔진, TMA, 레지스터 명령어), 오버랩 스케줄링(Intra-SM, Inter-SM), 추상화 수준(고수준 API vs. 저수준 프리미티브) 간의 트레이드오프를 이해하고 현재 워크로드에 가장 적합한 방식을 선택해야 합니다.
-   **LLM 활용 시 알고리즘 혁신 한계 인지:** LLM을 사용하여 커널을 생성할 때, 구문 및 형태 오류 수정에는 유용하지만, 복잡한 멀티-GPU 환경에서 알고리즘적 최적화나 새로운 패턴 발견에는 아직 한계가 있음을 인지하고 인간의 전문 지식을 결합해야 합니다.
-   **`ParallelKernelBench`를 통한 커널 평가 및 개발:** `ParallelKernelBench`와 같은 벤치마크를 활용하여 생성된 커널의 정확성, 성능, 통신 효율성을 체계적으로 평가하고, 실제 AI 워크로드에 필요한 병렬화 전략을 탐색하는 데 사용할 수 있습니다.
-   **네트워킹 스택 진화에 대한 지속적인 관심:** AI 아키텍처가 대규모 스케일업, 분리된 추론, 이기종 하드웨어 등으로 변화함에 따라, NVLink/NVswitch와 같은 네트워킹 스택의 발전을 주시하고 새로운 인-네트워크 통신 프리미티브를 활용하는 방법을 모색해야 합니다.
