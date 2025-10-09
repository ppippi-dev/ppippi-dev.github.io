---
layout: post
title: "Force-Deleting a Stuck Kubernetes Namespace"
categories: [kubernetes]
tags: [kubernetes]
---

Sometimes a namespace refuses to disappear. Even after deleting everything inside, the namespace sits in `Terminating` forever. The culprit is usually **finalizers**.

Finalizers prevent Kubernetes from removing a namespace while resources still exist. If a controller fails to clean up, the namespace gets stuck. When that happens you can remove the finalizers manually.

```bash
NAMESPACE=ingress-nginx-controller
kubectl get namespace $NAMESPACE -o json > $NAMESPACE.json
```

Set the `NAMESPACE` variable to the namespace you want to delete and export its definition as JSON.

Open the JSON file and edit the `spec.finalizers` field:

```json
"spec": {
  "finalizers": []
}
```

A shortcut is to search for `"finalizers"` and replace the array with an empty list.

Next, start a local Kubernetes API proxy (run this in a **separate terminal**):

```bash
kubectl proxy
```

Back in the original terminal apply the modified namespace definition:

```bash
curl -k -H "Content-Type: application/json" \
  -X PUT \
  --data-binary @$NAMESPACE.json \
  http://127.0.0.1:8001/api/v1/namespaces/$NAMESPACE/finalize
```

Because the finalizers array is now empty, Kubernetes proceeds with the pending deletion and the namespace finally disappears.
<br>
