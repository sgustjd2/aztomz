# Can LLMs Write Fast Multi-GPU Kernels? — Simran Arora, Together AI

🔗 https://www.youtube.com/watch?v=pOvWgX7IJsc

## 개요
*   **발표자**: 심란 아로라 (Simran Arora), Together AI
*   **주제**: 멀티 GPU AI 커널 개발을 단순화하는 원칙을 탐구하고, 최신 LLM이 이러한 고성능 병렬 커널을 자동으로 작성할 수 있는지 그 능력과 한계를 평가합니다.

## 발표 흐름

### 도입: 왜 지금 멀티 GPU 네트워킹이 중요한가?
발표자는 자신을 Together AI의 수석 과학자이자 칼텍(Caltech)의 예비 교수로 소개하며 발표를 시작합니다. Together AI의 프론티어 성능 연구팀은 최신 AI 하드웨어에서 최고의 성능을 끌어내는 시스템, 프레임워크, 알고리즘을 개발합니다.

과거 GPU 활용도의 병목은 주로 단일 GPU 내의 메모리 접근이나 커널 성능에 있었습니다. 하지만 FlashAttention 같은 효율적인 커널, Mamba나 희소 어텐션(sparse attention) 같은 메모리 효율적 아키텍처, 그리고 Triton, Mojo 같은 DSL(도메인 특화 언어)의 발전으로 인해 이제 병목 현상은 **GPU 내부(intra-GPU)에서 GPU 간(multi-GPU) 통신**으로 옮겨갔습니다. 따라서 현재 AI 시스템의 성능을 극대화하기 위해서는 멀티 GPU 네트워킹에 대한 깊은 이해가 필수적입니다.

### 문제 정의: 성능과 개발 단순성 사이의 딜레마
멀티 GPU 커널 개발의 핵심 문제는 두 가지입니다.
1.  **하드웨어 활용도 극대화**: 하드웨어의 모든 성능을 남김없이 사용해야 합니다.
2.  **개발 단순성 확보**: 개발 과정이 너무 복잡해서는 안 됩니다.

현재 고성능 멀티 GPU 커널을 작성하는 것은 매우 어렵습니다.
*   **통신 오버헤드**: 대규모 언어 모델(LLM) 워크로드에서는 통신이 전체 실행 시간의 50% 이상을 차지할 수 있으며, 이로 인해 GPU의 연산 유닛은 유휴 상태(idle)가 됩니다.
*   **하드웨어 발전의 불균형**: NVIDIA A100에서 B200으로 넘어가면서, BF16 텐서 코어 성능은 7.2배, HBM(고대역폭 메모리)은 5.1배 향상된 반면, 노드 내(intra-node) 통신(NVLink)은 3배, 노드 간(inter-node) 통신(PCIe/InfiniBand)은 2배 향상에 그쳤습니다. 연산 성능에 비해 통신 성능의 발전이 더뎌 병목 현상이 심화되고 있습니다.

### 멀티 GPU 커널의 기본 원리: 3가지 핵심 트레이드오프
고성능 멀티 GPU 커널을 설계할 때 고려해야 할 근본적인 트레이드오프는 3가지가 있습니다.

#### 1. 전송 메커니즘 (Transfer Mechanism)
GPU 간 데이터 전송 방식은 크게 세 가지로 나뉘며, 각각 장단점이 있습니다.
*   **Copy Engine**: 호스트(CPU)가 시작하는 벌크 통신 방식입니다. 메시지 크기가 클 때 최고의 대역폭을 달성하지만, 작은 메시지에는 비효율적입니다. GPU 연산 프로세서나 레지스터를 소모하지 않는 장점이 있습니다.
*   **TMA (Tensor Memory Acceleration)**: 디바이스(GPU)가 시작하는 미세-조정(fine-grained) 통신 방식입니다. 적은 수의 GPU 프로세서와 레지스터만 사용하면서도 상대적으로 작은 메시지 크기에서도 높은 대역폭을 빠르게 포화시킬 수 있습니다.
*   **레지스터 명령어 (Register Instructions)**: 디바이스가 시작하는 가장 미세한 수준의 통신입니다. 많은 GPU 프로세서를 소모하며 대역폭을 완전히 포화시키기 어렵습니다. 하지만 NVSwitch의 인-네트워크 리덕션(in-network reduction) 같은 고급 기능을 유일하게 활성화할 수 있는 장점이 있습니다.

