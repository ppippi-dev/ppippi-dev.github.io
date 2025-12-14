---
description: MCP 구현해보기
heroImage: /img/2025-09-15-mcp-one-page/0.png
pubDate: '2025-09-15'
tags:
- LLMOps
title: MCP - Model Context Protocol
---

2024년 11월, Anthropic이 Claude에서 MCP(Model Context Protocol)를 오픈소스로 공개했다. 출시 직후부터 주변에서는 "MCP 써봤냐"는 질문이 잦았고,  "써보면 정말 편하다"라는 이야기도 들려왔다.

솔직히 처음에는 큰 감흥이 없었다. OpenAI Function Calling 혹은 Gemini Function Calling과 크게 다르지 않아 보였고, 이미 LLM 확장 기능을 만들 수 있는 도구는 많았기 때문이다. 하지만 불과 몇 달 사이에 MCP는 OpenAI, Google 등 주요 플레이어들의 제품에도 빠르게 통합되며 사실상 표준 후보로 자리 잡았다. ChatGPT UI에서도 [베타 기능으로 MCP를 직접 등록](https://platform.openai.com/docs/guides/developer-mode)할 수 있게 된 것이 좋은 예이며, 그 외에 많은 Agent Docs에서도 MCP 관련 튜토리얼을 제공하고 있다.

이 글에서는 간단한 MCP를 직접 구현해보고자 한다.



## 왜 MCP를 다시 바라보게 되었나

먼저 MCP는 어떤부분이 OpenAI, Gemini의 커텍터 혹은 Function Calling과 다른지 알아보자.

- **표준화된 인터페이스**: Function Calling은 플랫폼마다 사양이 다르지만, MCP는 JSON-RPC 기반의 공통 규약을 제공해 여러 LLM/에이전트가 동일한 서버에 연결할 수 있다.
- **벤더 중립성**: 오픈소스로 먼저 공개되면서 생태계가 빠르게 커졌다. Cursor, Claude, OpenAI, Gemini 등 다양한 클라이언트가 하나의 서버 구현을 공유한다.
- **도구·리소스·프롬프트 관리**: 단순 API 호출을 넘어서, 에이전트가 참고할 리소스와 프롬프트까지 서버 단에서 선언적으로 관리할 수 있다.
- **로컬·원격 전송 옵션**: STDIO부터 SSE까지 다양한 전송 레이어를 지원해, 로컬 실험부터 SaaS 연동까지 동일한 코드베이스로 확장할 수 있다.

이런 장점 덕분에 MCP는 단순히 "Function Calling의 또 다른 구현"이 아니라, 에이전트 아키텍처를 구성하는 표준 포트에 가까워졌다. 그럼 이제 어떻게 구성되어 있고, 실제로 어떻게 동작하는지 살펴보자.



### MCP (Model Context Protocol)

Claude는 MCP를 ["AI 애플리케이션을 외부 시스템에 연결하기위한 오픈 소스 표준"](https://modelcontextprotocol.io/docs/getting-started/intro) 이라고 소개하고 있다.

특히 질리도록 들어본 표현 중 하나인 "AI 애플리케이션 용 USB-C 포트처럼 MCP를 생각해보십시오." 라는 내용이 등장한다. 즉, MCP는 AI 애플리케이션을 외부 시스템과 연결해주는 프로토콜이다.

Function Calling과 비교하면, 단일 벤더가 정한 JSON 스키마를 따르는 대신, MCP는 연결·초기화·도구 목록·리소스 접근까지 전 과정을 표준화했다. 덕분에 서버 입장에서는 "어떤 클라이언트가 붙더라도 동일한 핸드셰이크"를 기대할 수 있고, 클라이언트는 새로운 기능을 발견(List)하고 설명(Description)만으로 호출할 수 있다.



![img](/img/2025-09-15-mcp-one-page/mcp-simple-diagram.png)



간단한 예시를 들면, GPT에게 오늘 나의 캘린더 일정을 조회 해달라고 요청하는 것이다.

MCP가 없다면, GPT는 이를 수행할 수 없다. 하지만 MCP를 통해 캘린더를 조회하는 API를 호출하고, 이를 통해 데이터를 조회할 수 있다. 물론 Function calling을 통해서도 가능하지만, MCP는 오픈소스 프로토콜로 설정해서, GPT에서도 호출 할 수 있고 Gemini에서도 호출할 수 있는 그야말로 표준을 만든 셈이다.



## MCP 용어들 확인하기

MCP에 대한 구체적인 용어들을 알아보면 너무 힘드니, 간단하게만 체크하고자 한다.



### Participants

MCP는 크게 2가지로 나눌 수 있다. Client와 Server이다. MCP Host 라는 것도 MCP Docs에서 언급하고 있지만, 이는 단지 여러 Client 관리하는 Cursor같은 애플리케이션 이라고 이해하면 편하다.

![image-20250916001157470](/img/2025-09-15-mcp-one-page/image-20250916001157470.png)

클라이언트와 서버의 역할은 아래와 같다.

- **Client**: LLM 앱/에이전트/IDE 등. MCP 서버에 연결해 기능과 리소스를 사용한다.
- **Server**: 외부 시스템을 감싸 MCP 인터페이스로 노출한다. 예: 캘린더, 이슈 트래커, 데이터베이스, 파일시스템 등.

주목해야 할 부분은 MCP에서 클라이언트와 서버가 1:1 세션 연결을 권장한다는 점이다.

MCP 서버는 로컬 또는 원격으로 클라이언트와 연결 할 수 있다. 로컬에서는 STDIO를 사용하며 클라이언트와 동일한 시스템(운영체제)에서 돌리게 되는데, 이를 로컬 MCP라고 부른다.

반대로 외부 플랫폼에서 실행하며 SSE 전송으로 연결하면 원격 MCP 서버가 되며 네트워크를 통한 통신이 된다.



### Layer

Layer는 크게 Data Layer와 Transport Layer로 나뉜다. 

Data Layer는 JSON-RPC 기반 클라이언트-서버 통신 프로토콜과 라이프사이클 관리, 도구·리소스·프롬프트·알림 같은 핵심 프리미티브를 정의한다. MCP 서버를 구축할 때 특히 도구·리소스·프롬프트 부분을 많이 다루게 될 텐데, 관련 내용은 이후에 자세히 살펴보겠다.

Transport Layer는 전송 수단별 연결 수립, 메시지 프레이밍, 인증을 포함한 통신 경로를 책임져 데이터가 오갈 수 있게 한다. 위에서 언급한 STDIO(Standard Input/Output) 방식이냐 SSE(Server-Sent Events)냐 등을 설정한다고 보면 된다.

자세한 내용은 [MCP Docs Architecture](https://modelcontextprotocol.io/docs/learn/architecture)에 잘 정리돼 있다. 이 글에서는 실습 위주로 살펴볼 예정이므로 이 정도로만 정리한다. 이후 코드 레벨에서 구체적으로 확인해 보자.



## 실습 환경

직접 따라 하기 위해서는 아래 준비가 필요했다.

- Python 3.11 이상과 `uv`(또는 `pip`) 기반 가상환경
- `fastmcp`, `openai`, `yfinance`,  등 예제에서 사용하는 라이브러리
- OpenAI API 키 (LLM 호출 파트 확인용, 없어도 클라이언트-서버 상호작용은 테스트 가능)



## 코드로 살펴보기

사실 이론적인 부분이 많아서, 잘 이해가 안간다. 직접 코드로 하나씩 살펴보고자 한다.

먼저 MCP 서버 쪽을 구현해보고자 한다. 나는 이전부터 사용해오던 주식 가격 조회 기능을 MCP 기반으로 옮겨 보았다.

Python의 FastMCP 라이브러리를 사용하면 서버를 빠르게 구성할 수 있다. `FastMCP` 인스턴스를 만들고, 이후 필요한 기능을 `@mcp.tool` 데코레이터로 등록하는 식이다.

```python
from mcp.server.fastmcp import FastMCP

# MCP server instance
mcp = FastMCP(
    name="stock-mcp",
)
```



### Tools

Data Layer에 속하는 tool이다. 서버에서 제일 많이 사용하게 될 내용이기도 하다.

기본 구조는 아래와 같다. 기존 파이썬 함수를 선언하고 `@mcp.tool` 데코레이터로 노출한다. 이름(name)과 설명(description)을 적어 두면, 클라이언트는 `list_tools`를 통해 메타데이터를 읽고 어떤 입력을 기대해야 하는지 파악한다.

```python
# ===== Tools =====
@mcp.tool("change_hello_to_hi", description="Change Hello to Hi.")
def change_hello_to_hi(args: dict[str, Any]) -> dict[str, Any]:
    text = args.get("text", "")
    return {"output": text.replace("Hello", "Hi")}
```

`args`를 딕셔너리로 받는 이유는 JSON-RPC 메시지에 그대로 직렬화되기 때문이다. 타입 힌트를 지정해 두면 FastMCP가 자동으로 JSON Schema를 만들어주어, 어떤 필드가 필수인지 에이전트에게 알려준다. 이 과정에서 Pydantic을 사용하면 좋지만 예제에서는 단순 dict라고 표현하겠다.


조금 더 실전 예시를 살펴보자.

아래는 yfinance 라이브러리를 통해, 입력받은 주식 코드의 정보를 가져오는 함수이다.

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



갑자기 다른 클라이언트 코드가 등장해 당황스러울 수도 있지만, STDIO를 통해 클라이언트에서 MCP 서버를 연결하고 이를 초기화하는 부분이다. 이번에는 `session.call_tool`에 주목하면 된다.

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

해당 코드를 실행시키면 아래와 같은 로그가 출력된다.

```shell
[TextContent(type='text', text='{\n  "success": true,\n  "company_name": "Samsung Electronics Co., Ltd.",\n  "ticker": "005930.KS",\n  "current_price": 78200.0,\n  "previous_close": 79400.0,\n  "change": "-1200.00 (-1.51%)"\n}', annotations=None, meta=None)]
```

흐름을 다시 정리하면 아래와 같다.
- `ClientSession.initialize()`가 서버 기능(툴/리소스/프롬프트 목록)과 프로토콜 버전을 합의한다.
- `session.call_tool()`이 JSON-RPC `call_tool` 요청을 보내고, 서버는 결과를 `TextContent` 등 표준 타입으로 래핑해서 응답한다.
- 로그에 찍힌 `ListToolsRequest`는 FastMCP가 자동으로 호출한 것으로, 세션 초기에 사용 가능한 도구 목록을 캐시해 둔다.

즉 MCP 서버에서 구성한 함수에 따라 적절한 결과값이 전달되고, 클라이언트는 이를 표준화된 구조로 수신한다.

해당 내용은 단순 함수를 호출한 것처럼 보일 수 있다. 이를 LLM을 이용해서 동작하게 하면 다음과 같다.



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



다음과 같은 질문이 들어왔다고 가정한다. "How much is the stock price of Samsung Electronics?"

MCP에서는 어떤 툴이 있는지 조회하는 API가 제공된다. 나는 기존 함수 외에 테스트용 `fake_function`을 추가해 두었다.

먼저 툴 목록을 조회해 프롬프트에 포함시키고, 질문에 답하려면 어떤 툴을 사용해야 하는지 고르게 했다.

이를 통해 GPT는 `get_stock_price`를 선택하고, 해당 함수를 실행하게 된다. (코드가 길어지는 것을 방지하기 위해 인자를 추론하는 부분은 생략했다.)

로그는 다음과 같다.

```shell
PROMPT_MESSAGE:  
            You can call tools to get Answer for this question: How much is the stock price of Samsung Electronics?,
            tools: meta=None nextCursor=None tools=[Tool(name='get_stock_price', title=None, description='Look up stock data from Yahoo Finance.', inputSchema={'properties': {'args': {'additionalProperties': True, 'title': 'Args', 'type': 'object'}}, 'required': ['args'], 'title': 'get_stock_priceArguments', 'type': 'object'}, outputSchema={'additionalProperties': True, 'title': 'get_stock_priceDictOutput', 'type': 'object'}, annotations=None, meta=None), Tool(name='fake_function', title=None, description="Fake function. Don't Call it", inputSchema={'properties': {}, 'title': 'fake_functionArguments', 'type': 'object'}, outputSchema={'additionalProperties': True, 'title': 'fake_functionDictOutput', 'type': 'object'}, annotations=None, meta=None)],
            What you should do is call tools to get Answer for this question. 
            Choose Only One Tool to call. Just Return the Tool Name.
            If you don't know the answer, return 'None'
            
GPT Response:  get_stock_price
```

Prompt를 직접 만들어도 되지만, 프로덕션에서는 "도구 선택 → 인자 생성 → 호출 결과 해석" 과정을 프레임워크가 대신해 주는 경우가 많다. 다만 한 번은 로우레벨 흐름을 경험해 보는 것이 좋다. 어떤 메시지가 오가고 실패했을 때 어떤 예외가 터지는지 감을 잡을 수 있기 때문이다.

물론 직접 이렇게 LLM을 구현할 필요는 없다. 마지막에 간단하게 소개하겠지만, OpenAI SDK나 Google ADK에서 MCP와의 연동을 함께 제공하고 있어 훨씬 간단하게 통합할 수 있다.

이제 다음으로 Resource를 살펴보자.

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

Resource는 에이전트가 참고할 수 있는 정적인 자료를 노출하는 용도로 활용한다. 



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

Resource도 Tools와 동일하게 MCP에서 List 혹은 Read 관련 함수를 제공하며, 클라이언트가 필요 시 적절한 URI로 `read_resource`를 호출한다. 



로그는 다음과 같다.

```shell
[Resources]
- file://help.md/: Server usage guide and available tools

[TextResourceContents(uri=AnyUrl('file://help.md/'), mimeType='text/plain', meta=None, text='# stock-mcp Help\n\n- get_stock_price(ticker): Look up a Yahoo Finance ticker (e.g., 005930.KS)\n- prompts:\n  - extract-stock-code: Message template for extracting a 6-digit stock code\n  - stock-answer: Message template for composing a stock response\n\n(Invoke the LLM from the client.)\n')]
```



### Prompt

마지막으로 Prompt는 서버에서 재사용 가능한 메시지 템플릿을 정의하는 기능이다.

LLM API를 많이 다뤘다면 익숙한 패턴이다. 변수만 다르게 넣어 반복 호출해야 하는 프롬프트를 서버에 등록해 두면, 여러 클라이언트가 같은 로직을 공유하면서도 인자만 바꿔 사용할 수 있다. 코드를 바로 살펴보자.



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

LLM에서 자주 쓰는 프롬프트를 MCP 서버에서 관리한다고 생각하면 된다.

왜 굳이 클라이언트가 아닌 서버에서 관리할까? Tools, Resources, Prompt는 MCP 서버가 관리하고 클라이언트는 해당 내용을 "발견하고" 호출한다는 일관된 모델을 제공하기 때문이다. 팀 전체가 공유하는 공통 템플릿도 서버 한 곳에서 버전 관리할 수 있어 편하다.

이 또한 `list_prompts`를 통해 조회할 수 있고, Tools와 유사하게 인자를 입력해 최종 프롬프트 메시지를 받아볼 수 있다.



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

위와 같이 Prompt를 MCP 서버에서 받아온 뒤 LLM에 그대로 전달하면, 서버에서 정의한 템플릿과 인자가 조합된 최종 메시지를 재사용할 수 있다. 복잡한 Few-shot 예제를 서버에 묶어 두고, 클라이언트는 필요한 변수만 넘기는 방식이 깔끔하게 정리된다.

로그는 아래와 같다.

```shell
type='text' text="Return only the 6-digit stock code mentioned in the question below. For example, '005930'.\nQuestion: How much is the stock price of Samsung Electronics?" annotations=None meta=None
GPT Response:  005930
```



## 마무리

처음 접하면 코드가 다소 복잡해 보인다. 
요즘은 아래처럼 에이전트 SDK가 MCP를 지원해, 훨씬 단순한 코드로도 동일한 효과를 낼 수 있다.

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



내가 사용한 전체 예제 코드는 나의 [Github 저장소](https://github.com/ppippi-dev/LLMOps/tree/main/mcp_test)에 정리해 두었다.



여담이지만, MCP관련된 보안이슈들이 여전히 많이 남아있다. 이 부분을 고려하여 특히 원격 MCP 서버와 연결하는 경우, 항상 조심하기를 바란다.

