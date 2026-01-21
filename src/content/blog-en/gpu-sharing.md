---
description: Learn how to share NVIDIA GPUs in Kubernetes using Time-Slicing, CUDA
  MPS, and MIG—plus key trade-offs for isolation, performance, and operations.
pubDate: '2026-01-06'
tags:
- kubernetes
- MLOps
- NVIDIA
- GPU
title: 'Kubernetes GPU Sharing: Time-Slicing, MPS, and MIG'
---

## TL;DR

> GPU sharing in Kubernetes falls into two buckets: “overcommit (Time‑Slicing, MPS)” and “hardware partitioning (MIG).”  
> Time‑Slicing shares a GPU by time-slicing. It does not provide memory or fault isolation.  
> MPS uses a CUDA MPS server to arbitrate concurrent execution across multiple CUDA processes. In Kubernetes, the device plugin creates shared slots for scheduling.  
> MIG is hardware partitioning that provides dedicated per-instance resources, but it’s only available on certain GPUs (A100, H100, etc.).

GPUs are expensive, and inference workloads often have surprisingly low GPU utilization or GPU memory usage. If you stick to the default model of “one GPU per pod,” you can end up paying the full infrastructure cost while your GPUs sit idle. That’s why many teams look for ways to let multiple workloads share a GPU—how to use GPUs efficiently without sacrificing performance.

From here, the terminology tends to get a bit confusing.

I’ll first organize the terms and concepts behind Time‑Slicing, MPS, and MIG, and then explain how they behave and what to watch for operationally in Docker and Kubernetes environments.

---

## Why Use GPU Sharing?

If you have plenty of GPUs and your workloads consistently drive them at ~80–100%, you don’t really need sharing. But many inference workloads have bursty traffic, and the model or batch size may be small—making it hard to keep the GPU “fully” utilized all the time. In that case, letting multiple workloads share a GPU can run more services for the same cost.

Of course, it’s not free. Once you start sharing, you introduce context switching overhead, performance becomes harder to predict due to interference between workloads, and failures can propagate (especially with Time‑Slicing). Ultimately, GPU sharing is about choosing the right balance between “cost efficiency vs. predictability.”

GPU sharing is especially useful when:

- Inference workloads are light and GPU utilization is low
- You want to use expensive GPUs as efficiently as possible
- You need to run many small workloads concurrently

---

## Terminology First: Time‑Slicing, MPS, MIG

### Time‑Slicing

A scheduling approach where multiple CUDA processes take turns running on a single GPU. The GPU is not physically partitioned; instead, the GPU driver interleaves work via time-slicing.

### MPS (Multi‑Process Service)

NVIDIA CUDA MPS is a CUDA API implementation that mediates so multiple processes can use the GPU concurrently. While Time‑Slicing runs processes sequentially by taking turns, MPS can run CUDA kernels from multiple processes **in parallel**. The goal is better concurrency and higher GPU utilization; by default it does not assign fixed “slots/quotas.” However, you can cap per-client SM (Streaming Multiprocessor) usage via the `CUDA_MPS_ACTIVE_THREAD_PERCENTAGE` environment variable (not directly supported by the Kubernetes device plugin).

### MIG (Multi‑Instance GPU)

A feature that partitions a GPU at the hardware level into multiple independent devices. Each instance gets dedicated resources (SMs, memory, L2 cache), and supported GPUs are limited (A30, A100, H100, H200, etc.).

---

## What Does GPU Sharing Mean in Docker?

On a single Docker host, “GPU sharing” usually doesn’t mean any special scheduling feature. If you expose the GPU to containers via `nvidia-container-toolkit`, **multiple containers (= multiple CUDA processes) can use the same GPU at the same time**, and the driver will interleave kernel execution via time-slicing. In other words, “it’s shared, but there’s little isolation or guarantee (quota)” is close to the default behavior.

For example, if you expose the same GPU to two containers at the same time, they will compete with each other:

```bash
docker run --rm --gpus all <image> <cmd>
docker run --rm --gpus all <image> <cmd>
```

On the other hand, Docker by itself does not provide a built-in way to request **fractional GPUs** like `0.5 GPU`; that requires additional configuration.

If you need stronger sharing/isolation, you ultimately want to enable features like **MPS (Multi‑Process Service)** or **MIG (Multi‑Instance GPU)** on the host.

---

## Why “GPU Sharing” Is Confusing in Kubernetes

From Kubernetes’ perspective, a GPU is not a “continuous resource” like CPU or memory. In most clusters, GPUs are registered as **extended resources** such as `nvidia.com/gpu`, and those resources only support **integers**. In other words, requesting something like `0.5 GPU` is fundamentally not possible.

