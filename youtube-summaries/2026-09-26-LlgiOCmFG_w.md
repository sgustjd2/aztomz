---
title: "Fixing the PR Bottleneck — Matt Pocock, AIHero"
videoId: LlgiOCmFG_w
url: https://www.youtube.com/watch?v=LlgiOCmFG_w
channel: "AI Engineer"
publishedAt: 2026-09-26
summarizedAt: 2026-09-26
model: gemini-2.5-flash
---

# Fixing the PR Bottleneck — Matt Pocock, AIHero

🔗 https://youtu.be/LlgiOCmFG_w · 📅 2026-09-26 · 🎙 AI Engineer

## 한 줄 요약
AI 에이전트를 활용하여 코드 품질을 높이고 PR(Pull Request) 검토 과정을 가속화하며, 인간의 개입이 필요한 부분을 최소화하여 개발 효율성을 극대화하는 방법을 제시합니다.

## 발표자·소속
Matt Pocock, AIhero

## 핵심 주장
- **PR 병목 현상 해결:** AI 에이전트가 자동화된 검사 및 검토를 통해 PR 처리 속도를 높여, 개발 조직이 겪는 PR 병목 현상을 해결할 수 있습니다.
- **자동화된 검사(Automated Checks)의 중요성:** 린팅, 테스트, 타입 체킹 등 결정론적 검사는 비용이 저렴하므로 최대한 많이 활용하여 코드 품질을 초기 단계에서 확보해야 합니다.
- **자동화된 검토(Automated Review)의 역할:** AI 에이전트가 코드 품질 표준을 기반으로 코드를 검토하고 직접 수정(커밋)하여 인간 검토자의 부담을 줄여야 합니다.
- **인간 검토(Human Review)의 효율화:** 자동화된 검사와 검토를 통해 PR의 품질을 높여 인간 검토의 필요성을 줄이고, 인간은 중요도가 높은 PR이나 시스템 개선에 집중해야 합니다.
- **코드베이스 설계 개선:** '깊은 모듈(Deep Modules)'과 같은 좋은 코드베이스 설계를 통해 구조 의존적인 테스트를 줄이고, AI 에이전트가 더 효과적으로 코드를 이해하고 작업할 수 있도록 환경을 조성해야 합니다.

## 세부 내용
발표자는 AI 시대에 PR 병목 현상이 심화되고 있으며, 이를 해결하기 위해 '소프트웨어 팩토리' 개념을 도입해야 한다고 주장합니다. 소프트웨어 팩토리는 AI 에이전트가 버그 보고서, 지원 티켓, 느린 쿼리 등 다양한 입력을 받아 코드를 생성하고 수정하는 과정을 자동화하는 시스템입니다.

이러한 자동화된 흐름에서 코드 품질을 유지하기 위한 세 가지 '브레이크'를 제시합니다.
1.  **자동화된 검사(Automated Checks):** 린팅, 테스트, 타입 체킹, 코드 품질 지표 등 결정론적인 검사를 의미합니다. 이는 CPU 사이클만 소모하므로 비용이 저렴하여 최대한 많이 적용해야 합니다. 그러나 이러한 검사도 '동어반복적 테스트(Tautological Tests)'나 '구조 의존적 테스트(Structure-Sensitive Tests)', '실패할 수 없는 테스트(Tests That Can't Fail)'와 같이 거짓말을 할 수 있습니다. 발표자는 `export const X_POST_CHARACTER_LIMIT = 280;`과 같은 코드에 대해 `expect(X_POST_CHARACTER_LIMIT).toBe(280);`와 같이 구현을 그대로 재확인하는 테스트가 동어반복적 테스트의 예시라고 설명합니다. 또한, UI 요소의 순서를 확인하기 위해 소스 파일을 직접 읽어들이는 테스트는 구조 의존적 테스트의 예시로, 코드 구조가 변경되면 쉽게 실패한다고 지적합니다. `AudioContext` API를 스터빙(stubbing)하여 테스트하는 경우, 실제 API의 복잡한 오류 모드를 테스트하지 못해 프로덕션에서 문제가 발생할 수 있는 '실패할 수 없는 테스트'의 문제점도 언급합니다.

2.  **자동화된 검토(Automated Review):** AI 에이전트가 코드를 검토하여 자동화된 검사의 '거짓말'을 찾아내는 역할을 합니다. 발표자는 코딩 표준을 구현 에이전트(Implementer)에 직접 넣지 말고, 별도의 검토 에이전트(Reviewer)가 `CODING_STANDARDS.md`와 같은 파일을 읽어 코드를 검토하도록 해야 한다고 강조합니다. 구현 에이전트는 '작동하게 만드는 것(Make It Work)'에 집중하고, 검토 에이전트는 '좋게 만드는 것(Make It Good)'에 집중해야 합니다. 검토 에이전트는 탐색(Exploration) 외에 구현이나 디버깅이 거의 필요 없으므로, 코딩 표준을 적용하기에 적합하며, 이는 '오버로드된 구현'과 '언더로드된 검토'라는 비유로 설명됩니다. 또한, 자동화된 검토는 인간에게 코멘트를 남기는 대신, 직접 코드를 수정하여 커밋해야 한다고 주장합니다.

