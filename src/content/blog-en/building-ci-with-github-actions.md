---
description: Building CI with GitHub Actions
pubDate: '2022-05-15'
tags:
- Git
- Github Action
title: Building CI with GitHub Actions
---

I used to redeploy manually via scripts triggered by cron or Airflow. That approach required a machine running 24/7 and only synced on a schedule—not ideal. While researching Jenkins, I stumbled upon [생활코딩’s GitHub Actions video](https://www.youtube.com/watch?v=uBOdEEzjxzE&ab_channel=%EC%83%9D%ED%99%9C%EC%BD%94%EB%94%A9) and realized GitHub already provides a lightweight CI/CD solution.

Here’s how I set up a CI pipeline that builds a Spring Boot app, packages it into a Docker image, and pushes to Docker Hub.

<br>

### What Is GitHub Actions?

GitHub Actions is GitHub’s native CI/CD service. You create YAML workflows under `.github/workflows/`. GitHub offers starter templates tailored to your repo—check the **Actions** tab or browse the [docs](https://github.com/features/actions).

<br>

### Workflow Overview

I wanted the pipeline to trigger on pushes/PRs to `master`, build the project, and push an updated image. Later, Kubernetes pulls from Docker Hub.

The full workflow is in this gist:

<script src="https://gist.github.com/wjdqlsdlsp/085d314a07961a92c079e88617989e5a.js"></script>

Key sections:

```yaml
name: gradle and docker

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
```

`on` defines when the workflow runs.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up JDK 11
        uses: actions/setup-java@v1
        with:
          java-version: 11
```

- `runs-on`: provision an Ubuntu runner.
- `actions/checkout@v2`: pull the repo.
- `actions/setup-java@v1`: install JDK 11.

Docker Hub login & build steps:

<script src="https://gist.github.com/wjdqlsdlsp/ab177fde9b5535e9d7920b3929c0498e.js"></script>

Sensitive values (like `DOCKER_PASSWORD`) come from GitHub Secrets: Repository Settings → Secrets → Actions.

<p align="center"><img src="/img/post_img/action2.png"></p>

The final step builds the Docker image and pushes it.

<br>

### Testing

After committing the workflow, GitHub runs it automatically. Future pushes/PRs trigger new runs.

<p align="center"><img src="/img/post_img/action3.png"></p>

A green check means success. Click through for logs and errors. If something fails, GitHub emails you (if notifications are enabled).

> Workflows live under `.github/workflows/`; edit them directly in the repo to iterate.

I stopped at CI because I plan to handle CD with Argo CD (I love its dashboard). Stay tuned for a separate post.

<br>

### Lessons Learned

- Environment variables are scoped per step. Define and use them within the same `run` block, or persist them if needed. I initially tried editing `.bashrc` inside a step—it doesn’t survive subsequent steps.
- When in doubt, cram debugging commands into a single step to keep state.

GitHub Actions turned out to be much simpler than maintaining my own Jenkins or cron-based scripts, and it ties directly to repo activity—exactly what I needed for CI.***
