'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { MessageSquareIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { ConversationSidebar } from './ConversationSidebar';
import { MobileSidebar } from './MobileSidebar';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ToolRenderer } from './ToolRenderer';
import { useConversations } from './hooks/useConversations';
import type { ToolUIPart } from 'ai';

export interface ChatInterfaceProps {
  /** The unique identifier for the current conversation */
  conversationId: string;
}

/**
 * Main chat interface component
 *
 * @example
 * ```tsx
 * <ChatInterface conversationId="uuid-123" />
 * ```
 */
export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const { getAccessToken } = useAuth();

  // Conversations hook
  const {
    conversations,
    isLoading: isLoadingConversations,
    deleteConversation,
  } = useConversations();

  // Chat hook
  const { messages, sendMessage, addToolApprovalResponse, setMessages, status } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: '/api/agent/chat',
      headers: async (): Promise<Record<string, string>> => {
        const token = await getAccessToken();
        return token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};
      },
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

  // Local state
  const [input, setInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = useMemo(
    () => status === 'submitted' || status === 'streaming',
    [status]
  );

  // Fetch historical messages for the conversation
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          setMessages([]);
        }
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
  }, [conversationId, setMessages, getAccessToken]);

  // Handlers
  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID();
    router.push(`/chat/${newId}`);
  }, [router]);

  const handleSelectConversation = useCallback(
    (uuid: string) => {
      router.push(`/chat/${uuid}`);
    },
    [router]
  );

  const handleSubmit = useCallback(
    (_message: PromptInputMessage) => {
      if (!input.trim()) {
        return;
      }
      sendMessage({ text: input });
      setInput('');
    },
    [input, sendMessage]
  );

  const handleDeleteClick = useCallback((uuid: string) => {
    setConversationToDelete(uuid);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteConversation(conversationToDelete);
      if (success && conversationToDelete === conversationId) {
        handleNewChat();
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  }, [conversationToDelete, conversationId, deleteConversation, handleNewChat]);

  // Sidebar props
  const sidebarProps = useMemo(
    () => ({
      conversations,
      currentConversationId: conversationId,
      isLoading: isLoadingConversations,
      onNewChat: handleNewChat,
      onSelectConversation: handleSelectConversation,
      onDeleteConversation: handleDeleteClick,
    }),
    [
      conversations,
      conversationId,
      isLoadingConversations,
      handleNewChat,
      handleSelectConversation,
      handleDeleteClick,
    ]
  );

  return (
    <>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <div className="flex h-full w-full">
        {/* Desktop Sidebar */}
        <ConversationSidebar {...sidebarProps} />

        {/* Main Chat Area */}
        <div className="flex flex-col h-full w-full flex-1">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 p-2 border-b">
            <MobileSidebar {...sidebarProps} />
          </div>

          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title={t('chat.startConversation')}
                  description={t('chat.askAnything')}
                  icon={<MessageSquareIcon className="size-6" />}
                />
              ) : (
                <>
                  {messages.map((message: UIMessage) => (
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
                        {message.parts.map((part, i: number) => {
                          // Handle text parts
                          if (part.type === 'text') {
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          }

                          // Handle tool calls - type is "tool-{toolName}" in AI SDK v5
                          if (part.type?.startsWith('tool-')) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const toolPart = part as unknown as ToolUIPart<any>;
                            const toolName = part.type.replace('tool-', '');

                            return (
                              <ToolRenderer
                                key={toolPart.toolCallId}
                                part={toolPart}
                                toolCallId={toolPart.toolCallId}
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
                      <span className="text-sm text-muted-foreground">
                        {t('chat.aiThinking')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </ConversationContent>
          </Conversation>

          <div className="border-t p-4 bg-background">
            <PromptInput onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <PromptInputTextarea
                placeholder={t('chat.sendMessage')}
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