#### 2. 오버랩 스케줄 (Overlapping Schedule)
연산(Compute), 메모리(Memory), 통신(Communication)을 어떻게 중첩시키느냐에 따라 성능이 달라집니다.
*   **Intra-SM Overlapping**: 단일 스트리밍 멀티프로세서(SM) 내에서 여러 스레드(워프)가 각각 연산, 통신, 메모리 작업을 분담하여 동시에 처리합니다. 이를 위해서는 연산과 통신 작업의 데이터 패턴이 정렬(aligned)되어야 하며, 미세한 동기화가 필요합니다.
*   **Inter-SM Overlapping**: 여러 SM에 각각 연산, 통신, 메모리 작업을 할당합니다. 데이터 패턴이 정렬되지 않아도 유연하게 적용할 수 있으며, NVSwitch나 L2 캐시 프리페칭(prefetching)을 활용할 수 있습니다.
*   **성능 비교**: GEMM + Reduce-Scatter(RS)처럼 연산과 통신이 정렬된 작업에서는 Intra-SM 방식이 월등히 빠릅니다. 반면, GEMM + All-Reduce(AR)처럼 정렬되지 않은 작업에서는 Inter-SM 방식이 더 나은 성능을 보입니다.

#### 3. 추상화 수준 (Level of Abstraction)
개발 편의성과 성능 사이의 트레이드오프입니다.
*   **고수준 API (e.g., NCCL, RCCL)**: 동기화와 버퍼링을 내부적으로 처리해주는 간단한 API를 제공하지만, 성능이 느릴 수 있습니다.
*   **저수준 프리미티브 (e.g., Comet, CUTLASS, ParallelKittens)**: 개발자가 직접 동기화와 버퍼링을 관리해야 하므로 복잡하지만, 하드웨어의 최고 성능을 이끌어낼 수 있습니다.

### ParallelKittens: 멀티 GPU 커널 개발의 체계적 단순화
이러한 원칙들을 바탕으로, 발표자 팀은 **ParallelKittens**라는 최소한의 멀티 GPU 프로그래밍 프리미티브 세트를 개발했습니다. 이는 몇 가지 간단한 트레이드오프가 멀티 GPU 커널 프로그래밍을 지배한다는 것을 보여주며, 개발자가 복잡성을 줄이면서도 고성능 커널을 작성할 수 있게 돕습니다. ParallelKittens는 Together AI와 파트너사에서 실제 프로덕션에 사용되고 있습니다.

### ParallelKernelBench (PKB): LLM의 커널 작성 능력 평가
LLM이 이러한 근본 원리를 이해하고 활용할 수 있는지 평가하기 위해 **ParallelKernelBench(PKB)**라는 벤치마크를 제작했습니다.
*   **구성**: PKB는 LLM에게 (1) 작업 설명, (2) 네트워크 토폴로지 및 하드웨어 사양, (3) 최적화되지 않은 PyTorch + NCCL 레퍼런스 코드를 제공합니다.
*   **과제**: LLM은 이 정보를 바탕으로 고성능 커스텀 CUDA 커널을 생성해야 합니다.
*   **평가**: 생성된 커널은 (1) 정확성(Correctness), (2) 성능(Performance), (3) 통신 효율성(Communication) 세 가지 기준으로 평가됩니다.

### 결과: LLM은 멀티 GPU 커널 작성에 어려움을 겪는다
다양한 최신 LLM(GPT-4.5, Gemini 3 Pro, Claude Opus 3.7, Qwen-2, DeepSeek V4 Pro 등)을 PKB로 평가한 결과, 다음과 같은 사실이 드러났습니다.

*   **단일 시도(Single-shot) 성능 저조**: 가장 뛰어난 모델조차도 단 한 번의 시도로는 전체 87개 문제 중 일부만 해결했습니다.
*   **성능 문제**: 생성된 커널이 문법적으로 옳더라도, 성능이 매우 느린 경우가 많았습니다. `fast@p` (레퍼런스보다 p배 빠른 정답 커널의 비율) 지표를 보면, 약간의 속도 향상(e.g., 1.5배)만 요구해도 정답률이 급격히 떨어졌습니다.
*   **실패 원인 분석**: 실패의 주된 원인은 단순한 문법 오류나 텐서 형태 오류보다는, 교착 상태(Deadlock)나 잘못된 결과(Output mismatch) 같은 병렬 프로그래밍의 근본적인 논리 오류였습니다. 이는 LLM이 멀티 GPU 환경의 복잡한 트레이드오프를 제대로 이해하지 못함을 시사합니다.
*   **에이전틱 루프(Agentic Loops)의 한계**: Claude Code와 유사한 에이전트 루프를 통해 LLM이 스스로 컴파일 오류를 수정하게 하자, 문법적 정확성은 향상되었습니다. 하지만 이는 알고리즘적 혁신으로 이어지지 않았습니다. 즉, 에이전트는 비효율적인 기존 접근 방식을 고수할 뿐, 더 나은 병렬화 전략(e.g., Intra-SM 오버랩)을 스스로 발견하지 못했습니다.

