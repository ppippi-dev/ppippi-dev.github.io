---
description: Hands-on experience running IBM’s open-source MCP Gateway, mcp-context-forge,
  in production—covering Virtual Server-based tool access control, the MCP Catalog,
  and metrics.
pubDate: '2025-12-16'
tags:
- LLMOps
- MCP
- Agent
title: 'MCP Gateway Review: Running mcp-context-forge in Prod'
---

## TL;DR

> I consider an MCP Gateway one of the must-have tools for building an Agentic AI platform. If your number of MCPs is growing and getting hard to manage, or if you keep spinning up duplicate MCP servers, consider adopting the open-source `mcp-context-forge`.

Recently, while working on a project to set up Agent infrastructure, I got hands-on experience with several open-source projects—and I wanted to share that experience in writing.

Building Agent infrastructure isn’t just about creating a system that calls an LLM. It means turning it into an **operable software platform** that can be run sustainably. I’d like to introduce some open-source projects that helped a lot with architectural design—and this is the first post in that series. I decided to start with the tool I’m most attached to. I use it heavily, and I’ve even contributed to it.

It’s the MCP Gateway open source project [**mcp-context-forge**](https://github.com/IBM/mcp-context-forge). Let’s walk through it step by step.

At the time of writing, it’s V1.0.0-BETA-1.



## Why do you need an MCP Gateway?

Before explaining `mcp-context-forge`, it’s worth answering: **“Why do you need an MCP Gateway?”** Before adopting one, I think it’s good to ask:

1. Do I have enough MCP servers and tools to manage that I actually need an MCP Gateway?
2. Will Agents ever need to call the same MCP?

In early-stage or small projects, you may not feel the need for an MCP Gateway. It can even feel like over-engineering since it adds operational overhead and can become a single point of failure.

But once you hit the point where **the number of Agents and MCPs grows and the system starts to scale**, the story changes. From there on, the effort of introducing a Gateway pays off massively.

The biggest benefit is the MCP Catalog. When everyone is excited about MCP and keeps spinning up MCP servers, it becomes a real problem to understand what MCP servers and tools actually exist inside the company.

I’ve personally seen multiple MCP tools get created that all do the same thing. In that situation, simply being able to see a list of existing MCP servers and tools is a big win.


## What is mcp-context-forge?

Now let’s get into `mcp-context-forge`.

`mcp-context-forge` is an MCP Gateway open-sourced by IBM. It acts as an intermediary that efficiently manages increasingly complex connections between Agents and tools.

To be honest, there aren’t many MCP Gateway tools yet. When I was researching, `mcp-context-forge` and the `kgateway` + `Agentgateway` combination looked attractive. But `Agentgateway` felt relatively complex to operate, and I felt its completeness wasn’t quite there for production use. Also, we already use a different gateway stack internally.

For those reasons, I chose `mcp-context-forge`. Of course, `mcp-context-forge` also says not to use it at the production level since it hasn’t reached an official release yet. In my case, I am using it in production, and I haven’t felt any major issues.



### Running it

My production environment is Kubernetes, but in this post I’ll use Docker.

Given how many GitHub stars it already has, you can test it without much trouble.

```bash
git clone https://github.com/IBM/mcp-context-forge
docker-compose up 
```

The setup is basically composed of the Gateway, the main DB (postgres or mariadb), Redis, and `fast_time_server`.
It’s not a complex architecture, so it’s easy to run.

There’s a separate time-related server called `fast_time_server`, and I plan to look into it later. (It’s not something you strongly feel in practice.)



The landing page looks like this. You’ll see a colorful UI, and it also supports SSO depending on your needs—so it provides a useful login experience.

The default email address and password are set to `admin@example.com`, `changeme`.

![image-20251218010740484](/img/mcp-context-forge/image-20251218010740484.png)



After logging in, you’ll see a screen like this. I’ve been watching this project since v0.8, and as of v1.0.0-BETA-1, you can really feel how much the design has evolved.

![image-20251219001536178](/img/mcp-context-forge/image-20251219001536178.png)

Looking at the sidebar, there are various options:

- MCP Servers: In `mcp-context-forge`, these are referred to as “Gateways,” but you can think of them as MCP Servers. When you register one here, the tools, prompts, and resources in that MCP server are automatically registered.
- Virtual Servers: I consider this the core feature of `mcp-context-forge`. You can create a virtual gateway and select the tools, prompts, and resources you need, and then use it like a regular MCP server. It’s a very useful feature for configuring per-agent tools and separating tool permissions.
- Tools, Prompts, Resources: Same as what MCP describes.
- Roots: I’m not really sure what it does... I’ve never used it. It seems like a feature to pull in content from server storage, but I’m not sure.
- MCP Registry: `mcp-context-forge` runs a registry you can register from easily. You can one-click register a registry you like.
- Agents: You can register not only MCP servers, but also Agents.
- Metrics: You can view `mcp-context-forge` metrics. You can see which tools are called a lot, when the most recent call was, and identify unused tools.
- Teams / Users: You can manage permissions for `mcp-context-forge` users.



![image-20251219001059140](/img/mcp-context-forge/image-20251219001059140.png)

The screen above is the MCP Registry. If you try “Add Server” for a few items for testing, you’ll see them registered like in the screenshot below.

Of course, for most tools, “Add Server” isn’t the end—you still need to configure whatever authentication each server requires.



![image-20251219001727809](/img/mcp-context-forge/image-20251219001727809.png)

The screen above shows what gets created when you register GitHub.

![image-20251219002025981](/img/mcp-context-forge/image-20251219002025981.png)

Besides GitHub, I registered a few registries as a test. Once configuration is complete, you can browse the tools provided by the MCP servers under Tools.



![image-20251219002100211](/img/mcp-context-forge/image-20251219002100211.png)

As shown above, you can test a registered Tool.

![image-20251219002139585](/img/mcp-context-forge/image-20251219002139585.png)

Above is the Virtual Servers view, which I emphasized as the most important feature. As shown, you can select the MCP Server you want and pick Tools / Resources / Prompts.



![image-20251219002209987](/img/mcp-context-forge/image-20251219002209987.png)

When you select a Virtual Server, you can confirm it gets created as shown above.

![image-20251219002222560](/img/mcp-context-forge/image-20251219002222560.png)

If you view Config, you can choose options like above. It supports Stdio, SSE, and HTTP, so there’s no problem using MCP.

![image-20251219002234945](/img/mcp-context-forge/image-20251219002234945.png)

The screen above is an example using SSE. This is a familiar MCP registration configuration. If you look at the headers, you can see it requires a Bearer token—and `mcp-context-forge` uses tokens to control authorization.

![image-20251219002305321](/img/mcp-context-forge/image-20251219002305321.png)

The token configuration screen looks like the above. For each token, you can specify which Virtual Servers it can access. There’s also a feature to restrict by IP, but I haven’t used it. You can set permissions as well, but in most cases I just specify which tools each Agent can access, so I haven’t used that either.

Now I’ll wrap up by summarizing the pros and cons of `mcp-context-forge`.

## Pros

The biggest advantage is its role as an MCP Catalog. You can see at a glance what MCP servers and tools exist in your organization, which helps prevent duplicate MCP servers from being created. It also improves cross-team collaboration—when someone asks “Do we have a tool for this?”, you can answer immediately.

Permission separation via Virtual Servers is also compelling. You can specify only the tools each Agent needs, which prevents unnecessary tool calls and improves security confidence. The metrics feature makes it easy to see which tools are actually being used versus which ones are effectively abandoned.

The simple architecture is another advantage. You can run it with just PostgreSQL or MariaDB plus Redis, so the operational burden is low. It also supports Stdio, SSE, and HTTP, so you shouldn’t run into compatibility issues with existing MCP clients.


## Cons

I honestly didn’t feel major functional downsides. If I had to pick one, it’s that it’s still beta, so there are features that aren’t implemented yet.

Also, compared to connecting directly from an Agent to an MCP, it seems like some authentication methods aren’t supported. In my case, I tried connecting using the FastMCP Client and failed, so I switched to the `mcp` library. This might be resolved by now.

And because it’s a Gateway, you do need to consider that it can become a Single Point of Failure. That said, this is a common trait of all Gateways.


## Conclusion

Once your number of MCP servers and tools starts growing, an MCP Gateway becomes essential infrastructure. `mcp-context-forge` is still in beta, but from running it in a real production environment, it worked well without major issues.

Most importantly, it’s great that IBM open-sourced it and is actively developing it. I’m using it while contributing, and issue response tends to be fast.

If you’re considering adopting an MCP Gateway, I recommend taking a look at `mcp-context-forge`.


## Reference Links

- [mcp-context-forge GitHub](https://github.com/IBM/mcp-context-forge)
- [mcp-context-forge Official Docs](https://ibm.github.io/mcp-context-forge/)