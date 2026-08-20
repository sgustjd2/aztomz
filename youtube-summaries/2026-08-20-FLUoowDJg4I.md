---
title: "How I automate my own job at Hugging Face using agents — Niels Rogge, Hugging Face"
videoId: FLUoowDJg4I
url: https://www.youtube.com/watch?v=FLUoowDJg4I
channel: "AI Engineer"
publishedAt: 2026-08-20
summarizedAt: 2026-08-20
model: gemini-2.5-flash
---

# How I automate my own job at Hugging Face using agents — Niels Rogge, Hugging Face

🔗 https://youtu.be/FLUoowDJg4I · 📅 2026-08-20 · 🎙 AI Engineer

## 한 줄 요약
발표자는 Hugging Face에서 연구 논문의 모델 및 데이터셋을 Hugging Face Hub에 업로드하도록 연구자들에게 연락하는 자신의 업무를 AI 에이전트를 활용하여 자동화한 경험을 공유합니다.

## 발표자·소속
Niels Rogge, Hugging Face 머신러닝 엔지니어

## 핵심 주장
- 연구자들이 모델과 데이터셋을 Google Drive, GitHub 릴리스, Dropbox, Zenodo 등 다양한 플랫폼에 게시하여 검색 가능성이 낮아지는 문제를 해결하기 위해 Hugging Face Hub를 중앙 집중식 플랫폼으로 활용해야 합니다.
- 수백 개의 arXiv 논문을 수동으로 처리하는 것은 확장성이 떨어지므로, AI 에이전트를 사용하여 연구자들에게 자동으로 연락하고 아티팩트 업로드를 독려하는 프로세스를 자동화했습니다.
- 에이전트 개발 시, 초기에는 예측 가능성과 관리 용이성을 위해 결정론적 워크플로우를 선택했지만, 후속 작업에서는 유연성을 위해 Anthropic의 Claude Agents SDK와 같은 자율 에이전트 접근 방식을 채택했습니다.
- 에이전트는 GitHub Actions의 CRON 작업을 통해 매일 수백 개의 논문을 처리하며, Langfuse를 사용하여 LLM 호출의 입력, 출력, 비용, 지연 시간 등을 추적하여 에이전트의 동작을 모니터링합니다.

## 세부 내용
발표자는 Hugging Face의 커뮤니티 과학 팀에서 일하며 겪었던 문제점을 설명합니다. 많은 연구자가 모델 가중치나 데이터셋을 Google Drive, GitHub 릴리스, Dropbox, Zenodo 등 다양한 서비스에 업로드하여 다른 사람들이 해당 연구를 찾고 재현하기 어렵게 만듭니다. Hugging Face Hub는 메타데이터 태그와 문서화를 통해 아티팩트의 검색 가능성을 높이고, 전용 Python SDK와 CLI를 통해 업로드 및 다운로드를 용이하게 하여 연구 홍보에도 기여합니다.

이러한 수동 작업의 비확장성 문제를 해결하기 위해 발표자는 AI 에이전트를 통한 자동화를 시도했습니다. 에이전트는 arXiv 논문에서 GitHub URL을 식별하고, GitHub README를 읽어 새로운 아티팩트(모델, 데이터셋, 스페이스)를 확인합니다. 만약 아티팩트가 이미 Hugging Face에 있다면 모델/데이터셋 카드 개선을 위한 Pull Request를 열고, 없다면 GitHub Issue를 열어 업로드를 요청합니다. 마지막으로 저자와의 후속 조치도 진행합니다.

에이전트 개발 방식으로는 결정론적 워크플로우와 자율 AI 에이전트 두 가지를 고려했습니다. 초기에는 Anthropic의 "Building effective agents" 블로그 게시물 조언에 따라 예측 가능하고 관리하기 쉬운 결정론적 워크플로우를 선택하여 LLM API를 직접 사용했습니다. 이 워크플로우는 "단일 논문 처리 파이프라인"으로 구현되었으며, URL 찾기, GitHub 프로젝트 추출, 아티팩트 분류, 다수결 투표, GitHub Issue/PR 생성, 데이터 지속의 7단계로 구성됩니다.

이 워크플로우는 GitHub Actions의 간단한 CRON 작업으로 배포되어 매일 밤 수백 개의 arXiv 논문을 파싱합니다. 에이전트의 동작을 추적하고 모니터링하기 위해 Langfuse를 사용하며, 이를 통해 LLM 호출의 입력, 출력, 프롬프트, 비용, 지연 시간 등을 확인할 수 있습니다.

