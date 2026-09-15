---
title: "Agents Without Code: Skills, YAML, and Filesystems Replaced Python — Philipp Schmid, Google DeepMind"
videoId: fjF8EKnxKCU
url: https://www.youtube.com/watch?v=fjF8EKnxKCU
channel: "AI Engineer"
publishedAt: 2026-09-14
summarizedAt: 2026-09-15
model: gemini-2.5-flash
---

# Agents Without Code: Skills, YAML, and Filesystems Replaced Python — Philipp Schmid, Google DeepMind

🔗 https://youtu.be/fjF8EKnxKCU · 📅 2026-09-14 · 🎙 AI Engineer

## 한 줄 요약
발표자는 LLM 에이전트 개발이 파이썬 코드 중심에서 에이전트 프레임워크를 거쳐, 최종적으로 마크다운 파일과 스킬 기반의 관리형 에이전트로 진화하며 오케스트레이션 코드를 줄이는 방향으로 나아가고 있다고 주장합니다.

## 발표자·소속
필립 슈미트 (Philipp Schmid), 구글 딥마인드 (Google DeepMind) 스태프 엔지니어

## 핵심 주장
- **LLM 에이전트 개발의 코드 감소 추세**: 에이전트 개발은 초기 파이썬 코드 중심의 복잡한 루프 구현에서, 에이전트 프레임워크를 통한 추상화, 그리고 마침내 마크다운 파일과 스킬 정의만으로 동작하는 관리형 에이전트(Managed Agents)로 진화하며 오케스트레이션 코드가 크게 줄어들고 있습니다.
- **상호작용(Interactions) API의 역할**: 구글 제미나이(Gemini)의 상호작용 API는 모델과 에이전트를 위한 통합 인터페이스를 제공하며, 서버 측 상태 관리, 백그라운드 실행, 툴 호출, 멀티모달 입력 및 이미지 생성을 지원하여 에이전트 개발을 간소화합니다.
- **'턴(Turns)' 기반에서 '스텝(Steps)' 기반 데이터 모델로의 전환**: 기존의 사용자-모델 간 '턴' 기반 대화 기록 방식은 에이전트의 복잡한 추론 및 툴 사용을 표현하기 어려웠습니다. '스텝' 기반 모델은 추론(Thoughts), 툴 호출(Calls), 결과(Results) 등 에이전트의 내부 실행 과정을 상세히 추적하여 더 강력한 에이전트 구축을 가능하게 합니다.
- **관리형 에이전트의 이점**: 관리형 에이전트는 격리된 원격 리눅스 샌드박스에서 실행되며, 코드 실행, 파일 시스템 접근, 웹 검색 등 풍부한 툴셋을 제공합니다. 개발자는 파이썬 플러밍 코드 없이 마크다운 파일로 에이전트의 지침, 규칙, 행동 및 스킬을 정의하여 배포 및 라이프사이클 관리를 간소화할 수 있습니다.

## 세부 내용

발표는 LLM 에이전트의 정의("An LLM agent runs tools in a loop to achieve a goal." - Simon Willison)로 시작하여, GitHub PR 리뷰어 에이전트를 세 가지 방식으로 구축하는 과정을 통해 에이전트 개발의 진화를 보여줍니다. 각 버전은 이전 버전보다 코드를 삭제하는 것을 목표로 합니다.

**1. Interactions API 소개**
구글 제미나이의 새로운 Interactions API는 모델과 에이전트를 위한 통합 인터페이스를 제공합니다. 서버 측 상태 관리, 장기 실행 워크플로우를 위한 백그라운드 실행을 지원하며, 툴 호출, 멀티모달 입력 및 이미지 생성을 위한 동일한 API를 사용합니다. 특히, 기존의 '턴(Turn-based)' 방식 대신 '스텝(Steps)' 기반의 데이터 모델을 채택하여 에이전트의 추론, 툴 호출, 결과 등 실행 과정을 더 세밀하게 추적하고 관리할 수 있습니다.

