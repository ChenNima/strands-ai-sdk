import json
import traceback
import uuid
from typing import Any, Callable, Dict, Mapping, Sequence

from fastapi.responses import StreamingResponse
from openai import OpenAI
from openai.types.chat.chat_completion_message_param import ChatCompletionMessageParam
from strands import Agent


async def stream_strands_agent(
    agent: Agent,
    messages: Sequence[ChatCompletionMessageParam],
    protocol: str = "data",
    on_finish: Callable[[Dict[str, Any]], None] = None,
):
    """Yield Server-Sent Events for a streaming Strands Agent completion.
    
    Args:
        agent: The Strands Agent instance
        messages: Chat messages to send to the agent
        protocol: The protocol for SSE events
        on_finish: Optional callback that receives the complete buffered message
                  in the format: {
                      "role": "assistant",
                      "parts": [...],  # Contains all text and tool-related parts
                      "metadata": {"finishReason": "..."}
                  }
    """
    try:
        def format_sse(payload: dict) -> str:
            return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"

        message_id = f"msg-{uuid.uuid4().hex}"
        text_stream_id = f"text-{uuid.uuid4().hex[:8]}"
        text_started = False
        text_finished = False
        tool_calls_state: Dict[str, Dict[str, Any]] = {}
        finish_reason = None
        
        # Message buffer to collect the complete AI response
        message_parts = []
        current_text_part = None
        
        yield format_sse({"type": "start", "messageId": message_id})

        # Get the last user message for the agent
        if messages:
            last_message = messages[-1]
            user_input = last_message.get("content", "")
            
            # Stream agent response
            async for event in agent.stream_async(user_input):
                # Handle streaming text content
                if 'event' in event and 'contentBlockDelta' in event['event']:
                    content_block = event['event']['contentBlockDelta']
                    if 'delta' in content_block:
                        # Regular text content
                        if 'text' in content_block['delta']:
                            if not text_started:
                                yield format_sse({"type": "text-start", "id": text_stream_id})
                                text_started = True
                                current_text_part = {"type": "text", "text": ""}
                            
                            text_delta = content_block['delta']['text']
                            if current_text_part:
                                current_text_part["text"] += text_delta
                            
                            yield format_sse({
                                "type": "text-delta",
                                "id": text_stream_id,
                                "delta": text_delta
                            })
                        
                        # Reasoning content (thinking)
                        elif 'reasoningContent' in content_block['delta'] and 'text' in content_block['delta']['reasoningContent']:
                            if not text_started:
                                yield format_sse({"type": "text-start", "id": text_stream_id})
                                text_started = True
                            
                            # Stream reasoning as text (could be marked differently if needed)
                            yield format_sse({
                                "type": "text-delta",
                                "id": text_stream_id,
                                "delta": content_block['delta']['reasoningContent']['text']
                            })
                
                # Handle complete message with tool calls and results
                elif 'message' in event:
                    if 'content' in event['message'] and isinstance(event['message']['content'], list):
                        for content in event['message']['content']:
                            if isinstance(content, dict):
                                # Text content
                                if 'text' in content:
                                    if not text_started:
                                        yield format_sse({"type": "text-start", "id": text_stream_id})
                                        text_started = True
                                    
                                    yield format_sse({
                                        "type": "text-delta",
                                        "id": text_stream_id,
                                        "delta": content['text']
                                    })
                                
                                # Tool call
                                elif 'toolUse' in content:
                                    # End text stream before starting tool call if needed
                                    if text_started and not text_finished:
                                        yield format_sse({"type": "text-end", "id": text_stream_id})
                                        text_finished = True
                                    
                                    tool_use = content['toolUse']
                                    tool_call_id = tool_use['toolUseId']
                                    tool_name = tool_use['name']
                                    tool_input = tool_use['input']
                                    
                                    # Save text part if exists
                                    if current_text_part:
                                        message_parts.append(current_text_part)
                                        current_text_part = None
                                    
                                    # Track tool call state
                                    tool_calls_state[tool_call_id] = {
                                        "name": tool_name,
                                        "input": tool_input,
                                        "started": True
                                    }
                                    
                                    # Add tool call part to buffer
                                    message_parts.append({
                                        "type": f"tool-{tool_name}",
                                        "toolCallId": tool_call_id,
                                        "toolName": tool_name,
                                        "state": "input-available",
                                        "input": tool_input
                                    })
                                    
                                    # Emit tool-input-start
                                    yield format_sse({
                                        "type": "tool-input-start",
                                        "toolCallId": tool_call_id,
                                        "toolName": tool_name
                                    })
                                    
                                    # Emit tool-input-available with parsed arguments
                                    yield format_sse({
                                        "type": "tool-input-available",
                                        "toolCallId": tool_call_id,
                                        "toolName": tool_name,
                                        "input": tool_input
                                    })
                                
                                # Tool result
                                elif 'toolResult' in content:
                                    tool_result = content['toolResult']
                                    tool_call_id = tool_result['toolUseId']
                                    status = tool_result['status']
                                    
                                    if status == 'success':
                                        # Extract the actual result
                                        result_content = tool_result.get('content', [])
                                        if result_content and isinstance(result_content, list):
                                            output = result_content[0].get('text', '') if result_content else ''
                                        else:
                                            output = str(result_content)
                                        
                                        # Add tool result part to buffer
                                        if message_parts and message_parts[-1].get("toolCallId") == tool_call_id:
                                            message_parts[-1]["output"] = output
                                            message_parts[-1]["state"] = "output-available"
                                        
                                        yield format_sse({
                                            "type": "tool-output-available",
                                            "toolCallId": tool_call_id,
                                            "output": output
                                        })
                                        
                                        # Reset text stream state for potential new text after tool
                                        # Generate new text_stream_id and reset flags
                                        text_stream_id = f"text-{uuid.uuid4().hex[:8]}"
                                        text_started = False
                                        text_finished = False
                                    else:
                                        # Tool execution error
                                        error_text = tool_result.get('content', [{}])[0].get('text', 'Tool execution failed')
                                        yield format_sse({
                                            "type": "tool-output-error",
                                            "toolCallId": tool_call_id,
                                            "errorText": error_text
                                        })
                                        
                                        # Reset text stream state for potential new text after tool error
                                        # Generate new text_stream_id and reset flags
                                        text_stream_id = f"text-{uuid.uuid4().hex[:8]}"
                                        text_started = False
                                        text_finished = False
                
                # Handle message stop
                elif 'event' in event and 'messageStop' in event['event']:
                    if 'stopReason' in event['event']['messageStop']:
                        finish_reason = event['event']['messageStop']['stopReason']
                        
                        # Only send finish if not a tool use - tool use should continue for tool execution
                        if finish_reason != "tool_use":
                            # Save remaining text part if exists
                            if current_text_part:
                                message_parts.append(current_text_part)
                                current_text_part = None
                            
                            # End text stream if it was started
                            if text_started and not text_finished:
                                yield format_sse({"type": "text-end", "id": text_stream_id})
                                text_finished = True
                            
                            # Send finish message with metadata
                            finish_metadata = {
                                "finishReason": finish_reason.replace("_", "-")
                            }
                            
                            # Call onFinish callback with buffered message
                            if on_finish:
                                on_finish({
                                    "role": "assistant",
                                    "parts": message_parts,
                                    "metadata": finish_metadata
                                })
                            
                            yield format_sse({"type": "finish", "messageMetadata": finish_metadata})
        
        # Ensure text stream is ended
        if text_started and not text_finished:
            yield format_sse({"type": "text-end", "id": text_stream_id})
        
        # Call onFinish with final buffered message
        if current_text_part:
            message_parts.append(current_text_part)
        if on_finish and finish_reason:
            on_finish({
                "role": "assistant",
                "parts": message_parts,
                "metadata": {"finishReason": finish_reason.replace("_", "-")} if finish_reason else {}
            })
        
        yield "data: [DONE]\n\n"
        
    except Exception:
        traceback.print_exc()
        raise


