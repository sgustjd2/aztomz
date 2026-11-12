---
title: "Stop Shipping LLM Settings That Only Win on Paper - Rohan Pandey & Balaji Varadarajan, DigitalOcean"
videoId: cWrYEBlWpcY
url: https://www.youtube.com/watch?v=cWrYEBlWpcY
channel: "AI Engineer"
publishedAt: 2026-11-12
summarizedAt: 2026-11-12
model: gemini-2.5-flash
---

# Stop Shipping LLM Settings That Only Win on Paper - Rohan Pandey & Balaji Varadarajan, DigitalOcean

🔗 https://youtu.be/cWrYEBlWpcY · 📅 2026-11-12 · 🎙 AI Engineer

## 한 줄 요약
LLM 서빙 설정을 최적화하는 에이전트가 Bayesian Optimization과 Optuna 도구를 활용하여 수동 튜닝 시간을 단축하고, GPT-J 6B 모델에서 가중 처리량 17.5% 개선, DeepSeek R1 Distill 모델에서 처리량 100% 개선 및 P99 ITL 51% 감소를 달성했습니다.

## 발표자·소속
Rohan Pandey, DigitalOcean (영상에서 소속은 DigitalOcean으로 언급되었으나, 화면에는 이름만 표시됨)

## 핵심 주장
- **수동 LLM 서빙 설정 최적화 시간 단축**: 에이전트는 Bayesian Optimization을 사용하여 vLLM 서빙 설정의 최적 파라미터를 자동으로 찾아, 수동으로 최적 레시피를 찾는 데 드는 상당한 시간을 절약합니다.
- **Optuna를 통한 효율적인 탐색**: Optuna 도구는 Bayesian Optimization 전략을 활용하여 검색 공간을 최소화하고, 여러 시행(trial)을 통해 레시피를 반복적으로 개선하여 최적화된 구성을 빠르게 도출합니다.
- **성능 지표의 유의미한 개선**: GPT-J 6B 모델의 경우 가중 처리량(weighted throughput)이 17.5% 향상되었으며, DeepSeek R1 Distill 모델에서는 토큰 처리량이 100% 증가하고 P99 ITL(Initial Token Latency)이 51% 감소하는 등 주요 성능 지표에서 큰 개선을 보였습니다.
- **자동화된 보고서 및 최적화된 YAML 파일 제공**: 에이전트 실행 후에는 각 시행의 성능을 상세히 보여주는 HTML 보고서와 최적화된 파라미터가 적용된 YAML 설정 파일이 자동으로 생성되어, 사용자가 결과를 쉽게 확인하고 적용할 수 있습니다.

## 세부 내용
발표자는 Rohan Pandey이며, 최근 개발된 "최적화 에이전트"에 대한 데모를 진행했습니다. 이 에이전트의 목표는 어떤 모델이든 최적의 vLLM 서빙 설정을 찾아 수동으로 최적 레시피를 찾는 데 드는 시간을 줄이는 것입니다. 에이전트는 Bayesian Optimization (BO)이라는 전략을 사용하며, 이는 주어진 상황에서 최적의 숫자를 찾는 데 사용되는 수학적 기법입니다. BO는 검색 공간을 최소화하여 최적화된 파라미터를 찾는 데 필요한 시간을 단축합니다.

이 전략을 구현하기 위해 Optuna라는 도구가 사용됩니다. Optuna는 BO를 활용하여 검색 루프 내에서 작동합니다. 현재 레시피를 입력받아 BO를 실행하고, 각 시행(trial) 후 레시피를 평가하여 점수를 매깁니다. 이 점수를 바탕으로 레시피를 개선하고, 최적의 레시피를 찾을 때까지 이 과정을 반복합니다.

데모에서는 Ubuntu 드롭렛에서 GPT-J 6B 모델을 사용하여 에이전트를 실행하는 과정을 보여주었습니다. 초기 설정은 YAML 파일로 제공되며, 여기에는 `chat_short`, `chat_long`, `rag`, `batch_classify`의 네 가지 레짐이 포함되어 있습니다. 각 레짐은 고유한 ISL(Input Sequence Length) 및 OSL(Output Sequence Length) 토큰 값을 가집니다.