Also, extended resources don’t allow overcommit. So when people say “GPU sharing” in Kubernetes, they often mean **a plugin replicates the advertised GPU resources so that multiple pods end up using the same physical GPU**.

---

## Time‑Slicing in Kubernetes

Time‑Slicing works in Kubernetes not because kube-scheduler understands GPUs, but because the **NVIDIA device plugin “replicates” the number of GPUs advertised by a node**. For example, if you make one physical GPU appear as 10 “shared slots,” the scheduler simply sees “10 GPUs available” and can place up to 10 pods.

```yaml
version: v1
sharing:
  timeSlicing:
    renameByDefault: true
    failRequestsGreaterThanOne: true
    resources:
    - name: nvidia.com/gpu
      replicas: 10
```

With `renameByDefault: true`, the node advertises `nvidia.com/gpu.shared` instead of `nvidia.com/gpu`. This is especially useful in practice because even if “shared GPUs” and “dedicated GPUs” coexist in the same cluster, you can distinguish them by resource name.

Also, Time‑Slicing is applied per node. That is, it’s difficult (from the plugin’s perspective) to mix “some GPUs on the same node are shared while others are dedicated,” so in practice you usually **separate node pools**.

One key setting is `failRequestsGreaterThanOne`. In Time‑Slicing, requesting `nvidia.com/gpu.shared: 2` does not guarantee “2x compute/memory.” To reduce confusion, in production it’s typically safer to keep `failRequestsGreaterThanOne: true` so **each container can only get 1 shared GPU**.

A pod spec looks like:

```yaml
resources:
  limits:
    nvidia.com/gpu.shared: 1
```

Time‑Slicing is a good match for “lightweight, short, high‑QPS” inference workloads, but you accept these risks:

- No memory isolation, so one workload’s OOM/leak can affect others
- You share the same GPU fault domain, so one process crash can impact everything
- High interference makes tuning difficult for latency‑sensitive services

---

## MPS in Kubernetes

MPS in Kubernetes, like Time‑Slicing, is exposed as **the plugin replicating GPU resources to create shared slots**:

```yaml
version: v1
sharing:
  mps:
    renameByDefault: true
    resources:
    - name: nvidia.com/gpu
      replicas: 10
```

That said, it’s worth starting with these constraints in mind for Time‑Slicing and MPS in Kubernetes:

- You **cannot enable Time‑Slicing and MPS at the same time**.
- With the NVIDIA device plugin, MPS has been treated as **experimental** in certain periods, and constraints/behavior can vary by version.
- (Important) With `k8s-device-plugin`, MPS sharing mode is **not supported on devices where MIG is enabled.** (However, MPS itself can still be used independently inside a MIG instance.)
- (Important) **MPS does not provide strong fault isolation.** On Volta+ GPUs, clients get isolated GPU address spaces, but a fatal fault in one client can still propagate to all clients sharing the same GPU. MPS was originally designed for cooperative, mutually trusted processes (like MPI jobs), so be careful in environments that require strict multi-tenant isolation.
- In the device plugin’s MPS sharing mode, multi-GPU requests are restricted. For example, requesting `nvidia.com/gpu: 2` triggers an error like:

```text
Allocate failed due to rpc error: code = Unknown desc = invalid request for sharing GPU (MPS), at most 1 nvidia.com/gpu can be requested on multi-GPU nodes
```

It’s safest to interpret this as a Kubernetes-level restriction to preserve QoS and predictable resource allocation.

Also note: “MPS in Kubernetes” (= the device plugin’s GPU sharing mode) and “turning on MPS directly at the application level” are different operational models. The former creates **scheduler-visible shared slots** to place multiple pods onto one GPU; the latter **runs a CUDA MPS server directly on a single node/single GPU** to improve process concurrency. Due to operational complexity and the risk of misconfiguration, the latter is generally not recommended.

---

## MIG in Kubernetes

Unlike the previous two approaches, MIG is a feature that **partitions a GPU at the hardware level into multiple independent devices**. MIG instances have separated memory and compute resources and provide the highest isolation and predictability. That makes MIG especially attractive in environments with strong multi-tenancy requirements (sharing across teams/services, services with SLAs, etc.).

In Kubernetes, when configured with `migStrategy=mixed`, MIG profiles are exposed as **separate resource names** like:

- `nvidia.com/mig-1g.5gb`
- `nvidia.com/mig-2g.10gb`
- `nvidia.com/mig-3g.20gb`
- …

Pods can request the profile they want:

```yaml
resources:
  limits:
    nvidia.com/mig-1g.5gb: 1
```

### Using MIG on GKE

