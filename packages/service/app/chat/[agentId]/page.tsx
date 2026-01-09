'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingScreen } from '@/components/loading-screen';

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    const agentId = params?.agentId as string;
    if (agentId) {
      // Generate a new conversation UUID and redirect
      const newConversationId = crypto.randomUUID();
      router.push(`/chat/${agentId}/${newConversationId}`);
    }
  }, [params, router]);

  return <LoadingScreen message={t('common.loading')} />;
}
