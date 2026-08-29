# AI-Native Organisations Run on Skills: How to Structure and Scale Them — Imad Touil, QuantumBlack

🔗 https://www.youtube.com/watch?v=M05vON8i0aI

## 개요
이마드 투일(Imad Touil), 퀀텀블랙(QuantumBlack) 소속의 발표자가 AI 네이티브 조직이 '스킬(Skills)'을 기반으로 운영되는 이유와, 이 스킬을 조직 전체에서 효과적으로 구조화하고 확장하는 방법에 대해 설명합니다.

## 발표 흐름
### 도입: '스킬' 사용 현황 파악
발표자는 청중에게 간단한 거수 투표를 요청하며 발표를 시작합니다.
1.  **개인적 사용:** "스킬을 직접 만들고 사용해 본 적이 있는 분?" (대부분 손을 듦)
2.  **팀 내 공유:** "팀 내에서 스킬을 공유하고 사용하는 분?" (수가 줄어듦)
3.  **조직 전체 거버넌스:** "조직 전체에 걸쳐 스킬을 관리(governed), 유지보수(maintained)하고 있는 분?" (소수만 손을 듦)

이 투표를 통해, 스킬의 개념은 널리 퍼졌지만 조직적 차원의 체계적인 활용과 거버넌스는 아직 초기 단계임을 보여줍니다. 발표의 목적은 바로 이 조직적 차원의 스킬 활용법, 즉 왜 중요하고 어떻게 도입할 수 있는지를 설명하는 것입니다.

### 에이전틱 소프트웨어 스택의 두 가지 루프
AI 에이전트가 작동하는 소프트웨어 스택은 두 개의 루프(loop)로 구성됩니다.
*   **내부 루프 (Inner Loop): 코딩 에이전트 하네스 (Coding Agent Harness)**
    *   이는 에이전트의 핵심 실행 환경으로, 컨텍스트 관리자(Context manager), 도구/MCP 런타임(Tool/MCP runtime), 메모리 및 상태(Memory & state), 스킬 로더/라우터(Skills loader/router) 같은 핵심 구성요소로 이루어집니다.
*   **외부 루프 (Outer Loop): 워크플로우 (Workflows)**
    *   내부 루프를 활성화하고 조율하는 더 큰 흐름입니다. 여기에는 **스킬(Skills)**, 하위 에이전트(Sub-Agents), MCP 서버(MCP Servers), 훅(Hooks) 등이 포함됩니다.

이 전체 스택이 원활히 작동하려면 그 아래에 여러 지원 컴포넌트(Enablement Components)와 컨텍스트 레이어(Context Layer)가 필요합니다.
*   **지원 컴포넌트:** 샌드박스 환경, MCP 게이트웨이, 모델 게이트웨이, 그래프(지식 그래프), 스킬 레지스트리, 워크플로우 마켓플레이스 등.
*   **컨텍스트 레이어:** 프로젝트 지침, 도구/MCP 스키마, 메모리, 대화 기록, 검색된 컨텍스트 등 에이전트가 작업을 완료하는 데 필요한 모든 정보를 제공합니다.

발표자는 이 구조에서 특히 **워크플로우**와 그 핵심 요소인 **스킬**에 집중할 것이라고 강조합니다.

### 이상과 현실: AI 개발 파이프라인의 복잡성
단순한 코딩 에이전트는 흔히 `/specify`(명세) → `/design`(설계) → `/tasks`(작업 분할) → `/implement`(구현)의 4단계 파이프라인을 따르는 것처럼 보입니다. 하지만 이는 실제 엔터프라이즈 환경의 복잡성을 제대로 반영하지 못합니다. 이 4단계는 전체 제품 개발 생애주기에서 '제품 증분 빌드(Build Product Increment)'라는 하나의 단계에 불과합니다.