On GKE, the default is **single strategy**, and the resource request pattern is different. You specify the MIG partition size via `nodeSelector`, and request the resource like a normal GPU with `nvidia.com/gpu: 1`.

```yaml
spec:
  nodeSelector:
    cloud.google.com/gke-gpu-partition-size: 1g.5gb
  containers:
  - name: my-container
    resources:
      limits:
        nvidia.com/gpu: 1
```

With this approach, all MIG devices are exposed under the single resource name `nvidia.com/gpu`, and the nodeSelector determines the actual partition size. In contrast, the `nvidia.com/mig-1g.5gb` style is what you use with the NVIDIA device plugin when configured as `migStrategy=mixed`.

A key operational point for MIG is that it’s not something “Kubernetes automatically splits for you.” Typically, you must preconfigure MIG instances on the node (or enforce a policy via components like GPU Operator / MIG manager), and pods then consume the resulting resources.

Another difference: with MIG, it can be meaningful to attach “two MIG devices” to a single pod (for example, `nvidia.com/mig-1g.5gb: 2`). This contrasts with Time‑Slicing/MPS, where “two shared slots” does not guarantee performance.

---

## (Extra) vGPU and “Sharing Inside a Server”

The need to “split a GPU” also exists outside Kubernetes. A common example is NVIDIA vGPU, which partitions GPUs at the hypervisor/virtualization layer and assigns them to VMs (often with licensing/platform constraints).

Another practical alternative is to avoid splitting GPUs at the infrastructure layer and instead **batch multiple requests within a single process at the application level**. For example, Triton dynamic batching and vLLM continuous batching often boost utilization significantly without “sharing by increasing pod count.” The trade-off is weaker tenant isolation at the process/model level, so you should decide based on your requirements. (I’ll cover vLLM in a separate post.)

---

## Monitoring in a GPU Sharing Environment

Once you introduce GPU sharing, it gets harder to understand “who is using how much.” In shared environments, the following tools/metrics are commonly used:

- **nvidia-smi**: The basic CLI to check GPU state, per-process memory usage, and MIG/MPS status. In MIG environments, use `nvidia-smi mig -lgi` to view instance configuration; in MPS environments, you can confirm the MPS server process via `nvidia-smi`.
- **DCGM (Data Center GPU Manager)**: NVIDIA’s GPU monitoring/management tool, which can collect more detailed metrics (SM utilization, memory bandwidth, NVLink status, etc.).
- **DCGM Exporter + Prometheus**: In Kubernetes, it’s common to deploy DCGM Exporter as a DaemonSet and scrape metrics with Prometheus. With Grafana dashboards, you can visualize GPU health across the cluster.

In shared environments, metrics to watch especially closely include **GPU Memory Used**, **SM Activity**, and **Encoder/Decoder Utilization**. Because per-process separation is hard with Time‑Slicing/MPS, monitoring often focuses more on node/GPU-level metrics than pod-level metrics.

---

## Selection Criteria: What Should You Prioritize?

There’s no single right answer. Once you decide your priorities, the choices narrow quickly. Use the table below as a reference.

| Criteria | Time‑Slicing | MPS | MIG |
|------|-------------|-----|-----|
| Memory isolation | ❌ | ❌ | ✅ |
| Fault isolation | ❌ | ❌ | ✅ |
| Performance predictability | Low | Medium | High |
| Configuration complexity | Low | Medium | High |
| Supported GPUs | All NVIDIA GPUs | All NVIDIA GPUs | A30, A100, H100, H200, etc. |
| Resource limit controls | ❌ | `CUDA_MPS_ACTIVE_THREAD_PERCENTAGE` | Fixed by profile |

**In summary:**

- If **isolation and predictability are the top priority**: start with MIG (or partitioning/virtualization like vGPU).
- If you want **simple setup and “just increase density quickly”**: Time‑Slicing is the fastest starting point.
- If you want to **share but still enforce some kind of upper bound**: consider MPS and accept its constraints (and verify cluster/driver/plugin versions).

And regardless of what you choose, it helps a lot operationally to clearly separate “shared GPUs.” Using `renameByDefault` for a `*.shared` resource name or separating via node labels/node pools are common approaches.

---

## Wrap‑Up

The most common misconception when adopting GPU sharing is: “if I increase the number, performance increases.” In Time‑Slicing/MPS, that number is usually closer to “access permission” than “capacity,” and performance depends on contention between workloads. In contrast, MIG is hardware partitioning, so the numbers map more intuitively to performance/memory.

---

## References

- NVIDIA k8s-device-plugin: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Operator (GPU Sharing): https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- Kubernetes Device Plugin: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins
- NVIDIA MIG overview: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/
- NVIDIA MPS: https://docs.nvidia.com/deploy/mps/introduction.html