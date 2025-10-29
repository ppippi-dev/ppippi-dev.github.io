---
date: 2025-10-20
order: 1
subtitle: ''
title: 1. Introduction to ADK
---


Recently, a variety of agent development tools have emerged. Among them, I’m paying the most attention to Google’s **ADK (Agent Development Kit)**. The fact that it was announced by Google drew my interest, but there are several other standout aspects.

As its name suggests, ADK is an “agent development kit,” but it goes beyond a simple SDK by providing a **standardized agent development framework** based on the **A2A (Agent to Agent)** protocol. That’s what I find most compelling. It lets developers design and deploy agents in a standardized way without having to implement complex inter-agent communication logic themselves.

Today’s AI agent ecosystem is crowded with frameworks. There are countless tools like LangChain, AutoGen, Agno, Swarm(OpenAI Agent SDK), and CrewAI, and even no-code tools like n8n. Personally, aside from specialized tools like Agno, many of them feel similar. In this situation, I tend to choose open source with strong community and sponsorship.

If I had to pick one difference between ADK and other frameworks, it would be that **ADK focuses on standardizing agent-to-agent communication and interaction (A2A)**. This clearly reflects Google’s vision of efficiently handling complex tasks through multi-agent systems.

In other words, **ADK isn’t just another agent development tool; it’s differentiated by providing an infrastructure-level standard that enables multiple agents to collaborate.**

ADK’s core philosophy is clear — **“Standardize collaboration between AI agents.”**

Other agent systems are closed, working only within their own frameworks. Many support multi-agent setups inside their own systems. But ADK extends this into an environment where **all agents can communicate in a common language, like HTTP on the internet**.

> Note: Strictly speaking, ADK and the A2A protocol are different concepts. I’ll cover this in a later chapter.

Thanks to ADK and A2A, agents built by different teams or organizations can be easily integrated through the same protocol. That’s why ADK stands out among so many tools. It could enable agent governance where each team builds and manages its own agents well.

Of course, how the agent market will evolve is still uncertain. But if you understand the core ideas of ADK and A2A, other agent frameworks become much easier to approach.

Enough preamble. Now I’m going to test ADK step by step and explore its strengths and limitations.

In the next post, we’ll set up the ADK development environment and build the first agent.