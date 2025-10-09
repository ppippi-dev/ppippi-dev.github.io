---
layout: post
title: "AWS – Deploying a Django Web Server on EC2"
categories: [AWS, django]
tags: [AWS, django]
---

I forget the steps every time I deploy, so here’s a proper walkthrough—for my future self.

Environment used:
- Frontend: HTML / CSS / JavaScript
- Backend: Django (Python)
- AWS OS: **Ubuntu Server 20.04 LTS (HVM)**

> We’ll be working with AWS EC2.

Push your site’s source code to GitHub, then clone it on the EC2 instance.

<p align="center"><img src="/assets/img/post_img/my_aws1.PNG" alt="Project repository"></p>

In my case the project lives in a shared repository for a team side project, so I’ll reuse that.

#### 1. Sign In to AWS and Launch an Instance

I’ll skip account creation. Once you sign in, you’ll see the dashboard:

<p align="center"><img src="/assets/img/post_img/my_aws2.PNG" alt="AWS dashboard"></p>

Click **Launch Instance** to create a virtual machine.

<p align="center"><img src="/assets/img/post_img/my_aws3.PNG" alt="Choose AMI"></p>

Select the Amazon Machine Image you need—here that’s **Ubuntu Server 20.04 LTS**.

<p align="center"><img src="/assets/img/post_img/my_aws4.PNG" alt="Choose instance type"></p>

Pick an instance type suited to your workload (and budget). I’m using a free-tier eligible type.

<p align="center"><img src="/assets/img/post_img/my_aws5.PNG" alt="Instance details"></p>
<p align="center"><img src="/assets/img/post_img/my_aws6.PNG" alt="Review instance"></p>

On the review screen click **Edit security groups**. (You can change this later too.)

<p align="center"><img src="/assets/img/post_img/my_aws7.PNG" alt="Security group"></p>

Django listens on port 8000 by default, so open port 8000; also open HTTP port 80.

If you’re running Spring or another app on port 8080, open that instead.

> Don’t open every port—it’s a serious security risk. Expose only what you need.

<p align="center"><img src="/assets/img/post_img/my_aws8.PNG" alt="Security group rules"></p>

Confirm the rules. AWS shows both IPv4 and IPv6 entries—that’s normal.

Finish the wizard to launch the instance. Remember to create or select an SSH key pair and keep it secure.

#### Connect via the Console

<p align="center"><img src="/assets/img/post_img/my_aws9.PNG" alt="Instance list"></p>

Once the instance is running, click its instance ID, then choose **Connect** in the upper-right.

<p align="center"><img src="/assets/img/post_img/my_aws10.PNG" alt="Connect to instance"></p>

Follow the prompts and an in-browser terminal will appear. Work as you would in any Linux shell.

```shell
sudo apt-get update
```

Update packages, then clone your repository:

```shell
git clone <your-repo-url>
```

Install `pip`:

```shell
sudo apt-get install python3-pip -y
```

From here replicate your local setup. If you have a requirements file:

```shell
pip install -r requirements.txt
```

Apply migrations and start the server:

```shell
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8000
```

This exposes Django on all interfaces.

Closing the EC2 console stops the server, so use `nohup` to keep it running in the background:

```shell
nohup python3 manage.py runserver 0.0.0.0:8000 &
```

To stop a background server, find the process:

```shell
ps -ef | grep "python3 manage.py runserver"
```

Then kill the relevant PIDs:

```shell
kill 21738
kill 21740
```

Want to avoid specifying port 8000 in the browser? Redirect port 80 to 8000:

```shell
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
    -j REDIRECT --to-port 8000
```

#### TMI

My app uses NLP and requires MeCab. If you need it too, this guide helped me:

[[Starting from scratch on EC2] Installing konlpy and mecab (Ubuntu)](https://yuddomack.tistory.com/entry/%EC%B2%98%EC%9D%8C%EB%B6%80%ED%84%B0-%EC%8B%9C%EC%9E%91%ED%95%98%EB%8A%94-EC2-konlpy-mecab-%EC%84%A4%EC%B9%98%ED%95%98%EA%B8%B0ubuntu)

Also, if Twitch’s `StreamListener` throws errors, pin Tweepy to version 3.10.0.
