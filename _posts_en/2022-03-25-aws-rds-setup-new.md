---
layout: post
title: "Setting Up AWS RDS"
categories: [AWS]
tags: [AWS]
---

<p align="center"><img src="/assets/img/post_img/rds.png"></p>

Amazon Relational Database Service (RDS) lets you run managed databases in the cloud. Here’s a quick walkthrough of creating a free-tier MySQL instance and connecting to it.

<br>

### 1. Choose an Engine

<p align="center"><img src="/assets/img/post_img/rds1.png"></p>

RDS supports six engines. Aurora delivers excellent performance and availability, but costs more. For this demo I chose MySQL to stay within the free tier.

<p align="center"><img src="/assets/img/post_img/rds2.png"></p>

Select the **Free Tier** template so AWS pre-configures eligible options.

<br>

### 2. Configure Instance Details

<p align="center"><img src="/assets/img/post_img/rds3.png"></p>

Set the master username and password—store them securely; you’ll need them to connect.

<p align="center"><img src="/assets/img/post_img/rds4.png"></p>

Free-tier instances are limited to `db.t2.micro`. For storage, `gp2` is the common choice (general-purpose SSD). `io1/io2` target high IOPS workloads. Enabling storage autoscaling lets RDS grow your volume when needed.

<br>

### 3. Availability, Connectivity, and Security

<p align="center"><img src="/assets/img/post_img/rds5.png"></p>

Free tier supports only **Single-AZ** deployments, which is fine for a toy project.

Next, configure networking:
- VPC, subnet group, public access, security groups.
- For this tutorial I set **Public access = Yes** so I can connect from my laptop.

<p align="center"><img src="/assets/img/post_img/rds6.png"></p>

Choose an authentication method. Passwords are simplest; for production consider IAM or Kerberos integration.

<br>

### 4. Additional Settings

<p align="center"><img src="/assets/img/post_img/rds9.png"></p>

In “Additional configuration” specify the initial database name (you’ll need it when connecting). Adjust backup and maintenance settings to taste, then create the instance. Provisioning takes a few minutes.

<br>

### 5. Connect

Once the status changes to “Available,” copy the endpoint:

<p align="center"><img src="/assets/img/post_img/rds7.png"></p>

Use your favorite client (I used SQLElectron).

<p align="center"><img src="/assets/img/post_img/rds8.png"></p>

Fill in:
- Name: any label.
- Server Address: the endpoint from AWS.
- Port: `3306` (default for MySQL).
- User/Password: the credentials you set earlier.
- Initial Database: the name from additional configuration.

<p align="center"><img src="/assets/img/post_img/rds10.png"></p>

Run a quick query to confirm everything works.

When you’re done, delete the instance (and any snapshots) to avoid charges. Even tiny resources can incur small costs if left running.***