후속 조치 자동화를 위해 발표자는 Anthropic의 Claude Agents SDK를 사용하여 AI 에이전트를 구축했습니다. 이 에이전트는 Modal에 배포되며, Hugging Face CLI 스킬과 GLM-5.2 모델(Hugging Face Inference Providers 경유)을 사용하여 GitHub 이슈에 댓글을 달고 Slack에 결과를 게시합니다. Modal의 배치 처리 기능을 활용하여 각 GitHub 이슈를 별도의 컨테이너에서 병렬로 처리합니다. 이 에이전트는 Cursor에서 "process-unread-model"이라는 스킬로 호출되어 모든 읽지 않은 GitHub 이슈와 허브 알림을 가져와 처리하고 Slack에 결과를 게시합니다.

이 자동화의 결과로, 에이전트가 생성한 GitHub 이슈에 대한 많은 긍정적인 반응이 있었으며, Apple, Google DeepMind, Baidu PaddlePaddle 팀과 같은 주요 연구 기관들이 Hugging Face Hub에 아티팩트를 업로드했습니다. 발표자는 에이전트가 봇임을 명시적으로 밝히지 않았는데, 이는 사람들이 봇과 더 자연스럽게 상호작용하도록 유도하기 위함입니다. 또한, 에이전트가 모델 카드 템플릿을 자동으로 완성하는 등의 유용한 기능도 수행합니다.

발표자는 AI 슬롭(slop)을 피하기 위해 LLM 평가(LLM Evals)의 중요성을 강조하며, Hamel Husain의 "LLM Evals: Everything You Need to Know" 블로그 게시물을 추천합니다.

다른 노력으로는 @DailyPapers라는 트위터 계정을 운영하여 Hugging Face의 인기 논문과 아티팩트를 4시간마다 또는 새로운 흥미로운 내용이 릴리스될 때마다 자동으로 공유합니다. 이 계정은 이미 9만 명 이상의 팔로워를 보유하고 있으며, Gemini를 사용하여 트윗에 포함할 최적의 시각 자료를 결정합니다. 또한, "Papers with Code(.co)" 웹사이트를 부활시켜 모든 도메인에서 최신 기술(SOTA)을 자동으로 찾고, 미드 트레이닝(mid-training)과 같은 기술 용어를 학습할 수 있는 교육 자료를 제공하는 데 기여하고 있습니다.

## 인상적인 대목
- "연구자들이 Google Drive에서 Hugging Face Hub로 YOLOV1 가중치와 비디오 데이터셋을 마이그레이션하는 것이 완벽하게 합리적이라고 생각합니다." (Regarding the artifacts, migrating the YOLOV1 weights and our video dataset from Google Drive to the Hugging Face Hub makes perfect sense.)
- "에이전트 SDK는 'Anthropic Way'로 에이전트를 구축하는 가장 좋은 방법입니다." (The Agent SDK is the best way to build agents in the "Anthropic Way".)
- "제 에이전트가 매일 밤 너무 많은 GitHub 이슈를 열어서, 읽지 않은 GitHub 알림이 너무 많습니다." (Results: many, many unread GitHub notifications 😭)
- "다시 한번, 논문을 Hugging Face에 업로드하고, 논문 페이지에 연결하고, GitHub README에 언급해 주셔서 감사합니다. 모든 것이 훌륭해 보입니다." (Hey @OmriBranch, thank you for uploading the artifacts to the Hugging Face, linking them to the paper page, and mentioning them in the GitHub README. Everything looks great.)

## 실무 적용 포인트
- **아티팩트 중앙화:** 연구 결과물(모델, 데이터셋)을 Hugging Face Hub와 같은 중앙 집중식 플랫폼에 게시하여 검색 가능성과 재현성을 높이는 것을 고려해야 합니다.
- **LLM API 직접 활용:** 복잡한 에이전트 프레임워크 대신 LLM API를 직접 호출하는 결정론적 워크플로우로 시작하여 예측 가능성과 제어력을 확보하는 것이 좋습니다.
- **CRON 작업 및 GitHub Actions:** 반복적인 자동화 작업은 GitHub Actions의 CRON 작업을 활용하여 무료로 효율적으로 배포하고 관리할 수 있습니다.
- **에이전트 모니터링:** Langfuse와 같은 도구를 사용하여 LLM 에이전트의 입력, 출력, 비용, 지연 시간 등을 추적하고 관찰하여 성능을 최적화하고 문제를 디버깅해야 합니다.
