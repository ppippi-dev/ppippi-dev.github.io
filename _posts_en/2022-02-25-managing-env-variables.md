---
layout: post
title: "Storing Sensitive Python Values in Environment Variables"
categories: [Python, env]
tags: [Python, env]
---

#### 1. Create a Virtual Environment

```bash
python3 -m venv venv
```

I’m on macOS; Windows users should adapt commands accordingly.

<br>

#### 2. Activate the Environment

```bash
source venv/bin/activate
```

Again, adjust for Windows if needed.

<br>

#### 3. Reading Environment Variables in Python

Use the `os` module:

```python
import os

all_env = os.environ            # dictionary-like object
path = os.environ.get("PATH")   # fetch a specific key
```

<br>

#### 4. Temporary Variables from the Shell

```bash
export TEST_PATH="Hello World"
```

This works only for the current shell session.

<br>

#### 5. Making Variables Persistent in the Virtualenv

Edit `venv/bin/activate` and add:

```bash
ABC="hello_world !"
export ABC
```

After modifying the file, deactivate and reactivate your virtual environment so the new settings take effect.

<br>

#### 6. Real-World Example: Boto3 Credentials

Hard-coding AWS keys in source code is a security risk. Instead, store them as environment variables:

```python
import os
import boto3

AWS_KEY_ID = os.environ.get("AWS_KEY_ID")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")

s3 = boto3.client(
    "s3",
    region_name="ap-northeast-2",
    aws_access_key_id=AWS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_KEY,
)

print(s3.list_buckets())
```

This keeps your credentials out of version control while making your scripts clean and shareable.***
