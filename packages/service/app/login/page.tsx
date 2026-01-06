'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ai-elements/loader';
import { LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to chat
    if (isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader size={40} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader size={40} />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Strands AI SDK</CardTitle>
          <CardDescription>
            Sign in to start chatting with AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={login} 
            className="w-full" 
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign In with OIDC
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
