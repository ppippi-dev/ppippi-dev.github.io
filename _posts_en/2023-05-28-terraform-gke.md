---
layout: post
title: "Creating GKE Clusters with Terraform"
categories: [Terraform]
tags: [Terraform]
---

Terraform is a powerful Infrastructure as Code (IaC) tool that lets you describe, provision, and manage cloud resources declaratively. In an era that celebrates “low-code” and “no-code,” using Terraform may seem contradictory, but it dramatically simplifies infrastructure lifecycle management.

One killer feature: every resource Terraform creates can be destroyed with a single `terraform destroy`. When I experiment in personal cloud projects, that command saves me money by removing everything—no more missed resources lurking on the bill.

This post walks through my go-to setup for provisioning and tearing down GKE clusters with Terraform.

<br>

### Authenticate with gcloud
Terraform needs credentials to talk to GCP. I rely on `gcloud auth`:

```shell
gcloud auth login --brief
```

Sign in through the browser window that pops up.

List authenticated accounts:

```shell
gcloud auth list
```

Remove an account if necessary (I use this to avoid mixing company and personal projects):

```shell
gcloud auth revoke test@gmail.com
```

Finally, set the application default credentials so Terraform can pick them up:

```shell
gcloud auth application-default login
```

After this Terraform can access GCP on your behalf.

<br>

### Install Terraform
On macOS:

```shell
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

Other platforms are covered in the [official download page](https://developer.hashicorp.com/terraform/downloads).

Verify the installation:

```shell
$ terraform --version
Terraform v1.4.6
on darwin_arm64
```

<br>

### Prepare the Module Layout
Creating a GKE cluster manually requires configuring VPCs, subnets, service accounts, and more. Rather than reimplement everything, I use the excellent modules from [terraform-google-modules](https://github.com/terraform-google-modules), specifically the [`google-kubernetes-engine`](https://github.com/terraform-google-modules/terraform-google-kubernetes-engine) repository.

Clone the repo and organize it like this:

```shell
$ tree
.
├── gke
│   ├── gke.tf
│   └── variables.tf
└── module
    └── google-kubernetes-engine
        ├── README.md
        ├── cluster.tf
        ├── dns.tf
        ├── firewall.tf
        ├── main.tf
        ├── masq.tf
        ├── networks.tf
        ├── outputs.tf
        ├── sa.tf
        ├── scripts
        │   └── delete-default-resource.sh
        ├── variables.tf
        ├── variables_defaults.tf
        └── versions.tf
```

All module code lives under `module/google-kubernetes-engine`; the `gke` directory holds the configuration for my cluster.

`gke.tf` wires the module:

```hcl
module "cluster" {
  source = "../module/google-kubernetes-engine"

  ip_range_pods     = ""
  ip_range_services = ""
  name              = "<cluster-name>"
  network           = ""
  project_id        = "<project-id>"
  subnetwork        = ""
  region            = "asia-northeast3"
  zones             = ["asia-northeast3-a"]
  regional          = false

  node_pools = [
    {
      name         = "pool-1"
      machine_type = "e2-standard-2"
      autoscaling  = false
      node_count   = 2
      disk_size_gb = 10
      disk_type    = "pd-balanced"
      auto_upgrade = true
    },
  ]
}
```

`variables.tf` configures the provider and backend:

```hcl
provider "google" {
  project = "<project-id>"
  region  = "asia-northeast3"
}

terraform {
  backend "gcs" {
    bucket = "terraform-state-bucket"
    prefix = "terraform-gke"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.51.0, < 4.65.0"
    }
  }
}
```

Feel free to adapt these files to your environment. If you don’t need remote state, swap the backend for `local`.

<br>

### Provision the Cluster
Run Terraform from the `gke` directory:

```shell
cd terraforms/gke  # example path
```

Initialize providers and modules:

```shell
terraform init
```

Show the planned changes:

```shell
terraform plan
```

Apply the configuration:

```shell
terraform apply
```

Review the plan and type `yes`. Terraform provisions the VPC, subnet, service accounts, cluster, and node pools. When it finishes you’ll see:

```shell
Apply complete! Resources: 9 added, 0 changed, 0 destroyed.
```

Modify the configuration as needed—Terraform keeps everything in sync.

<br>

### Tear Everything Down
When you’re done (and want to save on cloud costs), destroy the resources:

```shell
terraform destroy
```

That single command deletes every object Terraform created.
<br>
