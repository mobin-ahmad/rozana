import { TableName, getActiveChainId, getCurrentUser, isUserSuperAdmin, getSettings } from './storage';

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  try {
    const user = getCurrentUser();
    const chainId = getActiveChainId();
    const settings = getSettings();
    return {
      'x-rozana-chain-id': chainId || 'chain-default',
      'x-rozana-branch-id': settings?.active_branch_id || '',
      'x-rozana-user-id': String(user?.id || 1),
      'x-rozana-role': user?.role || 'cashier',
      'x-rozana-super-admin': isUserSuperAdmin(user) ? 'true' : 'false',
      ...(extra || {}),
    };
  } catch {
    return { ...(extra || {}) };
  }
}

export interface DbConnectionStatus {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  user: string;
  server_version?: string;
  is_target_rozana?: boolean;
  tables?: string[];
  table_counts?: Record<string, number>;
  total_tables?: number;
  error?: string;
  error_code?: string;
  hint?: string;
  timestamp: string;
}

export interface SyncBatchItem {
  table: string;
  chainId: string;
  record: Record<string, unknown>;
}

type StatusListener = (status: DbConnectionStatus) => void;
const listeners: Set<StatusListener> = new Set();

let hasCheckedStatus = false;
let syncQueue: Promise<unknown> = Promise.resolve();

function enqueueSync<T>(task: () => Promise<T>): Promise<T> {
  const next = syncQueue.then(task, task);
  syncQueue = next.catch(() => undefined);
  return next;
}

let lastStatus: DbConnectionStatus = {
  connected: false,
  database: 'rozana',
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  timestamp: new Date().toISOString(),
};

export const databaseService = {
  getLastStatus(): DbConnectionStatus {
    return lastStatus;
  },

  subscribe(listener: StatusListener) {
    listeners.add(listener);
    listener(lastStatus);
    return () => {
      listeners.delete(listener);
    };
  },

  notify(status: DbConnectionStatus) {
    hasCheckedStatus = true;
    lastStatus = status;
    listeners.forEach((fn) => fn(status));
  },

  async checkStatus(): Promise<DbConnectionStatus> {
    try {
      const res = await fetch('/api/db/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: DbConnectionStatus = await res.json();
      this.notify(data);
      return data;
    } catch (err: unknown) {
      const error = err as Error;
      const fallback: DbConnectionStatus = {
        connected: false,
        database: 'rozana',
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        error: error.message || 'Cannot reach API backend',
        hint: 'Check that the Node/Express server is active and PostgreSQL "rozana" is listening on port 5432.',
        timestamp: new Date().toISOString(),
      };
      this.notify(fallback);
      return fallback;
    }
  },

  async configure(params: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionUrl?: string;
  }): Promise<{ success: boolean; error?: string; status?: DbConnectionStatus }> {
    try {
      const res = await fetch('/api/db/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error };
      }
      const updatedStatus = await this.checkStatus();
      return { success: true, status: updatedStatus };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  },

  async getTableRecords<T = unknown>(tableName: TableName | string): Promise<T[]> {
    try {
      const upperName = tableName.toUpperCase();
      const res = await fetch(`/api/table/${encodeURIComponent(upperName)}`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async insertRecord<T = unknown>(tableName: TableName | string, record: Partial<T>): Promise<T | null> {
    try {
      const upperName = tableName.toUpperCase();
      const res = await fetch(`/api/table/${encodeURIComponent(upperName)}`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(record),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  async updateRecord<T = unknown>(tableName: TableName | string, id: string | number, record: Partial<T>): Promise<T | null> {
    try {
      const upperName = tableName.toUpperCase();
      const res = await fetch(`/api/table/${encodeURIComponent(upperName)}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(record),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  async deleteRecord(tableName: TableName | string, id: string | number): Promise<boolean> {
    try {
      const upperName = tableName.toUpperCase();
      const res = await fetch(`/api/table/${encodeURIComponent(upperName)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  syncRecord(
    tableName: TableName | string,
    chainId: string,
    record: Record<string, unknown>
  ): Promise<boolean> {
    if (hasCheckedStatus && !lastStatus.connected) {
      return Promise.resolve(false);
    }
    const upperTable = String(tableName).toUpperCase();
    return enqueueSync(async () => {
      try {
        const res = await fetch('/api/db/sync-record', {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            table: upperTable,
            chainId: chainId || 'chain-default',
            record,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });
  },

  deleteRecordSync(
    tableName: TableName | string,
    chainId: string,
    id: string | number
  ): Promise<boolean> {
    if (hasCheckedStatus && !lastStatus.connected) {
      return Promise.resolve(false);
    }
    const upperTable = String(tableName).toUpperCase();
    return enqueueSync(async () => {
      try {
        const res = await fetch('/api/db/delete-record', {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            table: upperTable,
            chainId: chainId || 'chain-default',
            id,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });
  },

  syncBatch(
    items: SyncBatchItem[]
  ): Promise<{ success: boolean; syncedCount: number; totalRequested?: number; errorCount?: number; error?: string }> {
    if (!items || items.length === 0) {
      return Promise.resolve({ success: true, syncedCount: 0, totalRequested: 0, errorCount: 0 });
    }
    return enqueueSync(async () => {
      try {
        const chunkSize = 200;
        let totalSynced = 0;
        let totalErrors = 0;

        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const res = await fetch('/api/db/sync-batch', {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ items: chunk }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return {
              success: false,
              syncedCount: totalSynced,
              totalRequested: items.length,
              errorCount: totalErrors + chunk.length,
              error: data.error || `HTTP ${res.status}`,
            };
          }
          totalSynced += Number(data.syncedCount || 0);
          totalErrors += Number(data.errorCount || 0);
        }

        return {
          success: true,
          syncedCount: totalSynced,
          totalRequested: items.length,
          errorCount: totalErrors,
        };
      } catch (err: unknown) {
        return {
          success: false,
          syncedCount: 0,
          totalRequested: items.length,
          error: (err as Error).message,
        };
      }
    });
  },

  async pullAllFromPostgres(): Promise<Record<string, unknown[]> | null> {
    try {
      const res = await fetch('/api/db/export-all', {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async getPurgeCounts(): Promise<{
    success: boolean;
    connected: boolean;
    database?: string;
    host?: string;
    port?: number;
    counts: Record<string, number>;
    globalUsersPreserved: number;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/db/purge-counts');
      const data = await res.json();
      return data;
    } catch (err: unknown) {
      return {
        success: false,
        connected: false,
        counts: {
          organizations: 0,
          branches: 0,
          users: 0,
          item_definitions: 0,
          item_groups: 0,
          categories: 0,
          suppliers: 0,
          customers: 0,
        },
        globalUsersPreserved: 1,
        error: (err as Error).message,
      };
    }
  },

  async purgeRecords(targets: string[]): Promise<{
    success: boolean;
    connected: boolean;
    database?: string;
    deletedCounts?: Record<string, number>;
    remainingCounts?: Record<string, number>;
    globalUsersPreserved?: number;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/db/purge-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      });
      return await res.json();
    } catch (err: unknown) {
      return {
        success: false,
        connected: false,
        error: (err as Error).message,
      };
    }
  },
};

