---
layout: post
title: "OpenAI Agent SDK - 간단하게 Agent를 구축하자"
subtitle: "많은 Agent 툴을 사용해보고 느낀점"
feature-img: "assets/img/2025-10-08-openai-agent-sdk/1737661646125-download6.webp"
tags: [LLMOps]
---



2025년이 되면서 뉴스 피드를 보면 하루가 멀다 하고 "Agent"라는 단어가 등장한다. n8n·Make 같은 노코드 워크플로 툴부터, 구글의 ADK, 랭체인의 Agent, 그리고 오늘 이야기할 OpenAI Agent SDK까지 선택지가 급격히 늘어났다. 그 중에서도 OpenAI가 Agent Builder를 공개하며 Agent SDK와의 연동을 시작하고, 해당 SDK는 더욱 주목 받을 수 있을 것 같은 분위기다. Builder에서 만든 플로우를 그대로 코드로 가져와 버전 관리·배포까지 이어갈 수 있기 때문이다.

> Agent Builder 화면에서 **Code** 버튼을 누르면 바로 Agent SDK 코드가 출력된다.

![image-20251009212618233](/assets/img/2025-10-08-openai-agent-sdk/image-20251009212618233.png)

물론 Google ADK나 Microsoft Autogen처럼 다른 접근을 제공하는 툴도 많다. 결국 팀의 요구사항과 사용 중인 인프라에 따라 최적의 선택은 달라질 것이다. 이 글에서는 OpenAI Agent SDK가 어떤 지향점을 갖고 있는지, 어떤 기능이 돋보이는지 정리해 본다.

먼저 눈에 들어온 장점은 다음과 같다.

- 최소한의 추상화로 학습 곡선이 낮고, OpenAI API에 익숙한 사람이라면 바로 감을 잡을 수 있다.
- 멀티 에이전트·핸드오프·가드레일·세션 등 핵심 구성 요소만 깔끔하게 제공한다.
- 기본으로 트레이싱이 켜져 있어 실행 이력을 추적하기 쉽다.
- Agent Builder와 코드를 오가며 실험-배포 사이클을 빠르게 돌릴 수 있다.



### Agent SDK 알아보기

