'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ai-elements/loader';
import { LogIn, LogOut, User, Languages, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

export function AuthButton() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const t = useTranslations('navbar');
  const locale = useLocale();

  const switchLanguage = useCallback((newLocale: string) => {
    // Save to localStorage
    localStorage.setItem('locale', newLocale);
    // Set cookie for server-side rendering
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    // Reload page to apply new locale
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader size={16} />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button variant="default" size="sm" onClick={login}>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <User className="mr-2 h-4 w-4" />
          {user?.profile?.name || user?.profile?.email || 'User'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user?.profile?.email && (
          <>
            <DropdownMenuLabel className="font-normal text-sm text-muted-foreground">
              {user.profile.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 h-4 w-4" />
            {t('language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => switchLanguage('en')}>
                {locale === 'en' && <Check className="mr-2 h-4 w-4" />}
                {locale !== 'en' && <span className="mr-2 w-4" />}
                {t('english')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchLanguage('zh')}>
                {locale === 'zh' && <Check className="mr-2 h-4 w-4" />}
                {locale !== 'zh' && <span className="mr-2 w-4" />}
                {t('chinese')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
