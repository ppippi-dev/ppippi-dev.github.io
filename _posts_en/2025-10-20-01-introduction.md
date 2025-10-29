---
date: 2025-10-20
order: 1
subtitle: ''
title: 1. Introduction to ADK
---


A wave of agent development tools has appeared lately. Among them, I’m paying the most attention to Google’s **ADK (Agent Development Kit)**. The fact that it’s from Google drew me in, but there’s a lot more that stands out.

As its name suggests, ADK is an “agent development kit,” but it goes beyond a simple SDK to provide a **standardized agent development framework** based on the **A2A (Agent to Agent)** protocol. That’s the part I’m most focused on. It lets developers design and deploy agents in a standardized way without hand-rolling complex inter-agent communication logic.

Today’s AI agent ecosystem is crowded with frameworks—LangChain, AutoGen, Agno, Swarm (OpenAI Agent SDK), CrewAI, and even no-code tools like n8n. Personally, aside from special-purpose tools like Agno, most of them feel similar. In that landscape, I gravitate toward open source with strong communities and sponsors.

If I had to pick one key difference, it’s that **ADK focuses on standardizing communication and interaction between agents (A2A)**. This clearly reflects Google’s vision of handling complex tasks efficiently through multi-agent systems.

In short, **ADK isn’t just another agent dev tool; it’s differentiated by offering infrastructure-level standards that let multiple agents collaborate.**


ADK’s core philosophy is clear — **“Standardize collaboration among AI agents.”**

Most other agent systems are closed, working only within their own frameworks. Many support multi-agent setups inside their own ecosystem. ADK instead expands this into an environment where all agents can communicate in a common language—much like HTTP on the internet.

> Note: Strictly speaking, ADK and the A2A protocol are different concepts. I’ll cover this in a later chapter.

Thanks to ADK and A2A, agents built by different teams or organizations can be integrated easily through the same protocol. That’s why ADK stands out among so many tools. It makes me think we could establish agent governance where each team builds and manages its own agents well.

Of course, how the agent market will evolve remains uncertain. But if you grasp the core ideas behind ADK and A2A, I think other agent frameworks become much easier to approach.

That’s enough preface. Now I’ll start testing ADK in earnest and explore its strengths and limitations.

In the next post, I’ll set up the ADK development environment and build the first agent.