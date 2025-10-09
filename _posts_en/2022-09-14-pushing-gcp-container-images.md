---
layout: post
title: "Pushing Images to Google Container Registry"
categories: [gcr, Docker]
tags: [gcr, Docker]
---

Quick cheat sheet for building Docker images and pushing them to GCR.

<br>

### Build the Image

```bash
docker build -t <image_name>:<image_version> .
```

If you’re on Apple Silicon (M1/M2), target x86 to avoid surprises on Linux:

```bash
docker build --platform linux/amd64 -t <image_name>:<image_version> .
```

List local images:

```bash
docker images
```

<br>

### Tag for GCR

```bash
docker tag <image_id> gcr.io/<project_id>/<repo_name>:<image_version>
```

Replace `<image_id>` with the ID from `docker images`.

<br>

### Push

```bash
docker push gcr.io/<project_id>/<repo_name>:<image_version>
```

Make sure you’re authenticated (`gcloud auth configure-docker`) before pushing. That’s it! ***
