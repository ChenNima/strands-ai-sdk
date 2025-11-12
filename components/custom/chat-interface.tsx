'use client';

import { useChat } from '@ai-sdk/react';
import React from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { 
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';
import { MessageSquareIcon } from 'lucide-react';
import { Weather } from '@/components/weather';

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    id: 'chat-001',
  });

  const [input, setInput] = React.useState('');
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (message: PromptInputMessage) => {
    if (!input.trim()) {
      return;
    }

    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* @ts-ignore - Conversation component has type definition issues but works correctly */}
      <Conversation className="flex-1">
        {/* @ts-ignore - ConversationContent component has type definition issues but works correctly */}
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything about the weather or other topics"
              icon={<MessageSquareIcon className="size-6" />}
            />
          ) : (
            <>
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part: any, i: number) => {
                      // Handle text parts
                      if (part.type === 'text') {
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }
                      
                      // Handle tool calls - type is "tool-{toolName}" in AI SDK
                      if (part.type?.startsWith('tool-')) {
                        const { toolCallId, state, output } = part;
                        const toolName = part.type.replace('tool-', '');

                        // Show output when available
                        if (state === 'output-available' && output) {
                          return (
                            <div key={toolCallId} className="my-2">
                              <Tool>
                                <ToolHeader type="tool-call" state={state} />
                                <ToolContent>
                                  <ToolOutput 
                                    output={
                                      toolName === 'get_current_weather' ? (
                                        <Weather weatherAtLocation={typeof output === 'string' ? JSON.parse(output) : output} />
                                      ) : (
                                        <pre className="text-xs">{typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre>
                                      )
                                    }
                                    errorText={undefined}
                                  />
                                </ToolContent>
                              </Tool>
                            </div>
                          );
                        }

                        // Show loading state while tool is executing
                        if (state === 'input-streaming' || state === 'input-available') {
                          return (
                            <div key={toolCallId} className="my-2">
                              <Tool>
                                <ToolHeader type="tool-call" state={state} />
                                <ToolContent>
                                  {toolName === 'get_current_weather' && (
                                    <div className="flex items-center gap-2 p-2">
                                      <Loader size={16} />
                                      <span className="text-sm text-muted-foreground">Getting weather...</span>
                                    </div>
                                  )}
                                </ToolContent>
                              </Tool>
                            </div>
                          );
                        }
                      }
                      
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 p-4">
                  <Loader size={24} />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              )}
            </>
          )}
        </ConversationContent>
      </Conversation>

      <div className="border-t p-4 bg-background">
        <PromptInput onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <PromptInputTextarea
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <PromptInputFooter>
            <PromptInputSubmit 
              status={status}
              disabled={!input.trim() || isLoading}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
