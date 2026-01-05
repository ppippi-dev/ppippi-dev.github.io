---
description: IBM에서 오픈소스로 공개한 MCP Gateway, mcp-context-forge를 프로덕션 환경에서 운영한 경험을 공유합니다. Virtual Server를 통한 툴 권한 분리, MCP Catalog, 메트릭 기능 등 핵심 기능을 소개합니다.
pubDate: '2025-12-19'
tags:
- LLMOps
- MCP
- Agent
title: MCP Gateway 추천, mcp-context-forge 사용기
---

## TL;DR

> MCP Gateway는 Agentic AI 플랫폼을 만드는데 꼭 필요한 툴 중 하나라고 생각합니다. MCP가 점점 많아지고 관리하기 힘든 경우, 중복된 MCP 서버를 계속해서 찍어내고 있는 경우, mcp-context-forge라는 오픈소스 도입을 검토해보세요.



저는 최근, Agent 인프라를 셋팅하는 프로젝트를 하면서 여러 오픈소스를 경험했고, 그 경험을 글로나마 공유하고자 합니다.

Agent 인프라를 구축한다는 것은 단순히 LLM을 호출하는 시스템을 만드는 것이 아닙니다. 지속적으로 운영 가능한 **소프트웨어 플랫폼**으로 만들어야 한다는 것을 의미합니다. 이러한 아키텍처 설계를 위해 큰 도움이 되었던 오픈소스들을 소개하고자 하고, 오늘이 그 첫번째입니다. 첫번째로 제가 가장 애정을 가지고 사용하고 있는 툴을 소개하기로 했습니다. 실제로 컨트리뷰트까지하면서 애용하고 있습니다.

