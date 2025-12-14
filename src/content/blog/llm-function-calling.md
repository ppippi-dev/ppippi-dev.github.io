---
description: Python과 OpenAI API를 활용해 LLM이 외부 함수를 호출하고 실제 작업을 수행하는 방법을 알아봅니다.
heroImage: /img/2025-05-07/0.webp
pubDate: '2025-05-07'
tags:
- LLMOps
title: AI 에이전트의 핵심, LLM Function Calling 파헤치기
---

최근 대규모 언어 모델(LLM) 분야에서 **Function Calling**이라는 흥미로운 개념이 등장했습니다.

이름에서 알 수 있듯이, 이는 LLM이 단순히 텍스트를 생성하는 것을 넘어 **직접 함수를 호출**할 수 있는 기능을 의미합니다. Function Calling은 2025년 가장 뜨거운 키워드 중 하나인 **AI 에이전트(AI Agent)**를 구현하는 핵심 기술로 주목받고 있습니다.

기존의 챗봇 수준의 LLM은 주로 사용자와의 대화에 초점을 맞추었지만, Function Calling 기술이 추가되면서 LLM은 실질적인 액션(Action)을 수행할 수 있게 되었습니다. 구체적으로 LLM은 스스로 함수를 호출하여 필요한 정보를 외부로부터 얻거나, 특정 작업을 수행하여 주어진 목표를 달성할 수 있습니다. 즉, LLM이 **외부 세계와 상호작용**하며 더 능동적인 역할을 할 수 있게 된 것입니다.

Function Calling은 OpenAI의 GPT 모델에서 소개되었으며, 이후 다른 여러 LLM들도 이 기능을 구현하기 시작했습니다. 예를 들어, LLM은 Function Calling을 통해 다음과 같은 작업을 자동으로 수행할 수 있습니다:

-   **날씨 정보 API 호출:** "오늘 서울 날씨 어때?"라는 질문에 단순히 저장된 정보를 답변하는 것이 아니라, 실시간 날씨 API를 호출하여 최신 정보를 사용자에게 제공합니다.
-   **데이터베이스 정보 검색:** "지난 분기 매출 실적이 가장 좋았던 제품은 무엇인가?"라는 질문에 연결된 데이터베이스에서 직접 정보를 검색하여 답변합니다.
-   **외부 서비스 연동:** "내일 아침 7시에 알람 맞춰줘" 또는 "A 회사 주식 현재가 알려줘"와 같은 요청에 대해 스마트폰의 알람 기능을 직접 설정하거나 주식 정보 API를 호출하여 응답합니다.

이처럼 Function Calling을 통해 LLM은 단순한 텍스트 생성을 넘어서 실제로 유용한 작업을 수행하는 강력한 도구로 발전하고 있습니다.

OpenAI의 공식 블로그를 살펴보면, 2023년 6월 13일에 "[Function calling and other API updates](https://openai.com/index/function-calling-and-other-api-updates/)"라는 제목으로 이 기능이 소개된 이후 개발자들 사이에서 큰 인기를 얻으며 빠르게 확산되었습니다.

물론 Function Calling 이전에도 이와 유사한 시도로 **ReAct(Reasoning + Acting)** 에이전트 방식이 존재했습니다. ReAct는 LLM이 추론(Reasoning) 과정을 거쳐 행동(Acting)을 계획하고 실행하는 방식으로, Function Calling과 목표는 유사하지만 내부적인 작동 방식이나 구현의 세부적인 측면에서 약간의 차이가 있는 것으로 보입니다.

ReAct 에이전트와 Function Calling 에이전트의 차이점에 대해 더 자세히 알고 싶으신 분들은 아래 블로그 글을 참고하시면 도움이 될 것입니다.

