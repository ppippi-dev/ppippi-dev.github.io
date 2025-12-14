---
description: Introduction to PySpark
pubDate: '2021-11-24'
tags:
- DataCamp
- Spark
title: Introduction to PySpark
---

#### What Is Spark?

Apache Spark is a cluster-computing platform. It lets you distribute data and computation across several nodes (each node is a machine in the cluster). Breaking data into partitions allows each node to process only a slice, so you can work with very large datasets.

Every node performs part of the overall computation; nodes operate in parallel. Parallel computation can dramatically speed up certain tasks, but distributed systems add complexity. Choosing Spark effectively comes with experience. It shines when:
- The data is too large for a single machine.
- The computation can be parallelized easily.

<br>

#### Using Spark in Python

First connect to a cluster. The master node coordinates with worker nodes. The master distributes data and computation, and workers return results.

You create a connection by instantiating `SparkContext`. The constructor accepts options describing the cluster. Those options are often encapsulated in a `SparkConf` object.

Example sanity checks:

```python
# Verify SparkContext
print(sc)

# Print Spark version
print(sc.version)
```

Spark is serious software—it takes time to start, so simple scripts usually run faster without it.

<br>

#### DataFrames over RDDs

Spark’s foundational structure is the RDD (Resilient Distributed Dataset). It handles data partitioning across nodes, but RDDs are low-level and hard to work with. Spark DataFrames build on RDDs, offering a table-like abstraction similar to SQL tables—much easier to use and automatically optimized.

A `SparkSession` provides access to DataFrame APIs. Create one (and reuse it) with `SparkSession.builder.getOrCreate()`:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()
print(spark)
```

Spark automatically creates an underlying `SparkContext`.

Inspect available tables via the catalog:

```python
print(spark.catalog.listTables())
```

<br>

#### Querying

Spark lets you write SQL against DataFrames:

```python
query = "FROM flights SELECT * LIMIT 10"
flights10 = spark.sql(query)
flights10.show()
```

Convert a Spark DataFrame to pandas when needed:

```python
query = """
SELECT origin, dest, COUNT(*) AS N
FROM flights
GROUP BY origin, dest
"""
flight_counts = spark.sql(query)
pd_counts = flight_counts.toPandas()
print(pd_counts.head())
```

Create a Spark DataFrame from pandas:

```python
pd_temp = pd.DataFrame(np.random.random(10))
spark_temp = spark.createDataFrame(pd_temp)

print(spark.catalog.listTables())
spark_temp.createOrReplaceTempView("temp")
```

Load data directly:

```python
airports = spark.read.csv("/usr/local/share/datasets/airports.csv", header=True)
airports.show()
```

<br>

#### Columns and SQL Basics

Use `withColumn()` to add or transform columns:

```python
flights = spark.table("flights")
flights = flights.withColumn("duration_hrs", flights.air_time / 60)
```

SQL concepts carry over: SELECT, WHERE, GROUP BY, etc. For example:

```python
flights.filter("air_time > 120").show()
flights.filter(flights.air_time > 120).show()
```

Equivalent SQL:

```sql
SELECT * FROM flights WHERE air_time > 120;
```

Select columns:

```python
selected1 = flights.select("tailnum", "origin", "dest")

temp = flights.select(flights.origin, flights.dest, flights.carrier)
selected2 = temp.filter(flights.origin == "SEA").filter(flights.dest == "PDX")
```

Compute expressions with aliases:

```python
avg_speed = (
    flights.distance / (flights.air_time / 60)
).alias("avg_speed")

speed1 = flights.select("origin", "dest", "tailnum", avg_speed)
speed2 = flights.selectExpr(
    "origin", "dest", "tailnum", "distance/(air_time/60) AS avg_speed"
)
```

Aggregations:

```python
flights.filter(flights.origin == "PDX").groupBy().min("distance").show()
flights.filter(flights.origin == "SEA").groupBy().max("air_time").show()

flights.filter(flights.carrier == "DL").filter(flights.origin == "SEA") \
    .groupBy().avg("air_time").show()

flights.withColumn("duration_hrs", flights.air_time / 60) \
    .groupBy().sum("duration_hrs").show()
