'use client';

import { Loader } from '@/components/ai-elements/loader';
import { useTranslations } from 'next-intl';

export interface LoadingScreenProps {
  /** Custom loading message. If not provided, uses i18n default */
  message?: string;
  /** Size of the loader icon */
  size?: number;
}

/**
 * Unified loading screen component
 *
 * @example
 * ```tsx
 * <LoadingScreen />
 * <LoadingScreen message="Custom loading message" />
 * ```
 */
export function LoadingScreen({ message, size = 40 }: LoadingScreenProps) {
  const t = useTranslations('common');

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader size={size} />
        <p className="text-muted-foreground">{message || t('loading')}</p>
      </div>
    </div>
  );
}
