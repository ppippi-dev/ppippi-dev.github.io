---
layout: post
title: "Using Kubernetes ConfigMaps for Environment Variables"
categories: [kubernetes]
tags: [kubernetes]
---

On a single server, setting env vars is easy:

```bash
export A=abc                # temporary
vi ~/.bashrc                # add exports for permanence
```

But in Kubernetes—especially managed services like GKE—exporting on the master won’t propagate to worker nodes. Instead, define variables in the pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: envar-demo
spec:
  containers:
  - name: envar-demo-container
    image: gcr.io/google-samples/node-hello:1.0
    env:
    - name: DEMO_GREETING
      value: "Hello from the environment"
    - name: DEMO_FAREWELL
      value: "Such a sweet sorrow"
```

However, hard-coding sensitive values in YAML is risky—especially if the repo is public. A better approach: use **ConfigMaps** (or Secrets for truly sensitive data).

<br>

### 1. Define a ConfigMap

```yaml
# config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
  namespace: default
data:
  DB_NAME: admin
  DB_PASSWORD: password
```

Apply it:

```bash
kubectl apply -f config.yaml
```

<br>

### 2. Reference the ConfigMap in a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: semogong
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: semogong-container
        image: wjdqlsdlsp/semogong:1.6
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: config
```

The key snippet:

```yaml
envFrom:
- configMapRef:
    name: config
```

This injects all key-value pairs from `config` into the container environment. The manifest stays clean, and you can commit it without exposing credentials (just remember ConfigMaps are stored in plain text—use Secrets for passwords in production).
