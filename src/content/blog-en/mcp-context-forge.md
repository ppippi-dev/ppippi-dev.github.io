---
description: IBM에서 오픈소스로 공개한 MCP Gateway, mcp-context-forge를 프로덕션 환경에서 운영한 경험을 공유합니다.
  Virtual Server를 통한 툴 권한 분리, MCP Catalog, 메트릭 기능 등 핵심 기능을 소개합니다.
pubDate: '2025-12-16'
tags:
- LLMOps
- MCP
- Agent
title: MCP Gateway 추천, mcp-context-forge 사용기
---


## TL;DR

> I think an MCP Gateway is one of the must-have tools for building an Agentic AI platform. If you have too many MCPs to manage, or you keep spinning up duplicate MCP servers, consider adopting the open-source **mcp-context-forge**.

Recently, while working on a project to set up agent infrastructure, I got hands-on with several open-source projects—and I wanted to share that experience in writing.

Building agent infrastructure isn’t just about creating a system that calls an LLM. It means building a sustainable, operable **software platform**. I’d like to introduce some open-source projects that helped me a lot with architecture design, and today is the first post in that series. For the first one, I chose the tool I’m most attached to and use the most. I even contribute to it and rely on it heavily.

That tool is the MCP Gateway open source project [**mcp-context-forge**](https://github.com/IBM/mcp-context-forge). Let’s walk through it step by step.

As of writing, it’s **V1.0.0-BETA-1**.



## Why do you need an MCP Gateway?

Before diving into mcp-context-forge, it’s worth answering: **“Why do you need an MCP Gateway?”** Before adopting one, I think it’s good to ask yourself:

1. Do I have enough MCP servers and tools to manage that I actually need an MCP Gateway?
2. Will agents end up calling the same MCP?

In early-stage or small projects, you might not feel the need for an MCP Gateway. It can even feel like over-engineering because it increases operational surface area and can become a single point of failure.

But once you hit the point where **the number of agents and MCPs grows and the system starts scaling**, the story changes. From then on, the payoff is so strong that the effort of introducing a gateway feels trivial.

The biggest benefit is the MCP Catalog. When everyone says MCP is great and keeps spinning up MCP servers, it becomes critical to know which MCP servers and tools actually exist inside the company.

I’ve personally seen multiple MCP tools created that did the same thing. In that situation, being able to view a list of what MCP servers and tools exist is a huge advantage.


## What is mcp-context-forge?

Now let’s get into mcp-context-forge.

`mcp-context-forge` is an MCP Gateway open-sourced by IBM. It acts as an efficient intermediary as connections between increasingly complex agents and tools become harder to manage.

To be honest, there aren’t many MCP Gateway tools out there. When I was researching, mcp-context-forge and a kgateway + Agentgateway combination looked appealing. But agentgateway felt relatively complex to operate, and I felt it wasn’t mature enough for production use. Also, internally we already use a different gateway stack.

For those reasons, I chose mcp-context-forge. Of course, mcp-context-forge is still pre-GA and does mention that it shouldn’t be used at production level. In my case, I am running it in production, and I haven’t felt any major issues.



### Running it locally

My production environment is Kubernetes, but in this post I’ll use Docker.

Given how many GitHub stars it has, you can test it without much difficulty.

```bash
git clone https://github.com/IBM/mcp-context-forge
docker-compose up 
```

The setup is essentially: Gateway, main DB (postgres or mariadb), Redis, and fast_time_server.  
It’s not a complex architecture, so it’s easy to operate.

There’s also a separate time-related server called fast_time_server. I plan to look into that later. (It doesn’t feel very impactful.)



The startup screen looks like this. You’ll see a colorful UI, and you can connect SSO if needed, which provides useful login capabilities.

The default email address and password are `admin@example.com`, `changeme`.

![image-20251218010740484](/img/mcp-context-forge/image-20251218010740484.png)



After logging in, you’ll see the following screen. I’ve been watching this project since v0.8, and looking at v1.0.0-BETA-1 now, you can really feel how much the design has evolved.

![image-20251219001536178](/img/mcp-context-forge/image-20251219001536178.png)

If you look at the sidebar, there are various options:

- MCP Servers: In mcp-context-forge this is called “Gateway,” but you can think of it as an MCP Server. When you register one, the tools, prompts, and resources on that MCP server are automatically registered.
- Virtual Servers: I think this is mcp-context-forge’s core feature. You can create a “virtual” gateway and select the tools, prompts, and resources you need, then use it like a regular MCP server. It’s a useful way to configure tools per agent and isolate tool permissions.
- Tools, Prompts, Resources: Same concepts as MCP defines.
- Roots: I’m not sure what this does... I’ve never used it. It looks like it might let you pull content from server storage, but I’m not sure.
- MCP Registry: mcp-context-forge runs a registry you can register from easily. You can add a registry you like with one click.
- Agents: You can register agents in addition to MCP servers.
- Metrics: You can view mcp-context-forge metrics. You can see which tools are called the most, when they were last used, and identify unused tools.
- Teams / Users: You can manage permissions for mcp-context-forge users.



![image-20251219001059140](/img/mcp-context-forge/image-20251219001059140.png)

The screen above is the MCP Registry. If you “Add Server” for a few items for testing, you’ll see them get registered like in the screenshot below.

Of course, for most tools, adding the server isn’t the end—you still need to configure whatever authentication each server requires.



![image-20251219001727809](/img/mcp-context-forge/image-20251219001727809.png)

The screen above shows what gets created when you register GitHub.



![image-20251219002025981](/img/mcp-context-forge/image-20251219002025981.png)

In addition to GitHub, I registered a few registries for testing. Once setup is complete, you can browse the tools owned by each MCP server under Tools.



![image-20251219002100211](/img/mcp-context-forge/image-20251219002100211.png)

As shown above, you can test a registered tool.



![image-20251219002139585](/img/mcp-context-forge/image-20251219002139585.png)

Above is the Virtual Servers view, which I emphasized as the most important feature. As you can see, you can select the MCP servers and the Tools / Resources / Prompts you want.



![image-20251219002209987](/img/mcp-context-forge/image-20251219002209987.png)

When you select a Virtual Server, you can confirm it gets created like above.



![image-20251219002222560](/img/mcp-context-forge/image-20251219002222560.png)

If you view Config, you can choose from options like the above. It supports Stdio, SSE, and HTTP, so there’s no issue using MCP.



![image-20251219002234945](/img/mcp-context-forge/image-20251219002234945.png)

The screen above is an SSE example, and it shows a familiar MCP registration config. If you look at headers, you can see it requires a Bearer token. mcp-context-forge uses tokens to control access.



![image-20251219002305321](/img/mcp-context-forge/image-20251219002305321.png)

The token settings screen looks like this. For each token, you can specify which Virtual Servers it can access. There’s also an option to restrict by IP, but I haven’t used it. You can also assign permissions, but I haven’t used that either—normally I just limit each agent to only the tools it needs.

Now I’ll wrap up by summarizing mcp-context-forge’s pros and cons.

## Pros

The biggest advantage is acting as an MCP Catalog. You can see at a glance which MCP servers and tools exist within the company, helping prevent duplicate MCP servers from being created. It also helps cross-team collaboration because you can answer “Do we have a tool for this?” immediately.

Permission isolation through Virtual Servers is also compelling. You can restrict each agent to only the tools it needs, which prevents unnecessary tool calls and is reassuring from a security perspective. The metrics feature also makes it easy to understand which tools are actually being used versus which ones are neglected.

The simplicity of the architecture is another plus. You can run it with just PostgreSQL or MariaDB plus Redis, so the operational burden is low. Because it supports Stdio, SSE, and HTTP, there are no compatibility issues with existing MCP clients.

## Cons

I didn’t really feel major functional drawbacks. If I had to pick one, it’s that it’s still beta, so some features are not implemented yet.

Also, compared to connecting directly from an agent to an MCP, it looks like there are a few authentication methods that aren’t supported. In my case, I tried connecting using FastMCP Client and failed, so I switched to the mcp library. This may already be resolved now.

Also, because it’s a gateway, you should consider that it can become a Single Point of Failure (SPOF). That said, this is a common characteristic of all gateways.

## Closing thoughts

Once you start accumulating MCP servers and tools, an MCP Gateway becomes essential infrastructure. mcp-context-forge is still in beta, but based on running it in a real production environment, it worked reliably without major issues.

Most importantly, it’s open-sourced by IBM and actively developed. I use it while contributing, and issue response tends to be fast.

If you’re considering adopting an MCP Gateway, I recommend taking a look at mcp-context-forge.

## References

- [mcp-context-forge GitHub](https://github.com/IBM/mcp-context-forge)
- [mcp-context-forge Official Documentation](https://ibm.github.io/mcp-context-forge/)