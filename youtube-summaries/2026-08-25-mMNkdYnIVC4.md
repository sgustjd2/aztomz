---
title: "Einstein Arena: Harnessing Collective Agent Intelligence for Open Science — James Zou, Together AI"
videoId: mMNkdYnIVC4
url: https://www.youtube.com/watch?v=mMNkdYnIVC4
channel: "AI Engineer"
publishedAt: 2026-08-25
summarizedAt: 2026-08-25
model: gemini-2.5-flash
---

# Einstein Arena: Harnessing Collective Agent Intelligence for Open Science — James Zou, Together AI

🔗 https://youtu.be/mMNkdYnIVC4 · 📅 2026-08-25 · 🎙 AI Engineer

## 한 줄 요약
AI 에이전트의 잠재력을 최대한 발휘하기 위해, 에이전트의 행동이 자연스럽게 발현되도록 유인책, 정보, 제약 조건을 포함하는 환경을 설계하는 것이 기존의 엄격한 워크플로우 설계보다 효과적임을 EinsteinArena와 DSGym 사례를 통해 보여줍니다.

## 발표자·소속
James Zou, Together AI 및 Stanford University

## 핵심 주장
- 기존의 AI 에이전트 워크플로우 설계는 에이전트의 창의성과 능력을 제한하므로, 에이전트의 행동이 자연스럽게 발현될 수 있도록 인센티브, 정보, 제약 조건을 갖춘 환경을 설계하는 패러다임으로 전환해야 합니다.
- EinsteinArena는 AI 에이전트가 공개된 과학 문제를 해결하기 위해 협력하고 경쟁하는 환경을 제공하며, 이를 통해 인간 연구자도 달성하지 못한 새로운 과학적 발견을 이끌어냈습니다.
- 에이전트에게 특정 역할을 부여하고 협업 및 경쟁을 유도하는 환경은 기계 학습 커널의 성능을 획기적으로 개선하는 데 기여할 수 있습니다.
- DSGym은 데이터 과학 에이전트를 평가하고 훈련하기 위한 통합적이고 재현 가능한 환경으로, 기존 벤치마크의 '지름길' 문제를 해결하고 실제 연구 과제에 필요한 도메인 지식을 강조합니다.

## 세부 내용
발표자는 AI 에이전트의 잠재력을 최대한 활용하기 위한 새로운 접근 방식인 '환경 설계'를 강조했습니다. 기존에는 에이전트가 수행할 작업을 엄격한 워크플로우(입력-단계-출력)로 지시했지만, 이는 에이전트의 창의성과 적응력을 제한합니다. 대신, 에이전트가 스스로 인지하고 추론하며 행동할 수 있는 환경(정보, 인센티브, 제약 조건 포함)을 설계함으로써 행동이 자연스럽게 발현되도록 해야 한다고 주장했습니다.

첫 번째 사례로, AI 에이전트가 공개된 과학 문제에 대해 협력하고 경쟁하는 환경인 **EinsteinArena**를 소개했습니다. 이 플랫폼은 에이전트 친화적으로 설계되어 에이전트가 쉽게 접근하고, 과학적으로 흥미로운 문제 목록을 제공하며, 각 문제에 대한 솔루션의 품질을 평가하는 결정론적 검증기가 있습니다. 에이전트들은 토론 포럼에서 서로 소통하고, 리더보드를 통해 다른 에이전트의 솔루션을 확인하며 경쟁하고 협력합니다. EinsteinArena는 2023년 3월 출시 후 몇 주 만에, 에이전트들이 '키싱 넘버 문제(Kissing Number Problem)'와 같은 11개의 공개 문제에 대해 기존 인간 솔루션이나 특수 AI 도구보다 더 나은 새로운 최적의 솔루션을 발견하는 데 성공했습니다. 특히 11차원 키싱 넘버 문제의 경우, 40년간 582개로 정체되어 있던 최적의 구 배치 개수를 2022년 인간 수학자가 592개로, 2023년 DeepMind가 593개로 개선한 데 이어, EinsteinArena의 에이전트들이 며칠 만에 604개라는 새로운 기록을 세웠습니다. 이러한 성과는 단일 에이전트가 아닌 여러 에이전트 간의 협업을 통해 이루어졌으며, 에이전트들이 서로의 솔루션을 개선하고 최적화하는 과정이 리니지 트리로 시각화되었습니다.

두 번째 사례는 기계 학습 및 AI 자체를 개선하기 위해 EinsteinArena와 유사한 플랫폼을 활용하는 것입니다. 에이전트들은 GPU 커널의 성능을 높이기 위해 협력하고 경쟁합니다. 에이전트들은 커널을 제출하고, 컴파일 및 벤치마킹을 거쳐 정확성과 속도에 대한 점수를 실시간으로 받습니다. 이 환경에서는 '점유율/프로파일러', '메모리 전문가', '타일링/스케줄링', '텐서 코어/정밀도', '정확성/수치', '문서/연구' 등 다양한 페르소나를 가진 에이전트들이 협력하여 커널을 최적화합니다. 그 결과, 페이지드 어텐션(Paged attention)에서 2.30배, MatMul에서 1.05배, GEMM(FP8)에서 1.96배 등 상당한 속도 향상을 달성했으며, 이 개선된 커널들은 이미 Together AI의 프로덕션에 사용되고 있습니다.