-   [ReAct Agents vs Function Calling Agents: A Detailed Comparison](https://www.leewayhertz.com/react-agents-vs-function-calling-agents/#ReACT-agents-vs-function-calling-agents)

## Function Calling 구현해보기

이제 function calling을 직접 구현해보겠습니다. 이전 ["AI Agent 구현해보기"](https://ppippi-dev.tistory.com/1)에서 사용한 주식 가격 조회 코드를 function calling 방식으로 변경해보고자 합니다.

이전에 구현한 Flow는 다음과 같습니다:

1.  사용자가 알고자 하는 주식 가격 관련 내용을 질문합니다. (예: "삼성전자의 주가가 얼마야?")
2.  GPT를 이용해서, 사용자의 질문 속 주식 종목을 알아내고, 이를 종목 코드로 변경합니다. ("005930")
3.  yahoo finance 라이브러리를 사용하여 주식 종목 코드의 가격을 조회합니다.
4.  이후 얻어온 데이터를 GPT에 프롬프트와 함께 입력하여 적절한 대답으로 변경합니다.

해당 과정에서 2번 ~ 3번 과정을 function calling으로 도입하고자 합니다. 관련하여 [OpenAI API Docs](https://platform.openai.com/docs/guides/function-calling)를 참고하면 좋습니다.

먼저 yahoo finance 라이브러리를 통해 가격을 조회하는 코드는 다음과 같습니다. (실제 실행을 위해서는 yfinance 라이브러리가 설치되어 있어야 합니다: pip install yfinance)

```python
def get_stock_price(stock_code: str) -> dict:
    """주식 가격 정보를 가져오기 위한 함수"""
    try:
        if not stock_code.endswith(".KS"):
            ticker_symbol = f"{stock_code}.KS"
        else:
            ticker_symbol = stock_code

        # yfinance 라이브러리를 사용하여 주식 정보 가져오기
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        # 필요한 정보 추출
        current_price = info.get("currentPrice", "정보 없음")
        previous_close = info.get("previousClose", "정보 없음")
        company_name = info.get("longName", ticker_symbol)

        # 가격 변동 계산
        if current_price != "정보 없음" and previous_close != "정보 없음":
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
            change_str = f"{change:.2f} ({change_percent:.2f}%)"
        else:
            change_str = "정보 없음"

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

주식 종목의 코드를 입력하면, 해당 주식 종목의 가격을 반환하는 함수입니다.

이제 이런 함수가 있다는 것을 LLM에게 알려주기 위한 형태로 만들어야 합니다.

```python
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_stock_price",
                "description": "Get current stock price for provided stock name.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "stock_code": {"type": "string"},
                    },
                    "required": ["stock_code"],
                    "additionalProperties": False,
                },
            },
        },
    ]
```

위와 같이, 함수의 이름(name)과 설명(description), 그리고 사용에 필요한 파라미터(parameters)를 정의하여 tools 목록에 포함합니다. GPT는 이 정보를 바탕으로 어떤 함수를 사용해야 하는지, 그리고 어떤 인자를 넘겨야 하는지 결정합니다. (해당 예시에서는 tools에 하나의 함수만 정의했지만, 여러 개의 함수를 넣는 것이 가능합니다.)

이제 이 tools 정보를 포함하여 GPT를 호출합니다. (실제 API 호출을 위해서는 openai 라이브러리가 필요하며, API 키 설정이 필요합니다.)

```python
    messages: list[ChatCompletionMessageParam] = [
        {
            "role": "user",
            "content": f"유저의 질문을 통해 주식 종목 코드를 알려줘, 주식 종목 코드는 000000 같은 6자리 숫자 형식을 가졌어, 이후 종목 코드를 통해 주식 가격을 얻고싶어. \n 유저의 질문: {user_input}",
        },
    ]
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        max_tokens=150,
        temperature=0.7,
        tools=tools,
        tool_choice="auto",
    )

    print(response)
