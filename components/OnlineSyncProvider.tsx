// components/OnlineSyncProvider.tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { processPendingOperations } from '@/lib/syncService';

export function OnlineSyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isOnline) {
      processPendingOperations().then(() => {
        console.log('[Sync] Pending operations synchronized');
      }).catch(err => {
        console.error('[Sync] Error during sync:', err);
      });
    }
  }, [isOnline]);

  return <>{children}</>;
}