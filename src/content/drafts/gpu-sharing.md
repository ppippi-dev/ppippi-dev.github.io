---
title: Kubernetes에서 GPU Sharing 정리: Time‑Slicing, MPS, MIG
description: Kubernetes에서 NVIDIA GPU를 여러 워크로드가 함께 쓰게 만드는 방법(Time‑Slicing, CUDA MPS, MIG)과 각각의 격리/성능/운영 포인트를 정리한다.
pubDate: '2026-01-06'
tags:
- kubernetes
- MLOps
- NVIDIA
- GPU
---

## TL;DR

> Kubernetes에서의 GPU Sharing은 “오버커밋(Time‑Slicing, MPS)”과 “하드웨어 파티셔닝(MIG)”으로 구분된다.  
> Time‑Slicing은 GPU를 시간 분할로 공유한다. 메모리/장애 격리는 제공되지 않는다.  
> MPS는 CUDA MPS 서버가 여러 CUDA 프로세스의 동시 실행을 중재한다. Kubernetes에서는 device plugin이 공유 슬롯을 만들어 스케줄링한다.  
> MIG는 하드웨어 파티셔닝으로 인스턴스별 전용 자원을 제공하며, 지원 GPU가 제한된다(A100, H100 등).


GPU는 비싸고, 특히 추론 워크로드는 의외로 GPU utilization 혹은 GPU Memory가 낮은 경우가 많다. “한 파드에 GPU 1개”라는 기본 모델만 고집하면, GPU를 놀리면서도 인프라 비용은 그대로 지불하게 된다. 그래서 많은 팀이 “GPU를 여러 워크로드가 같이 쓰는 방법”, 즉 성능을 유지하면서 효율적으로 GPU를 사용하는 방법을 찾게 된다.

여기서부터 용어가 조금 혼란스러워진다.

먼저 Time‑Slicing, MPS, MIG의 용어와 개념을 정리하고, 이후 Docker와 Kubernetes 환경에서의 동작/운영 포인트를 설명한다.

---

## 왜 GPU Sharing을 쓰는가?

GPU가 넉넉하고, 워크로드가 GPU를 꾸준히 80~100% 가까이 쓰는 편이라면 굳이 Sharing을 할 필요는 없다. 하지만 많은 추론 워크로드는 요청이 들쭉날쭉하고, 모델이 작거나 배치가 작아서 GPU를 “항상” 꽉 채우기 어렵다. 이때 GPU를 여러 워크로드가 같이 쓰게 만들면 같은 비용으로 더 많은 서비스를 태울 수 있다.

물론 공짜는 아니다. 공유를 시작하면 context switching 오버헤드가 생기고, 워크로드 간 간섭 때문에 성능 예측이 어려워지며, 장애가 전파될 수 있다(특히 Time‑Slicing). 결국 GPU Sharing은 “비용 효율 vs 예측 가능성”의 균형점을 어디에 둘지 결정하는 문제다.

그래서 GPU Sharing은 보통 아래 같은 상황에서 특히 유용하다.

- 추론(workload)이 가볍고 GPU utilization이 낮은 경우
- GPU 비용을 최대한 효율적으로 쓰고 싶은 경우
- 다수의 소형 워크로드를 동시에 실행해야 하는 경우

---

## 먼저 용어 정리: Time‑Slicing, MPS, MIG

### Time‑Slicing

여러 CUDA 프로세스가 한 GPU를 번갈아 실행되도록 스케줄링하는 방식이다. GPU를 물리적으로 쪼개지 않으며, GPU 드라이버가 작업을 시간 분할로 섞어 처리한다.

### MPS (Multi‑Process Service)

