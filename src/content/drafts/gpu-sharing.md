---
# description: 검색 결과 스니펫 (120-160자), 핵심 키워드 + 가치 제안
# title: 검색 노출 핵심 (50-60자), 키워드 앞쪽 배치
# tags: 주요 키워드 + 상위 카테고리 + 관련 기술
description: ''
pubDate: '2026-01-06'
tags:
  -
title: ''
---

## TL;DR

> Kubernetes 환경에서 GPU Sharing은 **Time‑Sharing, MPS, MIG** 세 가지로 나뉜다.  
> **MIG만이 컨테이너 단위에서 여러 GPU(slices)를 동시에 요청**할 수 있고,  
> **MPS / Time‑Sharing은 컨테이너당 GPU 요청이 1개로 제한**된다.  
> 이 제한은 CUDA가 아니라 **Kubernetes 스케줄링 정책** 때문이다.

GPU Sharing 방법으로 대표적인 전략은 **Time‑Sharing, MPS, MIG** 세 가지다.  
이 글에서는 *Kubernetes 기준*으로 각 방식의 **리소스 모델, 제약, 실무에서 헷갈리는 포인트**를 정리한다.

---

## 왜 GPU Sharing을 쓰는가?

GPU가 충분하다면 굳이 Sharing을 할 필요는 없다.  
GPU를 분할하거나 공유하면 다음과 같은 비용이 발생한다.

- Context switching / scheduling 오버헤드
- 메모리 및 연산 자원 간섭
- 성능 예측성 저하 (특히 latency‑sensitive workload)

그럼에도 GPU Sharing을 사용하는 이유는 다음과 같다.

- 추론(workload)이 가볍고 GPU utilization이 낮은 경우
- GPU 비용을 최대한 효율적으로 쓰고 싶은 경우
- 다수의 소형 워크로드를 동시에 실행해야 하는 경우

---

## GPU Time‑Sharing

### 개념
- **GPU 전체를 여러 워크로드가 시간 분할로 공유**
- Context switching 기반
- 하드웨어 파티셔닝 없음

### Kubernetes에서의 동작
- 여러 파드가 **같은 물리 GPU를 동시에 공유**
- 하지만 **컨테이너당 GPU 요청은 최대 1개**
- `nvidia.com/gpu: 2` 같은 요청은 **스케줄러에서 reject**

```yaml
resources:
  limits:
    nvidia.com/gpu: 1  # 허용
```

### 특징 요약
- 격리 ❌
- 성능 예측성 ❌
- 설정 간단
- 경량 추론에 적합

---

## NVIDIA MPS (Multi‑Process Service)

### 개념
- **하나의 물리 GPU를 여러 CUDA 프로세스가 공유**
- MPS 서버가 CUDA context / kernel 실행을 중재
- 소프트웨어 레벨 공유 (MIG 아님)

### Kubernetes에서의 핵심 제약
> **MPS 활성화 노드에서는 컨테이너당 GPU 요청이 1개로 제한됨**

- 여러 파드가 **같은 GPU를 동시에 사용** 가능
- 하지만 **한 파드가 GPU 2개 이상을 요청하는 것은 불가**
- `gpu per client = 8` 같은 설정은  
  → *GPU 개수*가 아니라 **GPU 내부 리소스 비율 제어**

```yaml
resources:
  limits:
    nvidia.com/gpu: 2  # ❌ reject
```

### 중요한 오해 포인트
- MPS는 **멀티 GPU 스케줄러가 아니다**
- Kubernetes가 여러 GPU를 “합쳐서” 한 컨테이너에 주지 않는다
- 이 제약은 CUDA가 아니라 **Kubernetes 리소스 모델의 정책**

---

## MIG (Multi‑Instance GPU)

### 개념
- GPU를 **하드웨어 단위로 물리 분할**
- 각 MIG 인스턴스는:
  - 독립된 메모리
  - 독립된 SM
  - 강한 오류 격리

### Kubernetes에서의 동작
- MIG 인스턴스는 **독립 GPU 리소스처럼 노출**
- 하나의 컨테이너가 **여러 MIG slice를 동시에 요청 가능**

```yaml
resources:
  limits:
    nvidia.com/gpu: 3
```

> 단, **노드에 실제로 존재하는 MIG 인스턴스 수를 초과하면 스케줄 불가**

### 특징 요약
- 격리 ✅
- 성능 예측성 ✅
- 설정/운영 복잡도 높음
- 안정성이 중요한 워크로드에 적합

---

## 핵심 비교 요약

| 구분 | Time‑Sharing | MPS | MIG |
|----|----|----|----|
| 공유 방식 | 시간 분할 | 프로세스 공유 | 하드웨어 분할 |
| 격리 | ❌ | ❌ | ✅ |
| 컨테이너당 GPU 요청 | 1개 제한 | 1개 제한 | 여러 개 가능 |
| 여러 파드 동시 사용 | ✅ | ✅ | ✅ |
| 성능 예측성 | 낮음 | 낮음 | 높음 |
| 실무 추천 용도 | 경량 추론 | 경량 추론 | 안정성/멀티 GPU |

---

## 한 문장 요약

> **Kubernetes에서 GPU Sharing을 쓸 때,  
> 컨테이너가 여러 GPU를 동시에 가져가야 한다면 선택지는 MIG뿐이다.**

MPS와 Time‑Sharing은 “GPU를 나눠 쓰는 방법”이지  
“GPU 개수를 늘려주는 방법”이 아니다.
