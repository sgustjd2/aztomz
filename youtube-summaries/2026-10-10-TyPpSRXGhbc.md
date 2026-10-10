---
title: "Small Models, Big Results: Training a Finance Agent for Under $500 — Charles Dickens, Snorkel AI"
videoId: TyPpSRXGhbc
url: https://www.youtube.com/watch?v=TyPpSRXGhbc
channel: "AI Engineer"
publishedAt: 2026-10-10
summarizedAt: 2026-10-10
model: gemini-2.5-flash
---

# Small Models, Big Results: Training a Finance Agent for Under $500 — Charles Dickens, Snorkel AI

🔗 https://youtu.be/TyPpSRXGhbc · 📅 2026-10-10 · 🎙 AI Engineer

## 한 줄 요약
Snorkel AI는 UC 버클리 스카이 컴퓨팅 랩과 협력하여 고품질의 전문화된 금융 데이터와 강화 학습(RL)을 활용해 40억(4B) 파라미터 모델이 2350억(235B) 파라미터 모델보다 금융 질의응답(QA) 작업에서 더 뛰어난 성능을 발휘하도록 훈련시켰습니다.

## 발표자·소속
Charles Dickens, Research Scientist, Snorkel AI

## 핵심 주장
*   **작은 모델의 성능 우위:** 전문화된 고품질 데이터와 훈련 방법론을 통해 40억 파라미터 모델이 2350억 파라미터 모델을 금융 질의응답(QA) 작업에서 능가할 수 있음을 입증했습니다.
*   **신뢰성과 전문화의 중요성:** 엔터프라이즈 AI 워크로드, 특히 금융과 같은 고위험 도메인에서는 모델의 파라미터 규모보다 신뢰성과 특정 도메인에 대한 전문화가 더 중요합니다.
*   **데이터 중심 AI 접근 방식:** SEC 10-K 보고서에서 추출한 데이터를 전문가 검증을 거쳐 FinQA 데이터셋을 구축하고, 이를 통해 모델의 성능을 향상시키는 데이터 중심 AI의 중요성을 강조합니다.
*   **효율적인 훈련 비용:** 8개의 H100 GPU를 사용하여 약 21시간 동안 모델을 훈련하는 데 500달러 미만의 비용이 들었으며, 이는 대규모 모델 대비 훨씬 효율적인 배포 경제성을 제공합니다.
*   **단순한 보상 설계의 효과:** 복잡한 부분 보상(partial reward) 방식보다 단순한 이진 보상(binary reward) 방식이 모델 학습에 더 효과적일 수 있음을 실험을 통해 보여주었습니다.

## 세부 내용

발표는 Snorkel AI의 소개와 함께, 40억 파라미터 모델이 2350억 파라미터 모델을 능가하는 놀라운 성과를 발표하며 시작되었습니다. 발표자는 이러한 결과가 "신뢰성과 전문화"가 "원시 파라미터 규모"보다 중요하며, 고품질 데이터가 핵심임을 보여준다고 강조했습니다.

Snorkel AI는 스탠포드, 워싱턴, 위스콘신 대학의 연구실 출신 창립자들과 재능 있는 연구원들로 구성된 프론티어 AI 데이터 랩입니다. 이들은 오픈 리서치 및 벤치마크, 프론티어 랩 데이터/환경, 엔터프라이즈 배포 세 가지 방식으로 AI 발전에 기여하고 있습니다. 오늘 발표하는 프로젝트는 오픈 리서치 및 벤치마크 분야에 해당하며, UC 버클리 스카이 컴퓨팅 랩과의 협력을 통해 이루어졌습니다. 이 프로젝트의 모든 자산(GitHub, Hugging Face 모델 및 데이터셋)은 오픈 소스로 공개되어 있습니다.

금융 기관이 AI에 기대하는 것은 단순히 "추론 능력"이 아니라, 복잡한 레거시 시스템과 API가 있는 기존 스택에서 안정적으로 작동하고, 20단계 이상의 워크플로우에서 오류 없이 신뢰할 수 있으며, 규제 준수 담당자가 모든 단계를 감사하고 방어할 수 있는 AI입니다. 발표자는 이를 "대규모 범용 모델 대 소규모 전문 모델의 이야기"로 비유하며, 전문화된 워크플로우에는 범용적인 지능보다는 해당 분야의 전문가가 필요하다고 주장했습니다.