일단, Agent SDK는 과거 베타 단계였던 Swarm에서 출발해 정식 제품군으로 편입된 버전이다. 공식 문서에 명시된 [두 가지 원칙](https://openai.github.io/openai-agents-python)이 특히 인상 깊다.

1. 사용할 가치가 있을 만큼 충분한 기능을 제공하되, 빠르게 배울 수 있도록 기본 구성 요소는 최소화한다.
2. 기본 설정만으로도 훌륭하게 동작하지만, 원하는 대로 커스터마이즈할 수 있게 열린 구조를 유지한다.

결국 "가볍지만 필요한 건 다 있는" 도구가 되겠다는 선언처럼 읽힌다. 실제로 SDK가 다루는 범위는 에이전트, 핸드오프, 가드레일, 세션, 트레이싱 정도로 명확하게 잘라 놓았다. 덕분에 복잡한 설정 없이도 에이전트 시스템의 뼈대를 바로 세울 수 있다.



가장 기본이 되는 코드를 보면 심플함이 더 분명해진다. 에이전트를 선언하는 데 아래의 코드면 충분하다. 오히려 GPT API를 직접 다룰 때보다 선언적이다.

```python
from agents import Agent, Runner

agent = Agent(name="Assistant", instructions="You are a helpful assistant")

result = Runner.run_sync(agent, "Write a haiku about recursion in programming.")
print(result.final_output)
```





### 빠르게 시작하기

Agent SDK를 처음 실험해 볼 때 자주 쓰는 흐름을 정리했다.

설치는 openai-agents 라이브러리를 설치하는 것이 전부이다.
```bash
pip install openai-agents
```

### Handoffs

멀티 에이전트를 엮는 가장 쉬운 방법이 핸드오프다. 각 에이전트를 선언하고 `handoffs` 배열에 넘겨 주면 라우팅을 담당하는 에이전트가 자연스럽게 분기해 준다. 다른 툴에서 오케스트레이션·라우터라고 부르는 개념과 유사하지만, SDK에서는 의도적으로 구성을 단순화했다.

```python
spanish_agent = Agent(
    name="Spanish agent",
    instructions="You only speak Spanish.",
)

english_agent = Agent(
    name="English agent",
    instructions="You only speak English",
)

triage_agent = Agent(
    name="Triage agent",
    instructions="Handoff to the appropriate agent based on the language of the request.",
    handoffs=[spanish_agent, english_agent],
)


async def main():
    result = await Runner.run(triage_agent, input="Hola, ¿cómo estás?")
    print(result.final_output)
```

위 예시는 triage_agent가 입력 언어에 따라 스페인어·영어 에이전트로 작업을 넘겨준다. `Runner.run_sync` 대신 비동기 `Runner.run`을 사용하면 체이닝 도중 외부 API 호출이나 툴 실행을 기다릴 때도 자연스럽게 확장된다. 실제 서비스에서는 핸드오프 체인을 깊게 가져가기보다는, 언어·도메인·권한과 같은 명확한 기준으로만 분기하는 편이 유지보수에 유리했다.

물론 다른 툴들처럼, [멀티에이전트를 툴](https://github.com/openai/openai-agents-python/blob/main/examples/agent_patterns/agents_as_tools.py)들처럼 사용하는 방법도 있으니 참고하면 좋을 듯 하다.





### Tools

Agent SDK가 제공하는 툴 시스템은 함수 한두 개만으로 정의할 수 있을 만큼 단순하다. 기본적인 형식은 아래와 같다.

```python
from agents import Agent, Runner, function_tool

@function_tool
def get_weather(city: str) -> str:
    return f"The weather in {city} is sunny."


agent = Agent(
    name="Hello world",
    instructions="You are a helpful agent.",
    tools=[get_weather],
)
```

`@function_tool` 데코레이터로 함수를 감싸면 JSON 스키마가 자동으로 생성되고, `tools` 파라미터에 그대로 넘겨 쓸 수 있다. GPT API와 동일하게,  `tool_choice="required"`처럼 호출 정책을 조정해 세밀한 통제가 가능하다.

Agent SDK에서 제공하는 함수형 툴 외에도 MCP 같은 외부 툴 프로토콜을 붙일 수 있다.

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

위 예시는 MCP 서버를 stdio 방식으로 붙인 뒤 해당 리소스를 툴로 노출하는 과정이다. 테스트해보면 리소스 조회(`list`·`get`)부터 실행까지 무리 없이 지원해 MCP 생태계와의 궁합이 매우 좋다는 느낌을 받았다.



### Tracing

Agent SDK는 에이전트가 남긴 메시지와 툴 호출, 핸드오프 이력까지 기본값으로 [OpenAI Dashboard - Logs](https://platform.openai.com/logs)에 적재한다. 별도의 옵저버빌리티 스택을 붙이지 않아도 즉시 실행 흐름을 시각화할 수 있다는 점이 강력하다.

다만 모든 트래픽이 OpenAI로 전송되는 만큼 민감한 데이터에 대해서는 사전에 정책을 정해 두는 편이 좋다. 로그 수집을 끄고 싶다면 라이브러리를 import하기 전에 아래와 같이 환경 변수를 지정하면 된다.

```python
os.environ["OPENAI_AGENTS_DISABLE_TRACING"] = "1"
```



다음과 같이 트레이싱이 된다고 보면 된다.

![image-20251009215019250](/assets/img/2025-10-08-openai-agent-sdk/image-20251009215019250.png)

OpenAI 모델이 아니더라도 트레이싱은 유지할 수 있다. LiteLLM 같은 어댑터로 다른 모델을 붙이고, 별도로 발급한 OpenAI API Key를 `set_tracing_export_api_key`에 전달하면 된다. 비용 없이 로그만 수집하는 용도로 사용할 수 있다는 뜻이다.

```python
import os
from agents import set_tracing_export_api_key, Agent, Runner
from agents.extensions.models.litellm_model import LitellmModel

tracing_api_key = os.environ["OPENAI_API_KEY"]
set_tracing_export_api_key(tracing_api_key)

model = LitellmModel(
    model="your-model-name",
    api_key="your-api-key",
)

agent = Agent(
    name="Assistant",
    model=model,
)
```





### 가드레일

에이전트가 점점 복잡해질수록 정책을 코드로 강제할 방법이 필요하다. Agent SDK는 가드레일을 장착하는 방식을 명확히 두 가지로 나눈다.

1. 입력 가드레일: 최초 사용자 입력을 검사해 필요 시 실행을 중단한다.
2. 출력 가드레일: 최종 에이전트 응답을 검토해 민감한 내용이 있는지 확인한다.

핵심은 가드레일도 결국 하나의 에이전트 혹은 함수라는 점이다. 입력 가드레일을 예로 들면, 사용자가 입력한 내용을 가드레일 함수에 전달해 차단(tripwire) 여부를 결정한다.



예시 코드는 다음과 같이 소개하고 있다.

```python
from pydantic import BaseModel
from agents import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    RunContextWrapper,
    Runner,
    TResponseInputItem,
    input_guardrail,
)

class MathHomeworkOutput(BaseModel):
    is_math_homework: bool
    reasoning: str

guardrail_agent = Agent( 
    name="Guardrail check",
    instructions="Check if the user is asking you to do their math homework.",
    output_type=MathHomeworkOutput,
)


@input_guardrail
async def math_guardrail( 
    ctx: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(guardrail_agent, input, context=ctx.context)

    return GuardrailFunctionOutput(
        output_info=result.final_output, 
        tripwire_triggered=result.final_output.is_math_homework,
    )


agent = Agent(  
    name="Customer support agent",
    instructions="You are a customer support agent. You help customers with their questions.",
    input_guardrails=[math_guardrail],
)

async def main():
    # This should trip the guardrail
    try:
        await Runner.run(agent, "Hello, can you help me solve for x: 2x + 3 = 11?")
        print("Guardrail didn't trip - this is unexpected")

    except InputGuardrailTripwireTriggered:
        print("Math homework guardrail tripped")
```

위 코드에서 `math_guardrail` 함수는 별도의 에이전트를 호출해 "수학 숙제를 대신 풀어 달라는 요청인지" 판단하고, 참일 경우 `InputGuardrailTripwireTriggered` 예외를 발생시킨다. Guardrail 로직을 별도 에이전트로 분리하면 정책을 재사용하거나 다른 프로젝트에 쉽게 이식할 수 있다는 장점이 있다. 출력 가드레일 역시 `@output_guardrail` 데코레이터로 동일한 패턴을 구현할 수 있다.



### 세션과 상태 관리

에이전트를 실서비스에 붙이려면 대화 맥락과 사용자별 상태를 꾸준히 보존해야 한다. Agent SDK는 `Session` 개념을 제공해 이런 요구를 깔끔하게 분리한다. 해당 내용은 다루지는 않지만 다른 툴들에서 지원하는 메모리, db등 지원하고 있어서 무리없이 사용할 수 있을 것 같다. 



### 단점

사실 다른 툴들과 비교했을 때, 크게 장,단점이 느껴지지 않는 툴이라고 생각한다. 굳이 뽑자면  OpenAI 생태계와의 결합이 강하다. LiteLLM을 통해 다른 모델을 붙일 수 있지만, 결국 트레이싱·권한 관리는 OpenAI 계정에 의존하고, 기본 트레이싱이 OpenAI Dashboard로만 향한다. 사내 모니터링을 이미 쓰고 있다면 별도 파이프라인을 구축해야한다.



### 마치며

Agent SDK는 MS Autogen처럼 심플함을 추구하면서도, OpenAI Builder와의 연동을 통해 실험-배포 루프를 짧게 만들어 줄 수 있을 것 같다는 생각이 든다. 무엇보다 필요한 구성 요소만 남겨 학습 비용을 크게 줄여 준다는 점이 마음에 든다.



추가 예제와 패턴은 [openai-agents-python](https://github.com/openai/openai-agents-python/tree/main/examples/agent_patterns) 저장소에서도 자세히 볼 수 있다. 팀의 요구에 맞는 아키텍처를 직접 실험해 보길 권한다.