에이전트를 실행하기 위해 `tuner.py` 스크립트를 사용하며, 다음 인자들을 전달합니다:
- `--study-name`: 연구 이름 (예: `study_pred_1x2`)
- `--recipe`: 초기 YAML 파일 경로 (예: `/home/ubuntu/vllm-optimization/recipes/gpt-j-6b-pred-1x2.yaml`)
- `--hardware`: 하드웨어 유형 (예: `a100-80gb`)
- `--trials`: 실행할 시행 횟수 (예: `24`)

이러한 명령은 일반적으로 몇 시간이 소요됩니다. GPT-J 6B 모델의 경우 약 4~5시간이 걸렸다고 언급했습니다.

에이전트 실행 후에는 HTML 보고서가 생성됩니다. GPT-J 6B 모델에 대한 "Component A - Configuration Optimizer" 보고서에서는 50번의 시행 중 47번째 시행이 최적의 결과였음을 보여줍니다. 최적화된 서빙 설정(deployable)에는 `max_num_seqs` (256), `max_num_batched_tokens` (2880), `max_paged_kv_cache_len` (16384), `gpu_memory_utilization` (0.9), `kv_cache_dtype` (fp8), `swap_space` (16), `profile_locking` (True), `enable_prefix_caching` (True), `max_model_len` (1024), `tensor_parallel` (1), `max_model_len_ratio` (1.0) 등의 파라미터가 포함됩니다. 이 최적화된 설정을 통해 기준선 대비 가중 처리량(weighted throughput)이 17.5% 개선되었습니다.

DeepSeek R1 Distill 모델에 대한 다른 HTML 보고서("vLLM tuning report - study pred_1x2")도 보여주었습니다. 이 모델은 9번의 시행 중 9번째 시행이 최적이었으며, P99 ITL(Initial Token Latency)이 76ms로 기준선 156ms 대비 51% 개선되었고, P99 FTL(Full Token Latency)도 37ms로 기준선 76ms 대비 51% 개선되었습니다. 처리량은 2.6k로 기준선 1.3k 대비 100% 증가했습니다.

결론적으로, 에이전트는 각 시행의 결과와 최적화된 레시피를 담은 HTML 보고서 및 YAML 파일을 제공하여 LLM 서빙 성능을 효과적으로 개선합니다.

## 인상적인 대목
- "Bayesian Optimization은 검색 공간을 최소화하여 최적화된 숫자를 찾는 데 걸리는 시간을 크게 줄입니다."
- "Optuna는 Bayesian Optimization을 사용하여 검색 루프에서 이 전략을 활용합니다."
- "전반적으로, 첫 번째 구성(config) 대비 토큰 처리량 측면에서 17.5%의 개선을 발견했습니다." (GPT-J 6B 모델)
- "토큰 처리량이 두 배가 되었고, ITL(Initial Token Latency)은 거의 절반으로 개선되었습니다." (DeepSeek R1 Distill 모델)

## 실무 적용 포인트
- **Bayesian Optimization 및 Optuna 활용**: LLM 서빙 설정과 같이 복잡한 하이퍼파라미터 튜닝 문제에 Bayesian Optimization과 Optuna 같은 도구를 적극적으로 도입하여 수동 튜닝에 드는 시간과 노력을 절감할 수 있습니다.
- **초기 YAML 설정 파일 준비**: 에이전트가 최적화를 시작할 수 있도록 모델 가중치와 함께 제공되는 기본 YAML 설정 파일을 준비하는 것이 중요합니다. 이 파일은 최적화의 시작점이 됩니다.
- **하드웨어 및 시행 횟수 명시**: `tuner.py` 스크립트를 실행할 때, 사용 중인 하드웨어(예: `a100-80gb`)와 원하는 시행 횟수(`--trials`)를 명확히 지정하여 특정 환경에 맞는 최적화를 수행해야 합니다.
- **자동 생성된 보고서 및 YAML 파일 활용**: 에이전트가 생성하는 HTML 보고서를 통해 각 시행의 성능 변화를 시각적으로 확인하고, 최종적으로 최적화된 YAML 설정 파일을 실제 배포 환경에 적용하여 성능을 개선할 수 있습니다.
