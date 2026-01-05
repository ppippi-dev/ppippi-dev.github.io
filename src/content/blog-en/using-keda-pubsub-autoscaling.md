---
description: Autoscaling GKE Jobs with KEDA and Pub/Sub
pubDate: '2022-09-17'
tags:
- GCP
- Keda
- kubernetes
title: Autoscaling GKE Jobs with KEDA and Pub/Sub
---

In this post I configure **Kubernetes Event-Driven Autoscaling (KEDA)** so that Pub/Sub messages drive the number of worker pods. The previous two posts (Secret Manager and Workload Identity) laid the groundwork for this experiment.

<br>

### Why KEDA?
Kubernetes already ships with Horizontal Pod Autoscaler (HPA), so why reach for KEDA? HPA reacts to CPU and memory utilization. That works for steady workloads but lags when traffic spikes suddenly.

KEDA, on the other hand, watches event sources (Pub/Sub, Kafka, databases, queues, etc.) and scales workloads based on the number of pending events. For bursty workloads that makes all the difference.

<br>

### Install KEDA
The official [deployment guide](https://keda.sh/docs/2.8/deploy/) walks through the process. It mirrors the Helm-based installation used for External Secrets Operator:

```shell
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
kubectl create namespace keda
helm install keda kedacore/keda --namespace keda
```

Run the commands in order and KEDA’s operator is up and running.

<br>

### Provide KEDA with Credentials
KEDA needs credentials to poll Pub/Sub. I reuse the ExternalSecret from the Secret Manager post and only change the target secret name:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: example
  namespace: es
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: example
  target:
    name: pubsub-secret
    creationPolicy: Owner
  data:
  - secretKey: test
    remoteRef:
      key: test
```

Next, create a `TriggerAuthentication` resource so multiple ScaledJobs can reuse the same credentials:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gcp-pubsub-credentials
  namespace: es
spec:
  secretTargetRef:
  - parameter: GoogleApplicationCredentials
    name: pubsub-secret
    key: test
```

The exact parameters depend on the provider—check the [docs](https://keda.sh/docs/2.5/concepts/authentication/#mainnav) for details. For GCP Pub/Sub, KEDA expects the service account JSON under `GoogleApplicationCredentials`. Because the JSON already lives in Secret Manager, the ExternalSecret keeps the Kubernetes Secret in sync.

> I wrote this post mainly to document the `name` and `key` fields above—examples that use Secret Manager were hard to find.

<br>

### Define the ScaledJob
KEDA supports all sorts of scalers. I’m interested in Pub/Sub so I followed [this guide](https://keda.sh/docs/1.5/scalers/gcp-pub-sub/#mainnav).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: scaled-job
  namespace: es
spec:
  jobTargetRef:
    parallelism: 5
    completions: 1
    backoffLimit: 3
    template:
      spec:
        serviceAccountName: sa
        nodeSelector:
          iam.gke.io/gke-metadata-server-enabled: "true"
        containers:
        - name: subscribe-job
          image: gcr.io/sharp-voyage-345407/subscribe:0.1
          command: ["python3", "main.py"]
  pollingInterval: 30
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: gcp-pubsub-credentials
    metadata:
      subscriptionName: test-sub
      subscriptionSize: "1"
```

- `serviceAccountName` and the `nodeSelector` reuse the Workload Identity configuration from the previous post so the job can read Pub/Sub without keys.
- `minReplicaCount` and `maxReplicaCount` determine how far KEDA can scale. Here I allow up to five concurrent jobs.
- Under `metadata`, `subscriptionName` points to the Pub/Sub subscription to watch, and `subscriptionSize` controls when to scale. With `"1"`, KEDA creates a new job as soon as a single unprocessed message exists.

When messages arrive, the number of running jobs increases accordingly:

<p align="center"><img src="/img/post_img/keda1.webp"></p>

<br>

### Quick Recap
To wire KEDA with Secret Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: example
  namespace: es
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: example
  target:
    name: pubsub-secret
    creationPolicy: Owner
  data:
  - secretKey: test
    remoteRef:
      key: test
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gcp-pubsub-credentials
  namespace: es
spec:
  secretTargetRef:
  - parameter: GoogleApplicationCredentials
    name: pubsub-secret
    key: test
```

`name` is the Kubernetes Secret created by External Secrets Operator; `key` is the key inside that Secret, which corresponds to the Secret Manager entry. After that KEDA scales the jobs exactly when Pub/Sub starts to backlog.
<br>