NVIDIA의 CUDA MPS는 여러 프로세스가 동시에 GPU를 사용하도록 중재하는 CUDA API 구현이다. Time‑Slicing이 프로세스를 번갈아 순차 실행하는 반면, MPS는 여러 프로세스의 CUDA 커널을 **병렬로 실행**할 수 있다. 목표는 동시성 개선과 GPU 활용도 향상이며, 기본적으로는 고정된 "슬롯/쿼터"를 할당하는 방식은 아니다. 다만 `CUDA_MPS_ACTIVE_THREAD_PERCENTAGE` 환경변수로 클라이언트별 SM(Streaming Multiprocessor) 사용률 상한을 설정할 수 있다(Kubernetes device plugin에서는 직접 지원하지 않음).

### MIG (Multi‑Instance GPU)

GPU를 하드웨어 레벨에서 여러 개의 독립된 디바이스로 쪼개는 기능이다. 인스턴스별 전용 자원(SM, 메모리, L2 캐시)이 제공되며, 지원 GPU가 제한된다(A30, A100, A100X, A800, H100, H200, H800 등).

---

## Docker에서의 GPU Sharing은 무엇인가?

Docker 단일 호스트에서의 “GPU 공유”는 보통 특별한 스케줄링 기능을 뜻하지 않는다. `nvidia-container-toolkit`으로 GPU를 컨테이너에 노출해두면, **여러 컨테이너(=여러 CUDA 프로세스)가 같은 GPU를 동시에 사용**할 수 있고, 이때 커널 실행의 순서는 드라이버가 알아서 time-slicing으로 섞어 처리한다. 즉 “공유는 되지만, 격리나 보장(쿼터)은 거의 없다”가 기본값에 가깝다.

예를 들어, 같은 GPU를 두 컨테이너에 동시에 열어주면 둘은 경쟁하면서 돌아간다.

```bash
docker run --rm --gpus all <image> <cmd>
docker run --rm --gpus all <image> <cmd>
```

반대로 **`0.5 GPU`처럼 쪼개서 요청**하는 기능은 Docker 자체만으로는 제공되지 않고 추가적인 설정이 필요하다.

더 강한 공유/격리가 필요하다면, 결국 호스트에서 **MPS(Multi‑Process Service)** 나 **MIG(Multi‑Instance GPU)** 같은 기능을 활성화하는 방향으로 가야 한다.

---

## Kubernetes에서 “GPU Sharing”이 혼란스러운 이유

Kubernetes 입장에서 GPU는 CPU나 메모리처럼 “연속적인 자원”이 아니다. 대부분의 클러스터에서 GPU는 `nvidia.com/gpu` 같은 **확장 리소스(extended resource)** 로 등록되고, 이 값은 **정수(int)만** 다룰 수 있다. 즉, `0.5 GPU` 같은 요청은 원천적으로 불가능하다.

또한 확장 리소스는 overcommit(오버커밋)이 허용되지 않는다. 그래서 Kubernetes에서 GPU를 “공유”한다는 말은, **플러그인이 GPU 리소스를 복제해서 여러 파드가 같은 GPU를 쓰게 만드는 방식**을 뜻하는 경우가 많다.

---

## Kubernetes에서의 Time‑Slicing

Kubernetes에서 Time‑Slicing이 가능한 이유는 kube-scheduler가 GPU를 이해해서가 아니라, **NVIDIA device plugin이 노드에 광고하는 GPU 개수를 “복제”해서 늘려주기 때문**이다. 예를 들어 1개의 물리 GPU를 10개의 “공유 슬롯”으로 보이게 하면, 스케줄러는 단순히 “GPU 10개가 있네”라고 판단하고 10개의 파드를 올릴 수 있다.

```yaml
version: v1
sharing:
  timeSlicing:
    renameByDefault: true
    failRequestsGreaterThanOne: true
    resources:
    - name: nvidia.com/gpu
      replicas: 10
```

위처럼 `renameByDefault: true`를 주면, 노드는 `nvidia.com/gpu` 대신 `nvidia.com/gpu.shared` 리소스를 광고한다. 이 방식이 실무에서 특히 좋은 이유는, “공유 GPU”와 “전용 GPU”가 한 클러스터에 섞여 있어도 리소스 이름으로 구분할 수 있기 때문이다.