이러한 필요성을 충족하기 위해 Snorkel AI는 FinQA(Expert Validated Financial QA Data)를 구축했습니다. FinQA 데이터셋 구축은 세 단계로 진행됩니다.
1.  **스키마 및 데이터 추출 (Stage 1: Schema and Data Extraction):** Qwen3-30B-A3B 모델을 사용하여 SEC EDGAR 시스템에서 약 6,900개의 SEC 10-K 보고서(연간 보고서)를 파싱하여 SQL 테이블과 스키마를 생성했습니다.
2.  **QA 생성 (Stage 2: QA Generation):** 각 SQL 테이블과 함께 금융 전문가와 함께 개발한 "질문 유형 분류 체계(Question Type Taxonomy)"를 Qwen3-30B-A3B에 입력하여 질의응답(QA) 쌍과 메타데이터를 생성했습니다. 이 분류 체계에는 "재무 비율 - 구성", "전년 대비 성장률", "순변동", "CAGR" 등이 포함됩니다.
3.  **검증 (Stage 3: Verification):**
    *   **계산 일관성 검사 (Layer 1: Programmatic Consistency Checks):** 각 QA 쌍과 메타데이터가 기존 테이블, 열, 데이터 항목을 올바르게 참조하는지 확인합니다.
    *   **자동화된 검토 (Layer 2: Automated Review):** Qwen3-30B-A3B를 이용한 두 번의 독립적인 검토를 통해 데이터 값, 계산, 답변 및 전반적인 품질을 검증합니다.
    *   **전문가 검토 (Layer 3: Expert Review):** 금융 전문가들이 모든 작업을 수동으로 검증하고 필요한 경우 수정합니다.

FinQA 데이터는 계획, 도구 호출, 추론이 필요한 현실적인 질의로 구성되며, 질문은 단일 테이블에 의존합니다. 답변은 단일하고 검증 가능한 최종 답변입니다. FinQA 환경은 `get_table_names`, `get_table_info`, `sql_query`, `calculator`와 같은 전문화된 도구를 갖춘 금융 에이전트 질의응답 환경입니다. 데이터셋은 훈련 4,030개, 검증 522개, 벤치마크 290개로 구성되어 있으며, 벤치마크 데이터는 훈련 데이터와 회사 중복이 없도록 분리되었습니다.

발표자는 대규모 모델에서 발견된 "훈련 격차(Discipline Gap)"를 지적했습니다.
*   **스키마 환각 (Schema Hallucination):** Qwen3-235B 모델이 실제 존재하지 않는 테이블 이름이나 스키마를 추측하는 경향을 보였습니다.
*   **컨텍스트 플러딩 (Context Flooding):** `SELECT *`와 같은 비효율적인 쿼리를 실행하여 컨텍스트 한계를 초과하는 문제가 발생했습니다.
*   **오류 복구 불가 (No Error Recovery):** 오류 메시지를 읽고 적응하는 대신 동일한 실패 전략을 반복했습니다.
이러한 실패 모드는 보험 인수와 같은 다른 엔터프라이즈 환경에서도 유사하게 관찰되었습니다.

Snorkel AI는 rLLM(A Framework for Post-Training Language Agents)을 사용하여 FinQA-4B 모델을 훈련했습니다. rLLM은 어떤 에이전트 프레임워크와도 작동하며, 최소한의 코드 변경으로 강화 학습(RL) 훈련을 가능하게 합니다. 훈련 환경은 ReAct 루프를 사용하는 에이전트와 약 7,000개의 SQL 테이블이 인메모리 SQLite 데이터베이스에 저장된 환경으로 구성됩니다. 보상은 GPT-5-nano를 저지로 사용하는 이진 정확도(binary correctness)였습니다.

훈련 세부 사항은 다음과 같습니다.
*   **기반 모델:** Qwen3-4B-Instruct-2507
*   **최적화 및 보상:** GRPO, 이진 보상 (1:정확, 0:부정확)
*   **프레임워크 및 환경:** rLLM 프레임워크, Snorkel FinQA 환경
*   **훈련:** 1024개의 동시 환경 (256개 프롬프트 x 3개 롤아웃 = 단계당 2,048개 궤적). LLM 저지(GPT-5-nano)가 정확성을 평가.
*   **컴퓨팅:** 8xH100, 약 21시간.
*   **비용:** 500달러 미만 (컴퓨팅 약 420달러, 저지 API 약 40달러).

결과적으로, rLLM-FinQA-4B 모델은 FinQA Pass@1 벤치마크에서 59.7%의 정확도를 달성하여 Qwen3-235B-A22B의 51.4%를 능가했습니다. 이는 기본 모델의 정확도를 두 배 이상 높인 결과이며, 훨씬 작은 규모에도 불구하고 대규모 모델을 능가하는 성능을 보여주었습니다.

FinQA-Reasoning 데이터셋을 통해 도메인 일반화 능력도 평가했습니다. 이 데이터셋은 2~5개의 테이블에 의존하며, 10~20개의 메트릭 계산이 필요한 더 복잡한 질의로 구성됩니다. rLLM-FinQA-4B는 FinQA-Reasoning 벤치마크에서 26.6%의 정확도를 기록하여 Qwen3-235B-A22B의 18.9%를 다시 한번 능가했습니다. 이는 단일 테이블 질의로만 훈련되었음에도 불구하고 멀티 테이블 질의에서 성능 향상을 보인 것입니다.

어블레이션 연구(Ablation Studies)를 통해 "단순한 데이터가 복잡한 기술을 가르친다"는 것을 발견했습니다. FinQA 데이터만으로 훈련했을 때 가장 높은 성능(86.6%)을 보였고, FinQA와 FinReasoning 데이터를 혼합하거나 커리큘럼 방식으로 훈련했을 때는 오히려 성능이 약간 하락했습니다(84.8%). 이는 병목 현상이 추론 깊이가 아니라 도구 사용 신뢰성(스키마 발견, SQL 구문, 오류 복구)에 있었으며, 모델이 이러한 기본기를 숙달하자 복잡한 기술을 스스로 구성할 수 있었음을 시사합니다.

