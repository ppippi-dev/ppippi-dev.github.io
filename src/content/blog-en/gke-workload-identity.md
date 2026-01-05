---
description: Configuring Workload Identity on GKE
pubDate: '2022-09-17'
tags:
- GCP
- Workload Identity
title: Configuring Workload Identity on GKE
---

GCP offers **Workload Identity**, a feature that lets Kubernetes service accounts impersonate Google service accounts without shipping JSON keys as Kubernetes Secrets. It feels similar to AWS IAM roles for service accounts.

I often worry about how to handle secrets securely—especially when GKE workloads need to talk to other Google Cloud services. A common pattern looks like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcpsm-secret
  labels:
    type: gcpsm
type: Opaque
stringData:
  secret-access-credentials: |-
    {
      "type": "service_account",
      "project_id": "external-secrets-operator",
      "private_key_id": "",
      "private_key": "-----BEGIN PRIVATE KEY-----\nA key\n-----END PRIVATE KEY-----\n",
      "client_email": "test-service-account@external-secrets-operator.iam.gserviceaccount.com",
      "client_id": "client ID",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/test-service-account%40external-secrets-operator.iam.gserviceaccount.com"
    }
```

The YAML above is lifted straight from the Secret Manager documentation. Embedding JSON keys in Secrets is widespread—but it means you are still distributing credentials manually.

I wanted to eliminate that risk by adopting Workload Identity.

<br>

### Test Setup
To reproduce the need for credentials, I used the [pub/sub sample job](https://github.com/wjdqlsdlsp/secret-keda-test/tree/main/python_code/publish) from GCP’s Python examples, containerized it, and pushed the image to `gcr.io`. Running it as a Kubernetes Job failed immediately—exactly because no credentials were provided.

<p align="center"><img src="/img/post_img/workload-error1.webp"></p>

Let’s fix that with Workload Identity.

<br>

### Enable Workload Identity on the Cluster
Workload Identity lets resources in your GKE cluster impersonate IAM service accounts. The official [GCP documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) is thorough; I followed it closely.

<p align="center"><img src="/img/post_img/workload1.webp"></p>

First, verify that Workload Identity is enabled on the cluster. If not, turn it on. You can do this via the console or the CLI:

```shell
gcloud container clusters update CLUSTER_NAME \
  --region=COMPUTE_REGION \
  --workload-pool=sharp-voyage-345407.svc.id.goog
```

Next, enable the metadata server for each node pool that will run workloads using Workload Identity:

<p align="center"><img src="/img/post_img/workload2.webp"></p>

```shell
gcloud container node-pools update NODEPOOL_NAME \
  --cluster=CLUSTER_NAME \
  --workload-metadata=GKE_METADATA
```

I prefer the console UI, but the commands above achieve the same result.

<br>

### Create a Google Service Account
Now create the Google service account (GSA) that the workload should impersonate.

<p align="center"><img src="/img/post_img/workload3.webp"></p>

Assign the necessary IAM roles in the GCP IAM console—or use `gcloud iam service-accounts create` if you prefer the CLI. No JSON key files are required.

<br>

### Bind the Identities
Wire the Kubernetes service account (KSA) to the Google service account:

```shell
gcloud iam service-accounts add-iam-policy-binding <GSA_NAME>@<GSA_PROJECT>.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:<PROJECT_ID>.svc.id.goog[<NAMESPACE>/<KSA_NAME>]"
```

Where:
- `GSA_NAME`: the Google service account name
- `GSA_PROJECT`: project that owns the GSA
- `PROJECT_ID`: project hosting the GKE cluster
- `NAMESPACE`: namespace where the Kubernetes service account lives
- `KSA_NAME`: name of the Kubernetes service account

My concrete values looked like this:

```shell
gcloud iam service-accounts add-iam-policy-binding admin-user@sharp-voyage-345407.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:sharp-voyage-345407.svc.id.goog[es/sa]"
```

<br>

### Create the Namespace and Service Account
I prefer to manage Kubernetes resources declaratively:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: es
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
  namespace: es
  annotations:
    iam.gke.io/gcp-service-account: admin-user@sharp-voyage-345407.iam.gserviceaccount.com
```

The crucial bit is the `iam.gke.io/gcp-service-account` annotation. If you prefer imperative commands, the docs offer equivalents:

```shell
kubectl create namespace NAMESPACE

kubectl create serviceaccount KSA_NAME \
  --namespace NAMESPACE

kubectl annotate serviceaccount KSA_NAME \
  --namespace NAMESPACE \
  iam.gke.io/gcp-service-account=GSA_NAME@GSA_PROJECT.iam.gserviceaccount.com
```

Once the annotation is in place, the Kubernetes service account is ready to impersonate the GSA.

<br>

### Use the Service Account in Your Workload
Finally, reference the KSA from the workload that needs Google Cloud access:

```yaml
spec:
  template:
    spec:
      serviceAccountName: sa
      nodeSelector:
        iam.gke.io/gke-metadata-server-enabled: "true"
```

`serviceAccountName` points to the annotated Kubernetes service account. The `nodeSelector` ensures pods land on nodes where the metadata server is enabled—a prerequisite for Workload Identity.

After deploying the updated manifest, the Job that previously failed now succeeds without ever handling a JSON key. The sample code lives on [GitHub](https://github.com/wjdqlsdlsp/secret-keda-test) if you want to follow along.
<br>
