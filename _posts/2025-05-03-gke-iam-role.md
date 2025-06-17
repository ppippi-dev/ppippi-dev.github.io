---
layout: post
title: "GKE에서 AWS IAM Role 연동: Access Key 없이 안전하게 AWS 리소스 접근하기"
subtitle: "GKE Workload Identity와 AWS IAM Role을 활용한 안전한 멀티클라우드 접근 방식"
feature-img: "assets/img/2025-05-03/0.webp"
tags: [머신러닝]
---

## 들어가며: 멀티클라우드 환경에서의 보안

최근 AWS와 GCP를 함께 사용하는 멀티클라우드 아키텍처가 보편화되면서, GCP 환경, 특히 Google Kubernetes Engine(GKE)에서 AWS의 데이터나 서비스에 접근해야 하는 요구사항이 증가하고 있습니다. 과거에는 AWS IAM 사용자의 Access Key를 발급받아 GKE 애플리케이션에 설정하는 방식이 일반적이었습니다. 하지만 Access Key는 한 번 발급되면 만료되지 않는 **장기 자격 증명**이기 때문에, 유출될 경우 심각한 보안 사고로 이어질 수 있다는 큰 단점이 있습니다.

이러한 보안 위험을 줄이고 관리를 용이하게 하기 위해, **AWS IAM Role과 신뢰 관계(Trust Relationship)**를 맺어 임시 자격 증명을 사용하는 방식으로 전환하는 것이 강력히 권장됩니다. 이 방식은 Access Key를 코드나 설정 파일에 직접 저장할 필요가 없어 보안을 크게 강화할 수 있습니다.

이 글에서는 GKE 환경에서 AWS IAM Role과의 신뢰 관계를 설정하여 Access Key 없이 안전하게 AWS 리소스에 접근하는 구체적인 방법을 단계별로 설명합니다. 특히 GCP의 **Workload Identity** 기능을 활용하여 관리 부담을 줄이는 데 중점을 둡니다. 관련 자료가 부족하여 직접 구축하고 테스트하며 얻은 경험을 바탕으로 작성되었습니다.

## 왜 Access Key 대신 IAM Role 신뢰 관계인가?

AWS IAM Role은 특정 AWS 리소스에 대한 접근 권한의 모음입니다. IAM 사용자와 가장 큰 차이점은 Access Key와 같은 **영구적인 자격 증명(Long-term credentials)을 가지지 않는다**는 점입니다. 대신, 신뢰하는 개체(Entity)가 임시 자격 증명(Temporary credentials)을 요청하여 해당 Role의 권한을 **정해진 시간 동안만** 위임받아 사용할 수 있습니다.

GKE 환경에서 AWS IAM Role을 사용하면 다음과 같은 명확한 장점을 얻을 수 있습니다.

-   **보안 강화**: Access Key와 같은 민감한 장기 자격 증명을 코드, 설정 파일, 환경 변수 등에 저장할 필요가 없습니다. 임시 자격 증명은 유효 기간이 짧아(기본 1시간, 최대 12시간) 탈취되더라도 위험을 크게 줄일 수 있습니다.
-   **관리 용이성**: 각 애플리케이션이나 서비스(Pod)별로 필요한 최소한의 권한만 가진 Role을 부여하여 권한 관리가 더욱 명확하고 세분화됩니다 (최소 권한 원칙). Access Key를 주기적으로 교체할 필요도 없습니다.
-   **자동화**: 자격 증명 발급 및 갱신 과정을 Workload Identity와 연동하여 자동화할 수 있어 운영 부담을 줄일 수 있습니다.

## GKE Workload Identity란?

AWS IAM Role 기반 신뢰 관계와 유사하게, GCP에는 **Workload Identity**라는 기능이 있습니다. Workload Identity를 사용하면 GKE와 같은 GCP 리소스가 별도의 키 파일(JSON 등) 없이 GCP 서비스 계정의 권한을 안전하게 위임받아 사용할 수 있습니다.

이 글에서는 GKE Kubernetes 서비스 계정(KSA)에 GCP 서비스 계정(GSA)의 권한을 부여하는 방식을 사용합니다. 즉, 쿠버네티스 서비스 계정이(KSA)이 GCP 서비스 계정(GSA) 역할을 통해 GCP 리소스에 접근하고, 더 나아가 AWS IAM Role을 통해 AWS 리소스에도 접근하게 됩니다.

더 자세한 내용은 공식 GCP 문서를 참고하시면 좋습니다.

참고문서: [https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity?hl=ko](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity?hl=ko)


## 설정 단계: GCP (Google Cloud Platform)

이제부터 본격적으로 설정을 진행합니다.

