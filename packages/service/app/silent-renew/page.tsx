'use client';

import { useEffect } from 'react';
import { getUserManager } from '@/lib/auth';

export default function SilentRenewPage() {
  useEffect(() => {
    const processSilentRenew = async () => {
      try {
        const userManager = getUserManager();
        await userManager.signinSilentCallback();
      } catch (error) {
        console.error('Silent renew failed:', error);
      }
    };

    processSilentRenew();
  }, []);

  return null;
}
