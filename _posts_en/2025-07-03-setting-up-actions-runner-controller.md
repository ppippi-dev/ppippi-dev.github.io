---
feature-img: assets/img/2025-07-03/0.png
layout: post
subtitle: Setting Up an MLOps CI Environment
tags:
- MLOps
- Infra
title: Setting Up Actions Runner Controller
---


### Intro

As I’ve been enjoying AI-enabled development lately, I’ve felt the importance of a solid test environment more than ever.

The most common approach is building CI with GitHub Actions, but in MLOps, CI often requires high-spec instances.

GitHub Actions does offer a [GPU instance (Linux, 4 cores)](https://docs.github.com/ko/billing/managing-billing-for-your-products/about-billing-for-github-actions), but at $0.07 per minute as of now, it’s quite expensive to use freely.

It’s also limited to an Nvidia T4 GPU, which can be restrictive as model sizes continue to grow.

A strong alternative in this situation is the self-hosted runner.

As the name suggests, you set up the runner yourself and execute GitHub workflows on it.

You can configure this through GitHub’s [Add self-hosted runners](https://docs.github.com/ko/actions/how-tos/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners).

However, this approach requires the CI machine to always be on (online). If CI/CD jobs are infrequent, this can be inefficient.

That’s where the Actions Runner Controller (ARC) becomes a great alternative.

[Actions Runner Controller](https://github.com/actions/actions-runner-controller) is an open source controller that lets GitHub Actions runners run in a Kubernetes environment.

With it, your Kubernetes resources are used for CI only when a GitHub Actions workflow actually runs.

### Installing Actions Runner Controller

The ARC installation has two major steps:
1. Create a GitHub Personal Access Token for communication and authentication
2. Install ARC with Helm and authenticate with the token you created

#### 1. Create a GitHub Personal Access Token

ARC needs to authenticate to interact with the GitHub API to register and manage runners. Create a GitHub Personal Access Token (PAT).

- Path: Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate new token

When creating the token, select the [appropriate permissions](https://github.com/actions/actions-runner-controller/blob/master/docs/authenticating-to-the-github-api.md#deploying-using-pat-authentication). (For convenience here, grant full permissions.)

> For security, set minimal required scopes and an expiration date.

ARC recommends using a GitHub App for authentication rather than a PAT when possible.

Keep the generated PAT secure—you’ll need it in the next step to install ARC.

#### 2. Install ARC with Helm

Before installing ARC, cert-manager is required. If cert-manager isn’t set up in your cluster, install it:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.2/cert-manager.yaml
```

Now, use Helm to install ARC into your Kubernetes cluster.

Use the Personal Access Token you created earlier. Replace YOUR_GITHUB_TOKEN below with your PAT:

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

After installation, check that the ARC controller is running:

```bash
kubectl get pods -n actions-runner-system
```

If successful, you should see the controller manager pod running in the actions-runner-system namespace.

ARC is now ready to communicate with GitHub. Next, define the runners that will actually execute workflows.

### 3. Configuring Runners

The controller is installed, but there are no runners yet to execute workflows. You’ll create runner Pods based on your GitHub Actions workflow jobs.

You’ll use two resources:
1. RunnerDeployment: The template for runner Pods—defines which container image to use, which GitHub repo to connect to, what labels to set, etc.
2. HorizontalRunnerAutoscaler (HRA): Watches the RunnerDeployment and automatically scales the replicas based on the number of queued jobs in GitHub.

#### Define the RunnerDeployment

Create a file named runner-deployment.yml as below. Change spec.template.spec.repository to your GitHub repository.

> If you have permissions, you can target an organization instead of a repository.

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

With this configured, you can see the self-hosted runner under your GitHub repo’s Actions settings.

<img src="/assets/img/2025-07-03/1.png">

After the deployment rolls out, you should see a new runner with the self-hosted and arc-runner labels under Settings > Actions > Runners in your repository.

#### Define the HorizontalRunnerAutoscaler

Next, define an HRA that auto-scales the RunnerDeployment. Create hra.yml:

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

By setting minReplicas and maxReplicas, you can scale up or down based on resource needs.

You can also specify additional metrics so a pod is created whenever a workflow is triggered. Many other metrics are available.

> When using a HorizontalRunnerAutoscaler, runners are created only when needed. During idle periods (0 runners), you won’t see runners in the GitHub UI.

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
```

The above is my preferred metric—it scales up when a workflow needs to run (when jobs are queued).
Likewise, you can set metrics as needed to get great results.

### 4. Use it in a GitHub Actions workflow

All set! Using the ARC runner is simple—just put the labels you defined in the RunnerDeployment under runs-on in your workflow.

Add a simple test workflow (test-arc.yml) under .github/workflows/:

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

The key is runs-on: [self-hosted, arc-runner]. When the workflow runs, GitHub assigns the job to a runner with both labels. ARC detects this event and, per the HRA settings, creates a new runner Pod if needed to process the job.

> With self-hosted runners, unlike GitHub-hosted runners, you may need to install some packages within the workflow.

### Troubleshooting notes

For CI/CD, I often use Docker, and a frequent pain point is DinD (Docker-in-Docker).

With ARC, by default the scheduling container (runner) and the Docker daemon container (docker) run as sidecars.

To address this, there are Docker images that support DinD.

As in the YAML below, if you specify the image and set dockerdWithinRunnerContainer, the Docker daemon runs inside the runner and the workflow runs within that runner.

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

Especially for Docker tests that require GPUs, if you use the above DinD image on a cluster with NVIDIA Container Toolkit installed, GPUs can be recognized.

In the workflow you want to run, set it up like below to confirm GPUs are configured correctly even under DinD.
(You should verify the versions of NVIDIA Container Toolkit and the NVIDIA GPU Driver plugin.)

```bash
# Check GPU devices
ls -la /dev/nvidia*

# Device library setup
smi_path=$(find / -name "nvidia-smi" 2>/dev/null | head -n 1)
lib_path=$(find / -name "libnvidia-ml.so" 2>/dev/null | head -n 1)
lib_dir=$(dirname "$lib_path")
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname "$lib_path")
export NVIDIA_VISIBLE_DEVICES=all
export NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Mount GPU devices and libraries directly without the nvidia runtime
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

We walked through building a dynamically scalable self-hosted runner environment by deploying Actions Runner Controller on Kubernetes.

ARC helps avoid the high costs of GitHub-hosted runners and the inefficiencies of managing your own VMs and runners. It’s especially powerful when you need GPUs or have complex dependencies in an MLOps CI/CD setup.

The initial setup can feel a bit involved, but once in place it can significantly reduce CI/CD costs and operational overhead. If you’re considering MLOps, ARC is definitely worth a try.