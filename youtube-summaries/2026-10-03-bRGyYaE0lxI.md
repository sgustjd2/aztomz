---
title: "GPU Died. Training Didn't: Self-Healing Training at Scale — Crusoe"
videoId: bRGyYaE0lxI
url: https://www.youtube.com/watch?v=bRGyYaE0lxI
channel: "AI Engineer"
publishedAt: 2026-10-03
summarizedAt: 2026-10-04
model: gemini-2.5-flash
---

# GPU Died. Training Didn't: Self-Healing Training at Scale — Crusoe

🔗 https://youtu.be/bRGyYaE0lxI · 📅 2026-10-03 · 🎙 AI Engineer

## 한 줄 요약
Crusoe는 Slurm과 Kubernetes를 통합하여 GPU 하드웨어 오류 발생 시에도 AI 훈련 작업을 자동으로 감지, 복구 및 재개하여 대규모 훈련의 가용성과 효율성을 높이는 솔루션을 제공합니다.

## 발표자·소속
*   Connor Guerrero: Developer Advocate, Crusoe
*   Young Jeong: Staff Solutions Engineer, Crusoe
*   Nikhil Gupta: Senior Software Engineer, Crusoe

## 핵심 주장
*   **자동화된 장애 복구:** 대규모 GPU 훈련 환경에서 하드웨어 오류는 불가피하며, 수동 개입은 비효율적입니다. Crusoe는 Slurm과 Kubernetes를 결합하여 GPU 노드 오류를 자동으로 감지하고 교체함으로써 훈련 중단 시간을 최소화합니다.
*   **통합된 인프라 관리:** Slurm의 고성능 작업 스케줄링과 Kubernetes의 인프라 복원력을 결합하여, ML 엔지니어는 익숙한 Slurm 명령어를 사용하고 플랫폼 팀은 Kubernetes를 통해 모든 서비스를 단일 제어 평면에서 관리할 수 있습니다.
*   **유연한 자원 활용:** 모든 GPU가 단일 풀에 존재하여, 동일한 노드에서 Slurm을 통한 훈련 작업과 Kubernetes를 통한 장기 실행 추론 서비스를 동시에 제공할 수 있습니다. 이는 자원 활용률을 극대화하고 동적인 워크로드 요구사항에 대응할 수 있게 합니다.

## 세부 내용
발표는 AI 엔지니어 월드 페어에서 Crusoe 팀이 대규모 AI 훈련에서 하드웨어 오류를 어떻게 처리하는지에 대한 내용으로 시작했습니다. Connor Guerrero는 수천 개의 GPU를 사용하는 대규모 훈련 워크로드에서 GPU 오류는 피할 수 없으며, 수동 복구는 지속 불가능하다고 지적했습니다. Crusoe는 Slurm과 Kubernetes를 활용하여 자동화된 복구 기능을 갖춘 견고한 플랫폼을 제공함으로써, ML 엔지니어와 플랫폼 팀 모두에게 사용 편의성을 유지한다고 설명했습니다.

Crusoe Cloud는 IaaS(Infrastructure as a Service)를 제공하며, 컴퓨팅, 스토리지, 네트워킹, 최신 Nvidia 및 AMD GPU를 포함합니다. 이 발표의 초점은 Crusoe Managed Kubernetes(CMK)와 그 위에 구축된 Crusoe Managed Slurm(Slinky 기반)이라는 툴링에 맞춰졌습니다. Slinky는 Slurm을 Kubernetes 위에서 실행하기 위한 SchedMD의 공식 오픈소스 프로젝트입니다. 특히, Crusoe는 실패한 GPU 노드를 자동으로 감지하고 교체하는 "AutoClusters"라는 시스템을 개발했습니다.

Young Jeong은 전통적인 Slurm의 장점과 한계를 설명했습니다. Slurm은 고성능 컴퓨팅(HPC)을 위해 개발되었으며, 대규모 멀티 노드 AI 훈련 워크로드에 잘 적용됩니다. 토폴로지 인식, 갱 스케줄링, 파티션 관리 등 연구자들이 익숙한 기능과 도구를 제공합니다. 그러나 Slurm은 정적이고 분할된 작업에 적합하여 현대 AI 훈련의 동적 자원 할당 요구사항에는 미치지 못합니다. 또한, 노드 상태 확인 및 GPU 오류 발생 시 수동 개입이 필요하며, 작업 실패 원인을 상세히 진단하기 위한 포괄적인 텔레메트리 기능이 부족하다는 한계가 있습니다.

Nikhil Gupta는 Crusoe Managed Slurm이 이러한 한계를 어떻게 극복하는지 설명했습니다. Crusoe Managed Slurm은 Slurm의 스케줄링 성능과 Kubernetes의 클라우드 네이티브 인프라 복원력을 결합합니다. Kubernetes는 Slurm 구성 요소의 상태를 자동으로 관리하며, CMK 플랫폼의 모든 기능(메트릭, 관찰 가능성, 노드 복구)이 Slurm과 함께 작동합니다. ML 엔지니어는 `sbatch`, `srun` 등 익숙한 Slurm 명령어를 그대로 사용하여 기존 스크립트를 실행할 수 있습니다. GPU 토폴로지는 자동으로 구성되며, 스토리지, 네트워킹, GPU 구성은 미리 설정되고 관리됩니다.

