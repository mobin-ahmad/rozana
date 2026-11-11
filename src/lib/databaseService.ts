import { TABLE_NAMES, TableName } from './storage';

export interface DbConnectionStatus {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  user: string;
  server_version?: string;
  is_target_rozana?: boolean;
  tables?: string[];
  total_tables?: number;
  error?: string;
  hint?: string;
  timestamp: string;
}

type StatusListener = (status: DbConnectionStatus) => void;
const listeners: Set<StatusListener> = new Set();

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
      const res = await fetch(`/api/table/${encodeURIComponent(upperName)}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async pullAllFromPostgres(): Promise<Record<string, unknown[]> | null> {
    try {
      const res = await fetch('/api/db/export-all');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
};