```

위 코드를 실행하면 (실제 API 호출 시), LLM은 사용자의 질문을 이해하고 get\_stock\_price 함수를 호출해야 한다고 판단할 경우 다음과 유사한 응답을 반환합니다.

```shell
ChatCompletion(id='chatcmpl-BUYpFct1sxYpeNUb7IBeegqOb6XJS', 
choices=[Choice(finish_reason='tool_calls', index=0, logprobs=None, 
message=ChatCompletionMessage(content=None, refusal=None, role='assistant', 
annotations=[], audio=None, function_call=None, 
tool_calls=[ChatCompletionMessageToolCall(id='call_4ux1NaOZJO5CY1Iy3tOSP6vo', 
function=Function(arguments='{"stock_code":"000270"}', name='get_stock_price'), 
type='function')]))], created=1746623409, model='gpt-4.1-nano-2025-04-14', 
object='chat.completion', service_tier='default', system_fingerprint='fp_8fd43718b3', 
usage=CompletionUsage(completion_tokens=18, prompt_tokens=110, 
total_tokens=128, completion_tokens_details=CompletionTokensDetails(accepted_prediction_tokens=0, 
audio_tokens=0, reasoning_tokens=0, rejected_prediction_tokens=0), 
prompt_tokens_details=PromptTokensDetails(audio_tokens=0, cached_tokens=0)))
```

응답의 tool\_calls 부분을 보면, LLM이 get\_stock\_price 함수를 호출해야 하며, stock\_code 인자로 "000279" 를 사용해야 한다고 알려줍니다. LLM이 직접 함수를 실행하는 것이 아니라, **어떤 함수를 어떤 인자로 호출해야 하는지**를 알려주는 것입니다.

이제 개발자는 이 응답을 바탕으로 실제로 위에서 정의한 get\_stock\_price 함수를 실행합니다.

```python
    if response.choices and response.choices[0].message.tool_calls:
        tool_call = response.choices[0].message.tool_calls[0]
        if tool_call.function.name == "get_stock_price":
            try:
                args = json.loads(tool_call.function.arguments)
                stock_code = args.get("stock_code")
                if stock_code:
                    answer_data = get_stock_price(stock_code)
            except json.JSONDecodeError:
                return {"success": False, "error": "응답 파싱 오류"}
        else:
            return {"success": False, "error": "적절한 함수 호출을 찾을 수 없음"}
```

이렇게 하면, LLM이 반환한 tool\_calls에 맞게 함수를 실행하고 그 결과를 answer\_data에 저장합니다.

(여담이지만, tool\_call을 통해 호출되어야 하는 함수에 GPT call 하는 로직을 포함시키면, 계속해서 function calling을 하는 추론형 모델을 구현할 수 있을 것 같습니다.)

마지막으로, 이 answer\_data (함수 실행 결과)를 다시 LLM에게 전달하여 사용자에게 친절한 형태로 답변을 생성하도록 요청합니다.

```python
messages = [
        {
            "role": "system",
            "content": "너는 유저의 질문에 대한 답변을 만들어주는 프로그램이야. 유저의 질문에 대한 답변을 만들어줘",
        },
        {
            "role": "user",
            "content": f"유저의 질문: {user_input}, 데이터: {answer_data}",
        },
    ]
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.7,
    )
```

이를 통해 얻어낸 최종 output은 다음과 같습니다.

"기아차(Kia Corporation)의 현재 주가는 88,100원이며, 전일 종가인 89,400원보다 1,300원(1.45%) 하락한 상태입니다. 앞으로의 주가 움직임에 관심이 있으시면 추가 정보나 분석을 원하시는지 알려주세요."

전체 코드를 참고하고싶으면 [Github full code](https://github.com/ppippi-dev/ai-agent-test/blob/main/src/function_calling.py)를 참고하세요

Function Calling은 LLM의 능력을 한 단계 끌어올려, 우리가 상상하는 다양한 AI 애플리케이션과 서비스 구현을 가능하게 하는 핵심 기술이라고 할 수 있습니다.

현재는 Function Calling을 기반으로 다양한 툴이 나오고, Function Calling과 유사한 방식을 쉽게 해주는 방법도 존재하는 것 같습니다.