---
description: Database Design
pubDate: '2022-01-27'
tags:
- DataCamp
- DB
title: Database Design
---

#### How Should We Organize Data?

Sound database design covers schemas, normalization, views, access control, DBMS choice, and much more. There’s no single right answer—the ideal design depends on how you plan to use the data. Cost, performance, and storage footprint all vary with architecture.

<br>

#### OLTP vs. OLAP

Two classic processing approaches:

| Aspect | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
| --- | --- | --- |
| Purpose | Support day-to-day operations | Perform analysis for decisions |
| Design | Application-oriented | Subject-oriented |
| Data | Current transactional snapshot | Integrated history for trends |
| Size | Gigabytes | Terabytes |
| Queries | Simple, fast (insert/update) | Complex, long-running |
| Users | Broad business audience | Analysts / data scientists |

OLTP examples: look up a book price, record customer transactions, log employee hours.  
OLAP examples: analyze top-selling books, study loyal customers, rank employees.

OLTP feeds OLAP. Operational systems populate data warehouses/lakes; OLAP insights guide operational strategies.

<br>

#### Data Structures

1. **Structured**: fixed schema with defined types, relationships (relational databases).
2. **Semi-structured**: self-describing formats like JSON, XML, some NoSQL.
3. **Unstructured**: raw data (images, chat logs, audio) with no schema.

Structured data is easiest to analyze but least flexible. Unstructured data scales better but needs more processing.

<br>

#### Traditional Databases, Warehouses, Lakes

- **Relational DBs**: usually OLTP, normalized schemas.
- **Data Warehouses**: OLAP-focused, gather multiple sources, use columnar storage and parallel processing (Redshift, BigQuery, Azure Synapse). Data marts are subject-focused subsets.
- **Data Lakes**: inexpensive object storage for all formats (structured, semi/unstructured). Schema-on-read, great for large-scale analytics and ML. Need governance to avoid “data swamps.”

<br>

#### ETL vs. ELT

- **ETL (Extract–Transform–Load)**: traditional warehouse flow—clean and transform before loading.
- **ELT (Extract–Load–Transform)**: load raw data first (common in big-data scenarios) and transform later as needed.

<br>

#### Database Design Basics

Design determines how data is stored and queried. Two components:

- **Data model**: conceptual specification (entities, relationships, attributes). Most common: relational model.
- **Schema**: blueprint implementing the model (tables, fields, relationships, indexes, views).

Data modeling layers:
1. Conceptual (what entities exist, how they relate).
2. Logical (map entities to tables).
3. Physical (how data is stored on disk).

<br>

#### Dimensional Modeling

Optimized for OLAP warehouses:
- Uses **fact tables** (metrics, foreign keys) and **dimension tables** (descriptive attributes).
- Star schema (simplest): fact table in the center, dimensions radiating.
- Snowflake schema: normalized dimensions, creating additional tables.

Example star schema fact table with measures `sale_amount`, `quantity`, and foreign keys to dimensions (book, store, time).

<br>

#### Normalization

Break tables into smaller ones and link via relationships to reduce redundancy and improve data integrity.

Example: A sales table with repeated author/publisher/genre info gets split into separate tables with foreign keys.

Normalization pros:
- Less duplication → safer updates, easier schema changes.
- Better consistency (e.g., “California” vs. “CA”).

Cons:
- More joins → slower reads, more complex queries.

OLTP systems benefit from normalization (write-heavy). OLAP systems often denormalize for faster reads.

<br>

#### Normal Forms

Levels of normalization:
- **1NF**: rows unique, each cell holds a single value.
- **2NF**: in 1NF, and every non-key column depends on the entire composite key (if one exists).
- **3NF**: in 2NF, and no transitive dependencies (non-key columns don’t depend on other non-key columns).

Higher normal forms reduce anomalies:
- **Update anomaly**: conflicting duplicates when updating.
- **Insert anomaly**: can’t insert due to missing data.
- **Delete anomaly**: deleting one fact removes others accidentally.

<br>

#### Views

A view is a virtual table defined by a query—it stores no data itself, making it ideal for reusable logic and access control.

```sql
CREATE VIEW view_name AS
SELECT col1, col2
FROM table_name
WHERE condition;

SELECT * FROM view_name;
```

List views (PostgreSQL):

```sql
SELECT *
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema');
```

Pros:
- No extra storage.
- Hide complexity; restrict columns/rows for certain users.
- Useful for frequently run queries.

You can update or insert through a view if it meets strict criteria (often discouraged). Drop or redefine a view as needed:

```sql
DROP VIEW view_name;
CREATE OR REPLACE VIEW view_name AS new_query;
```

<br>

#### Materialized Views

Materialized views store precomputed results on disk:
- Faster for expensive queries.
- Must be refreshed manually or on schedule (`REFRESH MATERIALIZED VIEW my_mv;`).
- Best for data warehouses where slight staleness is acceptable.
- Manage dependencies: refresh upstream objects before downstream to avoid stale data.

<br>

#### Access Control: Roles and Privileges

Roles manage permissions. They can act as users or groups.

```sql
CREATE ROLE data_analyst;
CREATE ROLE intern WITH PASSWORD 'PasswordForIntern' VALID UNTIL '2020-01-01';
ALTER ROLE admin CREATEROLE;

GRANT UPDATE ON ratings TO data_analyst;
REVOKE UPDATE ON ratings FROM data_analyst;
```

Group roles encapsulate privileges; user roles inherit from groups:

```sql
CREATE ROLE data_analyst;
CREATE ROLE alex WITH PASSWORD 'PasswordForIntern';
GRANT data_analyst TO alex;
```

Revoke with `REVOKE data_analyst FROM alex;`.

<br>

#### Putting It All Together

Database design is about trade-offs:
- OLTP vs. OLAP workloads.
- Structured vs. semi/unstructured data.
- Normalized vs. denormalized schemas.
- Virtual vs. materialized views.
- Security and role management.

Understanding these concepts helps you build systems that are performant, maintainable, and aligned with business needs.

<br>