세 번째 사례는 데이터 과학 에이전트를 위한 통합적이고 재현 가능한 환경인 **DSGym(Data Science Gym)**입니다. DSGym은 데이터 준비, 가설 생성, 보고서 생성 등 데이터 중심 조사를 위한 환경을 제공하며, 생물학, 지리학, 의학, 금융 등 10개 이상의 과학 도메인과 10개 이상의 파일 형식을 아우르는 1,000개 이상의 태스크를 포함합니다. 기존 데이터 과학 벤치마크의 큰 문제점은 '지름길(shortcuts)'이 많아 에이전트가 실제 데이터를 사용하지 않고도 태스크를 해결할 수 있다는 점이었습니다. DSGym은 이러한 지름길을 제거하기 위해 피어 리뷰된 과학 논문과 Kaggle 대회에서 데이터를 선별하고, 인간 전문가의 검토를 거쳐 태스크를 신중하게 큐레이션했습니다. DSGym의 태스크는 최신 프론티어 모델조차 50% 미만의 정확도를 보이는 등 여전히 도전적입니다. 또한 DSGym은 '훈련 데이터 팩토리' 역할도 수행하여, 에이전트가 생성한 2,000개의 실행 검증된 궤적(execution-verified trajectories)으로 4B(40억) 매개변수 오픈소스 모델을 미세 조정하여 동급 최고의 성능을 달성했습니다.

결론적으로, AI 시스템 구축은 모델 설계(Era 1)에서 에이전트 설계(Era 2)를 거쳐 이제는 에이전트의 행동을 유도하는 환경을 설계(Era 3)하는 방향으로 나아가고 있으며, 이러한 환경 설계가 에이전트의 창의성과 집단 지능을 극대화하는 열쇠라고 발표자는 강조했습니다.

## 인상적인 대목
- "Move from rigid workflows that control agents -> To environments where behavior emerges." (에이전트를 제어하는 엄격한 워크플로우에서 행동이 발현되는 환경으로 이동)
- "As agents become more powerful, rigid workflows often limit the capabilities and creativity of the agent. Whereas if we properly design the environment, this can enable a lot more creativity and capabilities and intelligence for the agents to naturally emerge." (에이전트가 강력해질수록, 엄격한 워크플로우는 에이전트의 능력과 창의성을 제한합니다. 반면 환경을 제대로 설계하면 에이전트의 창의성, 능력, 지능이 훨씬 더 자연스럽게 발현될 수 있습니다.)
- "It's actually designed so that it's intentionally very hard for humans to enter the arena... but any agent in the world can openly and freely participate on the arena." (인간이 아레나에 들어오기 매우 어렵게 의도적으로 설계되었지만... 세상의 어떤 에이전트든 아레나에 공개적으로 자유롭게 참여할 수 있습니다.)
- "Agents discovered 11 new best solutions to open problems." (에이전트들이 공개된 문제에 대한 11개의 새로운 최적 솔루션을 발견했습니다.)
- "Not coding skill — scientific grounding drives failures on real research tasks." (코딩 기술이 아니라 — 과학적 근거가 실제 연구 과제에서의 실패를 좌우합니다.)

## 실무 적용 포인트
- **에이전트 시스템 설계 시 워크플로우 대신 환경 설계 관점 채택:** 에이전트의 행동을 세세하게 지시하기보다, 에이전트가 목표 달성을 위해 스스로 탐색하고 학습할 수 있는 인센티브, 정보, 제약 조건을 갖춘 환경을 구축하는 데 집중합니다.
- **AI 에이전트 간 협업 및 경쟁 플랫폼 구축:** EinsteinArena처럼 에이전트들이 서로의 솔루션을 공유하고 개선하며 경쟁할 수 있는 플랫폼을 만들어 집단 지능을 활용하고 새로운 발견을 가속화합니다.
- **특정 역할(페르소나)을 가진 에이전트 활용:** 커널 최적화 사례처럼, 특정 전문 분야에 특화된 페르소나를 가진 에이전트들을 협력시켜 복잡한 문제 해결의 효율성을 높입니다.
- **'지름길' 없는 고품질 벤치마크 환경 구축:** DSGym처럼 실제 데이터를 사용하지 않고는 해결할 수 없는, 과학적으로 의미 있는 태스크들로 구성된 벤치마크를 큐레이션하여 에이전트의 진정한 능력을 평가하고 훈련합니다.
