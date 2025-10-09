---
layout: post
title: "Automating GKE Deployments with gcloud & Crontab"
categories: [kubernetes, devops]
tags: [kubernetes, devops]
---

Our project iterates rapidly. Rather than manually redeploy every update to Google Kubernetes Engine (GKE), I automated the process using the Google Cloud CLI plus a simple cron job.

<br>

### Why the gcloud CLI?

Cloud Shell is great, but its sessions terminate after ~20 minutes—useless for cron-based automation. Installing the Google Cloud SDK locally lets me run the same commands anytime.

Install the SDK following Google’s [official guide](https://cloud.google.com/sdk/docs/install-sdk), then initialize it:

```bash
./google-cloud-sdk/install.sh
gcloud init
```

During `gcloud init` you’ll authenticate and choose a default project/region.

<br>

### Connect to GKE from Your Machine

Retrieve cluster credentials (same command Cloud Shell uses):

```bash
gcloud container clusters get-credentials <cluster-name> \
  --zone <zone> \
  --project <project-id>
```

Verify access:

```bash
kubectl get nodes
```

<br>

### Automation Script

My app is a Spring Boot service. The Bash script clones the repo, builds it, packages a Docker image, and pushes to Docker Hub:

```bash
rm -rf Semogong
git clone https://github.com/Sejong-Talk-With/Semogong
git pull
cd Semogong
rm -rf src/test
gradle build
cp build/libs/semogong-0.0.1-SNAPSHOT.jar target/
docker build --tag wjdqlsdlsp/semogong:latest .

# optional backup
image_id=$(docker images -qa wjdqlsdlsp/semogong:latest)
docker tag "$image_id" wjdqlsdlsp/semogong:latest
docker push wjdqlsdlsp/semogong:latest
```

#### Note for Apple M1 Users

Images built on ARM Macs won’t run on x86 nodes. Add `--platform amd64`:

```bash
docker build --platform amd64 \
  --build-arg DEPENDENCY=build/dependency \
  -t wjdqlsdlsp/semogong:latest .
```

<br>

### Rolling Update

Trigger a zero-downtime deployment:

```bash
kubectl set image deployment.v1.apps/semogong \
  semogong-container=wjdqlsdlsp/semogong:latest
```

<br>

### Cron Scheduling

Wrap the build + push + rollout commands in a shell script, then schedule with `crontab`:

```bash
crontab -e
# run every hour
0 * * * * /path/to/deploy.sh

crontab -l   # verify entry
```

Every hour, cron rebuilds the image, pushes updates, and rolls the deployment on GKE automatically.

<br>

### Reflections

It’s satisfying to see the automation in action, but there are trade-offs:
- Laptop users lose battery while Docker and builds churn away.
- Error handling is minimal—failed builds require manual intervention.

The next step? Moving this workflow into a proper CI/CD pipeline for robustness and visibility.
