---
description: Introduction to MongoDB in Python
pubDate: '2022-03-02'
tags:
- DataCamp
- MongoDB
title: Introduction to MongoDB in Python
---

<p align="center"><img src="/img/post_img/mongodb1.webp"></p>

MongoDB excels at exploring data without rigid schemas. If you can model your data in JSON, you can likely store and analyze it in MongoDB.

<br>

### JSON, Python, and MongoDB

- JSON objects map neatly to Python dictionaries and MongoDB documents.
- Arrays map to Python lists and MongoDB arrays.
- Value types (strings, numbers, booleans, null) translate directly; MongoDB also supports extras like datetimes and regex.

Hierarchy overview:

| MongoDB          | JSON    | Python        |
| ---------------- | ------- | ------------- |
| Databases        | Object  | dict          |
| Collections      | Array   | list          |
| Documents        | Object  | dict          |
| Subdocuments     | Object  | dict          |
| Values           | Scalars | Scalars (plus datetime/regex) |

<br>

### Loading Sample Data (Nobel Prize API)

```python
import requests
from pymongo import MongoClient

client = MongoClient()
db = client["nobel"]

for name in ["prizes", "laureates"]:
    response = requests.get(f"http://api.nobelprize.org/v1/{name[:-1]}.json")
    documents = response.json()[name]
    db[name].insert_many(documents)
```

<br>

### Accessing Collections

Use bracket or dot notation:

```python
db = client["nobel"]
prizes = db["prizes"]
# or
db = client.nobel
prizes = db.prizes
```

Count documents:

```python
prizes.count_documents({})
laureates.count_documents({})
```

Inspect a document:

```python
laureates.find_one({})
```

<br>

### Filtering

Simple match:

```python
laureates.count_documents({"gender": "female"})
```

Compound filter:

```python
criteria = {"gender": "female", "diedCountry": "France", "bornCity": "Warsaw"}
laureates.count_documents(criteria)
laureates.find_one(criteria)
```

Query operators (`$in`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`) refine searches:

```python
laureates.count_documents({"diedCountry": {"$in": ["France", "USA"]}})
laureates.count_documents({"diedCountry": {"$ne": "France"}})
```

Dot notation drills into arrays/subdocuments:

```python
laureates.count_documents({"prizes.affiliations.name": "University of California"})
```

<br>

### Schema Flexibility

Documents in the same collection don’t need identical fields. Use `$exists` to test presence:

```python
laureates.count_documents({"bornCountry": {"$exists": True}})
laureates.count_documents({"prizes.0": {"$exists": True}})  # at least one prize
laureates.count_documents({"prizes.1": {"$exists": True}})  # at least two prizes
```

Retrieve unique values:

```python
laureates.distinct("gender")
# ['male', 'female', 'org']
```

Indexes speed up queries/aggregations, but for small datasets (≤MB, ≤1k docs) scans usually suffice.

<br>

MongoDB’s Python driver (`pymongo`) lets you fetch, filter, and explore semi-structured data with ease—perfect for APIs like the Nobel Prize dataset that provide JSON out of the box.
