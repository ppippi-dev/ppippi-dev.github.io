---
description: Building Data Engineering Pipelines in Python
pubDate: '2021-12-03'
tags:
- DataCamp
- Python
title: Building Data Engineering Pipelines in Python
---

#### Data Is Valuable

- Modern organizations increasingly recognize the value of collecting data.
- Internal teams rely on data more than ever; nearly everyone needs access for new insights.
- Public-facing products expose data through APIs and open datasets.

<br>

#### Genesis of the Data

Data originates in operational systems—streaming sensors, web logs, Google Analytics, sales platforms, IoT devices, and so on. We must store it somewhere for later processing. At today’s scale and velocity those repositories are often called **data lakes**.

Operational data typically lands in an initial **landing zone** within the data lake. Moving data into the lake is referred to as **ingestion**.

<br>

#### Cleaned Data Prevents Rework

Teams build many services on top of the lake—prediction models, A/B testing dashboards, etc.—and most require data transformations. Instead of repeating the same cleaning logic, we move data from the landing zone to a **clean zone** after standard transformations.

<br>

#### Business Layer for Insights

Finally, business-specific transformations feed downstream use cases. Example: predicting customer churn based on curated datasets passed into ML algorithms.

<br>

#### Pipelines Move Data Between Zones

Data pipelines migrate data from one zone to another and apply transformations along the way. They may be triggered by events (file arrival), schedules (nightly batches), or manually. Classic **ETL** (extract, transform, load) pipelines benefit from orchestrators like Apache Airflow.

<br>

#### Singer Fundamentals

Singer aims to be an open standard for moving data. It standardizes communication between:
- **Taps** (extract scripts) and
- **Targets** (load scripts)

Both use JSON messages over stdout. Because Singer is a specification, taps and targets can be written in any language and mixed freely. Messages flow through named **streams** and come in three types: `SCHEMA`, `STATE`, and `RECORD`.

Example schema definition:

```python
columns = {"id", "name", "age", "has_children"}
users = {
    (1, "Adrian", 32, False),
    (2, "Ruanne", 28, False),
    (3, "Hillary", 29, True),
}

json_schema = {
    "properties": {
        "age": {"maximum": 130, "minimum": 1, "type": "integer"},
        "has_children": {"type": "boolean"},
        "id": {"type": "integer"},
        "name": {"type": "string"},
    },
    "$id": "http://yourdomain.com/schemas/my_user_schema.json",
    "$schema": "http://json-schema.org/draft-07/schema#",
}
```

Write the schema message:

```python
import singer

singer.write_schema(
    schema=json_schema,
    stream_name="DC_employees",
    key_properties=["id"],
)
```

JSON serialization helpers:

```python
import json

json.dumps(json_schema["properties"]["age"])

with open("foo.json", mode="w") as fh:
    json.dump(obj=json_schema, fp=fh)
```

Send record messages:

```python
columns = ("id", "name", "age", "has_children")
users = {
    (1, "Adrian", 32, False),
    (2, "Ruanne", 28, False),
    (3, "Hillary", 29, True),
}

singer.write_record(
    stream_name="DC_employees",
    record=dict(zip(columns, users.pop())),
)
```

Constructing a record manually:

```python
fixed = {"type": "RECORD", "stream": "DC_employees"}
record_msg = {**fixed, "record": dict(zip(columns, users.pop()))}
print(json.dumps(record_msg))
```

Chain taps and targets:

```python
# my_tap.py
import singer

singer.write_schema(stream_name="foo", schema=...)
singer.write_records(stream="foo", records=...)
```

Pipe the output into a target:

```shell
python my_tap.py | target-csv
python my_tap.py | target-csv --config userconfig.cfg
```

Swap targets easily thanks to the shared JSON format:

```shell
my-packaged-tap | target-csv
my-packaged-tap | target-google-sheets
my-packaged-tap | target-postgresql --config conf.json

tap-custom-google-scraper | target-postgresql --config headlines.json
```

State messages keep track of progress:

```python
singer.write_state(value={"max-last-updated-on": some_variable})
```

<br>

#### Spark Overview

Spark is an analytics engine for large-scale data. Spark Core underpins four major libraries:
- Spark SQL
- Spark Streaming
- MLlib
- GraphX

Spark runs anywhere (local machine, cluster, cloud) and supports multiple languages, including Python (PySpark).

Use Spark when you need to process massive datasets or perform interactive analyses across many machines. Don’t use it for tiny datasets or trivial filters—the overhead outweighs the benefits.

**Business example**: find the ideal diaper by combining qualitative (comfort) and quantitative (price) metrics. Marketing already collected raw price and rating feeds.

Start Spark:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()
```

Read CSV:

```python
prices = spark.read.csv("mnt/data_lake/landing/prices.csv")
prices.show()
```

With headers:

```python
prices = spark.read.options(header="true").csv("mnt/data_lake/landing/prices.csv")
prices.show()
```

Inspect dtypes:

```python
from pprint import pprint
pprint(prices.dtypes)
```

Define an explicit schema:

```python
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    FloatType,
    IntegerType,
    DateType,
)

schema = StructType(
    [
        StructField("store", StringType(), nullable=False),
        StructField("countrycode", StringType(), nullable=False),
        StructField("brand", StringType(), nullable=False),
        StructField("price", FloatType(), nullable=False),
        StructField("currency", StringType(), nullable=True),
        StructField("quantity", IntegerType(), nullable=True),
        StructField("date", DateType(), nullable=False),
    ]
)