또한, "이진 보상이 부분 보상보다 우수하다"는 어블레이션 연구 결과도 발표했습니다. 데이터 검색, 계산된 메트릭, 추론, 일관성, 완전성, 구조 등 여러 요소를 고려한 복잡한 루브릭 기반 보상이나 부분 보상보다, 단순히 최종 답변의 정확성만을 평가하는 이진 보상이 더 나은 성능을 가져왔습니다.

이러한 연구를 바탕으로 Snorkel AI는 엔터프라이즈 에이전트를 위한 청사진을 제시합니다.
*   **규모 대비 효율성:** 목표는 시를 쓰고 IMO 문제를 해결하는 모델이 아니라, 신뢰할 수 있는 전문가를 구축하는 것입니다.
*   **배포 경제성:** 40억 파라미터 모델은 단일 GPU에서 실행될 수 있어, 2350억 파라미터 모델이 요구하는 다중 노드 클러스터보다 낮은 비용으로 더 강력한 정확도를 제공합니다.
*   **반복 가능성:** 이 접근 방식은 헬스케어, 법률, 보험 등 다른 전문화된 작업 및 도메인에도 일반화될 수 있습니다.

에이전트 평가를 위한 Snorkel AI의 관점은 "환경 복잡성", "자율성 지평", "출력 복잡성"의 세 가지 축으로 구성됩니다. 이 세 가지 축을 따라 에이전트의 성능을 평가하고 개선하는 것이 중요하다고 강조했습니다.

마지막으로, Snorkel AI는 오픈 벤치마크 그랜트(Open Benchmarks Grants) 프로그램을 통해 300만 달러 이상의 자금을 지원하며, Hugging Face, Plume, together.ai, Factory, hazbor, PyTorch 등과 협력하여 오픈 벤치마크를 개발하고 있다고 밝혔습니다. 또한, 전문 서비스 및 연구 분야에서 다양한 직책으로 채용 중임을 알리며 발표를 마쳤습니다.

## 인상적인 대목
*   "The problem isn't intelligence and capacity to reason—it's reliability and specialization." (문제는 지능과 추론 능력이 아니라 신뢰성과 전문화입니다.)
*   "For a high-stakes tax audit, you do not call Terence Tao. You call the person who knows the forms, the tools, and the rules." (고위험 세무 감사에는 테렌스 타오를 부르지 않습니다. 양식, 도구, 규칙을 아는 사람을 부릅니다.)
*   "rLLM-FinQA-4B more than doubles the base model's accuracy and again outperforms Qwen3-235B-A22B despite being a fraction of the size!" (rLLM-FinQA-4B는 기본 모델의 정확도를 두 배 이상 높였고, 크기가 훨씬 작음에도 불구하고 Qwen3-235B-A22B를 다시 한번 능가했습니다!)
*   "The bottleneck was simply tool-use reliability. Once the model mastered schema discovery, SQL syntax, and error recovery it could compose those skills!" (병목 현상은 단순히 도구 사용 신뢰성이었습니다. 모델이 스키마 발견, SQL 구문, 오류 복구를 숙달하자 이러한 기술들을 조합할 수 있었습니다!)
*   "Despite an investment in reward design, partial reward variants underperformed the simplest possible reward: a single binary signal!" (보상 설계에 투자했음에도 불구하고, 부분 보상 변형은 가장 단순한 보상인 단일 이진 신호보다 성능이 떨어졌습니다!)

## 실무 적용 포인트
*   **도메인 특화 데이터셋 구축:** 일반적인 대규모 모델에 의존하기보다, 특정 도메인(예: 금융, 법률, 헬스케어)에 특화된 고품질의 전문가 검증 데이터셋을 구축하는 것이 작은 모델의 성능을 극대화하는 데 필수적입니다.
*   **강화 학습(RL) 활용:** rLLM과 같은 프레임워크를 활용하여 에이전트의 도구 사용 능력과 추론 과정을 강화 학습으로 훈련함으로써, 복잡한 다단계 작업을 안정적으로 수행할 수 있는 에이전트를 개발할 수 있습니다.
*   **단순한 보상 설계:** 복잡한 보상 함수를 설계하는 데 많은 노력을 들이기보다, 최종 목표 달성 여부를 명확히 하는 단순한 이진 보상 신호가 모델의 학습 효율성을 높일 수 있음을 고려해야 합니다.
*   **비용 효율적인 모델 배포:** 40억 파라미터 모델이 단일 GPU에서 대규모 모델보다 우수한 성능을 낼 수 있다는 점은, 실제 엔터프라이즈 환경에서 AI 솔루션을 배포할 때 컴퓨팅 비용을 크게 절감하고 접근성을 높일 수 있는 중요한 시사점을 제공합니다.