### 결론 및 향후 과제
*   **교훈**:
    1.  소수의 간단한 트레이드오프(전송 메커니즘, 오버랩 스케줄, 추상화 수준)가 멀티 GPU 커널 성능을 좌우합니다.
    2.  현재 LLM은 이러한 트레이드오프를 깊이 이해하거나, 주어진 문맥에서 추론하는 능력이 부족합니다.
*   **향후 과제**:
    1.  PKB를 해결함으로써 실제 프로덕션에 유용한 새로운 커널을 얻을 수 있습니다. (예: NeMo vocab-parallel log-prob 커널, Hyena context parallelism 커널 등에서 상당한 속도 향상을 달성)
    2.  네트워킹 스택이 진화함에 따라(더 큰 스케일업, 분산 추론, 이기종 하드웨어) AI 아키텍처가 어떻게 변해야 하는지 연구해야 합니다.
    3.  노드 간 통신 및 멀티-실리콘 통신으로 연구를 확장해야 합니다.

발표자는 마지막으로 Together AI의 프론티어 성능 연구팀에서 채용을 진행 중이라고 알리며 발표를 마칩니다.

## 구체 수치·데모·아키텍처

*   **하드웨어 발전 비교 (A100 vs B200)**: BF16 텐서 코어 7.2배, HBM 5.1배, Intra-node(NVLink) 3배, Inter-node(PCIe/InfiniBand) 2배 성능 향상.
*   **메모리 계층 구조 (Memory Hierarchy Pyramid)**:
    *   레지스터 (Register): 64 KB, 130 TB/s
    *   공유 메모리 (Shared): 227 KB, 33 TB/s
    *   L2 캐시: 50 MB, 12 TB/s
    *   HBM: 80 GB, 3 TB/s
    *   피어 글로벌 메모리 (Peer Global Memory, NVLink/NVSwitch): 80xN GB, 0.45 TB/s
*   **네트워킹 토폴로지**:
    *   TPU: 3D Torus
    *   NVIDIA: NVLink/NVSwitch (Switched any-to-any)
    *   AMD: XGMI (point-to-point)
*   **PKB (ParallelKernelBench) 결과 (Single-shot)**:
    *   **GPT-5.5**: Pass@1 18/87, fast@1 10/87
    *   **Gemini 3 Pro**: Pass@1 10/87, fast@1 7/87
    *   **Claude Opus 3.7**: Pass@1 7/87, fast@1 3/87
    *   **Qwen-2**: Pass@1 12/87, fast@1 5/87
    *   **DeepSeek V4 Pro**: Pass@1 28/87, fast@1 22/87
*   **에이전틱 루프 결과 (Gemini 3 Pro)**:
    *   정답 문제 수: 24/87 -> 35/87로 증가
    *   성능 향상 문제 수: 26/87 (1배 이상 속도 향상)
*   **PKB로 생성된 신규 커널 성능 향상**:
    *   **NeMo vocab-parallel log-prob**: 최대 1.25배 속도 향상
    *   **Hyena forward context parallelism**: 최대 3.03배 속도 향상
    *   **SAM3 IoU suppression**: 최대 1.50배 속도 향상
*   **도구 및 라이브러리**: FlashAttention, Mamba, DeepSeek, Triton, Mojo, TileLang, NCCL, RCCL, CUTLASS, ParallelKittens, ParallelKernelBench, PyTorch, Megatron-LM, FlexFlow, NanoFlow, DeepSpeed.
*   **GitHub 리포지토리**: `https://github.com/HazyResearch/ThunderKittens`

## 핵심 인용
*   "A few years ago, GPU utilization used to be limited by poor intra-GPU memory access and single-GPU kernels. [...] We've sort of shifted the bottleneck to multi-GPU communication." (몇 년 전만 해도 GPU 활용도는 GPU 내부 메모리 접근과 단일 GPU 커널에 의해 제한되었습니다. [...] 이제 병목은 멀티 GPU 통신으로 옮겨갔습니다.)
*   "Networking is the remaining bottleneck." (네트워킹이 남아있는 병목입니다.)
*   "Agentic loops help correct syntax and shape errors, but does not help the model innovate algorithmically." (에이전틱 루프는 문법이나 형태 오류를 수정하는 데는 도움이 되지만, 모델이 알고리즘적으로 혁신하는 데는 도움이 되지 않습니다.)

## 한 줄 결론
멀티 GPU 커널 성능은 소수의 근본적인 트레이드오프에 의해 결정되지만, 현재의 LLM은 이를 제대로 이해하고 최적화하는 데 어려움을 겪고 있어, 인간의 전문성과 새로운 벤치마크를 통한 발전이 여전히 중요합니다.
