---
description: Notes from GCP OnAir – Big Series
pubDate: '2022-09-15'
tags:
- GCP
title: Notes from GCP OnAir – Big Series
---

Takeaways from Google Cloud’s **Big Series** event focused on BigQuery, BigLake, and modern data platforms.

<br>

### BigQuery Highlights

- Enterprise data warehouse with petabyte-scale storage/queries (exabyte scale coming).
- Standard SQL interface; easy for analysts to adopt.
- Fully managed, serverless (slot-based execution).
- Zero-ops, high durability, encrypted at rest and in transit.
- Streaming ingestion enables near real-time analytics.

Evolution:
- 1990s: Data Warehouses → 2000s: BI Foundations → Today: Data Analytics → Future: AI foundation.

### Fully Managed

Google handles infrastructure; users focus on analytics. Default quota is 2,000 slots, and you can request more. Pricing remains competitive—BigQuery is often called Google’s “killer service.”

### Sharing, Not Copying

GCP promotes secure data sharing rather than duplication. BigQuery supports simultaneous access without replicas.

### Managed Storage

- Data is replicated across multiple zones (3–4 by default).
- Compression available, but billing uses uncompressed size (negotiable at PB scale).
- Regional service—cross-region transfers incur charges.

### Why Dynamic Slot Allocation Works

Compute and storage are decoupled, yet tightly integrated for performance.

### Pricing

- **Analysis**: based on data scanned.
- **Storage**: active storage (<90 days) vs. long-term (>90 days, cheaper).
- **Loading**: free for ETL ingest.
- **Free tiers**: trial, monthly free quotas (10 GB storage, 1 TB query), free operations.

### Workload Management

- Slot = bundle of CPU, RAM, network.
- On-demand pricing auto-assigns slots per query; flat-rate reservations guarantee capacity.
- Idle reserved slots are auto-shared (disable via CLI if needed).
- Use flex slots for temporary peaks.

### Monitoring

BigQuery resource charts, Cloud Monitoring, and `INFORMATION_SCHEMA` tables help track usage/costs.

### Machine Learning

BigQuery continues to expand built-in ML capabilities—easy ML atop warehouse data.

### Data Mesh & Modern Platforms

Traditional centralized teams can’t keep pace; data needs outstrip capacity, leading to “data chaos.” Solution: treat **data as a product** and empower domain teams.

Key traits:
- Domain-oriented decentralization.
- Self-serve data platforms.
- Federated governance.
- High-quality datasets discoverable and trusted.

### BigLake + DataPlex

- **BigLake**: unified lakehouse (warehouse + lake) supporting structured and semi-structured data, fine-grained security, multi-cloud governance, performance acceleration.
- **DataPlex**: centralized management and governance for distributed data (AI-powered cataloging, policy enforcement).

BigLake integrates tightly with BigQuery and GCS, enabling modern lakehouse architectures on GCP.

<br>

**Bottom line:** Modernize your data platform with BigQuery + BigLake + DataPlex to empower domain teams while maintaining centralized governance.***
