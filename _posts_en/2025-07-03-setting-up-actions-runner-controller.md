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

As I’ve been enjoying building with AI lately, the importance of a solid test environment has become even clearer.

The most common approach is to build CI with GitHub Actions, but in MLOps you often need high-spec instances for CI.

GitHub Actions does offer [GPU instances (Linux, 4 cores)](https://docs.github.com/ko/billing/managing-billing-for-your-products/about-billing-for-github-actions), but at $0.07 per minute as of now, they’re quite expensive to use.

They’re also limited to NVIDIA T4 GPUs, which can be restrictive as model sizes keep growing.

A good alternative in this situation is a self-hosted runner.

As the name suggests, you configure the runner yourself and execute GitHub workflows on it.

You can set this up via GitHub’s guide: [Add self-hosted runners](https://docs.github.com/ko/actions/how-tos/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners).

However, this approach requires keeping the CI machine always on (online), which can be inefficient if CI/CD jobs are infrequent.

This is where the Actions Runner Controller (ARC) shines as a great alternative.

[Actions Runner Controller](https://github.com/actions/actions-runner-controller) is an open-source controller that lets GitHub Actions runners operate in a Kubernetes environment.

With it, your Kubernetes resources are used for CI only when a GitHub Actions workflow runs.


### Installing Actions Runner Controller

ARC installation has two major steps.
1. Create a GitHub Personal Access Token for communication/authentication with GitHub
2. Install ARC via Helm and authenticate using the token

#### 1. Create a GitHub Personal Access Token

ARC needs authentication to interact with the GitHub API to register and manage runners. Create a Personal Access Token (PAT).

- Path: Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate new token

When creating the Personal Access Token, select the [appropriate permissions](https://github.com/actions/actions-runner-controller/blob/master/docs/authenticating-to-the-github-api.md#deploying-using-pat-authentication). (For convenience here, grant full permissions.)

> For security, use least privilege and set an expiration.

It’s generally recommended to authenticate via a GitHub App rather than PAT.

Keep the PAT safe—you’ll need it when installing ARC.

#### 2. Install ARC with Helm

Before installing ARC, you need cert-manager. If it’s not already set up in the cluster, install it:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.2/cert-manager.yaml
```

Now install ARC into your Kubernetes cluster using Helm.

Using the Personal Access Token you created earlier, install ARC. Replace YOUR_GITHUB_TOKEN below with your PAT.

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

After installation, verify that the ARC controller is running:

```bash
kubectl get pods -n actions-runner-system
```

You should see the controller manager pod running in the actions-runner-system namespace.

ARC is now ready to communicate with GitHub. Next, define the runners that will actually execute workflows.

### 3. Configure the Runner

The ARC controller is installed, but there are no runners yet. Now we’ll create runner pods according to GitHub Actions jobs.

We’ll use two resources:
1. RunnerDeployment: Acts as a template for runner pods. It defines which container image to use, which GitHub repo to connect to, labels, etc.
2. HorizontalRunnerAutoscaler (HRA): Watches the RunnerDeployment and automatically adjusts the number of replicas based on the number of queued jobs on GitHub.

#### Define a RunnerDeployment

First, create a file named runner-deployment.yml as below. Change spec.template.spec.repository to your GitHub repository.

> Besides a repository, you can also target an organization if you have the permissions.

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

With this in place, you can find your self-hosted runner under your repo’s Actions settings.

<img src="/assets/img/2025-07-03/1.png">

After the deployment completes, you’ll see a new runner with the self-hosted and arc-runner labels under Settings > Actions > Runners in your GitHub repository.


#### Define a HorizontalRunnerAutoscaler

Next, define an HRA to autoscale the RunnerDeployment you created above. Create hra.yml.

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

By setting minReplicas and maxReplicas, you can scale up and down according to your resources.

You can also specify additional metrics to create pods whenever a workflow is triggered. There are several metrics available.

> When using HorizontalRunnerAutoscaler, runners are created only when needed. When the count is zero, you won’t see runners in the GitHub UI.

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

The above is my preferred metric—it scales up when workflow runs are queued. As shown, choose metrics as needed to get the behavior you want.


### 4. Use it in a GitHub Actions workflow

All set! Using the new ARC runner is simple. In your workflow file, put the labels from the RunnerDeployment in the runs-on key.

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

The key part is runs-on: [self-hosted, arc-runner]. When this workflow runs, GitHub assigns the job to a runner that has both labels. ARC detects the event and, based on the HRA settings, creates a new runner pod if needed to handle the job.

> With self-hosted runners, unlike GitHub-hosted runners, you may need to install some packages within the workflow.

### Troubleshooting notes

I often use Docker for CI/CD, and one recurring issue is DinD (Docker-in-Docker).

With ARC, by default the scheduling runner container and a docker daemon container (docker) run as sidecars.

To handle this, there’s a DinD-enabled runner image.

In the YAML below, set image and dockerdWithinRunnerContainer to run the docker daemon inside the runner; your workflow then executes on that runner.

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

For Docker tests that need GPUs, if you use the DinD image above on a cluster with NVIDIA Container Toolkit installed, the GPU will be recognized.

In the workflow you want to run, configure as below to confirm GPUs are available even under DinD. (Be sure to check the versions of NVIDIA Container Toolkit and the NVIDIA GPU Driver plugin!)

```bash
# Check GPU devices
ls -la /dev/nvidia*

# device library setup
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

We walked through how to set up Actions Runner Controller in a Kubernetes environment to build a dynamically scalable self-hosted runner setup.

ARC helps avoid the high costs of GitHub-hosted runners and the inefficiencies of managing your own VMs. It’s especially powerful for MLOps CI/CD environments that need GPUs or have complex dependencies.

While the initial setup may feel a bit involved, once it’s in place it can significantly cut CI/CD costs and reduce operational burden. If you’re considering MLOps, it’s definitely worth a look.