---
description: Connecting Web and DB Pods in Kubernetes
pubDate: '2022-07-03'
tags:
- kubernetes
title: Connecting Web and DB Pods in Kubernetes
---

Sometimes you have to run both your web app and database inside the cluster (instead of using a managed service like RDS). Here are two ways I linked them.

1. **Sidecar pattern** – web + DB containers in a single pod.
2. **Separate services** – independent pods connected via services.

<br>

### 1. Sidecar Pattern

Both containers share the same pod, thus the same IP/namespace, so the app can connect to MySQL via `localhost`.

```yaml
# service
apiVersion: v1
kind: Service
metadata:
  name: sidecar-svc
spec:
  selector:
    app: sidecar
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
```

```yaml
# deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sidecar-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sidecar
  template:
    metadata:
      labels:
        app: sidecar
    spec:
      containers:
      - name: fastapi-container
        image: fast:0.1
        ports:
        - containerPort: 8000
        env:
        - name: MYSQL_HOST
          value: "localhost"
        # other DB env vars…
      - name: mysql-container
        image: mysql:8.0.28
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
```

This is simple but not ideal for scaling—better suited to small apps.

<br>

### 2. Separate Services

Run web and DB in separate deployments. The web app references the MySQL **service name** (`mysql-svc`) instead of `localhost`.

```yaml
# services
apiVersion: v1
kind: Service
metadata:
  name: fastapi-svc
spec:
  selector:
    app: fastapi
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc          # note the name
spec:
  selector:
    app: mysql
  type: NodePort
  ports:
  - port: 3306
```

```yaml
# fastapi deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fastapi
  template:
    metadata:
      labels:
        app: fastapi
    spec:
      containers:
      - name: fastapi
        image: fast:0.1
        ports:
        - containerPort: 8000
        env:
        - name: MYSQL_HOST
          value: "mysql-svc"   # service DNS
        # other env vars…
---
# mysql deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql-pod
        image: mysql:8.0.28
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
```

Kubernetes DNS resolves `mysql-svc` to the backing pod(s), so the FastAPI container can connect to MySQL via that hostname.

<br>

### About Port Names

I wondered if naming a port would let me connect by name (similar to Docker Compose). Not quite—names help map container ports inside a Service:

```yaml
# mysql container
ports:
  - name: db-port
    containerPort: 3306
```

```yaml
# service
ports:
  - port: 8000
    targetPort: db-port
```

Here, the Service’s `targetPort` references the named port, but it doesn’t replace DNS. Use the Service name for inter-pod communication.
