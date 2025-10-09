---
layout: post
title: "Building a Simple Dashboard"
categories: [Python, AWS, boto3]
tags: [Python, AWS, boto3]
---

My study group logs progress in Notion. I wanted a lightweight dashboard so everyone could see weekly study hours—some for motivation, others for encouragement.

<p align="center"><img src="/assets/img/post_img/대쉬보드1.png"></p>

<br>

### Architecture Overview

<p align="center"><img src="/assets/img/post_img/대쉬보드2.png"></p>

1. Teammates record sessions in Notion.
2. Export the Notion database as CSV.
3. Use Python + Matplotlib to visualize the data.
4. Upload the chart to Amazon S3 via Boto3.
5. Share the S3 object URL as our dashboard.

<br>

### Exporting from Notion

Open the database, click the menu in the top-right corner, and choose **Export**. (I’m still hoping Notion exposes CSV exports via API so this can be fully automated with Airflow.)

<p align="center"><img src="/assets/img/post_img/대쉬보드3.png"></p>

<br>

### Visualization with Matplotlib

I generated a simple line chart summarizing each person’s study hours over the past week:

<p align="center"><img src="/assets/img/post_img/대쉬보드4.png"></p>

Seeing everyone’s totals at a glance helps us celebrate wins—or nudge slackers.

Sample code lives on GitHub: [make_plot.py](https://github.com/wjdqlsdlsp/simple_dashboard/blob/main/make_plot.py)

<br>

### Uploading with Boto3

Once the chart is created, upload it to S3. See my earlier post, [Getting Started with Boto3](https://wjdqlsdlsp.github.io/%EB%8D%B0%EC%9D%B4%ED%84%B0%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4/2022/02/25/managing-env-variables/), for secure credential handling. Code reference: the same GitHub repo.

Prepare a simple `index.html` that embeds the chart—also in the repo.

<br>

### Serve via S3

Every uploaded object has a public URL (assuming the ACL permits it). Share that link so teammates can access the dashboard:

<p align="center"><img src="/assets/img/post_img/대쉬보드5.png"></p>

<br>

### Bonus: One-Click Refresh with Bash

I initially planned to automate the entire flow with Notion’s API + Airflow. Since the API doesn’t expose CSV exports yet, I settled on a quick Bash script to streamline manual updates:

```bash
#!/usr/bin/env bash
cd ..
source venv/bin/activate
cd boto3
python3 make_plot.py
```

Now the workflow is: export CSV from Notion, run the script, and the dashboard refreshes automatically. Simple, effective, and lightweight.
