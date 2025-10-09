---
layout: post
title: "Hands-on Airflow (with Docker)"
categories: [Airflow, Docker]
tags: [Airflow, Docker]
---

<p align="center"><img src="/assets/img/post_img/airflow.png"></p>

After absorbing plenty of Airflow theory, I finally rolled up my sleeves. Airflow can be installed directly with `pip`, but I opted for the official Docker Compose setup—fast, reproducible, and easy to tear down.

<br>

### 1. Prepare the workspace

```bash
mkdir -p /opt/airflow
cd /opt/airflow
```

The official Compose file assumes this path (e.g., `/opt/airflow/dags`), so I followed suit.

<br>

### 2. Download `docker-compose.yaml`

```bash
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/2.2.4/docker-compose.yaml'
```

This is the official template from the docs. It defines the scheduler, webserver, triggerer, workers, and supporting services.

<br>

### 3. Create supporting directories

```bash
mkdir ./dags ./logs ./plugins
echo -e "AIRFLOW_UID=$(id -u)" > .env
```

Airflow mounts these folders into the containers. The `.env` file ensures file ownership matches your local user.

<br>

### 4. Initialize Airflow

```bash
docker-compose up airflow-init
```

This sets up the metadata database, creates the admin user, etc.

<br>

### 5. Launch Airflow

```bash
docker-compose up
```

The first start takes a while—grab a coffee. Once the logs settle, the web UI becomes available at `http://localhost:8080`. Default credentials: `airflow` / `airflow`.

<br>

### 6. Explore the UI

Airflow ships with example DAGs—poke around to understand the interface (graph view, tree view, logs, etc.).

<br>

### 7. Create a sample DAG

Any Python file placed in `/opt/airflow/dags` is automatically detected. Here’s a simple DAG that writes a timestamped file every minute:

```python
from airflow.operators.bash import BashOperator
from airflow import DAG
from datetime import datetime
import pendulum

kst = pendulum.timezone("Asia/Seoul")
text_file_path = "/opt/airflow/dags"
now = str(datetime.now())[14:16]

with DAG(
    dag_id="test_dag",
    start_date=datetime(2022, 2, 23, tzinfo=kst),
    schedule_interval="* * * * *",
) as dag:
    create_text_file = BashOperator(
        task_id="create_text_file",
        bash_command=f"cd {text_file_path} && echo 'hello airflow' > test{now}.txt",
    )
```

Save it as `test_dag.py` under `dags/`. Airflow will pick it up within a minute or so. Toggle the DAG **ON** in the web UI and watch the runs arrive in the Tree view. Check the `dags/` directory—you’ll see new files being created each minute.

<br>

### Lessons Learned

- Adjusting the DAGs folder path isn’t as straightforward as I expected; the Compose file hardcodes certain mounts. Until I understand the implications, I’m sticking with the default.
- Docker is powerful…and occasionally frustrating. Clearly I need more practice, but it’s a fantastic way to spin up full-fledged Airflow environments in minutes.
