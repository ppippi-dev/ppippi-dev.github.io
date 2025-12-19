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

> I consider an MCP Gateway one of the essential tools for building an Agentic AI platform. If your MCP footprint is growing and getting hard to manage, or you keep spinning up duplicate MCP servers, consider adopting the open-source **mcp-context-forge**.

Recently, while working on a project to set up agent infrastructure, I got to try out several open-source tools—and I wanted to share that experience in writing.

Building agent infrastructure doesn’t just mean creating a system that calls an LLM. It means turning it into an **operable software platform** you can run sustainably. I’d like to introduce some open-source projects that helped a lot with that architecture design, and this is the first one. For the first post, I decided to start with the tool I’m most attached to—and actually use enough that I’ve contributed to it.

That tool is the MCP Gateway open source project [**mcp-context-forge**](https://github.com/IBM/mcp-context-forge). Let’s walk through it step by step.

At the time of writing, it’s at V1.0.0-BETA-1.



## Why Do You Need an MCP Gateway?

Before explaining mcp-context-forge, it’s worth starting with: **“Why do you need an MCP Gateway?”** Before adopting one, I think it’s good to ask yourself:

1. Do I have enough MCP servers/tools to manage that I actually need an MCP Gateway?
2. Will my agents need to call the same MCP?

In early-stage or small projects, the need for an MCP Gateway may not be very obvious. It can even feel like over-engineering because it adds operational overhead and can become a single point of failure.

But once you reach the point where **the number of agents and MCPs grows and the system starts scaling**, the story changes. From that moment on, the effort of introducing a gateway pays off dramatically.

The biggest benefit is the MCP Catalog. When everyone’s excited about MCP and keeps spinning up MCP servers, it becomes a real problem to know what MCP servers and tools exist internally.

I’ve also seen cases where multiple MCP tools with the same functionality were created. In that situation, being able to view a list of what MCP servers and tools exist is a big advantage.


## What Is mcp-context-forge?

Now let’s get into mcp-context-forge.

`mcp-context-forge` is an MCP Gateway open-sourced by IBM. It acts as an efficient intermediary for increasingly complex connections between agents and tools.

To be honest, there aren’t many MCP Gateway tools yet. When I was researching, mcp-context-forge and the kgateway + Agentgateway combination both looked attractive, but Agentgateway felt relatively complex to operate, and I felt it still wasn’t mature enough for production use. We were also already using a different gateway stack internally.

For those reasons, I chose mcp-context-forge. Of course, mcp-context-forge also states that since it hasn’t reached a stable release yet, it should not be used at production level. In my case, I *am* running it in production, and I haven’t experienced any major issues.



### Spinning It Up

My production environment is Kubernetes, but this post will use Docker.

Given how many GitHub stars it has, it’s easy to test without much friction.

```bash
git clone https://github.com/IBM/mcp-context-forge
docker-compose up 
```

The setup is basically Gateway, the main DB (Postgres or MariaDB), Redis, and `fast_time_server`.
It’s not a complicated architecture, so it’s easy to operate.

There’s also a separate time-related server called `fast_time_server`, and I plan to look into it later. (I don’t feel a big difference from it right now.)



The start screen looks like this. You get a colorful UI, and it also provides useful login capabilities—SSO can be integrated if needed.

The default email address and password are `admin@example.com`, `changeme`.

![image-20251218010740484](/img/mcp-context-forge/image-20251218010740484.png)



After logging in, you’ll see a screen like this. I’ve been watching this project since v0.8, and as of v1.0.0-BETA-1, I can really tell the design has evolved a lot.

![image-20251219001536178](/img/mcp-context-forge/image-20251219001536178.png)

If you look at the sidebar, there are many options:

- MCP Servers: In mcp-context-forge, these are referred to as “Gateways,” but you can think of them as MCP servers. When you register one here, its tools, prompts, and resources are automatically registered.
- Virtual Servers: I consider this the core feature of mcp-context-forge. You can create a “virtual gateway” and select the tools, prompts, and resources you need, then use it like a regular MCP server. It’s a useful feature for configuring per-agent tool access and enforcing tool permission separation.
- Tools, Prompts, Resources: Same concepts as in MCP.
- Roots: I’m not sure what this does... I’ve never used it. It looks like it might be a feature to pull content from server storage, but I’m not certain.
- MCP Registry: mcp-context-forge runs registries you can easily add from. You can one-click register a registry you like.
- Agents: You can register agents, not just MCP servers.
- Metrics: You can view mcp-context-forge metrics. You can see which tools are called most often, when they were last used, and which tools aren’t used—helpful for identifying dead/unused tools.
- Teams / Users: You can manage permissions for mcp-context-forge users.



![image-20251219001059140](/img/mcp-context-forge/image-20251219001059140.png)

The screen above shows the MCP Registry. If you click Add Server for a few items for testing, you’ll see them registered like in the image below.

Of course, for most tools, registering the server isn’t the whole story—you still need to configure whatever authentication each server requires.

![image-20251219001727809](/img/mcp-context-forge/image-20251219001727809.png)

When you register GitHub, you can see it created like this:

![image-20251219002025981](/img/mcp-context-forge/image-20251219002025981.png)

I also registered a few other registries for testing. Once setup is complete, you can browse the tools each MCP server provides under Tools.

![image-20251219002100211](/img/mcp-context-forge/image-20251219002100211.png)

You can test a registered tool like in the screen below.

![image-20251219002139585](/img/mcp-context-forge/image-20251219002139585.png)

The screen above is Virtual Servers, which I emphasized as the most important feature. As shown, you can select the MCP Server(s) and Tools / Resources / Prompts you want.

![image-20251219002209987](/img/mcp-context-forge/image-20251219002209987.png)

When you select a Virtual Server, you can confirm it’s created like this:

![image-20251219002222560](/img/mcp-context-forge/image-20251219002222560.png)

If you view Config, you can choose settings like this. It supports Stdio, SSE, and HTTP, so you won’t have problems using MCP.

![image-20251219002234945](/img/mcp-context-forge/image-20251219002234945.png)

The screen above is an SSE example. This is a familiar MCP registration configuration. If you look at the headers, you can see it requires a Bearer token—mcp-context-forge uses tokens to control access.

![image-20251219002305321](/img/mcp-context-forge/image-20251219002305321.png)

The token configuration screen is shown above. For each token, you can specify which Virtual Servers it can access. There’s also an IP restriction feature, though I haven’t used it. You can also set permissions, but I typically just assign the tools each agent can access, so I haven’t used that either.

Now I’ll wrap up by covering the pros and cons of mcp-context-forge.

## Pros

The biggest advantage is its role as an MCP Catalog. You can see what MCP servers and tools exist inside your organization at a glance, which helps prevent duplicate MCP servers from being created. It also makes team collaboration easier—when someone asks “Do we have a tool for this?”, you can answer immediately.

Permission separation through Virtual Servers is also compelling. You can assign only the tools an agent needs, preventing unnecessary tool calls and improving security. The metrics feature makes it easy to understand which tools are actually being used versus which are effectively abandoned.

The simple deployment model is another plus. You can run it with just PostgreSQL (or MariaDB) and Redis, so the operational burden is low. It also supports Stdio, SSE, and HTTP, so there aren’t compatibility issues with existing MCP clients.

## Cons

I didn’t feel any major functional drawbacks. If I had to pick one, it’s that since it’s still in beta, some features aren’t implemented yet.

Also, compared to connecting directly from an agent to an MCP, it seems like a few authentication methods aren’t supported. In my case, I tried connecting using the FastMCP Client and it failed, so I remember switching to the `mcp` library. This may already be resolved now.

And because it’s a gateway, you should consider that it can become a Single Point of Failure. That said, this is a common characteristic of any gateway.

## Conclusion

An MCP Gateway becomes essential infrastructure once your MCP servers and tools start to grow. mcp-context-forge is still in beta, but in my experience running it in a real production environment, it worked well without major issues.

Most importantly, it’s open-sourced by IBM and actively being developed. I’m using it while contributing, and issue turnaround is fairly fast.

If you’re considering adopting an MCP Gateway, I recommend taking a look at mcp-context-forge.

## References

- [mcp-context-forge GitHub](https://github.com/IBM/mcp-context-forge)
- [mcp-context-forge Documentation](https://ibm.github.io/mcp-context-forge/)