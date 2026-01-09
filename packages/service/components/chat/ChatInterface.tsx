'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  PromptInputHeader,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { MessageSquareIcon, FileText, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { ConversationSidebar } from './ConversationSidebar';
import { MobileSidebar } from './MobileSidebar';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ToolRenderer } from './ToolRenderer';
import { FileUploadButton } from './FileUploadButton';
import { FileAttachments } from './FileList';
import { useConversations } from './hooks/useConversations';
import { useFileUpload } from './hooks/useFileUpload';
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

  // File upload hook
  const {
    files,
    isUploading,
    uploadFiles,
    removeFile,
    clearFiles,
    getCompletedFileIds,
  } = useFileUpload();

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
        const lastMessage = messages[messages.length - 1];

        // Extract file IDs from parts array (filter type='file' and get url)
        const fileIds = (lastMessage as any).parts
          ?.filter((part: any) => part.type === 'file')
          .map((part: any) => part.url) || [];

        return {
          body: {
            message: lastMessage,
            id,
            file_ids: fileIds.length > 0 ? fileIds : undefined,
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
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

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
      if (!input.trim() && files.length === 0) {
        return;
      }

      // Get completed file IDs
      const fileIds = getCompletedFileIds();

      // Send message with files (url field contains file ID)
      sendMessage({
        text: input,
        files: fileIds.map((id) => {
          const file = files.find((f) => f.id === id);
          return {
            type: 'file' as const,
            name: file?.filename || 'file',
            url: id,
            mediaType: file?.mimeType || 'application/octet-stream',
          };
        }),
      });

      setInput('');
      clearFiles();
    },
    [input, files, getCompletedFileIds, sendMessage, clearFiles]
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      try {
        await uploadFiles(fileList);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [uploadFiles]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        await handleFilesSelected(droppedFiles);
      }
    },
    [handleFilesSelected]
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
        <div
          className="flex flex-col h-full w-full flex-1 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload className="size-12" />
                <p className="text-lg font-medium">{t('promptInput.uploadFiles')}</p>
              </div>
            </div>
          )}

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

                          // Handle file parts
                          if (part.type === 'file') {
                            const filePart = part as { type: 'file'; name: string; url: string; mediaType: string };
                            return (
                              <div
                                key={`${message.id}-file-${i}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border bg-muted/50 w-fit mb-2"
                              >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="max-w-[200px] truncate" title={filePart.name}>
                                  {filePart.name}
                                </span>
                              </div>
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
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t p-4 bg-background">
            <PromptInput onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <PromptInputHeader>
                <FileAttachments files={files} onRemove={removeFile} />
              </PromptInputHeader>
              <PromptInputTextarea
                placeholder={t('chat.sendMessage')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <PromptInputFooter>
                <FileUploadButton
                  onFilesSelected={handleFilesSelected}
                  isUploading={isUploading}
                  disabled={isLoading}
                />
                <PromptInputSubmit
                  status={status}
                  disabled={(!input.trim() && files.length === 0) || isLoading || isUploading}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </>
  );
}
