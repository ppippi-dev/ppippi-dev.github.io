---
layout: post
title: "Docker Fundamentals"
categories: [Docker]
tags: [Docker]
---

### Launching a Simple Container

```bash
docker run ubuntu:20.04
```

If the image isn’t available locally, Docker pulls it automatically.

`docker ps` shows running containers. Since the Ubuntu container exits immediately, nothing appears.

Start an interactive shell instead:

```bash
docker run --rm -it ubuntu:20.04 /bin/sh
# ls
```

Key flags:
- `--rm`: delete the container when it exits.
- `-it`: attach an interactive terminal.

<br>

### Port Mapping & Redis Example

```bash
docker run --rm -p 1234:6379 redis
```

Now connect via telnet:

```bash
telnet localhost 1234
set hello world
get hello
# outputs world
quit
```

<br>

### Container & Image Management

```bash
docker stop <container>
docker rm <container>

docker pull <image>
docker rmi <image>
```

Create a custom network:

```bash
docker network create app-network
```

Run MySQL on that network with a bind mount:

```bash
docker run -d -p 3306:3306 \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=true \
  --network=app-network \
  --name mysql \
  -v /my/own/datadir:/var/lib/mysql \
  mysql:5.7
```

<br>

### docker-compose

Compose lets you capture multi-container setups in YAML. Example (from [subicura’s blog](https://subicura.com/)):

```yaml
version: "2"
services:
  db:
    image: mariadb:10.5
    volumes:
      - ./mysql:/var/lib/mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: wordpress
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
  wordpress:
    image: wordpress:latest
    volumes:
      - ./wp:/var/www/html
    ports:
      - "8000:80"
    restart: always
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
```

Run it with `docker-compose up` to spin up both MariaDB and WordPress in one shot. Compose handles networking, volumes, and environment variables for you.***
