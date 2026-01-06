'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleCallback } from '@/lib/auth';
import { Loader } from '@/components/ai-elements/loader';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleCallback();
        // Redirect to chat after successful authentication
        router.push('/chat');
      } catch (error) {
        console.error('Authentication callback failed:', error);
        // Redirect to home page on error
        router.push('/');
      }
    };

    processCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader size={40} />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
