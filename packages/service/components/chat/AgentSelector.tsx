'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Bot, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgents } from './hooks/useAgents';
import type { AgentItem } from '@/lib/api-client';

export function AgentSelector() {
  const router = useRouter();
  const t = useTranslations();
  const { agents, isLoading, createAgent, deleteAgent } = useAgents();
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateAgent = useCallback(async () => {
    setIsCreating(true);
    try {
      const agent = await createAgent(newAgentName || undefined);
      setNewAgentName('');
      setDialogOpen(false);
      // Navigate to the new agent
      router.push(`/chat/${agent.uuid}`);
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsCreating(false);
    }
  }, [createAgent, newAgentName, router]);

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      router.push(`/chat/${agentId}`);
    },
    [router]
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent, agent: AgentItem) => {
    e.stopPropagation();
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!agentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAgent(agentToDelete.uuid);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  }, [agentToDelete, deleteAgent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('agent.selectAgent')}</h1>
          <p className="text-muted-foreground">{t('agent.selectAgentDescription')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {agents.map((agent) => (
            <Card
              key={agent.uuid}
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => handleSelectAgent(agent.uuid)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="size-5 text-primary" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={(e) => handleDeleteClick(e, agent)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('agent.createdAt')}: {new Date(agent.created_at).toLocaleDateString()}
                </CardDescription>
              </CardContent>
            </Card>
          ))}

          {/* Create New Agent Card */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:border-primary transition-colors border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Plus className="size-5 text-muted-foreground" />
                    <CardTitle className="text-lg text-muted-foreground">
                      {t('agent.createNew')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t('agent.createNewDescription')}</CardDescription>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('agent.createNewAgent')}</DialogTitle>
                <DialogDescription>{t('agent.createNewAgentDescription')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('agent.name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('agent.namePlaceholder')}
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateAgent();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateAgent} disabled={isCreating}>
                  {isCreating && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {t('common.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {agents.length === 0 && (
          <div className="text-center text-muted-foreground">
            <p>{t('agent.noAgents')}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('agent.deleteAgent')}</DialogTitle>
            <DialogDescription>
              {t('agent.deleteAgentConfirmation', { name: agentToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
