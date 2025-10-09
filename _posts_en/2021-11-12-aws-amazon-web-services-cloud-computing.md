---
layout: post
title: "AWS – Amazon Web Services – Cloud Computing"
categories: [AWS]
tags: [AWS]
---

> Notes from *Amazon Web Services – AWS Discovery Book* by Kwon Young-hwan.

<br>

#### What Is Cloud Computing?

Cloud computing delivers computing services via the internet. The opposite model is often called edge computing; in practice both approaches matter. In this post we’ll explore AWS, the cloud that always comes up in “fourth industrial revolution” conversations.

<br>

#### Benefits of Cloud Computing

- Access from anywhere, anytime, over the internet.
- No upfront capital expenditure; pay only for what you use.
- Economies of scale drive continuous price reductions.
- You never have to forecast future infrastructure capacity.
- Improved speed and agility.
- No need to operate and maintain your own data center.
- Launch or deploy services worldwide in minutes.

Thanks to these advantages most companies now rely on cloud platforms.

<br>

#### Why You Should Learn Cloud Computing

- Many organizations have already adopted the cloud or are actively evaluating it.
- Managing hardware in on-prem data centers is becoming rare.

Cloud usage keeps rising. To work as an engineer today, you need to understand it—it’s no longer optional.

<br>

#### Service Models: IaaS, PaaS, SaaS

- **IaaS (Infrastructure as a Service)**: virtualized compute, networking, and storage delivered flexibly to many customers. Think raw infrastructure.
- **PaaS (Platform as a Service)**: a managed platform for building and running web services or applications.
- **SaaS (Software as a Service)**: applications delivered via the web browser, such as Gmail or Microsoft 365.

<br>

#### Major AWS Services

AWS holds the largest share of the global cloud market and offers a huge catalog of services—EC2, ELB, S3, EKS, ECS, and plenty more with “Elastic” in the name. They even provide services for satellites that you’d expect only specialized companies to run.

<br>

#### Servers

A server is a computer designed for a specialized task. It needs faster CPUs, large memory, and high-capacity disks to process ever-growing data volumes. Consequently, servers cost more than typical desktops and often run server-grade OSes like UNIX or Linux (Windows Server is also common).

On AWS you provision virtual servers through **EC2 (Elastic Compute Cloud)**. Pick whatever hardware profile you need and spin it up on demand.

<br>

#### Hard Disks

Hard disks consist of magnetically coated platters spinning at high speed; they store, retrieve, and delete data persistently. There are traditional spinning disks and flash-based SSDs. SSDs offer faster access, lower latency, and minimal noise—but at a higher price.

Servers frequently employ disk array controllers, RAID, and similar technologies to protect data and maintain performance even when drives fail.

On AWS you attach block storage to EC2 instances via **EBS (Elastic Block Store)**.

<br>

#### Security

Security keeps information and data safe from threats. AWS offers:

- **IAM (Identity & Access Management)** for user access and encryption key control.
- **Amazon GuardDuty** for managed threat detection.
- **AWS Shield** for DDoS protection.
- **AWS WAF (Web Application Firewall)** for filtering malicious web traffic.

As security grows in importance, AWS continues to expand these offerings.

<br>

#### Firewalls

A firewall protects internal assets connected to external networks such as the internet. All external traffic must pass through it, giving you a chance to detect and block attacks.

AWS provides virtual firewalls like **Security Groups**, **Network ACLs**, and AWS WAF.

<br>

#### Regions

Serving global customers from a single physical location creates latency and disaster-recovery risks. AWS mitigates this by operating regions worldwide. In 2016 the Seoul region launched, enabling low-latency service for Korea (Japan’s region was commonly used before that).

<br>

#### Availability Zones

Availability Zones (AZs) are AWS data centers. Each region contains multiple AZs that are geographically separated to avoid simultaneous outages due to disasters or power failures. Korea has three AZs today.

<br>

#### Edge Locations

Edge locations relate to CDN (Content Delivery Network) infrastructure. A CDN replicates content to cache servers around the world so users download from nearby points of presence.

AWS’s CDN is **CloudFront**; its collection of cache servers are edge locations. Accessing content from a nearby edge server is dramatically faster than from a distant origin, so CloudFront maintains POPs in major cities worldwide.

<br>

#### Amazon EC2

**EC2 (Elastic Compute Cloud)** delivers scalable virtual compute capacity. Each virtual machine is an “instance,” and you can run thousands if needed.

Key features:
- Scale from one instance to thousands.
- Available in every public AWS region.
- Create, start, modify, stop, and delete instances on demand.
- Supports Linux and Windows; install any software you need.
- Pay by the second based on usage.
- Multiple pricing models to match your workload.

<br>

#### EC2 Instance Families

Instance names encode their purpose:

- **M** series: general purpose.
- **C** series: compute optimized.
- **I** / **D** series: storage optimized.
- **G** series: GPU optimized.
- **R** series: memory optimized.

Example: **c4.large**

- `c`: family (compute optimized)
- `4`: generation
- `large`: size within the family

<br>

#### EC2 Purchasing Options

- **On-Demand**: launch when you need it; pay per second (postpaid).
- **Reserved Instances**: commit for 1 or 3 years for a substantial discount (often prepaid).
- **Spot Instances**: bid for spare capacity; highest bids win.
- **Dedicated Instances**: run on hardware dedicated to a single customer.

<br>

#### Amazon EBS (Elastic Block Store)

EBS provides block-level storage volumes for EC2 instances. Volumes are persistent, low-latency, and designed for reliability.

Key traits:
- Choose size in 1 GB increments up to multiple TB.
- Charged based on volume size and time in use.
- Magnetic tiers also bill per I/O operation.
- Decoupled from EC2—you can detach and reattach to other instances.
- Data persists independently of the instance; create volumes in any AZ within the region.
- Create or restore volumes from snapshots.

Volume types include:
- General Purpose SSD
- Provisioned IOPS SSD
- Throughput Optimized HDD
- Cold HDD
- Magnetic

<br>

#### EBS Snapshots

A snapshot captures the state of storage at a specific moment—crucial for backups and recovery. EBS snapshots let you back up or archive volumes.

Characteristics:
- You can keep using the volume and instance while a snapshot runs.
- Use snapshots to resize volumes.
- Share snapshots with other AWS accounts.
- Copy snapshots across regions.

<br>

#### Amazon Security Groups

Security Groups act as virtual firewalls controlling inbound and outbound traffic for EC2 instances. You can attach up to five security groups when launching an instance. The policy model closely resembles traditional on-premises firewall rules.
