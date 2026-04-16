// lib/offlineDB.ts
import Dexie, { Table } from 'dexie';

export interface PendingOperation {
  id?: number;
  table: string;          // 'obras', 'empleados', 'pagos', etc.
  action: 'insert' | 'update' | 'delete';
  payload: any;           // data to send (for insert/update)
  recordId?: number;      // ID of the record (for update/delete)
  timestamp: number;
  synced: boolean;
}

class OfflineDB extends Dexie {
  pendingOperations!: Table<PendingOperation>;

  constructor() {
    super('GoMeOfflineDB');
    this.version(1).stores({
      pendingOperations: '++id, table, synced, timestamp'
    });
  }
}

export const offlineDB = new OfflineDB();