먼저, GKE Workload Identity를 설정하고 AWS IAM Role과 연동하기 위한 구체적인 단계를 알아보겠습니다.

#### 1\. GKE 클러스터 Workload Identity 활성화

먼저, gcloud CLI를 사용하여 GKE 클러스터에서 Workload Identity를 활성화해야 합니다. 아래 명령어를 터미널에서 실행하세요.

_(본인의 환경 정보로 변수 값을 수정해야 합니다.)_

```shell
# 환경 변수 설정 (본인 환경에 맞게 수정)
export YOUR_GKE_CLUSTER_NAME="seoul-cluster"
export YOUR_GKE_ZONE="asia-northeast3-a"
export YOUR_GCP_PROJECT_ID="sharp-voyage-345407"

# GKE 클러스터 업데이트 (Workload Identity 활성화)
gcloud container clusters update $YOUR_GKE_CLUSTER_NAME \
    --zone=$YOUR_GKE_ZONE \
    --workload-pool=${YOUR_GCP_PROJECT_ID}.svc.id.goog
```

GKE 클러스터를 새로 생성하는 경우, 생성 과정의 '보안' 섹션에서 'Workload Identity 사용 설정' 옵션을 체크하면 이 단계를 생략할 수 있습니다.

<img src="/assets/img/2025-05-03/1.png">


#### 2\. GCP 서비스계정 (IAM Service Account) 생성 및 권한 부여

Workload Identity가 사용할 GCP 서비스 계정을 생성합니다. 이후 GKE에 정상적으로 Workload Identity가 적용되었는지 체크하기 위해 Viewer 권한을 추가하였습니다.

```shell
# 환경 변수 설정 (원하는 이름으로 수정 가능)
export YOUR_SERVICE_ACCOUNT_NAME="gcp-test-service-account"
export YOUR_GCP_PROJECT_ID="sharp-voyage-345407"

# GCP 서비스 계정 생성
gcloud iam service-accounts create $YOUR_SERVICE_ACCOUNT_NAME

# (선택 사항) 테스트를 위한 권한 부여 (예: Viewer 역할)
# 실제 환경에서는 필요한 최소한의 권한만 부여해야 합니다.
gcloud projects add-iam-policy-binding $YOUR_GCP_PROJECT_ID \
  --member="serviceAccount:$YOUR_SERVICE_ACCOUNT_NAME@${YOUR_GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/viewer"
```

#### 3\. Kubernetes 서비스 계정(KSA) 생성

GKE 클러스터 내부에 Kubernetes 서비스 계정을 생성합니다.

```shell
export YOUR_NAMESPACE=test-ns
export YOUR_KSA_NAME=test-sa

kubectl create namespace $YOUR_NAMESPACE

kubectl create serviceaccount $YOUR_KSA_NAME \
    --namespace=$YOUR_NAMESPACE
```

#### 4\. GCP IAM -> Kubernetes Service Account 연결 (IAM 정책 바인딩)

Workload Identity의 핵심 단계입니다.

생성한 GSA가 특정 KSA를 '사용자'로 받아들일 수 있도록 IAM 정책 바인딩을 추가합니다.

이 바인딩을 통해 KSA는 GSA의 권한을 위임받을 수 있게 됩니다. roles/iam.workloadIdentityUser 역할이 이 권한을 부여합니다.

```shell
export YOUR_GCP_PROJECT_ID="sharp-voyage-345407"
export YOUR_NAMESPACE=test-ns
export YOUR_KSA_NAME=test-sa

gcloud iam service-accounts add-iam-policy-binding $YOUR_SERVICE_ACCOUNT_NAME@${YOUR_GCP_PROJECT_ID}.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$YOUR_GCP_PROJECT_ID.svc.id.goog[$YOUR_NAMESPACE/$YOUR_KSA_NAME]"
```

#### 5\. KSA annotation 추가

Kubernetes Service Account가 GCP Workload Identity를 통해 권한을 가져와야 한다는 것을 알려주기 위해 annotation 추가가 필요합니다.

```shell
export YOUR_NAMESPACE=test-ns
export YOUR_KSA_NAME=test-sa
export YOUR_GCP_PROJECT_ID="sharp-voyage-345407"
export YOUR_SERVICE_ACCOUNT_NAME="gcp-test-service-account"

kubectl annotate serviceaccount $YOUR_KSA_NAME \
    --namespace $YOUR_NAMESPACE \
    iam.gke.io/gcp-service-account=$YOUR_SERVICE_ACCOUNT_NAME@$YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com
```

