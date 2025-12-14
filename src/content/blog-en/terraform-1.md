---
description: Terraform – Creating an AWS EC2 Instance
pubDate: '2022-08-16'
tags:
- Terraform
title: Terraform – Creating an AWS EC2 Instance
---

> Reference: *Terraform Up & Running* (O’Reilly)

Infrastructure as Code (IaC) turns cloud resources into versioned, shareable code. Terraform is the most popular cross-cloud IaC tool—it supports AWS, GCP, Azure, and many others.

<p align="center"><img src="/img/post_img/terraform.png" width="600"></p>

<br>

### Setup

- Terraform 1.2.7
- AWS
- PyCharm (editor)

Repository layout:

```
terraform/
 ├── main.tf
 └── var.tf
```

`main.tf` defines resources; `var.tf` holds variables.

Install Terraform from [terraform.io](https://www.terraform.io/downloads). Verify:

```bash
terraform -help
terraform -v
```

<br>

### Configure the AWS Provider

```hcl
# main.tf
provider "aws" {
  region = "ap-northeast-2"
}
```

Initialize the working directory:

```bash
terraform init
```

This creates `.terraform/` and `.terraform.lock.hcl`, which track provider plugins and resource state.

<br>

### Launch an EC2 Instance

```hcl
resource "aws_instance" "ec2" {
  ami           = "ami-0ea5eb4b05645aa8a"  # Ubuntu 20.04 LTS
  instance_type = "t3.nano"

  tags = {
    Name = "terraform-example"
  }
}
```

Run a dry run:

```bash
terraform plan
```

If it looks good:

```bash
terraform apply
```

Confirm with `yes`. In the AWS console you should see the new instance.

<br>

### Add a Security Group & User Data

```hcl
resource "aws_security_group" "instance" {
  name = "terraform-example-instance"

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Update the instance to attach the security group and launch a lightweight web server:

```hcl
resource "aws_instance" "ec2" {
  ami           = "ami-0ea5eb4b05645aa8a"
  instance_type = "t3.nano"

  tags = {
    Name = "terraform-example"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Hello, world" > index.html
              nohup busybox httpd -f -p 8080 &
              EOF

  vpc_security_group_ids = [aws_security_group.instance.id]
}
```

Re-run `terraform apply`. Test the endpoint:

```bash
curl http://<public-ip>:8080
# outputs "Hello, world"
```

<br>

### Clean Up

Don’t forget to remove resources when finished:

```bash
terraform destroy
```

Alternatively, comment out resources and run `terraform apply` to delete them.

<br>

### Notes

When updating an existing instance, I noticed port 8080 sometimes failed until I destroyed and recreated the resource. I’ll dig deeper, but for now, recreating resolved the issue.
