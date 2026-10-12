---
title: "Build with Perception Agents — Emile Baizel & Shruti Arora, Amazon AGI Lab"
videoId: ZGzthw4BZiA
url: https://www.youtube.com/watch?v=ZGzthw4BZiA
channel: "AI Engineer"
publishedAt: 2026-10-11
summarizedAt: 2026-10-12
model: gemini-2.5-flash
---

# Build with Perception Agents — Emile Baizel & Shruti Arora, Amazon AGI Lab

🔗 https://youtu.be/ZGzthw4BZiA · 📅 2026-10-11 · 🎙 AI Engineer

## 한 줄 요약
Amazon AGI Lab은 지식 작업 에이전트가 다양한 환경에서 인지, 추론, 행동하여 실제 작업을 완료할 수 있도록 돕는 'Perception Agents'를 개발하고 있으며, 특히 브라우저 자동화에 중점을 둔 'Amazon Nova Act' 서비스를 제공한다.

## 발표자·소속
- Emile Baizel, Solutions Architect Team Lead, Amazon AGI Lab
- Shruti Arora, Solutions Architect, Amazon AGI Lab
- Giovanni Laquidara, Bee Team, Amazon
- Jeff, Amazon

## 핵심 주장
- **Perception Agents 개발 목표**: Amazon AGI Lab은 스타트업의 속도와 아마존의 자원을 결합하여 지식 작업 에이전트를 구축하는 데 중점을 둔다. 이 에이전트들은 다양한 환경에서 인지, 추론, 행동하여 실제 작업을 완료할 수 있어야 한다.
- **Perception Agents의 세 가지 접근 방식**: 에이전트 개발은 협업(Agents that understand and communicate), 인지(Agents that understand their environment), 신뢰성(Agents that go beyond 90% reliability)의 세 가지 핵심 원칙을 따른다. 특히 인지는 에이전트가 화면의 내용을 인간처럼 이해하는 것을 목표로 한다.
- **Amazon Nova Act 소개**: Amazon Nova Act는 개발자가 자연어를 사용하여 브라우저 기반 워크플로우를 대규모로 자동화할 수 있도록 돕는 AWS 서비스이다. 폼 작성, 검색 및 추출, 쇼핑, QA 등 다양한 브라우저 작업을 자동화할 수 있다.
- **Perception Agent Primitives**: Perception Agents는 'Visual Annotator'와 'UI Verification Skill'이라는 두 가지 오픈소스 프리미티브를 제공한다. Visual Annotator는 사용자가 웹 페이지에 직접 주석을 달고 변경 사항을 설명할 수 있게 하며, UI Verification Skill은 에이전트가 디자인 사양에 따라 UI 변경 사항을 자동으로 확인하도록 돕는다.

## 세부 내용
Amazon AGI Lab의 Emile Baizel은 Perception Agents 워크숍을 시작하며 팀의 목표와 접근 방식을 설명했다. Amazon AGI Lab은 스타트업의 속도와 아마존의 자원을 결합하여 지식 작업 에이전트를 구축하는 데 중점을 둔다. 이 에이전트들은 다양한 환경에서 인지, 추론, 행동하여 실제 작업을 완료할 수 있어야 한다.

에이전트 개발은 세 가지 핵심 원칙을 따른다.
1.  **협업**: 에이전트가 인간의 목표를 이해하고, 목표 달성 방법을 공유하며, 실제 고객 사용 사례에 기반하여 작업하는 팀원 역할을 한다.
2.  **인지**: 에이전트가 주변 환경을 이해해야 한다. 이는 브라우저, 모바일 기기, 컴퓨터 화면 등 시각적 화면을 통해 지식 작업을 수행하는 것을 의미한다.
3.  **신뢰성**: 에이전트가 90% 이상의 신뢰성을 가져야 한다. 이를 위해 연구팀은 시뮬레이션 환경에서 모델을 훈련하고 실제 사용 사례를 기반으로 평가를 구축한다.

작년에 출시된 첫 번째 제품은 **Amazon Nova Act**이다. 이 서비스는 개발자가 자연어를 사용하여 브라우저 기반 워크플로우를 대규모로 자동화할 수 있도록 돕는다. 주요 사용 사례는 폼 작성, 검색 및 추출, 쇼핑, QA 등이다. Nova Act는 AWS 서비스로 제공되며, 콘솔에서 에이전트의 작업 궤적과 요소 바운딩 박스를 확인할 수 있다. 올해는 MCP 서버와 스킬이 출시되어 에이전트가 Nova Act를 쉽게 사용할 수 있게 되었다. 또한, 노코드(no-code) 방식의 플레이그라운드도 제공된다.

워크숍의 주요 주제인 **Perception Agents**는 에이전트가 API나 백엔드 접근 없이도 시각적 인터페이스를 인간처럼 해석하여 화면의 내용을 이해하고 작업을 수행할 수 있도록 하는 것을 목표로 한다. 이를 통해 에이전트는 수천 개의 웹사이트에서 반복적인 작업을 자동화할 수 있다.