이제 GCP에서 Workload Identity 셋팅은 완료되었습니다. 테스트를 위해 아래의 pod를 실행시켜서 정상적으로 수행되는지 확인합니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gsutil-pod
spec:
  serviceAccountName: <KSA Service Account: test-sa>
  containers:
    - name: gsutil
      image: gcr.io/google.com/cloudsdktool/google-cloud-cli:stable
      command: ["/bin/sh", "-c"]
      args: ["gsutil ls"]
```

해당 pod의 로그를 조회했을 때, 정상적으로 gcs 버킷의 리스트가 조회되면 성공입니다.

## 설정 단계: AWS (Amazon Web Services)

GCP에서의 설정은 완료되었습니다. 이제 AWS에서의 설정이 필요합니다. 

AWS에서는 이전 GCP와 다르게 설정해야하는 것이 많지 않습니다. 연결하고 싶은 IAM Role만 생성하면 완료됩니다.

이유는, AWS에서는 GCP와 이미 OICD를 연결해둔 상태라, 따로 연결을 설정하지 않아도 됩니다. 

관련 내용은 아래 AWS Docs를 참고하면 좋을 것 같습니다.

[https://docs.aws.amazon.com/ko\_kr/IAM/latest/UserGuide/id\_roles\_providers\_create\_oidc.html#manage-oidc-provider-console](https://docs.aws.amazon.com/ko_kr/IAM/latest/UserGuide/id_roles_providers_create_oidc.html#manage-oidc-provider-console)


#### 1\. GCP 서비스 계정(GSA)의 고유 ID(Unique ID) 조회

AWS IAM Role를 설정하기 전, 신뢰관계를 설정하기 위해서는 GCP IAM의 unique id가 필요합니다.

아래와 같이, gcloud를 통해 service account를 조회하고, uniqueId 값을 찾아냅니다.

```shell
export YOUR_SERVICE_ACCOUNT_NAME="gcp-test-service-account"
export YOUR_GCP_PROJECT_ID="sharp-voyage-345407"

gcloud iam service-accounts describe $YOUR_SERVICE_ACCOUNT_NAME@${YOUR_GCP_PROJECT_ID}.iam.gserviceaccount.com
```

저의 경우 uniqueId: '111035977024964273138' 라는 값을 얻었습니다.

#### 2\. AWS IAM Role 생성하기

AWS Management Console 또는 AWS CLI를 사용하여 IAM Role을 생성합니다. 해당 글에서는 AWS console에서 진행합니다.

아래의 사진과 같이, IAM 역할(Role)을 생성합니다. 선택한 내용은 다음과 같습니다.

<img src="/assets/img/2025-05-03/2.png">


입력한 사용자 지정 신뢰 정책은 다음과 같습니다. (UNIQUE\_ID는 string 형식으로 기입합니다.)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "accounts.google.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "accounts.google.com:aud": "<YOUR_GSA_UNIQUE_ID>"
                }
            }
        }
    ]
}
```

이후 정상적으로 동작하는지 확인하기 위해, S3 FullAccess 권한을 부여했습니다.

<img src="/assets/img/2025-05-03/3.png">


이후 단계에서 aws\_role이라는 이름으로 AWS IAM Role를 생성했습니다.

<img src="/assets/img/2025-05-03/4.png">


#### 3\. GKE service account에 AWS IAM Annotation추가

이제 AWS에서 생성한 IAM Role을 인지할 수 있도록, GKE Service Account에 Annotation 형식으로 추가합니다.

```shell
export YOUR_NAMESPACE=test-ns
export YOUR_KSA_NAME=test-sa
export YOUR_AWS_ROLE_ARN=arn:aws:iam::996145069080:role/aws_role

kubectl annotate serviceaccount $YOUR_KSA_NAME \
    --namespace $YOUR_NAMESPACE \
    amazonaws.com/role-arn=${YOUR_AWS_ROLE_ARN}
```

## AWS sts 토큰 GCP OIDC 토큰으로 변환

가장 해맸던 부분입니다. 위의 과정으로 간단하게 완료될 줄 알았지만, 하나의 추가 단계가 필요합니다. AWS에서 사용하는 sts토큰을 GCP OIDC 토큰으로 변환하여 사용할 수 있는 형태로 만드는 과정이 필요합니다.

이 과정에 참고하기에 좋은 오픈소스가 있어서 이를 이용했습니다. 

