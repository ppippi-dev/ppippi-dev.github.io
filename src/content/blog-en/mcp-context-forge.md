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

> I consider an MCP Gateway one of the must-have tools for building an Agentic AI platform. If your MCPs are growing and becoming hard to manage, or you keep spinning up duplicate MCP servers, consider adopting the open-source mcp-context-forge.

Recently, while working on a project to set up agent infrastructure, I got hands-on experience with several open-source tools—and I wanted to share that experience in writing.

Building agent infrastructure isn’t just about creating a system that calls an LLM. It means turning it into an **operationally sustainable software platform**. I want to introduce the open-source tools that helped me a lot with this kind of architecture design, and this is the first post in that series. For the first one, I chose the tool I’m most attached to and use the most. I even use it enough to contribute to it.

That tool is the MCP Gateway open source project, [**mcp-context-forge**](https://github.com/IBM/mcp-context-forge). Let’s walk through it step by step.

As of writing, it’s at V1.0.0-BETA-1.



## Why do you need an MCP Gateway?

Before getting into mcp-context-forge, it’s worth addressing **“Why do you need an MCP Gateway?”**. Before adopting an MCP Gateway, I think it’s good to ask yourself these questions:

1. Do I have enough MCP servers and tools to manage that I actually need an MCP Gateway?
2. Will my agents ever need to call the same MCP?

In the early stage or in small projects, you may not really feel the need for an MCP Gateway. It can even feel like over-engineering because it adds operational surface area and can become a single point of failure.

But once you hit the point where **the number of agents and MCPs grows and the system starts to scale**, the story changes. From then on, the effort required to introduce a gateway pays off massively.

The biggest advantage is the MCP Catalog. In an environment where everyone says MCP is great and keeps spinning up MCP servers, it becomes a real problem to know what MCP servers and tools exist internally.

I’ve also experienced situations where multiple MCP tools with the same functionality were created. In cases like that, being able to view a list of MCP servers and tools is a huge benefit.


## What is mcp-context-forge?

Now let’s dive into mcp-context-forge.

`mcp-context-forge` is an MCP Gateway open-sourced by IBM. It acts as an efficient intermediary for increasingly complex connections between agents and tools.

There honestly aren’t many MCP Gateway tools out there. When I was researching, mcp-context-forge and the kgateway + Agentgateway combo looked attractive. But Agentgateway felt relatively complex to operate, and I felt it wasn’t quite mature enough for production use. Also, internally we were already using a different gateway stack in some areas.

For those reasons, I chose mcp-context-forge. Of course, mcp-context-forge also mentions that it’s not recommended for production use yet since it hasn’t reached a stable release. In my case, I’m running it at production level, and I haven’t felt any major issues.



### Running it

My operating environment is Kubernetes, but in this post I’ll use a Docker-based setup.

Given how many GitHub stars it already has, you can test it without much trouble.

```bash
git clone https://github.com/IBM/mcp-context-forge
docker-compose up 
```

The setup is composed of Gateway, a main DB (postgres or mariadb), Redis, and `fast_time_server`.
It’s not a complicated architecture, so it’s easy to operate.

There’s also a separate time-related server called `fast_time_server`. I’m planning to look into that later. (It doesn’t feel very impactful to me so far.)



The start screen looks like this. You’ll see a colorful UI, and depending on your needs you can also connect SSO—so it provides a useful login experience.

For reference, the default email address and password are `admin@example.com`, `changeme`.

![image-20251218010740484](/img/mcp-context-forge/image-20251218010740484.png)



After logging in, you’ll see a screen like the following. I’ve been watching this project since v0.8, and looking at it now in v1.0.0-BETA-1, I can definitely tell the design has evolved a lot.

![image-20251219001536178](/img/mcp-context-forge/image-20251219001536178.png)

If you look at the sidebar, there are a variety of options:

- MCP Servers: In mcp-context-forge this is referred to as “Gateway,” but you can think of it as an MCP Server. When you register one here, the tools, prompts, and resources in that MCP server are automatically registered.
- Virtual Servers: I consider this the core feature of mcp-context-forge. You can create a “virtual gateway” and select the tools, prompts, and resources you need—and then use it like a normal MCP server. It’s a useful feature for configuring per-agent toolsets and separating tool permissions.
- Tools, Prompts, Resources: Same meaning as defined in MCP.
- Roots: I’m not entirely sure what this does... I’ve never used it. It seems like a feature to use content from server storage, but I’m not sure.
- MCP Registry: mcp-context-forge runs registries you can register easily. You can add a registry you like with one click.
- Agents: You can register not only MCP servers, but also agents.
- Metrics: You can view mcp-context-forge metrics. You can see which tools are called the most, when they were last used, and identify unused tools.
- Teams / Users: You can manage permissions for mcp-context-forge users.



![image-20251219001059140](/img/mcp-context-forge/image-20251219001059140.png)

The screen above is MCP Registry. If you try adding a few servers for testing, you’ll see them registered as shown below.

Of course, for most tools, “Add Server” isn’t the end—you still need to configure whatever authentication each server requires.



![image-20251219001727809](/img/mcp-context-forge/image-20251219001727809.png)

The screen above shows what gets created when you register GitHub.



![image-20251219002025981](/img/mcp-context-forge/image-20251219002025981.png)

In addition to GitHub, I registered a few registries for testing. Once configuration is complete, you can browse the tools provided by the MCP servers under Tools.



![image-20251219002100211](/img/mcp-context-forge/image-20251219002100211.png)

As shown above, you can test a registered tool.



![image-20251219002139585](/img/mcp-context-forge/image-20251219002139585.png)

Above is the Virtual Servers view—the core feature I emphasized earlier. As shown, you can select the MCP Servers and specific Tools / Resources / Prompts you want.



![image-20251219002209987](/img/mcp-context-forge/image-20251219002209987.png)

When you select a Virtual Server, you can confirm it gets created as shown above.



![image-20251219002222560](/img/mcp-context-forge/image-20251219002222560.png)

If you view the config, you can choose as shown above. It supports Stdio, SSE, and HTTP, so there’s no problem using MCP.



![image-20251219002234945](/img/mcp-context-forge/image-20251219002234945.png)

The screen above is an SSE example—this is a familiar MCP registration configuration. If you look at the headers, you can see it requires a Bearer token. mcp-context-forge uses tokens to control access.



![image-20251219002305321](/img/mcp-context-forge/image-20251219002305321.png)

The token configuration screen looks like the above. For each token, you can specify which Virtual Servers it can access. There’s also a feature to restrict by IP, but I haven’t used it. You can also set permissions, but I usually just assign the tools each agent can access, so I haven’t used that either.

Now I’ll wrap up by summarizing mcp-context-forge’s pros and cons.

## Pros

The biggest advantage is its role as an MCP Catalog. You can see at a glance which MCP servers and tools exist in your organization, which helps prevent duplicate MCP servers from being created. It also helps cross-team collaboration—you can quickly answer “Do we have a tool for this?”

Permission isolation via Virtual Servers is also compelling. You can specify only the tools each agent needs, which prevents unnecessary tool calls and is reassuring from a security perspective. The metrics feature also makes it easy to understand which tools are actually being used versus abandoned.

The simple architecture is another plus. You can operate it with just PostgreSQL or MariaDB and Redis, so the operational burden is low. Since it supports Stdio, SSE, and HTTP, you also won’t run into compatibility issues with existing MCP clients.


## Cons

I didn’t feel many functional downsides. If I had to pick one, it’s that it’s still in beta, so there are some unimplemented features.

Also, compared to connecting directly from an agent to an MCP, it seems there are a few authentication methods it doesn’t support. In my case, I tried connecting using the FastMCP Client and it failed, so I remember switching to the `mcp` library. This might be resolved by now.

And since it’s a gateway, you should consider that it can become a Single Point of Failure. But that’s a common characteristic of any gateway.


## Closing thoughts

An MCP Gateway becomes essential infrastructure once your number of MCP servers and tools starts to grow. mcp-context-forge is still in beta, but in my experience operating it in a real production environment, it worked well without major issues.

Most importantly, it’s great that IBM open-sourced it and is actively developing it. I’m using it while contributing to it, and issue response is fairly fast.

If you’re considering adopting an MCP Gateway, I recommend taking a look at mcp-context-forge.



## Reference links

- [mcp-context-forge GitHub](https://github.com/IBM/mcp-context-forge)
- [mcp-context-forge Official Docs](https://ibm.github.io/mcp-context-forge/)