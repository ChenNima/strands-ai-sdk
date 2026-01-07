'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { handleCallback } from '@/lib/auth';
import { LoadingScreen } from '@/components/loading-screen';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CallbackPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleCallback();
        router.push('/chat');
      } catch (err) {
        console.error('Authentication callback failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    processCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">{t('authFailed')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/login')} variant="outline">
            {t('backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return <LoadingScreen message={t('completing')} />;
}
