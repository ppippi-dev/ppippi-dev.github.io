---
feature-img: assets/img/2025-07-03/0.png
layout: post
subtitle: Building an MLOps CI Environment
tags:
- MLOps
- Infra
title: Setting Up Actions Runner Controller
---


### Intro

As I’ve been enjoying building with AI lately, I’ve felt even more strongly how important a solid test environment is.

The most common approach is to set up CI with GitHub Actions, but in MLOps, CI often requires high-spec instances.

GitHub Actions does offer a [GPU instance (Linux 4 cores)](https://docs.github.com/ko/billing/managing-billing-for-your-products/about-billing-for-github-actions), but at $0.07 per minute as of now, it’s quite expensive to use.

It’s also limited to an Nvidia T4 GPU, which can be restrictive as model sizes continue to grow.

As an alternative, you can use a self-hosted runner.

As the name suggests, you set up the runner yourself and execute GitHub workflows on it.

You can configure this using GitHub’s [Add a self-hosted runner](https://docs.github.com/ko/actions/how-tos/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners).

However, this approach requires keeping your CI machine always on (online), which can be inefficient if CI/CD jobs are infrequent.

That’s where the Actions Runner Controller (ARC) becomes an excellent alternative.

[Actions Runner Controller](https://github.com/actions/actions-runner-controller) is an open source project that lets you run GitHub Actions runners in a Kubernetes environment.

With it, you can run CI using your Kubernetes resources only when a GitHub Actions workflow is triggered.


### Installing Actions Runner Controller

The ARC installation consists of two major steps.
1. Create a GitHub Personal Access Token for communication and authentication with GitHub
2. Install ARC with Helm and authenticate using the token

#### 1. Create a GitHub Personal Access Token

ARC needs authentication to interact with the GitHub API to register and manage runners. Create a GitHub Personal Access Token (PAT).

* Path: `Settings` > `Developer settings` > `Personal access tokens` > `Tokens (classic)` > `Generate new token`

When creating the PAT, select the [appropriate scopes](https://github.com/actions/actions-runner-controller/blob/master/docs/authenticating-to-the-github-api.md#deploying-using-pat-authentication). (For convenience here, grant full permissions.)

> For security, use least privilege and set an expiration date.

It’s generally recommended to authenticate via a GitHub App rather than PAT.

Keep the PAT safe—you’ll need it in the next step when installing ARC.

#### 2. Install ARC with Helm

ARC requires cert-manager. If cert-manager isn’t set up in your cluster, install it:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.2/cert-manager.yaml
```

Now use Helm to install ARC into your Kubernetes cluster.





Install ARC using the Personal Access Token you created earlier. Replace `YOUR_GITHUB_TOKEN` with your PAT in the command below.

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

After installation, verify the ARC controller is running:

```bash
kubectl get pods -n actions-runner-system
```

If this succeeds, you’ll see the ARC controller manager pod running in the `actions-runner-system` namespace.

ARC is now ready to talk to GitHub! Next, define the runner that will actually execute your workflows.

### 3. Configure the Runner

We’ve installed the ARC controller, but there’s no runner yet to execute workflows. We need to create runner pods based on GitHub Actions jobs.

We’ll use two resources:
1. RunnerDeployment: Acts as the template for runner pods—defines which container image to use, which GitHub repository to connect to, which labels to apply, etc.
2. HorizontalRunnerAutoscaler (HRA): Watches the RunnerDeployment and automatically adjusts its replicas based on the number of queued jobs in GitHub.

#### Define RunnerDeployment

Create a file named `runner-deployment.yml` as below. Change `spec.template.spec.repository` to your GitHub repository.

> If you have permissions, you can target an organization instead of a single repository.

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

With this configured, you’ll see the self-hosted runner in your GitHub repo’s Actions.

<img src="/assets/img/2025-07-03/1.png">

After it’s deployed, in a moment you’ll find a new runner registered under your repository’s Settings > Actions > Runners tab with the labels `self-hosted` and `arc-runner`.


#### Define HorizontalRunnerAutoscaler

Next, define an HRA to auto-scale the RunnerDeployment. Create a `hra.yml` file.

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

Set minReplicas and maxReplicas to scale up and down based on resources.

You can also specify additional metrics to create pods whenever a workflow is triggered. Many other metrics are available.

> When you configure a HorizontalRunnerAutoscaler, runners are created only when needed. When there are zero runners, you won’t see them in the GitHub UI.

<img src="/assets/img/2025-07-03/2.png">

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

The above is my preferred metric—it scales up when workflow runs are needed (i.e., when jobs are queued).
As shown, you can choose metrics as needed to get great results.


### 4. Use it in a GitHub Actions workflow

We’re all set! Using the new ARC runner is simple: in your workflow file, set the `runs-on` key to the labels specified in the RunnerDeployment.

Add a simple test workflow (`test-arc.yml`) under your repository’s `.github/workflows/` directory:

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

The key is `runs-on: [self-hosted, arc-runner]`. When this workflow runs, GitHub assigns the job to a runner with both `self-hosted` and `arc-runner` labels. ARC detects the event and, based on the HRA settings, creates a new runner pod if needed to process the job.

> With self-hosted runners, unlike GitHub-hosted ones, you may need to install certain packages within the workflow.

### Troubleshooting notes

I often use Docker for CI/CD, and one recurring issue is DinD (Docker in Docker).

With ARC, by default a runner container (scheduling container) and a docker daemon container run as sidecars.

To handle this, there are Docker images that support DinD.

In a YAML like the one below, specify the image and set dockerdWithinRunnerContainer to run the Docker daemon inside the runner, and the workflow will run on that runner.

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

For Docker tests that require GPUs, if your cluster has NVIDIA Container Toolkit installed, using the DinD image above can make GPUs visible.

If you configure your workflow as below, you can confirm GPUs are properly set up even in a DinD scenario. (Be sure to check your NVIDIA Container Toolkit and NVIDIA GPU Driver Plugin versions!)

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

### Wrapping up

We’ve looked at how to build a dynamically scalable self-hosted runner environment by deploying Actions Runner Controller in Kubernetes.

ARC helps you avoid the high cost of GitHub-hosted runners and the inefficiency of managing VMs for runners yourself. It’s especially powerful when building MLOps CI/CD environments that need GPUs or have complex dependencies.

While the initial setup can feel a bit involved, once it’s in place it can significantly cut CI/CD costs and reduce operational burden. If you’re considering MLOps, it’s well worth evaluating.