---
description: Learn how LLMs can call external functions and perform real-world tasks
  using Python and the OpenAI API.
heroImage: /img/2025-05-07/0.webp
pubDate: '2025-05-07'
tags:
- LLMOps
title: 'Deep Dive into LLM Function Calling: The Core of AI Agents'
---

Recently, an interesting concept called **Function Calling** has emerged in the field of Large Language Models (LLMs).

As the name suggests, it refers to the ability of an LLM to go beyond simply generating text and **directly call functions**. Function Calling is gaining attention as a key technology for implementing **AI Agents**, one of the hottest keywords of 2025.

While existing chatbot-level LLMs focused mainly on user conversation, the addition of Function Calling technology has enabled LLMs to perform practical actions. Specifically, an LLM can call functions on its own to obtain necessary information from external sources or perform specific tasks to achieve a given goal. In other words, the LLM has become able to play a more active role by **interacting with the outside world**.

Function Calling was introduced in OpenAI's GPT models, and since then, various other LLMs have started to implement this feature. For example, through Function Calling, an LLM can automatically perform tasks such as:

-   **Calling a weather information API:** Instead of simply answering "What's the weather in Seoul today?" with stored information, it calls a real-time weather API to provide the latest information.
-   **Searching a database:** For a question like "What was the best-selling product last quarter?", it directly searches the connected database for an answer.
-   **Integrating with external services:** For requests like "Set an alarm for 7 AM tomorrow" or "Tell me the current stock price of company A," it can directly set the phone's alarm or call a stock information API.

In this way, Function Calling allows LLMs to evolve beyond simple text generation into powerful tools that perform genuinely useful tasks.

Looking at OpenAI's official blog, this feature was introduced on June 13, 2023, in a post titled "[Function calling and other API updates](https://openai.com/index/function-calling-and-other-api-updates/)," and it has since gained great popularity among developers and spread rapidly.

Of course, even before Function Calling, there was a similar approach called the **ReAct (Reasoning + Acting)** agent method. ReAct involves the LLM going through a reasoning process to plan and execute actions. While its goal is similar to Function Calling, there seem to be some differences in the internal workings and implementation details.

For those who want to know more about the differences between ReAct agents and Function Calling agents, the following blog post will be helpful.

-   [ReAct Agents vs Function Calling Agents: A Detailed Comparison](https://www.leewayhertz.com/react-agents-vs-function-calling-agents/#ReACT-agents-vs-function-calling-agents)

## Implementing Function Calling

Let's try implementing function calling ourselves. We will convert the stock price inquiry code used in the previous ["Implementing an AI Agent"](https://ppippi-dev.tistory.com/1) post to a function calling approach.

The previously implemented flow was as follows:

1.  The user asks a question about the stock price they want to know. (e.g., "What is the stock price of Samsung Electronics?")
2.  Using GPT, identify the stock name from the user's question and convert it to a stock code ("005930").
3.  Use the yahoo finance library to look up the price for the stock code.
4.  Feed the retrieved data along with a prompt to GPT to generate an appropriate answer.

We want to introduce function calling for steps 2 and 3 of this process. It's helpful to refer to the [OpenAI API Docs](https://platform.openai.com/docs/guides/function-calling) for this.

First, the code to look up the price using the yahoo finance library is as follows (to run it, you need the yfinance library installed: `pip install yfinance`).

```python
def get_stock_price(stock_code: str) -> dict:
    """Function to get stock price information."""
    try:
        if not stock_code.endswith(".KS"):
            ticker_symbol = f"{stock_code}.KS"
        else:
            ticker_symbol = stock_code

        # Get stock information using the yfinance library
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        # Extract necessary information
        current_price = info.get("currentPrice", "Not available")
        previous_close = info.get("previousClose", "Not available")
        company_name = info.get("longName", ticker_symbol)

        # Calculate price change
        if current_price != "Not available" and previous_close != "Not available":
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
            change_str = f"{change:.2f} ({change_percent:.2f}%)"
        else:
            change_str = "Not available"

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

This is a function that returns the price of a stock when its code is provided as input.

Now, we need to format this information to let the LLM know that such a function exists.

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

As shown above, we define the function's name, description, and required parameters and include it in the `tools` list. Based on this information, GPT decides which function to use and what arguments to pass. (In this example, only one function is defined in `tools`, but it's possible to include multiple functions.)

Now, we call the GPT with this `tools` information. (To make an actual API call, the `openai` library is required, and an API key needs to be set up.)

```python
    messages: list[ChatCompletionMessageParam] = [
        {
            "role": "user",
            "content": f"From the user's question, provide the stock code. The stock code is a 6-digit number format like 000000. I want to get the stock price using this code. \n User's question: {user_input}",
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

When you run the above code (making an actual API call), if the LLM understands the user's question and determines it needs to call the `get_stock_price` function, it will return a response similar to the following.

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

If you look at the `tool_calls` part of the response, it tells us that the LLM needs to call the `get_stock_price` function with "000270" as the `stock_code` argument. The LLM doesn't execute the function itself; it tells us **which function to call with which arguments**.

Now, based on this response, the developer actually executes the `get_stock_price` function defined earlier.

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
                return {"success": False, "error": "Error parsing response"}
        else:
            return {"success": False, "error": "Could not find a suitable function call"}
```

This executes the function according to the `tool_calls` returned by the LLM and stores the result in `answer_data`.

(As an aside, if you include a GPT call logic within the function that is meant to be called via `tool_call`, it seems possible to implement a recursive reasoning model that continuously uses function calling.)

Finally, we pass this `answer_data` (the function execution result) back to the LLM and ask it to generate a user-friendly response.

```python
messages = [
        {
            "role": "system",
            "content": "You are a program that generates answers to user questions. Please create an answer for the user's question.",
        },
        {
            "role": "user",
            "content": f"User's question: {user_input}, Data: {answer_data}",
        },
    ]
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.7,
    )
```

The final output obtained through this process is as follows.

"The current stock price of Kia Corporation is 88,100 KRW, which is down 1,300 KRW (1.45%) from the previous day's closing price of 89,400 KRW. If you are interested in future price movements, please let me know if you would like additional information or analysis."

For the full code, please refer to the [Github full code](https://github.com/ppippi-dev/ai-agent-test/blob/main/src/function_calling.py).

Function Calling is a key technology that elevates the capabilities of LLMs, enabling the implementation of the various AI applications and services we imagine.

Currently, various tools are emerging based on Function Calling, and there seem to be methods that simplify processes similar to Function Calling.

