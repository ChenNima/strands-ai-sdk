'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '@/components/ai-elements/loader';
import { PlusIcon, Trash2Icon, ChevronLeft, Bot } from 'lucide-react';
import type { ConversationItem } from '@/lib/api-client';

export interface ConversationSidebarProps {
  conversations: ConversationItem[];
  currentConversationId: string;
  isLoading: boolean;
  agentName?: string;
  onNewChat: () => void;
  onSelectConversation: (uuid: string) => void;
  onDeleteConversation: (uuid: string) => void;
  onBackToAgents?: () => void;
}

/**
 * Sidebar component displaying conversation list
 */
export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  agentName,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onBackToAgents,
}: ConversationSidebarProps) {
  const t = useTranslations();

  return (
    <div className="w-64 border-r bg-background flex-col h-full hidden md:flex">
      {/* Agent Header */}
      {onBackToAgents && (
        <div className="p-3 border-b bg-muted/30">
          <Button
            onClick={onBackToAgents}
            variant="ghost"
            className="w-full justify-start gap-2 h-auto py-2 px-2 hover:bg-muted"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
            <Bot className="size-4 text-primary" />
            <span className="truncate font-medium">{agentName || t('agent.untitled')}</span>
          </Button>
        </div>
      )}

      <div className="p-4 border-b">
        <Button
          onClick={onNewChat}
          className="w-full gap-2"
          variant="default"
        >
          <PlusIcon className="size-4" />
          {t('chat.newChat')}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {t('chat.noConversations')}
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.uuid} className="group relative">
                <Button
                  onClick={() => onSelectConversation(conv.uuid)}
                  variant={currentConversationId === conv.uuid ? 'default' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-2 px-3 pr-10"
                  title={conv.title}
                >
                  <div className="truncate text-sm">{conv.title}</div>
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.uuid);
                  }}
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-7 w-7"
                  title={t('chat.deleteConversation')}
                >
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