바로, MCP Gateway인 [**mcp-context-forge**](https://github.com/IBM/mcp-context-forge) 라는 오픈소스입니다. 이제 하나씩 알아보는 시간을 가지면 좋을 것 같습니다.

글을 작성하는 현 시점은 V1.0.0-BETA-1인점 말씀드립니다. 



## 왜 MCP Gateway가 필요한가?

mcp-context-forge를 설명하기 전에, 먼저 **"왜 MCP Gateway가 필요한가?"**부터 짚고 넘어가는 것이 좋을 것 같습니다. 저는 MCP Gateway를 도입하기 전에, 아래의 질문을 먼저 해보는게 좋다고 생각합니다.

1. 현재 내가 MCP Gateway가 필요할 만큼, 관리해야하는 MCP 서버 및 툴이 많은가?
2. Agent가 동일한 MCP를 호출할 일이 있는가?

사실 초기 단계나 작은 규모의 프로젝트에서는 MCP Gateway의 필요성이 잘 느껴지지 않을 수 있습니다. 오히려 관리 포인트 증가 및 단일 실패 지점이 될 수 있어, 오버 엔지니어링으로 느껴지기도 합니다.

하지만, **Agent와 MCP의 개수가 늘어나고 시스템이 확장되는 시점**이 오면 이야기는 달라집니다. 이때부터는 Gateway 도입에 들어가는 수고가 우스울 정도로 강력한 효과를 발휘하게 됩니다.

가장 큰 장점은 MCP Catalog입니다. 모두가 MCP가 좋다며 MCP 서버를 찍어내고 있는 상황에서, 현재 사내에 어떤 MCP 서버와 툴이 있는지 파악하는 것은 중요한 문제입니다.

저 또한, 동일한 기능을 하는 MCP tool들이 여러개 생성되어 있는 것을 경험하기도 했고요. 이런 상황에서 어떤 MCP 서버 및 툴이 있는지 리스트를 볼 수 있는 건 큰 장점일 것입니다.


## mcp-context-forge란 무엇인가?

이제 본격적으로 mcp-context-forge를 알아보면 좋을 것 같습니다.

`mcp-context-forge`는 IBM에서 오픈소스로 공개한 MCP Gateway입니다. 복잡해지는 Agent와 도구(Tool) 간의 연결을 효율적으로 중개해주는 역할을 합니다.

사실 MCP Gateway 툴이 많지 않습니다. 제가 리서치를 하던 시점에는, mcp-context-forge와 kgateway + Agentgateway 조합이 매력적으로 보였는데, agentgateway는 상대적으로 운영이 복잡하다고 느꼈고, 프로덕션 레벨에서 사용하기에 완성도가 아직 미흡하다고 느꼈습니다. 이미 사내에서 다른 gateway스택을 사용하고 있는 부분도 있습니다. 

이러한 이유들로 인해 mcp-context-forge를 택하게 되었습니다. 물론 아직 mcp-context-forge는 정식버전 출시전으로 프로덕션 레벨에서 사용하지말라고는 내용이 있기도 합니다. 저의 경우 프로덕션 레벨에서 사용하고 있는데, 큰 문제점을 느끼진 않았습니다.



### 실행시켜보기

제가 운영중인 환경은 쿠버네티스이지만 해당 글에서는 docker 기반으로 진행할 예정입니다.

이미 많은 깃헙 star를 받은 만큼 크게 어려움 없이 테스트해볼 수 있습니다.

```bash
git clone https://github.com/IBM/mcp-context-forge
docker-compose up 
```

구성은 크게 Gateway, 메인db(postgres or mariadb), Redis, fast_time_server 으로 되어있습니다. 
복잡한 구조는 아니라, 쉽게 운영할 수 있습니다.

fast_time_server라고, 시간 관련 서버가 따로 있는데, 이거에 대해서는 이후에 알아보려고 합니다. (크게 체감되지는 않습니다.)



시작화면은 다음과 같습니다. 알록달록한 화면을 볼 수 있고, 필요에 따라, SSO도 연결할 수 있어서, 유용한 로그인 기능을 제공합니다.

기본 Email address 및 Password는 `admin@example.com`, `changeme` 로 설정되어 있으니 참고하세요.

![image-20251218010740484](/img/mcp-context-forge/image-20251218010740484.webp)



로그인 이후 들어가면, 다음과 같은 화면을 볼 수 있습니다. 저는 v0.8부터 해당 오픈소스를 보고있는데, v1.0.0-BETA-1인 현시점에서 보면, 디자인이 많이 진화 했다는 걸 느낄 수 있습니다.



![image-20251219001536178](/img/mcp-context-forge/image-20251219001536178.webp)

사이드바를 보면, 다양한 옵션이 있습니다. 

- MCP Servers: mcp-context-forge에서는 이를 Gateway라는 표현으로 사용하는데, 그냥 MCP Server라고 보면 되고, 여기서 등록을하면 해당 MCP 서버에 있는 tools, prompts, resources 가 자동으로 등록됩니다.
- Virtual Servers: mcp-context-forge의 핵심기능이라고 생각합니다. 가상의 gateway를 두고, 필요한 tools, prompts, resources 들을 지정할 수 있는데, 이후 이를 기존 MCP 서버처럼 사용할 수 있습니다. 에이전트마다 필요한 툴들을 설정하고, 툴 권한 분리를 할 수 있는 유용한 기능입니다.
- Tools, Prompts, Resources: MCP에서 말하는 내용과 동일합니다.
- Roots: 무슨 역할인지 잘 모르겠습니다... 사용해본적도 없습니다. 아마 서버에 있는 저장공간에 있는 내용을 가져다 쓸 수 있는 기능같아 보이는데 잘 모르겠네요.
- MCP Registry: mcp-context-forge에서 편하게 등록할 수 있는 registry를 운영하고 있습니다. 마음에 드는 registry를 원클릭으로 등록할 수 있습니다.
- Agents: MCP 서버들 뿐만 아니라 Agent도 등록할 수 있습니다.
- Metrics: mcp-context-forge의 메트릭을 볼 수 있습니다. 어떤 툴이 많이 호출되는지, 가장 최근이 언제인지 파악할 수 있으며, 사용되지 않는 툴이 어떤 건지 파악하기 좋습니다.
- Teams / Users: mcp-context-forge 유저의 권한 관리를 할 수 있습니다.





![image-20251219001059140](/img/mcp-context-forge/image-20251219001059140.webp)

위의 화면은 MCP Registry입니다. 테스트를 위해 몇가지 Add Server를 해보면 아래의 사진처럼 등록되는 걸 알 수 있습니다.

물론 대부분의 툴은 Add Server만 한다고 끝은 아니고, 각 서버들이 요구하는 인증을 사용해야합니다.



![image-20251219001727809](/img/mcp-context-forge/image-20251219001727809.webp)

위의 화면은 Github을 등록했을 때, 다음과 같이 생성되는 걸 볼 수 있습니다.



![image-20251219002025981](/img/mcp-context-forge/image-20251219002025981.webp)

Github 외에도 몇개의 Registry를 테스트로 등록했는데, 설정이 끝나면, Tools에 MCP 서버가 가진 툴들을 조회할 수 있습니다.





![image-20251219002100211](/img/mcp-context-forge/image-20251219002100211.webp)

위의 화면처럼, 등록된 Tool을 테스트해볼 수 있습니다.





![image-20251219002139585](/img/mcp-context-forge/image-20251219002139585.webp)

위에가 아까 가장 핵심 기능이라고 강조한 Virtual Servers의 모습입니다. 위와같이 원하는 MCP Server 및 Tools / Resources / Prompts 를 선택할 수 있습니다. 





![image-20251219002209987](/img/mcp-context-forge/image-20251219002209987.webp)

Virtual Server를 선택하면 위와 같이 생성되는걸 확인할 수 있습니다.



![image-20251219002222560](/img/mcp-context-forge/image-20251219002222560.webp)

Config를 조회하면 위와 같이 선택할 수 있습니다. Stdio, SSE, HTTP를 지원해서 MCP를 이용하는데 문제 없습니다.



![image-20251219002234945](/img/mcp-context-forge/image-20251219002234945.webp)

위의 화면은 SSE방식의 예시인데, 다음과 같이 익숙한 MCP 등록 설정입니다. headers를 보면 Bearer token을 요구하는 것을 알 수 있는데, mcp-context-forge의 권한을 컨트롤 하기 위해 토큰을 사용합니다.





![image-20251219002305321](/img/mcp-context-forge/image-20251219002305321.webp)

토큰 설정화면은 위와 같습니다. 토큰마다 접근할 수있는, Virtual Server를 지정할 수 있습니다. IP로 제한거는 기능도 있는데 이건 사용해본적은 없네요. 권한또한 지정할 수 있는데, 보통은 에이전트마다 접근할 수 있는 툴들만 지정해서 이것도 사용해 본적은 없습니다.



이제 mcp-context-forge의 장점과 단점을 말하고 마무리하려고 합니다.

## 장점

가장 큰 장점은 MCP Catalog 역할입니다. 사내에 어떤 MCP 서버와 툴이 있는지 한눈에 파악할 수 있어서, 중복된 MCP 서버가 생성되는 것을 방지할 수 있습니다. 팀 간 협업 시에도 "이런 툴 있어?"라는 질문에 바로 답할 수 있게 됩니다.

Virtual Server를 통한 권한 분리도 매력적입니다. 에이전트마다 필요한 툴만 지정할 수 있어서, 불필요한 툴 호출을 막고 보안적으로도 안심이 됩니다. 메트릭 기능 덕분에 어떤 툴이 실제로 사용되고 있는지, 혹은 방치되고 있는지 파악하기도 좋습니다.

구성이 간단한 것도 장점입니다. PostgreSQL이나 MariaDB, 그리고 Redis만 있으면 운영할 수 있어서 부담이 적습니다. Stdio, SSE, HTTP를 모두 지원하기 때문에 기존 MCP 클라이언트와 호환성 문제도 없습니다.


## 단점

기능적인 단점은 사실 크게 못 느꼈습니다. 굳이 뽑자면 아직 베타 버전이라 미구현된 기능들이 있다는 점 정도입니다.

그리고 Agent에서 MCP로 직접 연결할 때와 비교해서, 지원하지 않는 인증 방식이 몇 가지 있는 것으로 보입니다. 저의 경우 FastMCP Client를 사용해서 연결하는 방법을 시도했었는데 실패해서, mcp 라이브러리로 변경했던 기억이 있습니다. 지금은 해결되었을 수도 있겠네요.

또한 Gateway라는 특성상 단일 실패 지점(Single Point of Failure)이 될 수 있다는 점은 고려해야 합니다. 다만 이건 모든 Gateway의 공통적인 특성이기도 합니다.



## 마무리

MCP Gateway는 MCP 서버와 툴이 많아지기 시작하면 반드시 필요해지는 인프라입니다. mcp-context-forge는 아직 베타 버전이지만, 실제 프로덕션 환경에서 운영해본 결과 큰 문제 없이 잘 동작했습니다.

무엇보다 IBM에서 오픈소스로 공개하고 활발하게 개발 중이라는 점이 좋습니다. 저도 컨트리뷰트하면서 사용하고 있는데, 이슈 대응도 빠른 편입니다.

MCP Gateway 도입을 고민하고 계시다면, mcp-context-forge를 한번 검토해보시길 추천드립니다.



## 참고 링크

- [mcp-context-forge GitHub](https://github.com/IBM/mcp-context-forge)
- [mcp-context-forge 공식 문서](https://ibm.github.io/mcp-context-forge/)
