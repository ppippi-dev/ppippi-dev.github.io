---
description: Creating a simple stock agent bot using ChatGPT
heroImage: /img/2025-04-14/0.webp
pubDate: '2025-04-14'
tags:
- LLMOps
title: Implementing an AI Agent
---

# Implementing an AI Agent

Since ChatGPT was released to the world on November 30, 2022, we have been experiencing a wave of rapid change.

Among these changes, the concept of the AI Agent is particularly noteworthy. Although a bit late, to keep up with the times, I want to take a closer look at this concept and try to implement a simple AI Agent myself.

## AI Agent??

When I first encountered the term AI Agent, I thought it was just another name for the existing AI Assistant.

However, there is a significant difference between the two, which I want to clarify first.

While searching for related information, I found useful information in the [GCP docs](https://cloud.google.com/discover/what-are-ai-agents). The link is below.

This document defines an AI Agent as "a software system that uses AI to pursue goals and complete tasks on behalf of a user."

On the other hand, the AI Assistant, which I was confused about, is described as "an AI agent designed to collaborate directly with users, understand and respond to natural language and input, and perform tasks."

For example, an AI Assistant, like Apple's Siri or Amazon's Alexa, answers user questions and performs tasks by interacting with the user.

In contrast, an AI Agent has a higher level of autonomy and makes independent decisions to achieve specific goals, much like an autonomous driving system.

Of course, it is difficult to draw a clear line between an AI Assistant and an AI Agent.

<img src="/img/2025-04-14/1.png">

The speaker uses Cursor as an IDE. (I've become someone who can't develop without Cursor...)

Cursor has already introduced an AI Agent.

<img src="/img/2025-04-14/2.png">

As shown in the picture above, when you give the Agent a goal, it performs the goal in various ways, such as checking my folder structure, using the knowledge that the LLM has, and searching the web if necessary.

If an error occurs during a task, it finds the cause on its own and solves the problem in a different way.

## AI Agent Practice: Implementing it myself

The easiest way to understand is to practice it myself, so I'm going to implement a simple AI Agent.

The AI Agent to be implemented is a simple bot that checks stock prices.

The environment used is as follows.

### Environment Used

-   python 3.12
-   openai - gpt4o-mini
-   yfinance

The complete code can be found in the [GitHub repository](https://github.com/ppippi-dev/ai-agent-test) below.

### Simple Flow Introduction

The bot to be implemented operates in the following order.

1.  The user enters a question.
2.  GPT extracts the stock name from the question and returns the corresponding stock code.
3.  The yfinance library retrieves the stock information for the stock code.
4.  GPT organizes the data and prints it in a user-friendly way.

Now let's implement the above flow with code.

First, I will implement the necessary functions for each step and call them from the main function.

The functions that make up the Agent are as follows.

-   `act()`: A function that controls the main flow
-   `get_stock_code_from_gpt()`: A function that extracts the stock code
-   `get_stock_price()`: A function that retrieves stock price information
-   `answer_paraphrase()`: A function that generates the final answer

Let's look at the implementation of each function.

First, let's look at the `act()` function for the flow.

```python
def act(user_input):
    """Determine action based on user input"""

    stock_code = get_stock_code_from_gpt(user_input)
    add_ks_mark = f"{stock_code.stock_code}.KS"
    stock_info = get_stock_price(add_ks_mark)
    answer = answer_paraphrase(stock_info, user_input)
    return answer
```

This function manages the entire flow of receiving user input, querying stock information, and generating a response.

It's easier to think of it as a simple LLM pipeline.

Next is the main function that processes the user's question.

```python
def main():
    """main function"""
    agent = StockAgent()

    while True:
        user_input = input("User's question: ")
        if user_input == "exit":
            break
        response = agent.act(user_input)
        print(response)
```

This function processes the user's question through a simple while loop.

Now, this is the part where we actually implement the AI Agent.

It extracts the stock included in the user's question through GPT and returns the code for that stock.

```python
class StockCode(BaseModel):
    """Model to return stock code"""

    stock_code: str

def get_stock_code_from_gpt(user_input: str) -> StockCode | None:
    """Function to return stock code"""
    messages = [
        {
            "role": "system",
            "content": "You are a program that finds the stock code of the stock item included in the user's question. Find the stock code of the stock item included in the user's question and return the stock code.",
        },
        {
            "role": "user",
            "content": f"Please tell me the stock code through the question below. The stock code consists of 6 digits, like '000000'. \n User's question: {user_input}",
        },
    ]
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=150,
        temperature=0.7,
        response_format=StockCode,
    )
    return response.choices[0].message.parsed
```

I configured the prompt to extract the stock code if there is a stock item in the user's question.

Then, it extracts stock information data using the extracted stock code and the yfinance library.

```python
def get_stock_price(ticker_symbol: str) -> dict:
    """Function to get stock price information"""
    try:
        # Get stock information using the yfinance library
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        # Extract necessary information
        current_price = info.get("currentPrice", "No information")
        previous_close = info.get("previousClose", "No information")
        company_name = info.get("longName", ticker_symbol)

        # Calculate price change
        if current_price != "No information" and previous_close != "No information":
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
            change_str = f"{change:.2f} ({change_percent:.2f}%)"
        else:
            change_str = "No information"

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

yfinance is a library that retrieves data for stock codes through Yahoo Finance, but it doesn't seem to have all domestic stock items.

Finally, it generates an answer through GPT with the obtained data.

```python
def answer_paraphrase(answer_data: dict, user_input: str) -> str | None:
    """Paraphrasing function for answering with stock information data"""
    messages = [
        {
            "role": "system",
            "content": "You are a program that creates answers to user questions. Please create an answer to the user's question.",
        },
        {
            "role": "user",
            "content": f"User's question: {user_input}, Data: {answer_data}",
        },
    ]
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
    )
    return response.choices[0].message.content
```

Running the code built this way creates a simple AI Agent as shown below.

Example of execution result:

```txt
User's question: What is the stock price of Kia Motors?
The current stock price of Kia Motors is 84,300 won. The previous closing price was 84,600 won, and the current price has fallen by 300 won (-0.35%).
User's question: How much is Samsung Electronics?
The current stock price of Samsung Electronics is 53,500 won. The previous closing price was 53,200 won, and today it has risen by 300 won (0.56%).
```

## Afterword

I have implemented a simple AI Agent as above. In fact, most LLMs already perform agent functions through web searches with internal logic without the need for the above method.

In particular, looking at the process by which inference models (Chain of Thought) obtain answers, it is presumed that the following process is included.

For reference, OpenAI has already created an [API to easily build agents](https://openai.com/index/new-tools-for-building-agents/).

