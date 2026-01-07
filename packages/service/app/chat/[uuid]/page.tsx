'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChatInterface } from '@/components/chat';
import { LoadingScreen } from '@/components/loading-screen';

export default function Page() {
  const params = useParams();
  const t = useTranslations();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = params?.uuid as string;
    if (id) {
      setConversationId(id);
      setIsLoading(false);
    }
  }, [params]);

  if (isLoading || !conversationId) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  return <ChatInterface conversationId={conversationId} />;
}
