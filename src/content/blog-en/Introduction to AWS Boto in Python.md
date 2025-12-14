---
description: Introduction to AWS Boto in Python
pubDate: '2022-01-04'
tags:
- DataCamp
- boto3
title: Introduction to AWS Boto in Python
---

#### Put Files in the Cloud

AWS powers much of the internet, and `boto3` lets you treat AWS as an extension of your laptop—automating reports, running sentiment analysis, sending alerts, and more. Use it to interact with AWS services from Python:

```python
import boto3

s3 = boto3.client(
    "s3",
    region_name="us-east-1",
    aws_access_key_id=AWS_KEY_ID,
    aws_secret_access_key=AWS_SECRET,
)

response = s3.list_buckets()
```

Create IAM users and assign permissions before generating access keys. Key AWS services covered here: IAM, S3, SNS, Comprehend, and Rekognition.

<br>

#### Buckets and Objects

S3 stores files (“objects”) inside containers (“buckets”). Buckets resemble folders and have their own policies; objects are the files inside. You can:
- create, list, and delete buckets
- upload, list, download, and delete objects

Create a bucket:

```python
s3 = boto3.client(
    "s3",
    region_name="us-east-1",
    aws_access_key_id=AWS_KEY_ID,
    aws_secret_access_key=AWS_SECRET,
)

s3.create_bucket(Bucket="gid-requests")
```

List buckets and delete one:

```python
s3.list_buckets()
s3.delete_bucket(Bucket="gid-requests")
```

Upload/download objects:

```python
s3.upload_file(
    Filename="gid_requests_2019_01_01.csv",
    Bucket="gid-requests",
    Key="gid_requests_2019_01_01.csv",
)

s3.download_file(
    Filename="gid_requests_downed.csv",
    Bucket="gid-requests",
    Key="gid_requests_2018_12_30.csv",
)
```

List objects with optional filters (`MaxKeys`, `Prefix`), inspect metadata via `head_object`, and delete with `delete_object`.

<br>

#### Permissions

AWS denies access by default. To make files public you can:
- grant IAM permissions,
- use bucket policies,
- set object ACLs (`put_object_acl` or `ExtraArgs={'ACL': ...}`),
- or generate pre-signed URLs for temporary access.

Public objects are available at `https://{bucket}.s3.amazonaws.com/{key}`. Generate URLs programmatically:

```python
url = "https://{}.s3.amazonaws.com/{}".format("gid-requests", "2019/potholes.csv")
```

Private access options:

```python
s3.download_file(...); pd.read_csv("./potholes_local.csv")

obj = s3.get_object(Bucket="gid-requests", Key="2019/potholes.csv")
pd.read_csv(obj["Body"])

share_url = s3.generate_presigned_url(
    ClientMethod="get_object",
    ExpiresIn=3600,
    Params={"Bucket": "gid-requests", "Key": "potholes.csv"},
)
```

Load multiple files into one DataFrame by iterating through `list_objects` results, fetching each object, and `pd.concat`-ing.

<br>

#### Serving HTML Reports

Convert DataFrames to HTML and upload them for stakeholders:

```python
df.to_html("table_agg.html", render_links=True, columns=[...], border=0)

s3.upload_file(
    Filename="./table_agg.html",
    Bucket="datacamp-website",
    Key="table.html",
    ExtraArgs={"ContentType": "text/html", "ACL": "public-read"},
)
```

Upload assets (images, charts) with appropriate `ContentType`. Reference IANA media types (`text/html`, `image/png`, `application/json`, etc.).

Generate an index:

```python
r = s3.list_objects(Bucket="gid-reports", Prefix="2019/")
objects_df = pd.DataFrame(r["Contents"])
base_url = "https://gid-reports.s3.amazonaws.com/"
objects_df["Link"] = base_url + objects_df["Key"]

objects_df.to_html(
    "report_listing.html",
    columns=["Link", "LastModified", "Size"],
    render_links=True,
)

s3.upload_file(
    Filename="./report_listing.html",
    Bucket="gid-reports",
    Key="index.html",
    ExtraArgs={"ContentType": "text/html", "ACL": "public-read"},
)
```

Wrap the steps into a pipeline: read raw files, aggregate, export CSV/HTML, upload results, and regenerate the index.

<br>

#### Notifications with SNS

Amazon SNS (Simple Notification Service) sends email, SMS, or push messages. Publishers send to **topics**; subscribers receive them.

Create a topic and subscriptions:

```python
sns = boto3.client(
    "sns",
    region_name="us-east-1",
    aws_access_key_id=AWS_KEY_ID,
    aws_secret_access_key=AWS_SECRET,
)

topic_arn = sns.create_topic(Name="city_alerts")["TopicArn"]

sns.subscribe(TopicArn=topic_arn, Protocol="sms", Endpoint="+13125551123")
sns.subscribe(TopicArn=topic_arn, Protocol="email", Endpoint="alert@example.com")
```

List and delete topics/subscriptions with `list_topics`, `delete_topic`, `list_subscriptions_by_topic`, and `unsubscribe`.

Publish messages:

```python
sns.publish(
    TopicArn=topic_arn,
    Message="Body text of SMS or email",
    Subject="Subject Line for Email",
)

sns.publish(PhoneNumber="+13121233211", Message="Single SMS")
```

Example notification workflow:
1. Read contacts (phone/email) from CSV.
2. Create department-specific topics (e.g., trash, streets).
3. Subscribe contacts to the right topic.
4. Download monthly reports.
5. Count violations.
6. If thresholds exceed limits, publish alerts.

<br>

#### Computer Vision & NLP APIs

AWS offers managed ML via Rekognition, Translate, and Comprehend—quick to integrate, no model training required.

Upload an image to S3:

```python
s3.upload_file(
    Filename="report.jpg",
    Bucket="datacamp-img",
    Key="report.jpg",
)
```

Detect objects (e.g., scooters):

```python
rekog = boto3.client(
    "rekognition",
    region_name="us-east-1",
    aws_access_key_id=AWS_KEY_ID,
    aws_secret_access_key=AWS_SECRET,
)

response = rekog.detect_labels(
    Image={"S3Object": {"Bucket": "datacamp-img", "Name": "report.jpg"}},
    MaxLabels=10,
    MinConfidence=95,
)
```

Extract text:

```python
rekog.detect_text(Image={"S3Object": {"Bucket": "datacamp-img", "Name": "report.jpg"}})
```

Translate, detect language, and analyze sentiment:

```python
translate = boto3.client("translate", ...)
comprehend = boto3.client("comprehend", ...)

translate.translate_text(Text="Hello", SourceLanguageCode="auto", TargetLanguageCode="es")
comprehend.detect_dominant_language(Text="Hay basura ...")
comprehend.detect_sentiment(Text="DataCamp students are amazing.", LanguageCode="en")
```

Integrated scenario:
- Initialize Rekognition, Translate, and Comprehend clients.
- Translate descriptions to English.
- Run `detect_sentiment` on each.
- Use Rekognition to identify scooters in images.
- Filter rows where a scooter exists and sentiment is negative to estimate required pickups.

<br>
