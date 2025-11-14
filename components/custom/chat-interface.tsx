'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import React from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquareIcon, PlusIcon } from 'lucide-react';
import { Weather } from '@/components/weather';
import { ThemeToggle } from '@/components/theme-toggle';

interface ChatInterfaceProps {
  conversationId: string;
}

interface ConversationItem {
  uuid: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const router = useRouter();
  const [historicalMessages, setHistoricalMessages] = React.useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // Only send the latest user message to reduce network payload
      prepareSendMessagesRequest({ messages, id }) {
        return {
          body: {
            message: messages[messages.length - 1],
            id,
          },
        };
      },
    }),
  });

  const [input, setInput] = React.useState('');
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(true);
  
  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch conversations list
  React.useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch historical messages for the conversation
  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        const data = await response.json();
        setHistoricalMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        setHistoricalMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  // Combine historical messages with current messages
  const allMessages = React.useMemo(() => {
    return [...historicalMessages, ...messages];
  }, [historicalMessages, messages]);

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    router.push(`/chat/${newId}`);
  };

  const handleSelectConversation = (uuid: string) => {
    router.push(`/chat/${uuid}`);
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (!input.trim()) {
      return;
    }

    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Conversation List */}
      <div className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <ThemeToggle />
            <Button 
              onClick={handleNewChat}
              className="flex-1 gap-2"
              variant="default"
            >
              <PlusIcon className="size-4" />
              New Chat
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={20} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <Button
                  key={conv.uuid}
                  onClick={() => handleSelectConversation(conv.uuid)}
                  variant={conversationId === conv.uuid ? 'default' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  title={conv.title}
                >
                  <div className="truncate text-sm">
                    {conv.title}
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col h-screen w-full flex-1">
        {/* @ts-ignore - Conversation component has type definition issues but works correctly */}
        <Conversation className="flex-1">
          {/* @ts-ignore - ConversationContent component has type definition issues but works correctly */}
          <ConversationContent>
            {allMessages.length === 0 ? (
              <ConversationEmptyState
                title="Start a conversation"
                description="Ask me anything about the weather or other topics"
                icon={<MessageSquareIcon className="size-6" />}
              />
            ) : (
              <>
                {allMessages.map((message) => (
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
    </div>
  );
}
