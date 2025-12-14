---
description: Following the FastAPI Docs
pubDate: '2022-04-27'
tags:
- FastApi
- Python
title: Following the FastAPI Docs
---

### Installation

```bash
pip install fastapi
pip install uvicorn
```

`fastapi` provides the framework; `uvicorn` is the ASGI server.

<br>

### Minimal Example

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

Run it:

```bash
uvicorn main:app --reload
```

`main:app` points to the `app = FastAPI()` object in `main.py`. `--reload` automatically restarts the server on code changes—handy during development.

FastAPI also provides useful endpoints:
- `http://127.0.0.1:8000/` – API response.
- `http://127.0.0.1:8000/docs` – Swagger UI.
- `http://127.0.0.1:8000/redoc` – ReDoc documentation.
- `http://127.0.0.1:8000/openapi.json` – OpenAPI schema.

<br>

### Path Operation Decorators

```python
@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/hello")
async def hello():
    return {"message": "Hello World – this is hello"}
```

Each decorator maps an HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.) to a URL path.

<br>

### `async def` vs `def`

FastAPI lets you define handlers as `async def` or plain `def`. Async versions can yield better performance when awaiting I/O operations.

<br>

### Path Parameters

```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}
```

Use curly braces in the path to capture variables (`item_id`) and annotate types if you want validation (e.g., `int`). FastAPI automatically converts the value and raises a 422 error if it doesn’t match the type.