```

Groupings:

```python
by_plane = flights.groupBy("tailnum")
by_plane.count().show()

by_origin = flights.groupBy("origin")
by_origin.avg("air_time").show()
```

Custom aggregations via `agg()`:

```python
import pyspark.sql.functions as F

by_month_dest = flights.groupBy("month", "dest")
by_month_dest.avg("dep_delay").show()
by_month_dest.agg(F.stddev("dep_delay")).show()
```

<br>

#### Joins

Join tables with `.join()`:

```python
airports = airports.withColumnRenamed("faa", "dest")

flights_with_airports = flights.join(
    airports,
    on="dest",
    how="leftouter",
)
flights_with_airports.show()
```

<br>

#### ML Pipelines Overview

`pyspark.ml` centers on `Transformer` and `Estimator`:
- Transformers implement `.transform()` to modify a DataFrame (e.g., `Bucketizer`, `PCA`).
- Estimators implement `.fit()` to learn from data (e.g., `StringIndexer`, `RandomForestClassifier`) and return a Transformer (the model).

<br>

#### Feature Engineering Example

Join planes data:

```python
planes = planes.withColumnRenamed("year", "plane_year")
model_data = flights.join(planes, on="tailnum", how="leftouter")
```

Cast to numeric types:

```python
model_data = model_data.withColumn("arr_delay", model_data.arr_delay.cast("integer"))
model_data = model_data.withColumn("air_time", model_data.air_time.cast("integer"))
model_data = model_data.withColumn("month", model_data.month.cast("integer"))
model_data = model_data.withColumn("plane_year", model_data.plane_year.cast("integer"))
```

Create derived columns:

```python
model_data = model_data.withColumn(
    "plane_age", model_data.year - model_data.plane_year
)

model_data = model_data.withColumn("is_late", model_data.arr_delay > 0)
model_data = model_data.withColumn("label", model_data.is_late.cast("integer"))

model_data = model_data.filter(
    "arr_delay IS NOT NULL AND dep_delay IS NOT NULL "
    "AND air_time IS NOT NULL AND plane_year IS NOT NULL"
)
```

Categorical encoding (`StringIndexer` + `OneHotEncoder`):

```python
from pyspark.ml.feature import StringIndexer, OneHotEncoder, VectorAssembler

carr_indexer = StringIndexer(inputCol="carrier", outputCol="carrier_index")
carr_encoder = OneHotEncoder(inputCol="carrier_index", outputCol="carrier_fact")

dest_indexer = StringIndexer(inputCol="dest", outputCol="dest_index")
dest_encoder = OneHotEncoder(inputCol="dest_index", outputCol="dest_fact")

vec_assembler = VectorAssembler(
    inputCols=["month", "air_time", "carrier_fact", "dest_fact", "plane_age"],
    outputCol="features",
)
```

Build a pipeline:

```python
from pyspark.ml import Pipeline

flights_pipe = Pipeline(
    stages=[dest_indexer, dest_encoder, carr_indexer, carr_encoder, vec_assembler]
)
```

Fit and transform:

```python
piped_data = flights_pipe.fit(model_data).transform(model_data)
training, test = piped_data.randomSplit([0.6, 0.4])
```

<br>

#### Modeling & Evaluation

Logistic regression:

```python
from pyspark.ml.classification import LogisticRegression

lr = LogisticRegression()
```

Evaluator:

```python
import pyspark.ml.evaluation as evals

evaluator = evals.BinaryClassificationEvaluator(metricName="areaUnderROC")
```

Hyperparameter grid:

```python
import numpy as np
import pyspark.ml.tuning as tune

grid = (
    tune.ParamGridBuilder()
    .addGrid(lr.regParam, np.arange(0, 0.1, 0.01))
    .addGrid(lr.elasticNetParam, [0, 1])
    .build()
)
```

Cross-validation setup:

```python
cv = tune.CrossValidator(
    estimator=lr,
    estimatorParamMaps=grid,
    evaluator=evaluator,
)
```

Fit and evaluate:

```python
best_lr = lr.fit(training)
print(best_lr)

test_results = best_lr.transform(test)
print(evaluator.evaluate(test_results))
```