[https://github.com/doitintl/janus](https://github.com/doitintl/janus)

해당 깃헙 레포에 있는 janus.py라는 코드를 이용해서 aws\_credential를 셋팅하게 하면 됩니다.

_이 외에, 레퍼런스한 레포의 owner인 doitntl의 블로그를 참고하니, gtoken-webhook이라고 오픈소스화 해둬서, aws credential을 변환하는 과정을 webhook화 하는 방법도 존재하니 참고하면 좋을 것 같습니다._

테스트를 위해 사용한 코드는 아래와 같습니다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gcp-aws-credentials-script
data:
  get_aws_cred: |
    #!/usr/bin/python3
    import requests
    import boto3
    import json
    import sys
    import os


    def get_metadata(path: str, parameter: str):
        # Use .format() instead of f-type to support python version before 3.7
        metadata_url = 'http://metadata.google.internal/computeMetadata/v1/{}/{}'.format(path, parameter)
        headers = {'Metadata-Flavor': 'Google'}
        # execute http metadata request
        try:
            meta_request = requests.get(metadata_url, headers=headers)
        except requests.exceptions.RequestException as e:
            raise SystemExit(e)

        if meta_request.ok:
            return meta_request.text
        else:
            raise SystemExit('Compute Engine meta data error')


    if __name__ == '__main__':
        # Get AWS ARN from command line if specified
        if len(sys.argv) == 2:
            aws_role_arn = sys.argv[1]

        # Get AWS ARN from env var if specified
        elif 'AWS_JANUS_ROLE' in os.environ:
            aws_role_arn = os.environ['AWS_JANUS_ROLE']

        # Fail if both argv and env var configuration failed
        else:
            print('Please specify AWS arn role:\neither via env var `AWS_JANUS_ROLE` or \n CLI argument `{} arn:aws:iam::account-id:role/role-name`'.format(sys.argv[0]))
            exit(1)

        # Get variables from the metadata server
        try:
            instance_name = get_metadata('instance', 'hostname')
        # Cloud Run environment does not return instance name. use 'unknown' instead.
        except SystemExit:
            instance_name = 'unknown'
        project_id = get_metadata('project', 'project-id')
        project_and_instance_name = '{}.{}'.format(project_id, instance_name)[:64]
        token = get_metadata('instance', 'service-accounts/default/identity?format=standard&audience=gcp')

        # Assume role using gcp service account token
        sts = boto3.client('sts', aws_access_key_id='', aws_secret_access_key='')

        res = sts.assume_role_with_web_identity(
            RoleArn=aws_role_arn,
            WebIdentityToken=token,
            RoleSessionName=project_and_instance_name)

        aws_temporary_credentials = {
            'Version': 1,
            'AccessKeyId': res['Credentials']['AccessKeyId'],
            'SecretAccessKey': res['Credentials']['SecretAccessKey'],
            'SessionToken': res['Credentials']['SessionToken'],
            'Expiration': res['Credentials']['Expiration'].isoformat()
        }

        print(json.dumps(aws_temporary_credentials))
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  serviceAccountName: test-sa
  containers:
  - name: test-container
    image: amazon/aws-cli:latest
    env:
    - name: AWS_ROLE_ARN
      value: "arn:aws:iam::996145069080:role/aws_role"
    volumeMounts:
    - name: get-aws-cred
      mountPath: /usr/local/bin/get_aws_cred
      subPath: get_aws_cred
    command: ["/bin/bash"]
    args:
    - "-c"
    - |
      yum update -y && yum install -y python3 python3-pip
      pip3 install urllib3==1.26.16
      pip3 install requests boto3
      
      mkdir -p ~/.aws
      echo "[default]
      credential_process = python3 /usr/local/bin/get_aws_cred $AWS_ROLE_ARN" > ~/.aws/credentials
      chmod 600 ~/.aws/credentials
      
      aws s3 ls
  volumes:
  - name: get-aws-cred
    configMap:
      name: gcp-aws-credentials-script
      items:
      - key: get_aws_cred
        path: get_aws_cred
        mode: 493
```

해당 Pod를 실행시키면, 성공적으로 aws s3 ls 명령을 수행할 수 있습니다.

## 마무리

GKE Workload Identity와 AWS IAM Role OIDC 연동을 사용하면, 보안에 취약한 Access Key 없이 GKE 워크로드가 안전하고 효율적으로 AWS 리소스에 접근할 수 있습니다. 초기 설정 단계는 다소 복잡해 보일 수 있지만, 한 번 구축해두면 다음과 같은 큰 이점을 얻을 수 있습니다.

이 가이드가 GKE와 AWS를 함께 사용하는 환경에서 보안을 강화하고 운영 효율성을 높이는 데 도움이 되기를 바랍니다.

참고자료

- [https://www.doit.com/securely-access-aws-from-gke/](https://www.doit.com/securely-access-aws-from-gke/)
- [https://www.doit.com/assume-an-aws-role-from-a-google-cloud-without-using-iam-keys/](https://www.doit.com/assume-an-aws-role-from-a-google-cloud-without-using-iam-keys/)
- [https://github.com/doitintl/janus/blob/master/janus.py](https://github.com/doitintl/janus/blob/master/janus.py)