prices = (
    spark.read.options(header="true")
    .schema(schema)
    .csv("mnt/data_lake/landing/prices.csv")
)
```

<br>

#### Reasons to Clean Data

Real-world data is messy: wrong types, malformed rows, incomplete records, poorly chosen placeholders (“N/A”, “Unknown”). Automation is limited because cleaning is context-dependent (regulatory requirements, downstream tolerance, implicit standards).

Data types to consider:

| Spark type   | Python value          |
| ------------ | --------------------- |
| `ByteType`   | small ints (−128–127) |
| `ShortType`  | ints (−32 768–32 767) |
| `IntegerType`| ints (−2 147 483 648–2 147 483 647) |
| `FloatType`  | `float`               |
| `StringType` | `str`                 |
| `BooleanType`| `bool`                |
| `DateType`   | `datetime.date`       |

Handle malformed rows:

```python
prices = (
    spark.read.options(header="true", mode="DROPMALFORMED")
    .csv("landing/prices.csv")
)
```

Deal with nulls:

```python
prices.fillna(25, subset=["quantity"]).show()
```

Replace illogical placeholders:

```python
from pyspark.sql.functions import col, when
from datetime import date

one_year_from_now = date.today().replace(year=date.today().year + 1)

better = employees.withColumn(
    "end_date",
    when(col("end_date") > one_year_from_now, None).otherwise(col("end_date")),
)
```

<br>

#### Common Transformations

- Filter rows to focus on relevant data.
- Select/rename columns for clarity.
- Group and aggregate for metrics.
- Join DataFrames to enrich records.
- Order results for downstream consumption.

Filtering and ordering:

```python
from pyspark.sql.functions import col

prices_in_be = prices.filter(col("countrycode") == "BE").orderBy(col("date"))
```

Selecting/renaming:

```python
brands = prices.select(col("store"), col("brand").alias("brandname")).distinct()
```

Grouping:

```python
prices.groupBy(col("brand")).mean("price").show()

prices.groupBy(col("brand")).agg(
    avg("price").alias("average_price"),
    count("brand").alias("number_of_items"),
).show()
```

Join ratings with prices:

```python
ratings_with_prices = ratings.join(prices, ["brand", "model"])
```

<br>

#### Running PySpark Pipelines

Execute locally:

```shell
python my_pyspark_data_pipeline.py
```

Use `spark-submit` for real deployments:

```shell
spark-submit \
    --master "local[*]" \
    --py-files dependencies.zip \
    pydiaper/cleaning/clean_prices.py \
    app_arguments
```

Package dependencies:

```shell
zip --recurse-paths dependencies.zip pydiaper
```

<br>

#### Testing Pipelines

Why test?
- Ensure code aligns with expectations.
- Provide fast feedback before issues reach production.
- Tests double as living documentation.

Test pyramid guidance:
- Many fast **unit** tests (no external dependencies).
- Fewer **integration** tests (database, filesystem).
- Minimal **end-to-end** UI tests (slow, costly).

Spark ETL equals extract → transform → load. Extraction and loading touch external systems (expensive), so isolate pure transformations for unit tests.

Create in-memory DataFrames:

```python
from pyspark.sql import Row

purchase = Row("price", "quantity", "product")
record = purchase(12.99, 1, "cake")
df = spark.createDataFrame([record])
```

Refactor into small functions:

```python
def link_with_exchange_rates(prices, rates):
    return prices.join(rates, ["currency", "date"])

def calculate_unit_price_in_euro(df):
    return df.withColumn(
        "unit_price_in_euro",
        col("price") / col("quantity") * col("exchange_rate_to_euro"),
    )

unit_prices_with_ratings = calculate_unit_price_in_euro(
    link_with_exchange_rates(prices, exchange_rates)
)
```

Unit test example:

```python
def test_calculate_unit_price_in_euro():
    record = dict(price=10, quantity=5, exchange_rate_to_euro=2.0)
    df = spark.createDataFrame([Row(**record)])

    result = calculate_unit_price_in_euro(df)

    expected = spark.createDataFrame(
        [Row(**record, unit_price_in_euro=4.0)]
    )

    assertDataFrameEqual(result, expected)
```

Takeaways:
- Avoid external dependencies in unit tests.
- In-memory DataFrames are concise and explicit.
- Small, well-named functions are easier to test and reuse.

Run the suite with pytest:

```shell
cd ~/workspace/my_good_python_project
pytest .
```

Automate with Git hooks or CI/CD.

<br>

#### CI/CD Basics

Continuous Integration (CI) ensures only tested, reliable changes reach the main branch. Continuous Delivery (CD) guarantees deployable artifacts.

Example CircleCI config (`.circleci/config.yml`):

```yaml
jobs:
  test:
    docker:
      - image: circleci/python:3.6.4
    steps:
      - checkout
      - run: pip install -r requirements.txt
      - run: pytest .
```

<br>

#### Workflows and Scheduling

A workflow is a scheduled set of tasks. Cron is the classic scheduler:

```text
*/15 9-17 * * 1-3,5 log_my_activity
```

Runs `log_my_activity` every 15 minutes between 09:00–17:59 on Mon, Tue, Wed, Fri.

Cron is lightweight but limited for complex orchestrations. Modern alternatives include Luigi, Azkaban, and Airflow.

<br>

#### Apache Airflow

Airflow meets modern needs:
- Visual DAGs (task graphs)
- Monitoring (task durations, failures)
- Horizontal scaling

DAGs are **Directed Acyclic Graphs**. Nodes are operators; edges define dependencies. DAG code:

```python
from airflow import DAG
from datetime import datetime

my_dag = DAG(
    dag_id="publish_logs",
    schedule_interval="* * * * *",
    start_date=datetime(2010, 1, 1),
)
```

Common operators:
- `BashOperator`
- `PythonOperator`
- `SparkSubmitOperator`

Set dependencies:

```python
task1 >> task2
task3 << task2

# Equivalent
task1 >> task2 >> task3
```