**2. Era 1: 파이썬 루프를 이용한 에이전트 구축 (Raw SDK)**
초기 에이전트 개발은 파이썬으로 직접 루프를 구현하는 방식이었습니다. 발표자는 `agent.py`, `prompts.py`, `tools.py`, `github_client.py` 파일로 구성된 GitHub PR 리뷰어 에이전트의 코드를 보여줍니다.
- `agent.py`: Interactions API를 호출하고 모델의 응답을 처리하며, 함수 호출 여부를 확인하고 해당 툴을 실행하는 복잡한 루프 로직을 포함합니다. 오류 처리(try/catch)도 수동으로 구현해야 합니다.
- `prompts.py`: 에이전트의 시스템 지침을 정의합니다.
- `tools.py`: 에이전트가 사용할 툴(예: `get_pr_details`, `read_pr_diff`, `post_review_comment`)의 JSON 스키마를 수동으로 정의합니다.
- `github_client.py`: 실제 GitHub API 호출 로직을 구현합니다.
데모에서는 에이전트가 PR 정보를 가져오고 diff를 읽는 과정을 보여줍니다. 하지만 에이전트가 정의되지 않은 기능(예: 샌프란시스코 날씨)을 요청하면 "I do not have access to real-time information or weather APIs"와 같이 명시적으로 실패합니다. 이는 개발자가 모든 툴과 로직을 직접 코딩해야 하는 한계를 보여줍니다.

**3. Era 2: 에이전트 프레임워크의 등장 (Agent Development Kit)**
에이전트 프레임워크(예: LangChain, CrewAI, AutoGen, Guardrails)는 파이썬 루프의 복잡성을 추상화하여 개발을 간소화합니다. 프레임워크는 모델 출력을 파이썬 함수에 매핑하고, docstring에서 JSON 툴 스키마를 자동으로 생성하며, 실행 루프, 재시도, 백오프 등을 처리합니다.
데모에서는 Google ADK 프레임워크를 사용한 PR 리뷰어 에이전트를 보여줍니다. `agent.py` 파일이 사라지고, `tools.py`에서는 JSON 스키마 정의가 없어졌습니다. 프레임워크가 docstring을 기반으로 툴 스키마를 생성하기 때문입니다. 여전히 `github_client.py`와 같은 커스텀 파이썬 플러밍 코드는 필요하며, 에이전트가 새로운 규칙이나 기능을 추가하려면 코드 업데이트가 필요합니다. 날씨 요청 시 여전히 실패합니다.

**4. Era 3: 관리형 에이전트 (Managed Agents)**
최신 에이전트 개발은 원격 샌드박스에서 실행되는 관리형 에이전트를 통해 '코드 제로'에 가까운 경험을 제공합니다. 구글 I/O에서 출시된 Antigravity Remote Agent가 그 예시입니다.
- **동작 방식**: Interactions API를 통해 `agents="antigravity-preview-08-2626"`와 같이 에이전트를 호출하고 `environment="remote"`를 지정하여 원격 샌드박스에서 실행합니다.
- **특징**: Antigravity IDE를 구동하는 것과 동일한 하네스를 사용하며, 코드 실행, 파일 시스템, 웹 검색을 위한 풍부한 툴셋을 제공합니다. 안전하고 격리된 리눅스 샌드박스에서 실행되며, 개발자는 오케스트레이션 코드를 작성할 필요 없이 단일 API 호출로 에이전트를 사용할 수 있습니다.
- **샌드박스 환경 및 커스터마이징**: 샌드박스는 동적으로 구성하거나 ID로 저장할 수 있습니다. GitHub 리포지토리, GCS 버킷, 인라인 파일 등 다양한 소스를 에이전트에 제공할 수 있으며, 인증 정보(credentials)는 네트워크 프록시를 통해 안전하게 주입됩니다. 에이전트가 접근할 수 있는 도메인도 제한할 수 있습니다.
- **데모**: `03_managed-agents` 폴더에서 `agent.py`, `prompts.py`, `tools.py`, `github_client.py` 파일이 모두 사라지고, `AGENTS.md` 파일과 `gh.bash` 스크립트만 남습니다. `AGENTS.md`는 에이전트의 시스템 지침과 환경 세부 정보를 포함하며, 에이전트가 GitHub CLI와 Bash 툴, 파일 시스템에 접근할 수 있음을 명시합니다. 에이전트는 샌드박스 내에서 GitHub CLI를 설치하고, PR을 리뷰하며, 심지어 Google Search를 사용하여 샌프란시스코의 날씨를 성공적으로 찾아냅니다. 이는 에이전트가 명시적으로 정의되지 않은 툴도 스스로 찾아내어 사용할 수 있는 일반 목적 에이전트(general purpose agent)로 진화했음을 보여줍니다.

