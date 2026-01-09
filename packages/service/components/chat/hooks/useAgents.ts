'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type AgentItem } from '@/lib/api-client';

/**
 * Hook for managing agents list
 */
export function useAgents() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (name?: string) => {
    try {
      const newAgent = await api.createAgent(name);
      setAgents((prev) => [newAgent, ...prev]);
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      throw err;
    }
  }, []);

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      await api.deleteAgent(agentId);
      setAgents((prev) => prev.filter((agent) => agent.uuid !== agentId));
      return true;
    } catch (err) {
      console.error('Failed to delete agent:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refetch: fetchAgents,
    createAgent,
    deleteAgent,
  };
}
