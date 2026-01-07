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
import { MessageSquareIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Weather } from '@/components/weather';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChatInterfaceProps {
  conversationId: string;
}

// Separate component for Tool rendering with state management
function ToolRenderer({ 
  part, 
  toolCallId, 
  toolName,
  addToolApprovalResponse,
  sendMessage 
}: { 
  part: any;
  toolCallId: string;
  toolName: string;
  addToolApprovalResponse: any;
  sendMessage: any;
}) {
  const { state, output, approval, input } = part;
  const [isOpen, setIsOpen] = React.useState(false);

  // Automatically open when approval is requested
  React.useEffect(() => {
    if (state === 'approval-requested') {
      setIsOpen(true);
    }
  }, [state]);

  return (
    <div className="my-2">
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader 
          type={part.type}
          state={state}
          title={toolName}
        />
        <ToolContent>
          {/* Show approval request if tool requires approval */}
          {state === 'approval-requested' && approval && (
            <div className="space-y-3 p-3">
              <div className="text-sm">
                <div className="font-medium mb-2">Tool requires approval:</div>
                <div className="bg-muted rounded p-2 font-mono text-xs">
                  {JSON.stringify(input, null, 2)}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await addToolApprovalResponse({
                      id: approval?.id,
                      approved: true,
                    });
                    sendMessage();
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await addToolApprovalResponse({
                      id: approval?.id,
                      approved: false,
                    });
                    sendMessage();
                  }}
                >
                  Deny
                </Button>
              </div>
            </div>
          )}

          {/* Show input if available */}
          {input && state !== 'approval-requested' && (
            <div className="p-3 border-b">
              <div className="text-sm font-medium mb-2">Input:</div>
              <div className="bg-muted rounded p-2 font-mono text-xs">
                {JSON.stringify(input, null, 2)}
              </div>
            </div>
          )}

          {/* Show output when available */}
          {state === 'output-available' && output && (
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
          )}

          {/* Show loading state while tool is executing */}
          {state === 'input-streaming' && (
            <div className="flex items-center gap-2 p-2">
              <Loader size={16} />
              <span className="text-sm text-muted-foreground">
                {toolName === 'get_current_weather' ? 'Getting weather...' : `Executing ${toolName}...`}
              </span>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}

interface ConversationItem {
  uuid: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const router = useRouter();
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);
  const { getAccessToken } = useAuth();

  const { messages, sendMessage, addToolApprovalResponse, setMessages, status } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: '/api/agent/chat',
      headers: async (): Promise<Record<string, string>> => {
        const token = await getAccessToken();
        return token ? {
          'Authorization': `Bearer ${token}`,
        } : {};
      },
      // Only send the latest user message to reduce network payload
      prepareSendMessagesRequest({ messages, id }) {
        return {
          body: {
            message: messages[messages.length - 1],
            id,
          },
        };
      },
    }) as any,
  });

  const [input, setInput] = React.useState('');
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch conversations list
  React.useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await api.getConversations();
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
        const data = await api.getConversationMessages(conversationId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages(data as any);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, setMessages]);

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

  const handleDeleteClick = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setConversationToDelete(uuid);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);
    try {
      await api.deleteConversation(conversationToDelete);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.uuid !== conversationToDelete));
      
      // If we deleted the current conversation, redirect to new chat
      if (conversationToDelete === conversationId) {
        const newId = crypto.randomUUID();
        router.push(`/chat/${newId}`);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  return (
    <>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-full w-full">
      {/* Left Sidebar - Conversation List */}
      <div className="w-64 border-r bg-background flex flex-col h-full">
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
                <div key={conv.uuid} className="group relative">
                  <Button
                    onClick={() => handleSelectConversation(conv.uuid)}
                    variant={conversationId === conv.uuid ? 'default' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2 px-3 pr-10"
                    title={conv.title}
                  >
                    <div className="truncate text-sm">
                      {conv.title}
                    </div>
                  </Button>
                  <Button
                    onClick={(e) => handleDeleteClick(conv.uuid, e)}
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    title="Delete conversation"
                  >
                    <Trash2Icon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col h-full w-full flex-1">
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
                          const { toolCallId } = part;
                          console.log(part);
                          const toolName = part.type.replace('tool-', '');

                          return (
                            <ToolRenderer
                              key={toolCallId}
                              part={part}
                              toolCallId={toolCallId}
                              toolName={toolName}
                              addToolApprovalResponse={addToolApprovalResponse}
                              sendMessage={sendMessage}
                            />
                          );
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
    </>
  );
}