또한 Time‑Slicing은 노드 단위로 적용된다. 즉, “같은 노드에서 어떤 GPU는 공유, 어떤 GPU는 전용”처럼 섞어 쓰기는 어렵고(플러그인 기준), 보통은 **노드풀 자체를 분리**해서 운영한다.

한 가지 중요한 포인트가 `failRequestsGreaterThanOne`이다. Time‑Slicing에서 `nvidia.com/gpu.shared: 2`를 요청한다고 해서 “2배의 연산/메모리”를 보장받는 것이 아니다. 오해를 줄이기 위해, 실무에서는 보통 `failRequestsGreaterThanOne: true`로 두고 **공유 GPU는 ‘컨테이너당 1장’만 받게** 만드는 편이 안전하다.

파드 스펙은 대략 아래처럼 된다.

```yaml
resources:
  limits:
    nvidia.com/gpu.shared: 1
```

Time‑Slicing은 “가볍고, 짧고, 많이 들어오는” 추론 워크로드에 잘 맞지만, 다음 리스크를 감수해야 한다.

- 메모리 격리가 없어서 한 워크로드의 OOM/누수가 다른 워크로드에도 영향을 줄 수 있음
- 같은 GPU의 fault-domain을 공유해서 한 프로세스의 크래시가 전체에 영향을 줄 수 있음
- 워크로드 간 간섭이 커서 latency‑sensitive 서비스에선 튜닝이 어려움

---

## Kubernetes에서의 MPS

Kubernetes에서의 MPS도 Time‑Slicing과 마찬가지로 **플러그인이 GPU 리소스를 복제해 공유 슬롯을 만드는 방식**으로 노출된다.

```yaml
version: v1
sharing:
  mps:
    renameByDefault: true
    resources:
    - name: nvidia.com/gpu
      replicas: 10
```

다만 Kubernetes에서의 Time-Slicing 및 MPS의 경우 다음 제약을 알고 시작하는 게 좋다.

- Time‑Slicing과 MPS는 **동시에 켤 수 없다**.
- NVIDIA device plugin 기준으로 MPS는 **실험적(experimental)** 로 취급되는 시기가 있었고, 버전에 따라 제약/동작이 달라질 수 있다.
- (중요) **k8s‑device‑plugin 기준으로 MIG가 활성화된 디바이스에서는 MPS 공유가 지원되지 않는다.**
- (중요) **MPS는 장애 격리(fault isolation)를 제공하지 않는다.** 한 클라이언트의 치명적 오류(fatal fault)가 동일 GPU를 공유하는 모든 클라이언트를 종료시킬 수 있다. 이 때문에 MPS는 원래 MPI 작업처럼 서로 신뢰하는 협력적 프로세스를 위해 설계되었으며, 멀티 테넌트 격리가 필요한 환경에서는 주의가 필요하다.
- device plugin의 MPS 공유 모드에서는 멀티 GPU 요청이 제한된다. 예를 들어, `nvidia.com/gpu: 2`를 요청하면 아래와 같은 에러가 발생한다.

```text
Allocate failed due to rpc error: code = Unknown desc = invalid request for sharing GPU (MPS), at most 1 nvidia.com/gpu can be requested on multi-GPU nodes
```

이는 Kubernetes 레벨에서 QoS와 자원 할당 예측 가능성을 위해 제한하는 동작으로 보는 것이 안전하다.

또한 Kubernetes에서의 MPS(=device plugin의 GPU sharing 모드)와, 애플리케이션 레벨에서 MPS를 직접 켜는 방식은 동작 모델이 다르다. 전자는 **스케줄러에 보이는 공유 슬롯**을 만들어 다중 파드를 한 GPU에 올리는 방식이고, 후자는 **단일 노드/단일 GPU에서 CUDA MPS 서버를 직접 구동**해 프로세스 동시성을 높이는 방식이다. 운영 복잡도와 오작동 리스크 때문에, 후자는 일반적으로 권장하지 않는다.

