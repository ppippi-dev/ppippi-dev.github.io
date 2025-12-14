---
description: Terraform – Autoscaling Group + Application Load Balancer
pubDate: '2022-08-17'
tags:
- Terraform
title: Terraform – Autoscaling Group + Application Load Balancer
---

> Reference: *Terraform Up & Running* (O’Reilly)

Let’s build an AWS Autoscaling Group (ASG) and front it with an Application Load Balancer (ALB) using Terraform. We’ll also introduce **data sources**, which fetch attributes from existing resources.

<br>

### Data Sources

```hcl
data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "default" {
  vpc_id = data.aws_vpc.default.id
}
```

These data sources retrieve the default VPC and its subnets so we can reuse them without hardcoding IDs.

<br>

### Launch Configuration

Defines how ASG instances should be created.

```hcl
resource "aws_launch_configuration" "example" {
  image_id        = "ami-0ea5eb4b05645aa8a"
  instance_type   = "t3.nano"
  security_groups = [aws_security_group.instance.id]

  user_data = <<-EOF
              #!/bin/bash
              echo "Hello, world" > index.html
              nohup busybox httpd -f -p 8080 &
              EOF

  lifecycle {
    create_before_destroy = true
  }
}
```

`create_before_destroy` prevents Terraform from deleting the old configuration before the new one exists.

<br>

### Autoscaling Group

```hcl
resource "aws_autoscaling_group" "example" {
  min_size = 2
  max_size = 10

  launch_configuration = aws_launch_configuration.example.name
  vpc_zone_identifier  = data.aws_subnet_ids.default.ids

  target_group_arns = [aws_lb_target_group.asg.arn]
  health_check_type = "ELB"

  tag {
    key                 = "Name"
    value               = "terraform-asg-example"
    propagate_at_launch = true
  }
}
```

Ensure the subnets span multiple AZs for high availability.

<br>

### Application Load Balancer Components

We need four resources:

1. `aws_lb`
2. `aws_lb_listener`
3. `aws_lb_target_group`
4. `aws_lb_listener_rule`

**Load Balancer**

```hcl
resource "aws_lb" "example" {
  name               = "terraform-asg-example"
  load_balancer_type = "application"
  subnets            = data.aws_subnet_ids.default.ids
  security_groups    = [aws_security_group.alb.id]
}
```

**Listener**

```hcl
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.example.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "404: page not found"
      status_code  = "404"
    }
  }
}
```

**Target Group**

```hcl
resource "aws_lb_target_group" "asg" {
  name     = "terraform-asg-example"
  port     = var.server_port
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 15
    timeout             = 3
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}
```

**Listener Rule**

```hcl
resource "aws_lb_listener_rule" "asg" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.asg.arn
  }

  condition {
    path_pattern {
      values = ["*"]
    }
  }
}
```

<br>

### Security Group for the ALB

```hcl
resource "aws_security_group" "alb" {
  name = "terraform-example-alb"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

ALBs need outbound access for health checks, so open egress accordingly.

<br>

### Output

```hcl
output "alb_dns_name" {
  value       = aws_lb.example.dns_name
  description = "The domain name of the load balancer"
}
```

Apply everything (increase parallelism for speed):

```bash
terraform apply -parallelism=30
```

Test:

```bash
curl http://<alb_dns_name>
```

When you’re done, destroy the resources to avoid charges:

```bash
terraform destroy
```
