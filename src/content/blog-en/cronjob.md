---
description: Building a Dashboard with Kubernetes CronJobs
pubDate: '2022-05-18'
tags:
- kubernetes
- cronjobs
title: Building a Dashboard with Kubernetes CronJobs
---

Batch jobs usually mean **cron** or **Airflow**. Cron is dead simple but lacks observability. Airflow offers rich scheduling/monitoring, yet it’s heavier to operate. Kubernetes CronJobs sit somewhere in between—they’re easy to configure and provide basic monitoring.

Here’s how I automated a small dashboard update.

<br>

### 1. Python Script

Write the logic you want to run periodically. Mine generates a weekly study dashboard (see [code](https://github.com/Sejong-Talk-With/Semogong_plot/tree/main/make_plot)), but a simple example might be:

```python
print("hello world")
```

<br>

### 2. Dockerize It

`Dockerfile`:

```dockerfile
FROM python:3.9.10
ADD make_plot/ .
RUN pip install --trusted-host pypi.python.org -r requirements.txt
ENTRYPOINT ["python", "main.py"]
```

Build the image (Apple M1 users: specify `--platform amd64` to ensure compatibility with x86 nodes):

```bash
docker build --platform amd64 \
  --build-arg DEPENDENCY=build/dependency \
  --tag make_plot:latest .
# or simply: docker build -t make_plot:latest .
```

Push to Docker Hub:

```bash
docker tag <image-id> wjdqlsdlsp/make_plot
docker push wjdqlsdlsp/make_plot
```

<br>

### 3. Create the CronJob Manifest

```yaml
# cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: semogong-dash
spec:
  schedule: "0 * * * *"               # top of every hour
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: semogong-dash
            image: wjdqlsdlsp/make_plot:latest
            envFrom:
            - configMapRef:
                name: config-dev
          restartPolicy: OnFailure
```

Apply it:

```bash
kubectl create -f cronjob.yaml
```

<br>

### 4. Monitor

```bash
kubectl get cronjob
# NAME            SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
# semogong-dash   0 * * * *   False     0        38m             14d

kubectl get pods
# NAME                           READY   STATUS      RESTARTS   AGE
# semogong-dash-27547920-b7vjn   0/1     Completed   0          39m
```

CronJobs retain recent Jobs so you can inspect their status (`Completed`, `Failed`, etc.) and view logs as needed.

<br>

### Notes

- Cron schedules use **UTC**, so adjust for your timezone. [crontab.guru](https://crontab.guru/) is handy for conversions.
- This approach sits nicely between bare-metal cron and full-blown Airflow—quick to set up, yet still observable via Kubernetes.