---


## Kubernetes에서의 MIG

MIG는 앞의 두 방식과 달리 **GPU를 하드웨어 레벨에서 여러 개의 독립된 디바이스로 쪼개는 기능**이다. MIG 인스턴스는 분리된 메모리와 연산 자원을 가지며, 격리/예측 가능성이 가장 높다. 그래서 멀티 테넌시가 강하게 요구되는 환경(팀/서비스 간 공유, SLA가 있는 서비스 등)에서 특히 매력적이다.

Kubernetes에서는 보통 `migStrategy=mixed`로 설정했을 때, MIG 프로파일이 아래처럼 **별도 리소스 이름으로 노출**된다.

- `nvidia.com/mig-1g.5gb`
- `nvidia.com/mig-2g.10gb`
- `nvidia.com/mig-3g.20gb`
- …

파드는 원하는 프로파일을 골라 요청할 수 있다.

```yaml
resources:
  limits:
    nvidia.com/mig-1g.5gb: 1
```

### GKE에서의 MIG 사용

GKE에서는 기본적으로 **single strategy**를 사용하며, 리소스 요청 방식이 다르다. MIG 파티션 크기는 `nodeSelector`로 지정하고, 리소스는 일반 GPU처럼 `nvidia.com/gpu: 1`로 요청한다.

```yaml
spec:
  nodeSelector:
    cloud.google.com/gke-gpu-partition-size: 1g.5gb
  containers:
  - name: my-container
    resources:
      limits:
        nvidia.com/gpu: 1
```

이 방식에서는 모든 MIG 디바이스가 `nvidia.com/gpu`라는 단일 리소스로 노출되고, nodeSelector가 실제 파티션 크기를 결정한다. 반면 앞서 설명한 `nvidia.com/mig-1g.5gb` 형식은 NVIDIA device plugin에서 `migStrategy=mixed`로 설정했을 때 사용하는 방식이다.

MIG의 중요한 운영 포인트는 “쿠버네티스가 알아서 쪼개 주는 기능”이 아니라는 점이다. 보통은 노드에서 미리 MIG 인스턴스를 구성해 두어야 하고(또는 GPU Operator/MIG manager 같은 구성요소로 정책적으로 맞춰두고), 파드는 그 결과로 생긴 리소스를 소비하는 형태가 된다.

또 하나의 차이는, MIG에서는 `nvidia.com/mig-1g.5gb: 2`처럼 “두 개의 MIG 디바이스”를 한 파드에 붙이는 것이 의미를 가질 수 있다는 점이다. Time‑Slicing/MPS에서 “공유 슬롯 2개”가 성능을 보장하지 않는 것과 대비된다.

---

## (번외) vGPU, 그리고 “서버 내부에서의 공유”

GPU를 “나눠 쓴다”는 요구는 Kubernetes 밖에서도 존재한다. 대표적으로는 NVIDIA vGPU처럼 하이퍼바이저/가상화 레벨에서 GPU를 분할해 VM에 할당하는 방식이 있다(대개 라이선스/플랫폼 제약이 있다).

또 한 가지 현실적인 대안은, 인프라에서 GPU를 쪼개기보다 **애플리케이션 레벨에서 한 프로세스가 여러 요청을 배치로 처리**하게 만드는 것이다. 예를 들어 Triton의 dynamic batching, vLLM의 continuous batching 같은 접근은 "파드 수를 늘려 공유"하지 않고도 utilization을 크게 끌어올릴 때가 많다. 대신 프로세스/모델 수준에서 테넌트 격리가 약해질 수 있어 요구사항에 따라 판단해야 한다. (vLLM에 대해서는 별도 글에서 다룰 예정이다.)

---

## GPU Sharing 환경에서의 모니터링