Perception Agents는 두 가지 오픈소스 프리미티브를 제공한다.
1.  **Visual Annotator**: Chrome 확장 프로그램으로, 웹 페이지에 직접 포인팅, 그리기, 설명을 통해 주석을 달 수 있다. 이 주석은 JSON 파일로 내보내지며, 코딩 에이전트에게 전달되어 웹 페이지 변경을 지시하는 프롬프트와 함께 사용된다.
2.  **UI Verification Skill**: 에이전트가 라이브 웹사이트를 디자인 사양(CSS 규칙, 컴포넌트 규칙, 프로젝트 규칙, 플랫폼 규칙, 접근성 규칙 등) 및 Gherkin 시나리오(사용자 흐름)와 비교하여 UI 변경 사항을 자동으로 확인하고 보고서를 생성한다.

워크숍에서는 참가자들이 이 두 가지 프리미티브를 직접 활용하여 자동화된 파이프라인을 구축하는 도전 과제를 수행한다. 목표는 Visual Annotator를 통해 주석을 생성하고, 'Apply Changes' 버튼을 통해 코딩 에이전트가 CSS 문제를 해결하도록 지시하며, UI Verification Skill을 통해 변경 사항이 디자인에 부합하는지 자동으로 확인하는 것이다.

**데모:**
-   **Visual Annotator**: Nova Act 플레이그라운드에서 Chrome 확장 프로그램을 사용하여 웹 페이지의 요소를 선택하고, 텍스트로 변경 사항을 주석으로 달고, JSON 파일과 프롬프트를 내보내는 과정을 시연했다.
-   **UI Verification Skill**: VS Code 환경에서 UI Verification Skill을 실행하여 로컬 웹 서버의 디자인 사양을 확인하고, 시각적 스타일, 컴포넌트 규칙, 접근성, 프로젝트 규칙, 플랫폼 규칙에 대한 검증 결과를 보고서 형태로 생성하는 과정을 시연했다. 또한, 사용자 흐름(Flow Verification)에 대한 검증도 수행하여 각 작업 흐름의 통과 여부를 보여주었다.
-   **Bee Conversations to Agent**: Bee 웨어러블 기기를 통해 음성으로 디자인 변경을 지시하면, Bee가 이를 텍스트로 변환하여 에이전트에게 전달하고, 에이전트가 웹 페이지의 제목, 색상, 이모지 등을 변경한 후 UI 검증을 자동으로 수행하는 과정을 시연했다.

워크숍은 쉬운(Easy) 모드(15분, 모든 코드가 제공되는 단계별 안내)와 중간(Medium) 모드(30분, 구축 방법을 알려주는 두 단계 코드 힌트)로 나뉘어 진행된다. 또한, 보너스 챌린지(10분)도 제공된다.

## 인상적인 대목
-   "If my agent works 50% of the time, it doesn't work at all." (내 에이전트가 50%만 작동한다면, 전혀 작동하지 않는 것과 같다.) - 에이전트의 신뢰성이 얼마나 중요한지 강조하는 문장.
-   "Perception agents interpret visual interfaces the way a human does." (Perception Agents는 시각적 인터페이스를 인간처럼 해석한다.) - 에이전트가 단순히 요소를 클릭하는 것을 넘어 화면의 의미를 이해하는 것을 목표로 한다는 점이 인상적이다.
-   "Describe your intent by pointing and drawing instead of text-only." (텍스트만 사용하는 대신 포인팅하고 그림을 그려 의도를 설명하세요.) - 인간과 에이전트 간의 협업 방식을 혁신하려는 노력이 돋보인다.

## 실무 적용 포인트
-   **브라우저 자동화**: Amazon Nova Act를 활용하여 반복적인 웹 기반 작업을 자동화하고, 특히 API가 없는 레거시 시스템이나 다양한 웹사이트에 걸친 데이터 수집 및 폼 작성 작업을 효율화할 수 있다.
-   **UI/UX 검증 자동화**: Visual Annotator와 UI Verification Skill을 사용하여 웹 애플리케이션의 디자인 사양 및 사용자 흐름에 대한 자동화된 시각적 검증 파이프라인을 구축할 수 있다. 이를 통해 프런트엔드 개발 및 QA 프로세스의 효율성을 높이고 디자인 일관성을 유지할 수 있다.
-   **인간-AI 협업 개선**: Visual Annotator를 통해 디자인 팀이나 비기술 직군이 직접 UI 변경 사항을 에이전트에게 지시하고 피드백을 제공하는 워크플로우를 구현하여 개발자와의 소통 비용을 줄일 수 있다.
-   **음성 기반 에이전트 개발**: Bee 웨어러블 기기와의 통합 데모에서 보듯이, 음성 명령을 통해 에이전트에게 작업을 지시하고 결과를 확인하는 새로운 형태의 인간-AI 인터랙션을 탐색하고 적용할 수 있다.
