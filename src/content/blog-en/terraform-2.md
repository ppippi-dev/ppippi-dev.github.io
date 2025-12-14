---
description: Terraform – Variables and Outputs
pubDate: '2022-08-16'
tags:
- Terraform
title: Terraform – Variables and Outputs
---

> Reference: *Terraform Up & Running* (O’Reilly)

Let’s refactor the EC2 example from the previous post to use Terraform variables and outputs, embracing the DRY principle (Don’t Repeat Yourself).

<br>

### Declaring Variables

```hcl
variable "var_name" {
  description = "var's description"
  type        = number
  default     = 42
}
```

- `description`: helpful prompt when Terraform asks for input.
- `type`: enforces value type (`number`, `string`, `list(...)`, `map(...)`, `object(...)`, etc.).
- `default`: optional; if omitted, Terraform prompts at runtime.

CLI prompt example:

```bash
$ terraform apply
var.number_example
  An example of a number variable in Terraform

  Enter a value:
```

Override defaults via CLI:

```bash
terraform apply -var="number_example=2"
```

Variable type examples:

```hcl
variable "number_example"     { type = number }
variable "string_example"     { type = string }
variable "list_example"       { type = list(string) }
variable "list_numeric"       { type = list(number) }
variable "map_example"        { type = map(string) }
variable "object_example" {
  type = object({
    name    = string
    age     = number
    tags    = list(string)
    enabled = bool
  })
}
```

<br>

### Parameterizing the Server Port

`var.tf`:

```hcl
variable "server_port" {
  description = "The port the server will use for HTTP requests"
  type        = number
}
```

`main.tf`:

```hcl
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_security_group" "instance" {
  name = "terraform-example-instance"
  ingress {
    from_port   = var.server_port
    to_port     = var.server_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "ec2" {
  ami           = "ami-0ea5eb4b05645aa8a"
  instance_type = "t3.nano"

  tags = {
    Name = "terraform-example"
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Hello, world" > index.html
              nohup busybox httpd -f -p ${var.server_port} &
              EOF

  vpc_security_group_ids = [aws_security_group.instance.id]
}
```

Run:

```bash
terraform apply
# Enter a value: 8000
```

Test:

```bash
curl http://<public-ip>:8000
```

<br>

### Outputs

Variables accept input; outputs display values after apply. Define `output.tf`:

```hcl
output "test_ip" {
  description = "Instance endpoint"
  value       = "${aws_instance.ec2.public_ip}:${var.server_port}"
}
```

After `terraform apply`, Terraform prints:

```
Outputs:

test_ip = "3.35.167.31:8000"
```

Outputs are great for surfacing connection strings, IDs, etc. Don’t forget to destroy resources when you’re done:

```bash
terraform destroy
```
