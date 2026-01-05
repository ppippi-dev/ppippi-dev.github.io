---
description: Implementing MCP
heroImage: /img/2025-09-15-mcp-one-page/0.png
pubDate: '2025-09-15'
tags:
- LLMOps
title: MCP - Model Context Protocol
---


In November 2024, Anthropic open-sourced MCP (Model Context Protocol) from Claude. Right after launch, I kept hearing “Have you tried MCP?” and “It’s super convenient once you use it.”

Honestly, at first I wasn’t impressed. It didn’t look very different from OpenAI or Gemini Function Calling, and there were already plenty of tools to extend LLMs. But within just a few months, MCP was rapidly integrated into products from major players like OpenAI and Google, becoming a de facto standard candidate. A good example: you can now [register an MCP directly in the ChatGPT UI as a beta feature](https://platform.openai.com/docs/guides/developer-mode). Many agent docs now include MCP tutorials as well.

In this post, we’ll implement a simple MCP server and client.



## Why I took another look at MCP

First, how does MCP differ from OpenAI/Gemini connectors or Function Calling?

- Standardized interface: Function Calling specs vary by platform, but MCP provides a shared JSON-RPC-based convention so multiple LLMs/agents can connect to the same server.
- Vendor-neutral: Being open source accelerated ecosystem growth. Clients like Cursor, Claude, OpenAI, and Gemini can all share one server implementation.
- Tools, resources, and prompt management: Beyond plain API calls, the server can declaratively expose resources and prompts for the agent to use.
- Local and remote transport options: It supports multiple transports, from STDIO to SSE, so you can scale from local experiments to SaaS with the same codebase.

Thanks to these strengths, MCP isn’t just “another Function Calling flavor.” It’s closer to a standard port for agent architectures. Let’s see how it’s structured and how it works in practice.



### MCP (Model Context Protocol)

Claude introduces MCP as an “[open-source standard for connecting AI applications to external systems](https://modelcontextprotocol.io/docs/getting-started/intro).”

You’ll also see the familiar analogy: “Think of MCP as a USB-C port for AI applications.” In short, MCP is a protocol that connects AI apps to external systems.

Compared to Function Calling, instead of following a single vendor’s JSON schema, MCP standardizes the full flow: connect, initialize, list tools, access resources, etc. Servers can expect the same handshake from any client, and clients can discover features via List and call them using their Description.



![img](/img/2025-09-15-mcp-one-page/mcp-simple-diagram.webp)



A simple example: ask GPT to fetch today’s calendar events.

Without MCP, GPT can’t do that on its own. With MCP, it can call a calendar API and fetch the data. Sure, Function Calling can also do this, but MCP is an open protocol you can set up so both GPT and Gemini can call the same server—a true cross-vendor standard.



## Key MCP terms

Let’s keep terminology light and just cover the essentials.



### Participants

MCP has two main roles: Client and Server. MCP Docs also mention an MCP Host, which you can think of as an app like Cursor that manages multiple clients.

![image-20250916001157470](/img/2025-09-15-mcp-one-page/image-20250916001157470.webp)

Roles:

- Client: LLM apps/agents/IDEs, etc. They connect to MCP servers to use capabilities and resources.
- Server: Wraps external systems and exposes them via the MCP interface. Examples: calendar, issue tracker, database, filesystem.

Note that MCP recommends a 1:1 session between client and server.

An MCP server can connect locally or remotely. Locally, it uses STDIO and runs on the same OS as the client—this is a local MCP. If it runs on an external platform and connects over SSE, it becomes a remote MCP server communicating over the network.



### Layers

There are two major layers: Data Layer and Transport Layer.

The Data Layer defines the JSON-RPC-based client–server protocol and lifecycle, plus core primitives like tools, resources, prompts, and notifications. When building an MCP server, you’ll often work with tools, resources, and prompts—we’ll dig into those shortly.

The Transport Layer handles the connection method, message framing, and authentication so data can flow: e.g., STDIO (standard input/output) or SSE (server-sent events).

For details, see the [MCP Docs Architecture](https://modelcontextprotocol.io/docs/learn/architecture). We’ll focus on hands-on practice here and revisit specifics in code.



## Environment

To follow along, you’ll need:

- Python 3.11+ and a virtualenv via uv (or pip)
- Libraries used in the examples: fastmcp, openai, yfinance, etc.
- OpenAI API key (for LLM calls; not required to test client–server interaction)



## Let’s look at code

The theory can be abstract—walking through code helps. We’ll start with the MCP server. I ported a stock price lookup I’ve used before to MCP.

With Python’s FastMCP, you can spin up a server quickly. Instantiate FastMCP and register functions with @mcp.tool.

```python
from mcp.server.fastmcp import FastMCP

# MCP server instance
mcp = FastMCP(
    name="stock-mcp",
)
```



### Tools

Tools belong to the Data Layer and are the part you’ll use most on the server.

The basic pattern: define a normal Python function and expose it with @mcp.tool. If you include a name and description, clients can read the metadata via list_tools to learn what inputs to provide.

```python
# ===== Tools =====
@mcp.tool("change_hello_to_hi", description="Change Hello to Hi.")
def change_hello_to_hi(args: dict[str, Any]) -> dict[str, Any]:
    text = args.get("text", "")
    return {"output": text.replace("Hello", "Hi")}
```

args is a dict so it can serialize directly to/from JSON-RPC messages. With type hints, FastMCP can auto-generate a JSON Schema to tell agents which fields are required. You could use Pydantic here, but we’ll keep it to a simple dict in the example.

A more practical example: fetch stock info for an input ticker using yfinance.

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

You’ll now see some client code: it connects to the MCP server over STDIO and initializes the session. Focus on session.call_tool.

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

Running this prints something like:

```shell
[TextContent(type='text', text='{\n  "success": true,\n  "company_name": "Samsung Electronics Co., Ltd.",\n  "ticker": "005930.KS",\n  "current_price": 78200.0,\n  "previous_close": 79400.0,\n  "change": "-1200.00 (-1.51%)"\n}', annotations=None, meta=None)]
```

Flow recap:
- ClientSession.initialize() negotiates protocol version and fetches available tools/resources/prompts.
- session.call_tool() sends a JSON-RPC call_tool request; the server responds with a standardized content type like TextContent.
- The ListToolsRequest you see in logs is auto-invoked by FastMCP to cache tools at session start.

In short, the client receives a standardized response based on the server’s functions.

So far this looks like a direct function call. Here’s how it looks when you have an LLM select and call the tool:



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

Suppose the question is: “How much is the stock price of Samsung Electronics?”

MCP provides an API to list tools. I added a fake_function for testing alongside the real function. We list tools, feed them into the prompt, and ask the model to pick exactly one tool for the question.

GPT chooses get_stock_price and we call it. (Argument inference is omitted to keep code short.)

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

You can handcraft prompts, but in production a framework often handles “tool selection → argument creation → result interpretation.” Still, it’s worth experiencing the low-level flow at least once to see what messages are exchanged and what exceptions occur on failure.

You don’t have to implement LLM logic yourself either. As I’ll briefly note later, the OpenAI SDK and Google ADK already provide MCP integrations that make this even easier.

Next, let’s look at Resources.

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

Resources expose static references the agent can consult.



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

Like Tools, Resources have list and read methods. The client lists available resources and reads them via read_resource using their URI.

Logs:

```shell
[Resources]
- file://help.md/: Server usage guide and available tools

[TextResourceContents(uri=AnyUrl('file://help.md/'), mimeType='text/plain', meta=None, text='# stock-mcp Help\n\n- get_stock_price(ticker): Look up a Yahoo Finance ticker (e.g., 005930.KS)\n- prompts:\n  - extract-stock-code: Message template for extracting a 6-digit stock code\n  - stock-answer: Message template for composing a stock response\n\n(Invoke the LLM from the client.)\n')]
```



### Prompt

Prompts let the server define reusable message templates.

If you’ve worked with LLM APIs, this pattern is familiar. When you need to call the same prompt with different variables, register it on the server so multiple clients can share the logic while passing different args. Let’s jump to code.



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

Why manage them on the server instead of the client? Because Tools, Resources, and Prompts share a consistent “server-managed, client-discovers-and-calls” model. It also makes versioning and sharing team-wide templates easier.

You can fetch prompts with list_prompts and, like Tools, pass args to get the final message.



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

            # extract-stock-code prompt example
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

By retrieving the prompt from the MCP server and sending it to the LLM as-is, you can reuse final messages composed from server-defined templates and input variables. You can also bundle complex few-shot prompts on the server, and clients just pass the variables they need.

Logs:

```shell
type='text' text="Return only the 6-digit stock code mentioned in the question below. For example, '005930'.\nQuestion: How much is the stock price of Samsung Electronics?" annotations=None meta=None
GPT Response:  005930
```



## Wrap-up

At first glance, the code can look a bit involved. These days, agent SDKs support MCP, so you can get the same effect with much simpler code:

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

All example code used here is in my [GitHub repository](https://github.com/ppippi-dev/LLMOps/tree/main/mcp_test).

As a side note, there are still many security issues to consider with MCP. Be especially careful when connecting to remote MCP servers.