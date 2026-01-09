'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '@/components/ai-elements/loader';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MenuIcon, PlusIcon, Trash2Icon, ChevronLeft, Bot } from 'lucide-react';
import type { ConversationSidebarProps } from './ConversationSidebar';

/**
 * Mobile sidebar component with sheet/drawer behavior
 */
export function MobileSidebar({
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
  const [open, setOpen] = useState(false);

  const handleSelectConversation = (uuid: string) => {
    onSelectConversation(uuid);
    setOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setOpen(false);
  };

  const handleBackToAgents = () => {
    if (onBackToAgents) {
      onBackToAgents();
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          {/* Agent Header */}
          {onBackToAgents && (
            <Button
              onClick={handleBackToAgents}
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2 px-2 mb-2 hover:bg-muted"
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
              <Bot className="size-4 text-primary" />
              <span className="truncate font-medium">{agentName || t('agent.untitled')}</span>
            </Button>
          )}
          <div className="flex gap-2">
            <ThemeToggle />
            <Button
              onClick={handleNewChat}
              className="flex-1 gap-2"
              variant="default"
            >
              <PlusIcon className="size-4" />
              {t('chat.newChat')}
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
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
                    onClick={() => handleSelectConversation(conv.uuid)}
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
      </SheetContent>
    </Sheet>
  );
}
