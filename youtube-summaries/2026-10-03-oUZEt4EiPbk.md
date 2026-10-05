---
title: "I Built a Personal AI Agent on a Raspberry Pi — Jeremy Adams, Neo4j"
videoId: oUZEt4EiPbk
url: https://www.youtube.com/watch?v=oUZEt4EiPbk
channel: "AI Engineer"
publishedAt: 2026-10-03
summarizedAt: 2026-10-05
model: gemini-2.5-flash
---

# I Built a Personal AI Agent on a Raspberry Pi — Jeremy Adams, Neo4j

🔗 https://youtu.be/oUZEt4EiPbk · 📅 2026-10-03 · 🎙 AI Engineer

## 한 줄 요약
발표자는 라즈베리 파이 4B에 NanoClaw 에이전트를 구축하고, 이를 활용해 컨퍼런스 부스 정보를 수집하며 에이전트 메모리 및 음성-텍스트 변환 기능을 시연했습니다.

## 발표자·소속
Jeremy Adams, Sr. Developer Advocate, Neo4j

## 핵심 주장
- **개인 AI 에이전트의 접근성 및 제어 가능성 강조**: 발표자는 자신의 랩톱에 설치되지 않고 저렴하며 개방적이고 해킹 가능한 "작은 클로(Small Claw)" 에이전트를 선호하며, 복잡성보다는 이해도를 중시한다고 주장합니다.
- **라즈베리 파이의 엣지 컴퓨팅 잠재력 시연**: 라즈베리 파이 4B와 Docker를 활용하여 Neo4j 데이터베이스를 로컬에서 실행하고, USB 마이크를 통해 음성-텍스트 변환(Whisper VTT)을 수행하는 등 엣지 디바이스에서의 AI 에이전트 구현 가능성을 보여주었습니다.
- **그래프 데이터베이스를 활용한 에이전트 메모리 구현**: Neo4j를 사용하여 에이전트의 장기 기억을 저장하고 관리하는 방법을 제시했습니다. POLE+O(Person, Organization, Location, Event, Object) 엔티티 모델을 통해 대화 및 관찰 내용을 구조화된 지식 그래프로 변환하여 에이전트가 정보를 기억하고 추론할 수 있도록 했습니다.
- **컨퍼런스 데이터 수집 및 테마 분석**: 웨어러블 클로를 이용해 AI Engineer World's Fair '26 컨퍼런스 부스에서 수집한 음성 데이터를 분석하여 주요 전시 테마(예: 에이전트 인프라 및 배포, 평가 및 관찰 가능성)를 식별하는 실제 적용 사례를 선보였습니다.

## 세부 내용
발표는 AI Engineer World's Fair '26 컨퍼런스에서 진행되었으며, 발표자는 Neo4j의 Jeremy Adams였습니다. 그는 자신의 개인 AI 에이전트 프로젝트인 "Small Claw"를 소개하며, 이 프로젝트가 저렴하고, 개방적이며, 최소한의 DIY(Do-It-Yourself) 방식으로 구축되었음을 강조했습니다. 그는 복잡한 에이전트보다는 이해하기 쉬운 에이전트를 선호한다고 밝혔습니다.

데모를 위해 발표자는 라즈베리 파이 4B를 사용했습니다. 그는 HDMI 케이블과 USB 마이크 수신기를 연결하여 라즈베리 파이 데스크톱 화면을 라이브로 보여주었습니다. 라즈베리 파이 OS(64비트)가 실행되는 것을 확인한 후, 터미널에서 `docker ps` 명령어를 통해 Neo4j Docker 컨테이너가 실행 중임을 보여주었습니다.

그는 NanoClaw와 OpenClaw를 비교하며 NanoClaw가 훨씬 적은 소스 파일(15개 vs 2,680개), 코드 라인(~3,900개 vs 434,453개), 의존성(<10개 vs 70개), 설정 파일(0개 vs 53개)을 가지고 있어 이해하기 쉽고 OS 컨테이너 격리 기반의 보안 모델을 제공한다고 설명했습니다. NanoClaw는 Debian Linux, Docker, Claude Code/Agent SDK, WhatsApp 메시징을 활용합니다.

초기 아키텍처는 iPhone 또는 MacBook의 WhatsApp 앱을 통해 메시지를 보내면, 라즈베리 파이 4B의 NanoClaw 에이전트가 이를 받아 Claude Agent SDK를 통해 Anthropic 클라우드(Claude Opus/Sonnet)와 통신하는 방식이었습니다. LLM 추론은 클라우드에서 이루어졌습니다.