가장 중요한 기능 중 하나는 "AutoClusters"를 통한 자동화된 노드 복구입니다. 노드에 오류가 발생하면 AutoClusters가 사전 검증된 예비 풀에서 해당 노드를 자동으로 교체합니다. 이는 Kubernetes에 익숙한 팀이 Slurm 클러스터를 배포하고 관리하는 데 겪는 어려움이나, Slurm에 익숙한 팀이 Kubernetes 프레임워크에 적응하는 데 드는 마찰을 줄여줍니다. Crusoe Slurm Operator(CSO)는 Slurm 사용자, 파티션, 구성 및 스토리지를 관리하여 단일 명령으로 Slurm 환경을 Kubernetes 클러스터 내에 프로비저닝할 수 있게 합니다.

Connor는 XID 79 오류(GPU 사용 불가)와 같은 노드 오류 발생 시의 전체 복구 흐름을 시연했습니다.
1.  사용자에게 오류가 감지되었음을 알립니다(사용자의 조치 불필요).
2.  Slurm은 해당 노드를 다운 상태로 설정하고 실행 중인 작업을 취소합니다.
3.  프로세스는 SIGTERM 신호를 받아 종료되기 전 최대 2분 동안 체크포인트를 저장하거나 로그를 플러시할 시간을 갖습니다.
4.  AutoClusters는 다음 단계를 수행합니다:
    *   자동 교체 비활성화 라벨이 없는지 확인합니다.
    *   노드를 드레인합니다.
    *   노드 교체: 비정상 노드를 제거하고 예비 용량에서 새로운 정상 노드를 추가합니다.
    *   경고 및 복구 기록을 로깅합니다.
5.  Slurm 작업은 정상 노드가 준비될 때까지 기다립니다.
6.  Slurm 작업이 시작되고, 애플리케이션 코드가 모델과 체크포인트를 로드하여 훈련을 재개합니다.

데모에서는 PyTorch 훈련 스크립트가 실행되는 동안 시뮬레이션된 XID 79 오류가 주입되었습니다. 오류 발생 즉시 GPU 활용률이 0으로 떨어졌고, Crusoe Cloud 콘솔의 "Remediations" 탭에서 AutoClusters 노드 교체가 시작되는 것이 확인되었습니다. 사용자에게는 오류 감지 및 노드 교체 시작을 알리는 이메일 알림이 전송되었습니다. 전체 프로세스(오류 감지부터 정상 노드 복구 및 훈련 재개까지)는 15분 미만이 소요되었으며, GPU 활용률은 정상 수준으로 돌아왔습니다. 이는 엔지니어가 밤중에 로그인하여 몇 시간 동안 디버깅하는 것보다 훨씬 효율적입니다.

Crusoe는 이 모든 과정을 "1-click Slurm"으로 제공합니다. 단일 명령어로 Kubernetes 클러스터, Slurm 컨트롤러, 로그인 노드, 스토리지를 포함한 완전한 Slurm 환경을 프로비저닝할 수 있습니다. GPU 워커 노드 추가도 단일 명령어로 가능합니다. AutoClusters는 기본적으로 활성화되어 있습니다.

## 인상적인 대목
*   "Failures are inevitable. The architecture of infrastructure should be designed in a way so that when there is a critical error, all the right actions are handled autonomously, and engineers can focus on building their application and not worrying about the infrastructure." (실패는 불가피합니다. 인프라 아키텍처는 치명적인 오류가 발생했을 때 모든 올바른 조치가 자율적으로 처리되도록 설계되어야 하며, 엔지니어는 인프라에 대해 걱정하지 않고 애플리케이션 구축에 집중할 수 있어야 합니다.)

## 실무 적용 포인트
*   **자동화된 장애 복구 시스템 도입:** 대규모 AI 훈련 환경에서는 GPU 오류가 빈번하므로, AutoClusters와 같은 자동화된 노드 복구 시스템을 구축하거나 활용하여 훈련 중단 시간을 최소화해야 합니다.
*   **Kubernetes 기반 Slurm 통합:** Slurm의 고성능 스케줄링과 Kubernetes의 복원력 및 관리 용이성을 결합하는 아키텍처(예: Crusoe Managed Slurm)를 고려하여, ML 엔지니어와 인프라 팀 간의 운영 부담을 줄이고 효율성을 높일 수 있습니다.
*   **단일 제어 평면 관리:** Slurm 클러스터를 Kubernetes 위에 서비스로 통합하여, 모든 GPU 자원과 서비스를 단일 제어 평면에서 관리하고 모니터링함으로써 운영 복잡성을 줄이고 자원 할당의 유연성을 확보할 수 있습니다.
*   **체크포인트 및 로그 관리 자동화:** 노드 오류 시 훈련 작업이 중단되기 전 체크포인트를 저장하고 로그를 플러시하는 과정을 자동화하여, 훈련 재개 시 데이터 손실을 방지하고 디버깅 효율성을 높여야 합니다.
