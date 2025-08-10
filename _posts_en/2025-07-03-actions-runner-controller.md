---
feature-img: assets/img/2025-07-03/0.png
layout: post
subtitle: Building an MLOps CI environment
tags:
- MLOps
- Infra
title: Setting Up Actions Runner Controller
---


### Intro

As I’ve been enjoying AI-driven development lately, the importance of a solid test environment has really hit home.

A common approach is to build CI with GitHub Actions, but in MLOps you often need high-spec instances for CI.

GitHub Actions does offer [GPU instances (Linux, 4 cores)](https://docs.github.com/ko/billing/managing-billing-for-your-products/about-billing-for-github-actions), but at the time of writing they cost $0.07 per minute, which is quite expensive.

They’re also Nvidia T4 GPUs, which can be limiting performance-wise as models keep growing.

A good alternative in this situation is a self-hosted runner.

As the name suggests, you set up the runner yourself and execute GitHub workflows on that runner.

You can configure it via GitHub’s [Add self-hosted runners](https://docs.github.com/ko/actions/how-tos/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners).

However, this approach requires the CI machine to always be on (online), which can be inefficient if CI/CD jobs are infrequent.

That’s where the Actions Runner Controller (ARC) shines as an excellent alternative.

[Actions Runner Controller](https://github.com/actions/actions-runner-controller) is an open-source controller that manages GitHub Actions runners in a Kubernetes environment.

With it, you can run CI on your own Kubernetes resources only when a GitHub Actions workflow is actually executed.


### Install Actions Runner Controller

Installing ARC has two main steps:
1. Create a GitHub Personal Access Token for communication and authentication with GitHub
2. Install ARC via Helm and authenticate with the token you created

#### 1. Create a GitHub Personal Access Token

ARC needs to authenticate to the GitHub API to register and manage runners. Create a GitHub Personal Access Token (PAT) for this.

- Path: Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate new token

When creating the token, choose the [appropriate permissions](https://github.com/actions/actions-runner-controller/blob/master/docs/authenticating-to-the-github-api.md#deploying-using-pat-authentication). (For convenience here, grant full permissions.)

> For security, use least privilege and set an expiration date.

It appears that authenticating via a GitHub App is recommended over using a PAT.

Keep the PAT safe—you’ll need it to install ARC in the next step.

#### 2. Install ARC with Helm

ARC requires cert-manager. If cert-manager isn’t set up in your cluster, install it:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.2/cert-manager.yaml
```

Now install ARC into your Kubernetes cluster with Helm.

Use the Personal Access Token you created earlier to install ARC. Replace YOUR_GITHUB_TOKEN below with your PAT value.

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

If the command succeeds, you should see the ARC controller manager pod running in the actions-runner-system namespace.

ARC is now ready to talk to GitHub. Next, define the runner that will actually execute your workflows.

### 3. Configure a Runner

The ARC controller is installed, but there’s no runner yet to execute workflows. You need to create runner pods based on GitHub Actions jobs.

You’ll use two resources:
1. RunnerDeployment: Acts as a template for runner pods. Defines the container image, target GitHub repository, labels, etc.
2. HorizontalRunnerAutoscaler (HRA): Watches the RunnerDeployment and automatically adjusts its replicas based on the number of queued jobs in GitHub.

#### Define RunnerDeployment

Create a file named runner-deployment.yml as below. Change spec.template.spec.repository to your own GitHub repo.

> If you have permissions, you can also target an organization instead of a single repository.

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

With this configured, you can check the self-hosted runner in your GitHub repo’s Actions settings.

<img src="/assets/img/2025-07-03/1.png">

Once the deployment is up, after a short while you’ll see a new runner with labels self-hosted and arc-runner under Settings > Actions > Runners in your repository.

#### Define HorizontalRunnerAutoscaler

Next, define an HRA to autoscale the RunnerDeployment you just created. Create hra.yml:

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

By setting minReplicas and maxReplicas, you can scale up and down based on available resources.

You can also configure additional metrics to create pods whenever there’s a workflow trigger. Many other metrics are supported.

> When using HorizontalRunnerAutoscaler, runners are created only when needed. During idle periods (when there are zero runners), you won’t see any runners in the GitHub UI.

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

The above is my preferred metric—it scales up when workflows are queued. As shown, you can choose metrics to fit your needs and get great results.


### 4. Use it in a GitHub Actions workflow

All set! Using the new ARC runner is simple: specify the labels you set in the RunnerDeployment under runs-on in your workflow.

Add a simple test workflow (test-arc.yml) under .github/workflows/ in your repo:

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

The key part is runs-on: [self-hosted, arc-runner]. When this workflow runs, GitHub assigns the job to a runner that has both labels. ARC detects this event and, per your HRA settings, creates a new runner pod if needed to process the job.

> With self-hosted runners, unlike GitHub-hosted runners, you may need to install some packages within your workflow.

### Troubleshooting notes

For CI/CD, I often use Docker, and one recurring issue is Docker-in-Docker (DinD).

With ARC, by default the runner (scheduling) container and a docker daemon container run as sidecars.

To handle this, there’s a Docker image that supports DinD.

If you specify the image and dockerdWithinRunnerContainer as below, the Docker daemon runs inside the runner, and the workflow runs on that runner.

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

For Docker tests that need GPUs, if your cluster has NVIDIA Container Toolkit installed, using the DinD image above allows the GPU to be recognized.

Configure your workflow like this to confirm GPUs work even in a DinD setup. (Make sure your NVIDIA Container Toolkit and NVIDIA GPU Driver Plugin versions are compatible!)

```bash
# Check GPU devices
ls -la /dev/nvidia*

# Device/library setup
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

We covered how to build a dynamically scalable self-hosted runner environment by deploying Actions Runner Controller in Kubernetes.

Using ARC solves both the high cost of GitHub-hosted runners and the inefficiency of managing your own VMs for runners. ARC is especially powerful when you need GPUs or have complex dependencies in an MLOps CI/CD setup.

The initial setup can feel a bit involved, but once in place, it can significantly cut CI/CD costs and reduce operational burden. If you’re working on MLOps, it’s well worth considering.