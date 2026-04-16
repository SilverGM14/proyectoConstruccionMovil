// hooks/useOfflineMutation.ts
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDB } from '@/lib/offlineDB';
import { supabase } from '@/lib/supabaseClient';

type MutationAction = 'insert' | 'update' | 'delete';

export function useOfflineMutation(table: string) {
  const isOnline = useNetworkStatus();

  const mutate = async (
    action: MutationAction,
    payload?: any,
    recordId?: number
  ) => {
    if (isOnline) {
      // Ejecutar directamente en Supabase
      let result;
      if (action === 'insert') result = await supabase.from(table).insert(payload);
      else if (action === 'update') result = await supabase.from(table).update(payload).eq('id', recordId);
      else if (action === 'delete') result = await supabase.from(table).delete().eq('id', recordId);
      return result;
    } else {
      // Guardar en cola local
      await offlineDB.pendingOperations.add({
        table,
        action,
        payload,
        recordId,
        timestamp: Date.now(),
        synced: false,
      });
      // Retornar un objeto simulado para que el UI no falle
      return { data: payload, error: null };
    }
  };

  return { mutate };
}