def stream_text(
    client: OpenAI,
    messages: Sequence[ChatCompletionMessageParam],
    tool_definitions: Sequence[Dict[str, Any]],
    available_tools: Mapping[str, Callable[..., Any]],
    protocol: str = "data",
):
    """Yield Server-Sent Events for a streaming chat completion."""
    try:
        def format_sse(payload: dict) -> str:
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        message_id = f"msg-{uuid.uuid4().hex}"
        text_stream_id = "text-1"
        text_started = False
        text_finished = False
        finish_reason = None
        usage_data = None
        tool_calls_state: Dict[int, Dict[str, Any]] = {}

        yield format_sse({"type": "start", "messageId": message_id})

        stream = client.chat.completions.create(
            messages=messages,
            model="gpt-4o",
            stream=True,
            tools=tool_definitions,
        )

        for chunk in stream:
            for choice in chunk.choices:
                if choice.finish_reason is not None:
                    finish_reason = choice.finish_reason

                delta = choice.delta
                if delta is None:
                    continue

                if delta.content is not None:
                    if not text_started:
                        yield format_sse({"type": "text-start", "id": text_stream_id})
                        text_started = True
                    yield format_sse(
                        {"type": "text-delta", "id": text_stream_id, "delta": delta.content}
                    )

                if delta.tool_calls:
                    for tool_call_delta in delta.tool_calls:
                        index = tool_call_delta.index
                        state = tool_calls_state.setdefault(
                            index,
                            {
                                "id": None,
                                "name": None,
                                "arguments": "",
                                "started": False,
                            },
                        )

                        if tool_call_delta.id is not None:
                            state["id"] = tool_call_delta.id
                            if (
                                state["id"] is not None
                                and state["name"] is not None
                                and not state["started"]
                            ):
                                yield format_sse(
                                    {
                                        "type": "tool-input-start",
                                        "toolCallId": state["id"],
                                        "toolName": state["name"],
                                    }
                                )
                                state["started"] = True

                        function_call = getattr(tool_call_delta, "function", None)
                        if function_call is not None:
                            if function_call.name is not None:
                                state["name"] = function_call.name
                                if (
                                    state["id"] is not None
                                    and state["name"] is not None
                                    and not state["started"]
                                ):
                                    yield format_sse(
                                        {
                                            "type": "tool-input-start",
                                            "toolCallId": state["id"],
                                            "toolName": state["name"],
                                        }
                                    )
                                    state["started"] = True

                            if function_call.arguments:
                                if (
                                    state["id"] is not None
                                    and state["name"] is not None
                                    and not state["started"]
                                ):
                                    yield format_sse(
                                        {
                                            "type": "tool-input-start",
                                            "toolCallId": state["id"],
                                            "toolName": state["name"],
                                        }
                                    )
                                    state["started"] = True

                                state["arguments"] += function_call.arguments
                                if state["id"] is not None:
                                    yield format_sse(
                                        {
                                            "type": "tool-input-delta",
                                            "toolCallId": state["id"],
                                            "inputTextDelta": function_call.arguments,
                                        }
                                    )

            if not chunk.choices and chunk.usage is not None:
                usage_data = chunk.usage

        if finish_reason == "stop" and text_started and not text_finished:
            yield format_sse({"type": "text-end", "id": text_stream_id})
            text_finished = True

        if finish_reason == "tool_calls":
            for index in sorted(tool_calls_state.keys()):
                state = tool_calls_state[index]
                tool_call_id = state.get("id")
                tool_name = state.get("name")

                if tool_call_id is None or tool_name is None:
                    continue

                if not state["started"]:
                    yield format_sse(
                        {
                            "type": "tool-input-start",
                            "toolCallId": tool_call_id,
                            "toolName": tool_name,
                        }
                    )
                    state["started"] = True

                raw_arguments = state["arguments"]
                try:
                    parsed_arguments = json.loads(raw_arguments) if raw_arguments else {}
                except Exception as error:
                    yield format_sse(
                        {
                            "type": "tool-input-error",
                            "toolCallId": tool_call_id,
                            "toolName": tool_name,
                            "input": raw_arguments,
                            "errorText": str(error),
                        }
                    )
                    continue

                yield format_sse(
                    {
                        "type": "tool-input-available",
                        "toolCallId": tool_call_id,
                        "toolName": tool_name,
                        "input": parsed_arguments,
                    }
                )

                tool_function = available_tools.get(tool_name)
                if tool_function is None:
                    yield format_sse(
                        {
                            "type": "tool-output-error",
                            "toolCallId": tool_call_id,
                            "errorText": f"Tool '{tool_name}' not found.",
                        }
                    )
                    continue

                try:
                    tool_result = tool_function(**parsed_arguments)
                except Exception as error:
                    yield format_sse(
                        {
                            "type": "tool-output-error",
                            "toolCallId": tool_call_id,
                            "errorText": str(error),
                        }
                    )
                else:
                    yield format_sse(
                        {
                            "type": "tool-output-available",
                            "toolCallId": tool_call_id,
                            "output": tool_result,
                        }
                    )

        if text_started and not text_finished:
            yield format_sse({"type": "text-end", "id": text_stream_id})
            text_finished = True

        finish_metadata: Dict[str, Any] = {}
        if finish_reason is not None:
            finish_metadata["finishReason"] = finish_reason.replace("_", "-")

        if usage_data is not None:
            usage_payload = {
                "promptTokens": usage_data.prompt_tokens,
                "completionTokens": usage_data.completion_tokens,
            }
            total_tokens = getattr(usage_data, "total_tokens", None)
            if total_tokens is not None:
                usage_payload["totalTokens"] = total_tokens
            finish_metadata["usage"] = usage_payload

        if finish_metadata:
            yield format_sse({"type": "finish", "messageMetadata": finish_metadata})
        else:
            yield format_sse({"type": "finish"})

        yield "data: [DONE]\n\n"
    except Exception:
        traceback.print_exc()
        raise


def patch_response_with_headers(
    response: StreamingResponse,
    protocol: str = "data",
) -> StreamingResponse:
    """Apply the standard streaming headers expected by the Vercel AI SDK."""

    response.headers["x-vercel-ai-ui-message-stream"] = "v1"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    response.headers["X-Accel-Buffering"] = "no"

    if protocol:
        response.headers.setdefault("x-vercel-ai-protocol", protocol)

    return response
