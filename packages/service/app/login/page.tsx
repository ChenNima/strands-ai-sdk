'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingScreen } from '@/components/loading-screen';

export default function LoginPage() {
  const t = useTranslations('login');
  const tCommon = useTranslations('common');
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return <LoadingScreen message={tCommon('loading')} />;
  }

  if (isAuthenticated) {
    return <LoadingScreen message={tCommon('redirecting')} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={login}
            className="w-full"
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            {t('signIn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