발표자는 Neo4j를 에이전트의 메모리로 사용하는 데모를 보여주었습니다. 그는 WhatsApp 메시지로 "Neo4j에서 톰 행크스가 출연하거나 감독한 영화를 찾아줘"라고 질문했고, 에이전트는 Neo4j Aura(클라우드 기반 관리형 데이터베이스)에 저장된 영화 데이터베이스에서 관련 정보를 검색하여 응답했습니다. 이 과정에서 "Neo4J MCP server"가 라즈베리 파이에서 Neo4j Aura와 통신했습니다.

이후 발표자는 POLE+O(Person, Organization, Location, Event, Object) 엔티티 모델을 활용하여 에이전트 메모리를 구축하는 아이디어를 제시했습니다. 그는 컨퍼런스 Wi-Fi의 불안정성을 고려하여 오프라인 모드의 필요성을 언급하며, 라즈베리 파이 4B에 로컬 Neo4j Docker 인스턴스를 추가한 아키텍처를 소개했습니다. 이 로컬 Neo4j는 클라우드 Neo4j Aura와 동기화될 수 있습니다.

그는 USB 마이크와 푸시 버튼을 라즈베리 파이에 연결하여 음성-텍스트(VTT) 모델(Whisper)을 통해 음성 명령을 텍스트로 변환하고, 이를 NanoClaw 에이전트가 처리하도록 했습니다. 그는 컨퍼런스 부스를 돌아다니며 웨어러블 클로로 데이터를 수집하는 아이디어를 구현했습니다. 로컬 Neo4j에 "Exhibitor" 노드를 저장하고, 음성으로 수집한 부스 정보(예: 부스 번호, 이름, 태그라인)를 Cypher 쿼리를 통해 데이터베이스에 삽입했습니다.

수집된 데이터를 바탕으로 그는 100개의 AI Engineer World's Fair '26 전시 테마를 분석한 결과를 막대그래프로 보여주었습니다. 가장 많은 테마는 "Agent Infrastructure & Deployment"(14개), "Evaluation & Observability"(11개), "Web Data & Unstructured Data Pipelines"(9개) 순이었습니다.

마지막으로 그는 Neo4j Agent Memory Service(NAMS)를 소개하며, 이는 LLM 에이전트를 위한 호스팅된 그래프 기반 메모리 레이어로, 단기 대화, 장기 지식, 추론 추적 등을 Neo4j Aura의 네이티브 벡터 검색으로 지원한다고 설명했습니다. 그는 NAMS 대시보드를 통해 에이전트가 대화에서 추출한 엔티티(사람, 조직, 위치, 개념 등)를 시각적으로 탐색할 수 있음을 보여주었습니다.

## 인상적인 대목
- "comprehensible > comprehensive" (포괄적인 것보다 이해할 수 있는 것이 더 중요하다)
- "Will it Claw? 🤔" (클로가 작동할까?)
- "Oh, yeah! 🦀 Raspberry Pi 🍓 NanoClaw" (오, 그래! 라즈베리 파이 나노클로)
- "Memory tells you what happened. Skills tell you what to do." (기억은 무엇이 일어났는지 알려주고, 스킬은 무엇을 해야 할지 알려준다.)

## 실무 적용 포인트
- **엣지 AI 에이전트 개발**: 라즈베리 파이와 같은 저전력 엣지 디바이스에 NanoClaw와 Docker를 활용하여 경량 AI 에이전트를 구축할 수 있습니다. 이는 보안 및 비용 효율적인 로컬 데이터 처리 및 제어에 유용합니다.
- **그래프 기반 에이전트 메모리 시스템**: Neo4j를 사용하여 에이전트의 대화, 관찰, 추론 과정을 지식 그래프로 저장하고 관리할 수 있습니다. POLE+O와 같은 엔티티 모델을 적용하여 에이전트의 장기 기억 및 상황 인지 능력을 향상시킬 수 있습니다.
- **음성 인터페이스 통합**: USB 마이크와 Whisper VTT 모델을 라즈베리 파이에 통합하여 음성 명령을 텍스트로 변환하고, 이를 에이전트의 입력으로 활용하여 자연어 기반의 상호작용을 구현할 수 있습니다.
- **오프라인/하이브리드 모드 지원**: 컨퍼런스 Wi-Fi와 같이 네트워크 연결이 불안정한 환경을 대비하여, 로컬 Docker 컨테이너에 Neo4j를 실행하여 오프라인 모드를 지원하고, 네트워크 연결 시 클라우드 데이터베이스와 동기화하는 하이브리드 아키텍처를 고려할 수 있습니다.