**에이전트 엔지니어링의 교훈**:
- **모델과 싸우지 마라**: 실행 경로를 마이크로 관리하는 것을 멈추고, 일반적인 툴을 제공하여 모델이 스스로 탐색하고 추론하며 해결책을 찾도록 해야 합니다.
- **자신의 것을 소유하라**: 도메인 지침, 워크플로우(스킬), 평가(evals)에 집중하고, 깔끔한 툴을 정의하며 결과를 엄격하게 검증해야 합니다.
- **삭제하기 위해 구축하라**: 모델의 기능이 향상됨에 따라 오케스트레이션 코드, 프레임워크 플러밍 등을 지침으로 대체하여 코드를 줄여야 합니다. 발표자는 모델 기능이 향상될수록 하네스(orchestration code)가 복잡해진다면 '과잉 엔지니어링'이라고 지적합니다.

## 인상적인 대목
- "An LLM agent runs tools in a loop to achieve a goal." (0:25) - 에이전트의 핵심 기능을 명확하게 정의합니다.
- "Each version deletes code." (0:44) - 에이전트 개발의 진화 방향을 함축적으로 보여주는 문장입니다.
- "If your harness is getting more complex as models improve, you're over-engineering." (1:59) - 에이전트 엔지니어링의 가장 중요한 교훈 중 하나로, 모델의 발전과 함께 개발 방식도 변화해야 함을 강조합니다.
- 에이전트가 스스로 GitHub CLI를 설치하고 웹 검색을 통해 날씨 정보를 찾아내는 데모 (1:11:00)는 관리형 에이전트의 강력한 기능을 시각적으로 보여줍니다.

## 실무 적용 포인트
- **Interactions API 활용 고려**: 구글 제미나이의 Interactions API를 사용하여 모델 및 에이전트와의 상호작용을 통합하고, 서버 측 상태 관리 및 백그라운드 실행 기능을 활용하여 복잡한 워크플로우를 간소화할 수 있습니다.
- **'스텝' 기반 데이터 모델 채택**: 에이전트의 내부 추론 과정(Thoughts, Calls, Results)을 명확히 기록하고 관리할 수 있는 '스텝' 기반 데이터 모델을 사용하여 에이전트의 디버깅 및 성능 개선에 활용합니다.
- **선언적 에이전트 정의 지향**: 파이썬 코드 대신 마크다운 파일(AGENTS.md, SKILL.md)을 사용하여 에이전트의 지침, 규칙, 행동 및 스킬을 정의하는 선언적 방식을 채택하여 코드량을 줄이고 유지보수성을 높입니다.
- **원격 샌드박스 환경 활용**: 관리형 에이전트와 격리된 원격 샌드박스를 활용하여 에이전트가 코드 실행, 파일 시스템 접근, 웹 검색 등 다양한 툴을 안전하게 사용할 수 있도록 합니다. 이를 통해 개발자는 인프라 관리 부담을 줄이고 에이전트의 핵심 로직 개발에 집중할 수 있습니다.
