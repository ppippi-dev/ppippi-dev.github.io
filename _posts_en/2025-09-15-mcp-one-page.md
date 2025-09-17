---
feature-img: assets/img/2025-09-15-mcp-one-page/0.png
layout: post
subtitle: Implementing MCP
tags:
- LLMOps
title: MCP - Model Context Protocol
---


In November 2024, Anthropic open-sourced MCP (Model Context Protocol) in Claude. Right after launch, I kept getting asked “Have you tried MCP?” and heard “Once you use it, it’s really convenient.”

Honestly, it didn’t impress me at first. It didn’t look that different from OpenAI Function Calling, and there were already plenty of ways to extend LLMs. But within just a few months, MCP was quickly integrated into products from major players like OpenAI and Google, becoming a de facto standard candidate. A good example is that you can now [register MCP directly in the ChatGPT UI as a beta feature](https://platform.openai.com/docs/guides/developer-mode).

In this post, I’ll implement MCP myself.

## Why revisit MCP

First, let’s see how MCP differs from OpenAI/Gemini connectors or Function Calling.

- Standardized interface: Function Calling specs differ by platform, whereas MCP provides a JSON-RPC–based common contract, so multiple LLMs/agents can connect to the same server.
- Vendor neutrality: Being open source first, the ecosystem grew fast. Cursor, Claude, OpenAI, Gemini, and more can share one server implementation.
- Tool/Resource/Prompt management: Beyond simple API calls, servers can declaratively manage the resources and prompts an agent should reference.
- Local/remote transport options: From STDIO to SSE, it supports multiple transports, so you can scale from local experiments to SaaS with the same codebase.

Thanks to these strengths, MCP has become less “another take on Function Calling” and more like a standard port for agent architectures. Let’s look at how it’s structured and how it actually works.



### MCP (Model Context Protocol)

Claude introduces MCP as an “[open standard for connecting AI apps to external systems](https://modelcontextprotocol.io/docs/getting-started/intro).”

You’ll often see the phrase “Think of MCP like a USB‑C port for AI applications.” In other words, MCP is the protocol that connects AI apps to external systems.

Compared to Function Calling, which follows a vendor-defined JSON schema, MCP standardizes the full flow: connection, initialization, tool listing, and resource access. Servers can expect “the same handshake regardless of the client,” and clients can discover (list) and invoke functions based on descriptions.



![img](/assets/img/2025-09-15-mcp-one-page/mcp-simple-diagram.png)



A simple example: asking GPT to fetch today’s calendar events.

Without MCP, GPT can’t do it on its own. With MCP, it can call an API that reads the calendar and retrieve the data. While Function Calling could also make this work, MCP, as an open protocol, lets both GPT and Gemini call the same capability—effectively a shared standard.

I usually [register MCP servers in Cursor](https://docs.cursor.com/en/context/mcp) and use them there.



## Quick look at MCP terminology

Let’s keep the terminology lightweight.



### Participants

MCP has two main roles: Client and Server. MCP docs also mention an MCP Host—think of it as an app like Cursor that manages multiple clients.

![image-20250916001157470](/assets/img/2025-09-15-mcp-one-page/image-20250916001157470.png)

Client and server roles:

- Client: LLM apps/agents/IDEs, etc. They connect to an MCP server to use its capabilities and resources.
- Server: Wraps external systems and exposes them via the MCP interface. Examples: calendars, issue trackers, databases, filesystems.

Notably, MCP recommends a 1:1 client–server session.

An MCP server can run locally or remotely. Locally, it uses STDIO transport and runs on the same machine as the client—this is a local MCP.

If it runs on an external platform and connects over SSE, that’s a remote MCP server.



### Layers

There are two major layers: Data Layer and Transport Layer.

The Data Layer defines the JSON-RPC–based client–server protocol, lifecycle, and core primitives like tools, resources, prompts, and notifications. When building an MCP server, you’ll frequently work with tools/resources/prompts—more on these later.

The Transport Layer handles connection setup per transport, message framing, and authentication to ensure data can flow. This is where you choose between STDIO (Standard Input/Output), SSE (Server-Sent Events), etc.

See [MCP Docs Architecture](https://modelcontextprotocol.io/docs/learn/architecture) for details. This post focuses on hands-on work; we’ll keep it at that and dive into code.



## Setup

To follow along, you’ll need:

- Python 3.11+ and a virtual env via uv (or pip)
- Libraries used in the examples: fastmcp, openai, yfinance, etc.
- An OpenAI API key (only if you want to try the LLM calls; client–server interactions work without it)



## Let’s look at it in code

The theory can feel abstract, so let’s walk through code.

We’ll start with the MCP server. I migrated a stock price lookup I’ve used before to an MCP-based server.

With Python’s FastMCP library, you can spin up a server quickly. Create a FastMCP instance, then register features with the @mcp.tool decorator.

```python
from mcp.server.fastmcp import FastMCP

# MCP server instance
mcp = FastMCP(
    name="stock-mcp",
)

```



### Tools

Tools belong to the Data Layer and are what you’ll use most on the server.

The basic pattern: define a normal Python function and expose it with @mcp.tool. Provide a name and description so the client can read metadata via list_tools and know what inputs to provide.

```python
# ===== Tools =====
@mcp.tool("change_hello_to_hi", description="Change Hello to Hi.")
def change_hello_to_hi(args: dict[str, Any]) -> dict[str, Any]:
    text = args.get("text", "")
    return {"output": text.replace("Hello", "Hi")}
```

We accept args as a dict because it’s serialized directly into JSON-RPC messages. If you add type hints, FastMCP auto-generates a JSON Schema to tell agents which fields are required. Pydantic works nicely here, but for the example we’ll stick to a simple dict.


Now a more practical example.

Below, we fetch stock info for a given ticker using yfinance.

```python
# mcp_simple_stdio/mcp_server.py

# ===== Tools =====
@mcp.tool("get_stock_price", description="Look up stock data from Yahoo Finance.")
def get_stock_price(args: dict[str, Any]) -> dict[str, Any]:
    try:
        ticker_symbol = args.get("ticker")
        if not ticker_symbol:
            return {"success": False, "error": "ticker is required"}

        info: dict[str, Any] = yf.Ticker(ticker_symbol).info  # type: ignore

        current_price = info.get("currentPrice")
        previous_close = info.get("previousClose")
        company_name = info.get("longName", ticker_symbol)

        if current_price is not None and previous_close is not None:
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100 if previous_close else 0.0
            change_str = f"{change:.2f} ({change_percent:.2f}%)"
        else:
            change_str = None

        return {
            "success": True,
            "company_name": company_name,
            "ticker": ticker_symbol,
            "current_price": current_price,
            "previous_close": previous_close,
            "change": change_str,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    
```

It may feel abrupt to jump to client code, but this shows connecting to the MCP server over STDIO and initializing. Focus on session.call_tool.

```python
# mcp_simple_stdio/mcp_client.py
async def main() -> None:
    """Run the server over stdio and execute a basic interaction demo."""
    server_params = StdioServerParameters(
        command="python",
        args=["./mcp_simple_stdio/mcp_server.py"],
        env=dict(os.environ),
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            result = await session.call_tool(
                "get_stock_price",
                {"args": {"ticker": "005930.KS"}},
            )
            print(result.content)

```

Running that prints logs like:

```shell
[TextContent(type='text', text='{\n  "success": true,\n  "company_name": "Samsung Electronics Co., Ltd.",\n  "ticker": "005930.KS",\n  "current_price": 78200.0,\n  "previous_close": 79400.0,\n  "change": "-1200.00 (-1.51%)"\n}', annotations=None, meta=None)]
```

Flow recap:
- ClientSession.initialize() negotiates protocol versions and retrieves server capabilities (tools/resources/prompts).
- session.call_tool() sends a JSON-RPC call_tool request; the server responds wrapped in standard types like TextContent.
- The ListToolsRequest you see in logs is issued automatically by FastMCP early in the session to cache the available tools.

In short, the client receives standardized results from whatever functions the MCP server exposes.

That looked like a plain function call; here’s how it looks when you involve an LLM:



```python
async def main() -> None:
    """Run the server over stdio and execute a basic interaction demo."""
    server_params = StdioServerParameters(
        command="python",
        args=["./mcp_simple_stdio/mcp_server.py"],
        env=dict(os.environ),
    )

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            QUESTION = "How much is the stock price of Samsung Electronics?"

            tools = await session.list_tools()

            PROMPT_MESSAGE = f"""
            You can call tools to get Answer for this question: {QUESTION},
            tools: {tools},
            What you should do is call tools to get Answer for this question. 
            Choose Only One Tool to call. Just Return the Tool Name.
            If you don't know the answer, return 'None'
            """

            print("PROMPT_MESSAGE: ", PROMPT_MESSAGE)
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": PROMPT_MESSAGE,
                    }
                ],
            )
            print("GPT Response: ", response.choices[0].message.content)

            if response.choices[0].message.content != "None":
                result = await session.call_tool(
                    response.choices[0].message.content,
                    {"args": {"ticker": "005930.KS"}},
                )
                print(result.content)

```

Suppose the question is “How much is the stock price of Samsung Electronics?”

MCP provides an API to list tools. I added a test-only fake_function alongside the real one.

We first list the tools, include them in the prompt, and have the model pick the one needed to answer the question.

GPT chooses get_stock_price and we execute it. (Argument inference is omitted to keep the code short.)

Logs:

```shell
PROMPT_MESSAGE:  
            You can call tools to get Answer for this question: How much is the stock price of Samsung Electronics?,
            tools: meta=None nextCursor=None tools=[Tool(name='get_stock_price', title=None, description='Look up stock data from Yahoo Finance.', inputSchema={'properties': {'args': {'additionalProperties': True, 'title': 'Args', 'type': 'object'}}, 'required': ['args'], 'title': 'get_stock_priceArguments', 'type': 'object'}, outputSchema={'additionalProperties': True, 'title': 'get_stock_priceDictOutput', 'type': 'object'}, annotations=None, meta=None), Tool(name='fake_function', title=None, description="Fake function. Don't Call it", inputSchema={'properties': {}, 'title': 'fake_functionArguments', 'type': 'object'}, outputSchema={'additionalProperties': True, 'title': 'fake_functionDictOutput', 'type': 'object'}, annotations=None, meta=None)],
            What you should do is call tools to get Answer for this question. 
            Choose Only One Tool to call. Just Return the Tool Name.
            If you don't know the answer, return 'None'
            
GPT Response:  get_stock_price

```

You can handcraft prompts, but in production, frameworks often handle “tool selection → argument construction → result interpretation” for you. Still, it’s worth experiencing the low-level flow once to see what messages are exchanged and what exceptions you get on failure.

You also don’t have to build the LLM loop yourself. As I’ll briefly note at the end, OpenAI SDK and Google ADK include MCP integrations that make this much simpler.



Now let’s look at Resources.



### Resource

```python
# ===== Resources =====
@mcp.resource("file://help.md", description="Server usage guide and available tools")
def help_resource() -> str:
    return (
        "# stock-mcp Help\n\n"
        "- get_stock_price(ticker): Look up a Yahoo Finance ticker (e.g., 005930.KS)\n"
        "- prompts:\n"
        "  - extract-stock-code: Message template for extracting a 6-digit stock code\n"
        "  - stock-answer: Message template for composing a stock response\n"
        "\n(Invoke the LLM from the client.)\n"
    )
    
```

Resources expose static materials an agent can reference.



```python
async def main() -> None:
    """Run the server over stdio and execute a basic interaction demo."""
    server_params = StdioServerParameters(
        command="python",
        args=["./mcp_simple_stdio/mcp_server.py"],
        env=dict(os.environ),
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            resources = await session.list_resources()
            print("\n[Resources]")
            for r in resources.resources:
                print(f"- {r.uri}: {getattr(r, 'description', '')}")

            for r in resources.resources:
                read_result = await session.read_resource(r.uri)
                print(read_result.contents)
                
```

Like Tools, MCP provides list/read APIs for Resources, and the client calls read_resource with the appropriate URI when needed.



Logs:

```shell
[Resources]
- file://help.md/: Server usage guide and available tools

[TextResourceContents(uri=AnyUrl('file://help.md/'), mimeType='text/plain', meta=None, text='# stock-mcp Help\n\n- get_stock_price(ticker): Look up a Yahoo Finance ticker (e.g., 005930.KS)\n- prompts:\n  - extract-stock-code: Message template for extracting a 6-digit stock code\n  - stock-answer: Message template for composing a stock response\n\n(Invoke the LLM from the client.)\n')]
```



### Prompt

Finally, Prompts let the server define reusable message templates.

If you’ve worked with LLM APIs, this will feel familiar. Store prompts you call repeatedly with different variables on the server, and multiple clients can share the same logic while varying only the inputs. Code first:



```python
@mcp.prompt(
    "extract-stock-code",
    description="Prompt that extracts a 6-digit Korean stock code from the question",
)
def extract_stock_code_prompt(user_input: str) -> dict[str, Any]:
    return {
        "role": "user",
        "content": (
            "Return only the 6-digit stock code mentioned in the question below."
            " For example, '005930'.\n"
            f"Question: {user_input}"
        ),
    }

```

Think of this as managing commonly used LLM prompts on the MCP server.

Why on the server instead of the client? Because tools, resources, and prompts are all managed by the MCP server, and clients “discover” and invoke them consistently. It also centralizes versioning for templates shared across a team.

You can list prompts with list_prompts and, similar to Tools, pass arguments to get the final prompt message.



```python
async def main() -> None:
    """Run the server over stdio and execute a basic interaction demo."""
    server_params = StdioServerParameters(
        command="python",
        args=["./mcp_simple_stdio/mcp_server.py"],
        env=dict(os.environ),
    )

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # extract-stock-code 프롬프트 사용 예시
            prompt_result = await session.get_prompt(
                "extract-stock-code",
                {"user_input": "How much is the stock price of Samsung Electronics?"},
            )
            for msg in getattr(prompt_result, "messages", []) or []:
                print(msg.content)

            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": msg.content.text,
                    }
                ],
            )

            print("GPT Response: ", response.choices[0].message.content)
            
```

Fetch the prompt from the MCP server and pass it straight to the LLM—the server-defined template and your arguments are combined into a final message you can reuse. You can keep complex few-shot examples on the server and have clients only supply variables.

Logs:

```shell
type='text' text="Return only the 6-digit stock code mentioned in the question below. For example, '005930'.\nQuestion: How much is the stock price of Samsung Electronics?" annotations=None meta=None
GPT Response:  005930
```



## Wrap-up

At first glance, the code can look a bit complex.
These days, agent SDKs support MCP, so you can get the same effect with much simpler code, like below:

```python

async def main():
    async with MCPServerStdio(
        params={
            "command": "uv",
            "args": ["run", "-m", "openai_agent_sdk.mcp_server"],
        },
    ) as server:
        agent = Agent(
            name="test",
            instructions="test",
            model=settings.OPENAI_MODEL,
            mcp_servers=[server],
        )

        result = await Runner.run(agent, "삼성전자 주가 얼마야?")
        print(result)

```

The full example I used is in my [GitHub repo](https://github.com/ppippi-dev/LLMOps/tree/main/mcp_test).

As an aside, there are still plenty of security concerns around MCP. Keep this in mind and be especially careful when connecting to remote MCP servers.