GPU Sharing을 도입하면 "누가 얼마나 쓰고 있는지" 파악하기가 어려워진다. 공유 환경에서는 다음 도구/메트릭을 활용한다.

- **nvidia-smi**: 기본 CLI로 GPU 상태, 프로세스별 메모리 사용량, MIG/MPS 상태를 확인할 수 있다. MIG 환경에서는 `nvidia-smi mig -lgi`로 인스턴스 구성을, MPS 환경에서는 `nvidia-smi`에서 MPS 서버 프로세스를 확인할 수 있다.
- **DCGM (Data Center GPU Manager)**: NVIDIA의 GPU 모니터링/관리 도구로, 더 세밀한 메트릭(SM 활용도, 메모리 대역폭, NVLink 상태 등)을 수집할 수 있다.
- **DCGM Exporter + Prometheus**: Kubernetes 환경에서는 DCGM Exporter를 DaemonSet으로 배포하고 Prometheus로 메트릭을 수집하는 조합이 일반적이다. Grafana 대시보드와 연동하면 클러스터 전체의 GPU 상태를 시각화할 수 있다.

공유 환경에서 특히 주의할 메트릭은 **GPU Memory Used**, **SM Activity**, **Encoder/Decoder Utilization** 등이다. Time‑Slicing/MPS 환경에서는 프로세스별 분리가 어렵기 때문에, 파드 레벨 메트릭보다는 노드/GPU 레벨 메트릭 중심으로 모니터링하는 경우가 많다.

---

## 선택 기준: 무엇을 우선순위로 둘 것인가

정답은 없고, 우선순위를 정하면 선택지가 좁혀진다. 아래 비교 테이블을 참고하자.

| 기준 | Time‑Slicing | MPS | MIG |
|------|-------------|-----|-----|
| 메모리 격리 | ❌ | ❌ | ✅ |
| 장애 격리 | ❌ | ❌ | ✅ |
| 성능 예측 가능성 | 낮음 | 중간 | 높음 |
| 설정 복잡도 | 낮음 | 중간 | 높음 |
| 지원 GPU | 모든 NVIDIA GPU | 모든 NVIDIA GPU | A30, A100, H100 등 |
| 리소스 제한 설정 | ❌ | `CUDA_MPS_ACTIVE_THREAD_PERCENTAGE` | 프로파일별 고정 |

**요약하면:**

- **격리와 예측 가능성이 최우선**이라면: MIG(또는 vGPU 같은 파티셔닝/가상화)를 먼저 본다.
- **설정이 단순하고 "일단 밀도만 올리고 싶다"**면: Time‑Slicing이 가장 빠른 출발점이다.
- **공유하되 어느 정도 자원 상한을 걸고 싶다**면: 제약을 감수하고 MPS를 검토한다(클러스터/드라이버/플러그인 버전 확인 필수).

그리고 무엇을 선택하든, 운영 단계에서는 "공유 GPU"를 명확히 분리해두는 것이 큰 도움이 된다. (`renameByDefault`로 `*.shared` 리소스 이름을 쓰거나, 노드 라벨/노드풀을 분리하는 방식이 흔하다.)

---

## 정리

GPU Sharing을 도입할 때 가장 흔한 오해는 “숫자를 늘리면 성능이 늘어난다”이다. Time‑Slicing/MPS에서의 숫자는 대개 “용량”이 아니라 “접근 권한”에 가깝고, 성능은 워크로드 간 경쟁 상태에 따라 달라진다. 반대로 MIG는 하드웨어 파티셔닝이라, 숫자와 성능/메모리가 비교적 직관적으로 연결된다.

---

## 관련 레퍼런스

- NVIDIA k8s-device-plugin: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Operator (GPU Sharing): https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- Kubernetes Device Plugin: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins
- NVIDIA MIG 개요: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/
- NVIDIA MPS: https://docs.nvidia.com/deploy/mps/introduction.html