실제 엔터프라이즈 제품 제공(product delivery)은 훨씬 복잡하며 다음과 같은 다양한 워크플로우를 포함합니다.
*   **전략 (Strategy):** 제품 로드맵, 성공 지표 정의 등
*   **인사이트 (Insights):** 시장 조사, 경쟁 분석, 고객 인터뷰 등
*   **발견 (Discovery):** 문제 정의, 솔루션 탐색 및 검증, 사용자 스토리 작성 등
*   **데이터/제품 제공 (Data/Product Delivery):** 데이터 파이프라인 구축, 데이터 품질 검증 등
*   **소프트웨어 제품 제공 (Software Product Delivery):** 실제 제품 증분 빌드
*   **플랫폼 엔지니어링/운영 (Platform Engineering Ops):** 인프라 프로비저닝, IaC 모듈 관리 등
*   **출시 (Launch):** 제품 출시, 성능 최적화, 이슈 해결 등

이처럼 복잡하고 다양한 워크플로우를 효과적으로 관리하고 자동화하기 위해서는 재사용 가능하고 결정론적인 단위, 즉 '스킬'이 필수적입니다.

### 스킬의 부상과 성능 향상 효과
스킬의 중요성은 빠르게 인식되고 있습니다. 8개월 전 앤트로픽(Anthropic)이 처음 관련 글을 발표한 이후, 2개월 만에 오픈 스탠다드가 등장했고, 현재는 2,000개 이상의 공개 스킬이 존재할 정도로 채택이 급증했습니다.

스킬은 단순히 개념적인 것이 아니라 실제 성능 향상으로 이어집니다. 최신 LLM들을 대상으로 스킬 없이 작업을 수행했을 때와 스킬을 적용했을 때의 성능을 비교한 'Skills Bench' 결과에 따르면, 스킬을 적용했을 때 모든 도메인(소프트웨어 엔지니어링, 사이버 보안 등)에서 성능이 눈에 띄게 향상되었습니다. 이는 스킬이 결정론적(deterministic)인 결과를 보장하여 AI의 성능을 끌어올리기 때문입니다.

### 관리되지 않는 스킬이 만드는 새로운 기술 부채
그러나 스킬을 체계적으로 관리하지 않으면 새로운 종류의 기술 부채(technical debt)가 발생합니다.
*   **중복 (Duplication):** 팀 간 공유가 없어 동일한 스킬을 여러 팀이 각자 개발.
*   **품질 저하 (Quality):** 표준화된 테스트나 유지보수 없이 스킬이 방치되어 품질이 떨어짐.
*   **발견성 부족 (Discoverability):** 어떤 스킬이 존재하는지 알 수 없어 재사용이 불가능.
*   **소유권 부재 (Ownership):** 스킬의 책임자가 불분명하여 유지보수가 이루어지지 않음.
*   **유지보수성 악화 (Maintainability):** 모델이 변경될 때마다 스킬이 제대로 작동하는지 보장하기 어려움.
*   **조합성 문제 (Composability):** 각기 다른 방식으로 만들어진 스킬들을 조합하기 어려움.
*   **보안 취약점 (Security):** 공개된 스킬을 무분별하게 사용하다 프롬프트 인젝션 등 보안 문제 발생.
*   **권한 문제 (Permissions):** 민감한 비즈니스 로직이 포함된 스킬에 대한 접근 제어 부재.

### 해결책: 공유 플랫폼을 통한 스킬 확장 및 거버넌스
이러한 기술 부채를 해결하고 스킬의 가치를 극대화하려면 체계적인 확장 전략이 필요합니다. 이는 4단계로 이루어집니다.
1.  **개인 수준 (Individual level):** 개발자가 자유롭게 스킬을 생성, 테스트, 사용, 게시할 수 있는 환경 제공.
2.  **팀 수준 (Team level):** 팀 내에서 스킬을 공유하고 협업을 통해 개선.
3.  **중앙 플랫폼 (Centralized platform):** 조직 전체가 공유하는 플랫폼을 구축. 이 플랫폼은 스킬 카탈로그, 종속성 관리, 버전 관리, 접근 제어, 평가 및 관찰 가능성 등의 기능을 제공. 아키텍트, 엔지니어링 리드 등 거버넌스 주체가 이 플랫폼을 관리.
4.  **조직 수준 (Org level):** 모든 팀이 중앙 플랫폼에서 검증된 고품질 스킬을 가져와 사용하고, 개선 사항을 다시 플랫폼에 기여하는 선순환 구조를 만듦.

