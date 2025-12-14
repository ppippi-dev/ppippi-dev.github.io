---
description: Introduction to Relational Databases in SQL
pubDate: '2022-01-20'
tags:
- DataCamp
- SQL
title: Introduction to Relational Databases in SQL
---

#### Why Use a Database?

Relational databases offer structure, consistency, and relationships that spreadsheets can’t match. Each table stores one entity type (professors, universities, companies), eliminating duplication and allowing precise modeling of relationships (e.g., a professor can work for multiple universities; a company can employ many professors).

Explore PostgreSQL metadata:

```sql
SELECT table_schema, table_name
FROM information_schema.tables;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pg_config';

SELECT *
FROM university_professors
LIMIT 3;
```

Entity–relationship diagrams depict entity types (rectangles) and attributes (ovals). When attributes don’t fit neatly in a single table, create junction tables (e.g., affiliations) to avoid duplication.

<br>

#### Creating and Altering Tables

Basic syntax:

```sql
CREATE TABLE table_name (
    column_a data_type,
    column_b data_type,
    column_c data_type
);

ALTER TABLE table_name
ADD column_d data_type;
```

Example:

```sql
CREATE TABLE weather (
    clouds text,
    temperature numeric,
    weather_station char(5)
);
```

Insert distinct data from an existing table:

```sql
INSERT INTO organizations
SELECT DISTINCT organization, organization_sector
FROM university_professors;
```

Rename or drop columns:

```sql
ALTER TABLE table_name
RENAME COLUMN old_name TO new_name;

ALTER TABLE table_name
DROP COLUMN column_name;
```

<br>

#### Integrity Constraints Overview

Integrity constraints enforce rules:
- **Attribute constraints**: data types, NOT NULL, etc.
- **Key constraints**: uniqueness, primary keys.
- **Referential constraints**: foreign keys between tables.

They ensure consistent data, improve quality, and enable the DBMS to optimize queries.

<br>

#### Data Types and Casting

Operations depend on data types. Cast as needed:

```sql
SELECT temperature * CAST(wind_speed AS integer) AS wind_chill
FROM weather;
```

Change column types:

```sql
ALTER TABLE students
ALTER COLUMN name TYPE varchar(128);

ALTER TABLE students
ALTER COLUMN average_grade TYPE integer
USING ROUND(average_grade);
```

<br>

#### NOT NULL and UNIQUE

Use NOT NULL for mandatory fields:

```sql
CREATE TABLE students (
    ssn integer NOT NULL,
    lastname varchar(64) NOT NULL,
    home_phone integer,
    office_phone integer
);

ALTER TABLE students
ALTER COLUMN home_phone SET NOT NULL;

ALTER TABLE students
ALTER COLUMN ssn DROP NOT NULL;
```

Enforce uniqueness:

```sql
CREATE TABLE table_name (
    column_name UNIQUE
);

ALTER TABLE table_name
ADD CONSTRAINT some_name UNIQUE (column_name);
```

<br>

#### Primary Keys

Primary keys uniquely identify rows. They disallow duplicates and NULLs and should be minimal and stable.

```sql
CREATE TABLE products (
    product_no integer PRIMARY KEY,
    name text,
    price numeric
);

CREATE TABLE example (
    a integer,
    b integer,
    c integer,
    PRIMARY KEY (a, c)
);

ALTER TABLE table_name
ADD CONSTRAINT some_name PRIMARY KEY (column_name);
```

When natural keys are cumbersome, create surrogate keys. PostgreSQL’s `serial` type auto-increments:

```sql
ALTER TABLE cars
ADD COLUMN id serial PRIMARY KEY;
```

You can also concatenate existing columns into a new key:

```sql
ALTER TABLE table_name ADD COLUMN column_c varchar(256);
UPDATE table_name SET column_c = CONCAT(column_a, column_b);
ALTER TABLE table_name ADD CONSTRAINT pk PRIMARY KEY (column_c);
```

<br>

#### Foreign Keys and Relationships

Foreign keys link tables and enforce referential integrity: the child table must reference existing parent rows.

```sql
CREATE TABLE manufacturers (
    name varchar(255) PRIMARY KEY
);

CREATE TABLE cars (
    model varchar(255) PRIMARY KEY,
    manufacturer_name varchar(255)
        REFERENCES manufacturers (name)
);

ALTER TABLE a
ADD CONSTRAINT a_fkey FOREIGN KEY (b_id) REFERENCES b (id);
```

Many-to-many relationships use junction tables:

```sql
CREATE TABLE affiliations (
    professor_id integer REFERENCES professors (id),
    organization_id varchar(256) REFERENCES organizations (id),
    function varchar(256)
);
```

<br>

#### Referential Integrity Options

If a referenced parent row is deleted, PostgreSQL applies the foreign-key action:
- `NO ACTION` / `RESTRICT` (default): reject the deletion.
- `CASCADE`: delete child rows automatically.
- `SET NULL`: set child foreign keys to NULL.
- `SET DEFAULT`: set child keys to their defined default.

Example:

```sql
CREATE TABLE a (
    id integer PRIMARY KEY,
    b_id integer REFERENCES b (id) ON DELETE CASCADE
);
```

Choose the option that best matches your business rules to maintain consistent relationships.

<br>
