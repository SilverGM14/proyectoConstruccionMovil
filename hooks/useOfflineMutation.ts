// hooks/useOfflineMutation.ts
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDB } from '@/lib/offlineDB';
import { supabase } from '@/lib/supabaseClient';
import { PostgrestError } from '@supabase/supabase-js';

type MutationAction = 'insert' | 'update' | 'delete';

interface MutationResult {
  data: any | null;
  error: PostgrestError | Error | null;
}

export function useOfflineMutation(table: string) {
  const isOnline = useNetworkStatus();

  const mutate = async (
    action: MutationAction,
    payload?: any,
    recordId?: number
  ): Promise<MutationResult> => {
    if (isOnline) {
      // Ejecutar directamente en Supabase
      let result;
      try {
        if (action === 'insert') {
          result = await supabase.from(table).insert(payload);
        } else if (action === 'update') {
          result = await supabase.from(table).update(payload).eq('id', recordId);
        } else if (action === 'delete') {
          result = await supabase.from(table).delete().eq('id', recordId);
        }
        return { data: result?.data ?? null, error: result?.error ?? null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    } else {
      // Guardar en cola local
      try {
        await offlineDB.pendingOperations.add({
          table,
          action,
          payload,
          recordId,
          timestamp: Date.now(),
          synced: false,
        });
        return { data: payload, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    }
  };

  return { mutate };
}