발표자는 시뮬레이션 데모를 통해 거버넌스가 없을 때(각 팀이 무질서하게 스킬을 생성, 중복과 품질 저하 발생)와 중앙 플랫폼을 통해 거버넌스를 적용했을 때(중복이 줄고 고품질 스킬이 확산되어 생산성, 품질, 비용 효율성이 모두 향상됨)의 차이를 시각적으로 보여줍니다.

### 다음 단계: 탐색해야 할 미래
스킬 거버넌스는 이제 시작이며, 앞으로 다음과 같은 영역을 더 탐색해야 합니다.
*   **스킬 레지스트리 (Skills registry):** 여러 레지스트리 제공자들이 등장하며 발견, 버전 관리, 거버넌스 기능을 제공할 것.
*   **스킬 평가 (Skills evaluation):** 스킬의 품질을 보증하고 엔지니어링 원칙으로 자리 잡게 할 정교한 평가 방법론이 필요.
*   **스킬 자동 진화 (Skills auto-evolving):** 에이전트가 사용 패턴을 학습하여 스스로 스킬을 개선하고 최적화하는 폐쇄 루프(closed-loop) 시스템.

## 구체 수치·데모·아키텍처
*   **에이전틱 소프트웨어 스택 아키텍처:**
    *   **내부 루프 (코딩 에이전트 하네스):** Context manager, Tool/MCP runtime, Memory & state, Skills loader/router
    *   **외부 루프 (워크플로우):** Skills, Sub-Agents, MCP Servers, Hooks
    *   **지원 계층 (Enablement):** Sandbox, MCP gateway, Model gateway, Graph, Skills registry, Workflows marketplace
    *   **컨텍스트 계층 (Context):** Project instructions, Tool/MCP Schema, Memory, Conversation History, Retrieved Content
*   **엔터프라이즈 제품 제공 워크플로우:** Strategy, Insights, Discovery, Data/Product Delivery, Software Product Delivery, Platform Engineering Ops, Launch.
*   **스킬 채택 증가 그래프:** 2023년 10월부터 2024년 6월까지 공개 스킬(public skills) 수가 0개에서 2,000개 이상으로 기하급수적으로 증가.
*   **스킬 성능 향상 벤치마크 (Skills Bench):**
    *   소프트웨어 엔지니어링 분야에서 스킬을 적용했을 때, GPT-3.5는 32% → 55.1%, Opus 3.0은 50.3% → 72.4%로 성능이 향상됨.
*   **기술 부채의 종류:** Duplication, Quality, Discoverability, Ownership, Maintainability, Composability, Security, Permissions.
*   **스킬 확장 4단계 모델:** Individual level → Team level → Centralized platform → Org level.
*   **시뮬레이션 데모:** 15개 팀, 팀당 5-12명의 엔지니어가 있는 조직을 가정. 거버넌스 없이 6개월간 운영 시 스킬 중복(빨간색 점)이 많고 품질(녹색 점)이 낮은 반면, 중앙 플랫폼 도입 후에는 중복이 줄고 고품질 스킬이 조직 전체로 확산됨. 이를 통해 생산성, 품질, 비용 효율성이 모두 개선됨을 시각화.

## 핵심 인용
*   "The unit that makes Know-how executable, portable, and cheap."
    > "노하우를 실행 가능하고, 이식 가능하며, 저렴하게 만드는 단위 (이것이 바로 스킬입니다)."
*   "Ungoverned skills create a new class of technical debt."
    > "관리되지 않는 스킬은 새로운 종류의 기술 부채를 만듭니다."
*   "Workflows are skills on demand, chained together to achieve a deterministic result."
    > "워크플로우는 필요에 따라 호출되는 스킬들이며, 결정론적인 결과를 얻기 위해 함께 연결됩니다."

## 한 줄 결론
AI 네이티브 조직의 진정한 가치는 개별 AI 모델이 아닌, 조직의 노하우를 담아 재사용하고 확장할 수 있는 '스킬'을 체계적으로 거버넌스하는 중앙 플랫폼을 구축하는 데서 나온다.
