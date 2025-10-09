---
layout: post
title: "Notes from Google Cloud Jam (Kubernetes Intermediate)"
categories: [kubernetes]
tags: [kubernetes]
---

Highlights from the Google Cloud **Cloud Jam – GKE Intermediate** workshop.

<br>

### Pods

- A **pod** is the smallest deployable unit in Kubernetes (not the container itself, although GCP sometimes uses the terms interchangeably).
- Pods **do not self-heal**. Use higher-level controllers for resilience:
  - Deployment
  - StatefulSet
  - DaemonSet
  - Job/CronJob

I often work only with controllers, so I hadn’t considered that a naked pod lacks self-healing.

<br>

### YAML vs. CLI

Two ways to create resources:

- CLI:
  ```bash
  kubectl run nginx -n namespace --image=nginx:latest
  ```
- YAML:
  ```bash
  kubectl apply -f nginx_deployment.yaml -n namespace
  ```

YAML is preferred—CLI commands become unwieldy with many flags and are hard to reuse. You can still inspect generated YAML later via `kubectl get`.

<br>

### Namespaces

Best practice: specify namespaces via CLI, not inside the manifest.

```bash
kubectl apply -f mypod.yaml -n demo
```

If you hardcode the namespace in YAML:

```yaml
metadata:
  name: mypod
  namespace: demo
```

…and then try to override with `-n`, it fails:

```
error: the namespace from the provided object "test" does not match "test-other"
```

Conclusion: keep manifests namespace-agnostic and inject the namespace when applying for greater flexibility.