3.  **인간 검토(Human Review):** 자동화된 검사와 검토를 통해 PR의 품질을 높여 인간 검토의 부담을 최소화해야 합니다. 인간 검토자는 PR의 중요도를 판단하여 에너지를 효율적으로 분배해야 합니다. '단방향 또는 양방향 문(One-Way or Two-Way Door)' 개념을 사용하여, 쉽게 되돌릴 수 있는 변경(양방향 문)은 가볍게 검토하고, 데이터 손실이나 복잡한 마이그레이션이 수반되는 변경(단방향 문)은 신중하게 검토해야 합니다. 또한, '폭발 반경(Blast Radius)'을 고려하여 문제가 발생했을 때의 영향도를 평가해야 합니다. PR 본문은 '의도(why)'를 빠르게 이해할 수 있도록 의사 코드(Pseudocode)나 다이어그램(`show-me` 스킬)을 활용하여 작성해야 합니다. 마지막으로, 인간 검토는 시스템 자체를 검토하는 것이며, 같은 코멘트를 두 번 다시 작성하지 않도록 `retro` 스킬을 활용하여 자동화된 검사 및 코딩 표준을 지속적으로 개선해야 한다고 제안합니다.

발표자는 `aihero.dev/skills`에서 제공되는 `/improve-codebase-architecture`, `/code-review`, `/pr`, `/retro`, `/show-me` 등의 스킬을 통해 이러한 원칙들을 실현할 수 있다고 소개하며, 버전 1.3이 이번 주에 출시될 예정이라고 언급합니다.

## 인상적인 대목
- "If you just have permanent acceleration pushing stuff through your factory, you're going to end up with a slop cannon." (공장에 영구적인 가속만 가하면, 결국 엉망진창이 될 것입니다.)
- "Code is the environment your agent operates in. And if you have bad code in your codebase, that is going to beget more bad code." (코드는 에이전트가 작동하는 환경입니다. 코드베이스에 나쁜 코드가 있으면, 그것은 더 나쁜 코드를 낳을 것입니다.)
- "Automated/human review is for finding lies in the automated checks." (자동화/인간 검토는 자동화된 검사에서 거짓말을 찾는 것입니다.)
- "/implement = Make It Work, /code-review = Make It Good" (구현 = 작동하게 만들기, 코드 검토 = 좋게 만들기)
- "Don't outsource automated review. Build your own." (자동화된 검토를 아웃소싱하지 마십시오. 직접 구축하십시오.)
- "Automated review should NOT burden humans with comments to review and fix. Commits, Not Comments." (자동화된 검토는 인간에게 검토하고 수정할 코멘트 부담을 주어서는 안 됩니다. 코멘트가 아닌 커밋이어야 합니다.)
- "Review the system, not just the code." (코드만이 아닌 시스템을 검토하십시오.)
- "Never write the same comment twice." (같은 코멘트를 두 번 다시 작성하지 마십시오.)

## 실무 적용 포인트
- **자동화된 검사 강화:** 린팅, 단위 테스트, 통합 테스트, 타입 체킹 등 결정론적인 자동화된 검사를 최대한 많이 도입하고 실행 빈도를 높여 코드 품질 문제를 초기에 발견합니다.
- **코딩 표준 문서화 및 자동화된 검토 활용:** 팀의 코딩 표준을 `CODING_STANDARDS.md`와 같은 문서로 명확히 정의하고, 이를 기반으로 AI 에이전트가 PR을 검토하고 직접 수정하도록 설정합니다. 이를 통해 인간 검토자의 반복적인 피드백을 줄입니다.
- **PR 설명 개선:** PR 본문에 변경 사항의 '이유(why)'를 명확히 설명하고, 의사 코드, 다이어그램(`show-me` 스킬 활용) 등 시각적인 자료를 포함하여 인간 검토자가 빠르게 핵심을 파악할 수 있도록 돕습니다.
- **인간 검토의 전략적 접근:** 모든 PR을 동일하게 검토하기보다, '단방향 문' 변경(예: 데이터 마이그레이션, 중요한 아키텍처 변경)이나 '폭발 반경'이 큰 변경에 인간 검토자의 시간을 집중하고, 쉽게 되돌릴 수 있는 '양방향 문' 변경은 AI 에이전트에게 더 많은 권한을 부여합니다.
- **회고(Retrospective)를 통한 지속적인 개선:** `/retro` 스킬을 활용하여 과거 PR 검토 세션을 분석하고, 반복적으로 발생하는 문제에 대한 자동화된 검사나 코딩 표준을 제안하여 다음 검토 과정을 더 효율적으로 만듭니다.
