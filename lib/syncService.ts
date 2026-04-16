// lib/syncService.ts
import { supabase } from './supabaseClient';
import { offlineDB } from './offlineDB';

export async function processPendingOperations() {
  const pending = await offlineDB.pendingOperations
    .where('synced')
    .equals(false)
    .sortBy('timestamp');

  for (const op of pending) {
    try {
      let result;
      switch (op.action) {
        case 'insert':
          result = await supabase.from(op.table).insert(op.payload);
          break;
        case 'update':
          result = await supabase
            .from(op.table)
            .update(op.payload)
            .eq('id', op.recordId);
          break;
        case 'delete':
          result = await supabase
            .from(op.table)
            .delete()
            .eq('id', op.recordId);
          break;
      }

      if (result?.error) throw result.error;

      // Mark as synced
      await offlineDB.pendingOperations.update(op.id!, { synced: true });
    } catch (error) {
      console.error(`[Sync] Failed to sync operation ${op.id}:`, error);
      // Optionally implement retry logic here
    }
  }
}