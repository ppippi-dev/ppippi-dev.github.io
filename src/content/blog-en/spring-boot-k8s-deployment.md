---
description: Deploying Spring Boot to Kubernetes
pubDate: '2022-04-04'
tags:
- kubernetes
- spring
title: Deploying Spring Boot to Kubernetes
---

### 1. Provision an EC2 Instance

Spin up an Ubuntu Server 20.04 LTS instance (I used the free-tier `t2.micro`). Leave most settings at defaults, but only open the ports you truly need—my screenshots show “allow all traffic” for testing, but that’s insecure in production.

Generate/download an SSH key pair for access.

<br>

### 2. Install Java

SSH into the instance and install JDK 11:

```bash
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install openjdk-11-jdk
```

Add Java and database credentials to your shell profile:

```bash
sudo vi ~/.bashrc

export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
export PATH=$PATH:$JAVA_HOME/bin

export DB_URL=<DB endpoint>
export DB_NAME=<DB user>
export DB_PASSWORD=<DB password>

source ~/.bashrc
```

<br>

### 3. Install Gradle

```bash
VERSION=7.1.1
wget https://services.gradle.org/distributions/gradle-${VERSION}-bin.zip -P /tmp
sudo apt-get install unzip
sudo unzip -d /opt/gradle /tmp/gradle-${VERSION}-bin.zip
sudo ln -s /opt/gradle/gradle-${VERSION} /opt/gradle/latest
```

Set environment variables:

```bash
sudo vi /etc/profile.d/gradle.sh

export GRADLE_HOME=/opt/gradle/latest
export PATH=${GRADLE_HOME}/bin:${PATH}

sudo chmod +x /etc/profile.d/gradle.sh
source /etc/profile.d/gradle.sh
```

<br>

### 4. Build the Spring Boot App

Navigate to your project and run:

```bash
gradle build
```

The JAR appears under `build/libs/`. Run it locally to verify:

```bash
java -jar build/libs/<your-app>-SNAPSHOT.jar
```

Visit `http://<EC2-public-IP>:8080` to confirm the app responds.

<br>

### 5. Install Docker

```bash
sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get install docker-ce docker.io
sudo docker ps   # quick sanity check
```

<br>

### 6. Dockerize the Application

Create a `Dockerfile`:

```dockerfile
FROM openjdk:11-jre-slim
ADD target/semogong-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_OPTS=""
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

Copy your JAR into `target/`:

```bash
mkdir target
cp build/libs/semogong-0.0.1-SNAPSHOT.jar target/
```

Build and run:

```bash
sudo docker build --tag semogong-demo:0.1 .
sudo docker run -p 8080:8080 \
    -e DB_URL=$DB_URL -e DB_NAME=$DB_NAME -e DB_PASSWORD=$DB_PASSWORD \
    semogong-demo:0.1
```

<br>

### 7. Push to Docker Hub

Create a repository on Docker Hub, then:

```bash
sudo docker tag <image-id> wjdqlsdlsp/semogong
sudo docker login
sudo docker push wjdqlsdlsp/semogong
```

<br>

### 8. Deploy to Kubernetes (GKE)

Generate a manifest from the image:

```bash
kubectl run semogong \
  --image=wjdqlsdlsp/semogong \
  --port 8080 \
  --dry-run=client -o yaml > semogong.yaml
```

Edit `semogong.yaml` to add environment variables:

```yaml
spec:
  containers:
  - image: wjdqlsdlsp/semogong
    name: semogong
    env:
    - name: DB_URL
      value: "<value>"
    - name: DB_NAME
      value: "<value>"
    - name: DB_PASSWORD
      value: "<value>"
    ports:
    - containerPort: 8080
```

Apply and confirm:

```bash
kubectl apply -f semogong.yaml
kubectl get pods
```

Expose it via a LoadBalancer:

```bash
kubectl expose pod semogong \
  --name=semogong \
  --type=LoadBalancer \
  --port 80 \
  --target-port 8080

kubectl get service
```

Visit the `EXTERNAL-IP` to see your Spring Boot app running on Kubernetes.
