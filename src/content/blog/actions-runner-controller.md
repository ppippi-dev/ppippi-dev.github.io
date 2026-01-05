---
description: MLOps CI 환경 구축하기
heroImage: /img/2025-07-03/0.png
pubDate: '2025-07-03'
tags:
- MLOps
- Infra
title: Actions Runner Controller 구축하기
---

### Intro

최근 AI를 활용한 개발을 즐겨하면서, 테스트 환경의 중요성을 더욱 절감하고 있습니다.

가장 대표적인 방법으로는 GitHub Actions을 이용한 CI 구축이 있겠지만, MLOps에서는 CI를 위해 고사양의 인스턴스가 필요한 경우가 꽤 많습니다.

물론 GitHub Actions에서 제공하는 [GPU 인스턴스(Linux 4 코어)](https://docs.github.com/ko/billing/managing-billing-for-your-products/about-billing-for-github-actions)도 존재하지만, 현재 기준으로 분당 $0.07라는 매우 비싼 금액으로 설정되어 있어 사용하기 부담스럽습니다.

GPU의 종류도 Nvidia T4 GPU로, 모델의 크기가 점점 커지는 상황에서 성능상 제약이 있습니다.

이런 상황에서 대안으로 Self-hosted runner가 존재합니다.

말 그대로, 직접 Runner를 설정하고 해당 Runner에서 GitHub workflow를 실행시키는 방법입니다.

해당 방법은 아래와 같이, GitHub에서 제공해주는 [자체 호스트형 실행기 추가](https://docs.github.com/ko/actions/how-tos/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)를 통해 설정할 수 있습니다.

하지만, 해당 방법은 CI 머신을 항상 켜둬야 하는(online 상태) 문제점이 있습니다. CI/CD 작업이 드물게 일어나는 경우 비효율적일 수 있습니다.

이러한 배경에서 **Actions Runner Controller(ARC)**가 훌륭한 대안으로 떠오릅니다.

[Actions Runner Controller](https://github.com/actions/actions-runner-controller)는 GitHub Actions의 Runner를 Kubernetes 환경에서 동작할 수 있도록 제어해주는 오픈소스입니다.

이를 이용하면, GitHub Actions의 Workflow가 실행될 경우에만 본인이 운영하는 Kubernetes 리소스를 이용해 CI를 테스트할 수 있습니다.


### Actions Runner Controller 설치하기

ARC 설치 과정은 크게 두 단계로 나뉩니다.
1.  GitHub과의 통신 및 인증을 위한 **GitHub Personal Access Token** 생성
2.  Helm을 이용한 **ARC 설치** 및 생성한 token을 통한 인증

#### 1. GitHub Personal Access Token 생성하기

ARC가 GitHub API와 상호작용하며 Runner를 등록하고 관리하려면 인증이 필요합니다. 이를 위해 GitHub Personal Access Token(PAT)을 생성합니다.

*   **경로**: `Settings` > `Developer settings` > `Personal access tokens` > `Tokens (classic)` > `Generate new token`

Personal Access Token 생성 시 [적절한 권한](https://github.com/actions/actions-runner-controller/blob/master/docs/authenticating-to-the-github-api.md#deploying-using-pat-authentication)을 선택해야 합니다. ( 편의상 풀 권한 부여 )

> 보안을 위해서, 최소권한 및 키 만료기한 설정을 권장합니다.

Personal Access Token(PAT) 방식보다, Github App 방식으로 인증하는 것을 권장하는 것처럼 보입니다.

생성한 Personal Access Token은 다음 단계에서 ARC를 설치할 때 필요하므로 잘 보관해 둡니다.

#### 2. Helm으로 ARC 설치하기


ARC를 설치하기 전, cert-manager가 필요합니다. cert-manager가 클러스터에 셋팅되어 있지 않으면 설치합니다.

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.2/cert-manager.yaml
```


이제 Helm을 사용하여 쿠버네티스 클러스터에 ARC를 설치할 차례입니다.






앞에서 생성한 Personal Access Token을 사용하여 ARC를 설치합니다. 아래 명령어에서 `YOUR_GITHUB_TOKEN` 값을 앞에서 생성한 PAT 값으로 변경해주세요.


```bash
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller

helm repo update

helm pull actions-runner-controller/actions-runner-controller

tar -zxvf actions-runner-controller-*.tgz

export GITHUB_TOKEN=YOUR_GITHUB_TOKEN

helm upgrade --install actions-runner-controller ./actions-runner-controller \
  --namespace actions-runner-system \
  --create-namespace \
  --set authSecret.create=true \
  --set authSecret.github_token="${GITHUB_TOKEN}"
```

설치 완료 후, 다음 명령어로 ARC 컨트롤러가 정상적으로 실행되고 있는지 확인합니다:

```bash
kubectl get pods -n actions-runner-system
```

위 명령이 성공적으로 실행되면, `actions-runner-system` 네임스페이스에 ARC 컨트롤러 매니저 포드가 실행되는 것을 확인할 수 있습니다.

이제 ARC가 GitHub과 통신할 준비를 마쳤습니다! 다음 단계는 실제로 워크플로우를 실행할 Runner를 정의하는 것입니다.

### 3. Runner 설정하기

ARC 컨트롤러는 설치했지만, 아직 워크플로우를 실행할 Runner 자체는 없습니다. 이제 GitHub Actions 워크플로우 잡에 따라 Runner Pod를 생성해야 합니다.

이를 위해 두 가지 리소스를 사용합니다.
1.  `RunnerDeployment`: Runner 포드의 템플릿 역할을 합니다. 어떤 컨테이너 이미지를 사용하고, 어떤 GitHub 저장소에 연결되며, 어떤 레이블을 가질지 등을 정의합니다.
2.  `HorizontalRunnerAutoscaler` (HRA): `RunnerDeployment`를 관찰하면서, GitHub에 대기 중인 잡의 수에 따라 `RunnerDeployment`의 복제본(replicas) 수를 자동으로 조절합니다.

#### RunnerDeployment 정의

먼저, `runner-deployment.yml`이라는 이름으로 아래와 같이 파일을 작성합니다. `spec.template.spec.repository` 값을 자신의 GitHub 저장소 이름으로 변경해주세요.

> repository 뿐만 아니라, 권한이 있는 경우 organization으로도 지정할 수 있습니다.

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: example-runner-deployment
  namespace: actions-runner-system
spec:
  replicas: 1
  template:
    spec:
      repository: <YOUR_NAME>/<YOUR_REPO_NAME>
      labels:
        - self-hosted
        - arc-runner
```

다음과 같이 설정하면, Github Repo Actions self-hosted runner를 확인할 수 있습니다.

<img src="/img/2025-07-03/1.webp">

배포가 완료되면 잠시 후 GitHub 저장소의 **Settings > Actions > Runners** 탭에 `self-hosted`와 `arc-runner` 레이블을 가진 새로운 Runner가 등록된 것을 확인할 수 있습니다.


#### HorizontalRunnerAutoscaler 정의

다음으로, 위에서 만든 `RunnerDeployment`를 자동으로 스케일링할 HRA를 정의합니다. `hra.yml` 파일을 작성합니다.

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: example-hra
  namespace: actions-runner-system
spec:
  scaleTargetRef:
    name: example-runner-deployment
  minReplicas: 0
  maxReplicas: 5
```

minReplicas와 maxReplicas를 지정하여, 리소스에 따라 스케일업, 다운 할 수 있습니다.

혹은 추가적인 metrics를 지정하여 workflow trigger가 있을 때마다, pod를 생성하도록 구성할 수도 있습니다. 이 외에도 다양한 metrics가 존재합니다.

> HorizontalRunnerAutoscaler 를 구성했을 경우, 필요할 때만 Runner가 생성되는 구조로, 평시에는(runner가 0개일 경우) Github UI에서 Runner를 확인할 수 없습니다.

<img src="/img/2025-07-03/2.webp">




```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: example-hra
  namespace: actions-runner-system
spec:
  scaleTargetRef:
    name: example-runner-deployment
  minReplicas: 0
  maxReplicas: 5
  metrics:
  - type: TotalNumberOfQueuedAndInProgressWorkflowRuns
    repositoryNames: ["<YOUR_NAME>/<YOUR_REPO_NAME>"]

위는 제가 가장 선호하는 metric으로, workflow 실행이 필요할 때(Queue 상태 일 때) Scale up하는 메트릭입니다.
이와 같이, 필요에 따라 metrics를 지정하여 좋은 결과를 만들 수 있습니다.


### 4. GitHub Actions 워크플로우에서 사용하기

이제 모든 설정이 끝났습니다! 새로 만든 ARC Runner를 사용하는 것은 매우 간단합니다. 워크플로우 파일에서 `runs-on` 키에 `RunnerDeployment`에서 지정한 레이블을 넣어주기만 하면 됩니다.

저장소의 `.github/workflows/` 디렉토리에 아래와 같이 간단한 테스트 워크플로우(`test-arc.yml`)를 추가해봅시다.

```yaml
name: ARC Runner Test

on:
  push:
    branches:
      - main

jobs:
  test-job:
    runs-on: [self-hosted, arc-runner]
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Test
        run: |
          echo "Hello from an ARC runner!"
          echo "This runner is running inside a Kubernetes pod."
          sleep 10
```

`runs-on: [self-hosted, arc-runner]` 부분이 핵심입니다. 이 워크플로우가 실행되면 GitHub은 `self-hosted`와 `arc-runner` 레이블을 모두 가진 Runner에게 잡을 할당합니다. ARC는 이 이벤트를 감지하고, HRA 설정에 따라 필요하다면 새로운 Runner 포드를 생성하여 잡을 처리합니다.

> self-hosted로 구성할 경우, 깃헙에서 기본으로 제공하는 runner와 달리 일부 패키지들의 설치를 workflow에서 진행해야할 수 있습니다.


### 삽질 기록

CI/CD를 위해서 Docker를 자주 사용하는데, 자주 겪는 문제중 하나가 DinD(Docker in Docker) 문제입니다.

ARC의 경우, 기본적으로 runner라는 스케줄링 컨테이너와 docker라는 docker 데몬 컨테이너가 사이드카 구조로 같이 뜹니다.

이런 경우를 해결하기 위해, DinD를 지원하는 docker image가 존재합니다.

다음 yaml 파일같이, image 및 dockerdWithinRunnerContainer를 지정하면, runner 안에서 docker 데몬이 실행되고

workflow가 해당 runner에서 실행됩니다.

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: example-runner-deployment
  namespace: actions-runner-system
spec:
  replicas: 1
  template:
    spec:
      repository: <YOUR_NAME>/<YOUR_REPO_NAME>
      labels:
        - self-hosted
        - arc-runner
      image: "summerwind/actions-runner-dind:latest"
      dockerdWithinRunnerContainer: true
```

특히 GPU를 필요로 하는 docker 테스트의 경우 NVIDIA Container Toolkit이 설치된 cluster에서 위의 DinD 이미지를 사용하면
GPU를 인식할 수 있습니다.

실행하고자 하는 workflow에서 아래와 같이 설정하면, DinD 상황에서도 GPU가 정상적으로 설정된 것을 확인할 수 있습니다.
(NVIDIA Container Toolkit 및 NVIDIA GPU Driver Plugin 버전 확인은 필요합니다!)

```bash
# GPU 디바이스 확인
ls -la /dev/nvidia*

# device library setup
smi_path=$(find / -name "nvidia-smi" 2>/dev/null | head -n 1)
lib_path=$(find / -name "libnvidia-ml.so" 2>/dev/null | head -n 1)
lib_dir=$(dirname "$lib_path")
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname "$lib_path")
export NVIDIA_VISIBLE_DEVICES=all
export NVIDIA_DRIVER_CAPABILITIES=compute,utility

# nvidia runtime 없이 직접 GPU 디바이스와 라이브러리 마운트
docker run -it \
  --device=/dev/nvidia0:/dev/nvidia0 \
  --device=/dev/nvidiactl:/dev/nvidiactl \
  --device=/dev/nvidia-uvm:/dev/nvidia-uvm \
  --device=/dev/nvidia-uvm-tools:/dev/nvidia-uvm-tools \
  -v "$lib_dir:$lib_dir:ro" \
  -v "$(dirname $smi_path):$(dirname $smi_path):ro" \
  -e LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
  -e NVIDIA_VISIBLE_DEVICES="$NVIDIA_VISIBLE_DEVICES" \
  -e NVIDIA_DRIVER_CAPABILITIES="$NVIDIA_DRIVER_CAPABILITIES" \
  pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime
```

### 마무리하며

지금까지 쿠버네티스 환경에 Actions Runner Controller를 구축하여 동적으로 확장되는 Self-hosted runner 환경을 만드는 방법을 알아보았습니다.

ARC를 사용하면 GitHub에서 제공하는 Runner를 사용할 때의 비싼 비용 문제와, 직접 VM을 관리하며 Runner를 운영할 때의 비효율성을 모두 해결할 수 있습니다. 특히 GPU가 필요하거나, 복잡한 의존성을 가진 MLOps CI/CD 환경을 구축할 때 ARC는 매우 강력한 도구가 됩니다.

초기 설정 과정이 다소 복잡하게 느껴질 수 있지만, 한번 구축해두면 CI/CD 비용을 크게 절감하고 운영 부담을 덜어주므로 MLOps를 고민하고 있다면 꼭 한번 도입을 검토해보시길 바랍니다.

