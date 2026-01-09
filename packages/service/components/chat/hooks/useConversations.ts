'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type ConversationItem } from '@/lib/api-client';

interface UseConversationsOptions {
  agentId?: string;
}

/**
 * Hook for managing conversations list
 */
export function useConversations(options: UseConversationsOptions = {}) {
  const { agentId } = options;
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = agentId
        ? await api.getAgentConversations(agentId)
        : await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await api.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.uuid !== conversationId));
      return true;
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
    deleteConversation,
  };
}
