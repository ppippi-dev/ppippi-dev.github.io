---
description: Understanding Automatic Updates in GKE
pubDate: '2022-10-01'
tags:
- GCP
- GKE
title: Understanding Automatic Updates in GKE
---

Multiple services run in my GKE clusters. Some can tolerate downtime; others cannot. Because GKE performs automatic upgrades, I wanted to understand when updates happen and how much control I have.

<br>

### Release Channels at a Glance
GKE (Google Kubernetes Engine) is Google’s managed Kubernetes offering. Kubernetes itself releases frequently to deliver new features and security fixes ([release notes](https://kubernetes.io/ko/releases/)), and GKE follows suit. Google provides four release channels to help you balance stability and freshness ([docs](https://cloud.google.com/kubernetes-engine/docs/release-notes#current_versions)).

<p align="center"><img src="/img/post_img/update1.png"></p>

#### Static (No Channel)
<p align="center"><img src="/img/post_img/update2.png"></p>
The version stays fixed unless Google must patch it for security or compatibility reasons.

#### Rapid
<p align="center"><img src="/img/post_img/update3.png"></p>
Clusters are updated within one to two days of a new Kubernetes release. Google positions this as an early-access channel for users who want the latest features immediately.

#### Regular
<p align="center"><img src="/img/post_img/update4.png"></p>
This is the recommended channel. Updates roll out about one to two weeks after a new version is published, giving Google time to validate it.

#### Stable
<p align="center"><img src="/img/post_img/update5.png"></p>
The stable channel lags the regular channel until Google is confident the version is ready for broad production use.

<br>

### Automatic Updates 101
As a managed service, GKE upgrades the control plane and node pools for you. That convenience can still cause downtime if your workloads can’t handle restarts, so it’s important to know what happens behind the scenes.

Automatic upgrades apply separately to the **control plane** and **node pools**. By default both are enabled, but only node pools can be disabled.

<br>

### Can I Disable Automatic Upgrades?
- **Control plane** upgrades are always enabled. The best you can do is pick the Static/no-channel option to slow down change.
- **Node pools** can be toggled via the UI or CLI if you want to orchestrate upgrades yourself.

<p align="center"><img src="/img/post_img/update6.png"></p>

<br>

### When Does Google Force an Upgrade?
Even if you opt out, GKE enforces upgrades for security or compatibility reasons. The [release notes](https://cloud.google.com/kubernetes-engine/docs/release-notes#September_23_2022) call out versions that will be removed.

<p align="center"><img src="/img/post_img/update7.png"></p>

Pay attention to the “no longer available” designation—that’s when Google upgrades clusters automatically. How GKE handles control planes vs. node pools differs slightly.

<br>

#### Control Plane
Control planes always receive upgrades. Even if your exact version is not marked “no longer available,” Google keeps control planes within a supported window:

<p align="center"><img src="/img/post_img/update8.png"></p>

<br>

#### Node Pool
Node pools honor the automatic-upgrade toggle most of the time. However, two scenarios still trigger upgrades:

1. The version is marked “no longer available.”
2. The node version lags more than three minors behind the control plane version.

<p align="center"><img src="/img/post_img/update9.png"></p>
<p align="center"><img src="/img/post_img/update10.png"></p>

In either case, GKE schedules upgrades regardless of your settings.

<br>

### Maintenance Exclusions
You cannot stop control plane upgrades indefinitely, but you can defer them using maintenance windows and exclusions.

<p align="center"><img src="/img/post_img/update11.png"></p>

This feature lets you specify when upgrades **can** happen or block specific time ranges. Note the warning in the UI: within any 32-day period you still must allow at least 48 hours of maintenance time. Eventually the upgrades will happen.
<br>
