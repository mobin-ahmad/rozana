import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  Shield,
  Copy,
  Check,
  X,
  Download,
  Table as TableIcon
} from 'lucide-react';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { TABLE_NAMES, hydrateFromPostgresSnapshot } from '../lib/storage';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<DbConnectionStatus>(databaseService.getLastStatus());
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [host, setHost] = useState(status.host || 'localhost');
  const [port, setPort] = useState(String(status.port || 5432));
  const [database, setDatabase] = useState(status.database || 'rozana');
  const [user, setUser] = useState(status.user || 'postgres');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsub = databaseService.subscribe((s) => {
      setStatus(s);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const current = databaseService.getLastStatus();
      setHost(current.host || 'localhost');
      setPort(String(current.port || 5432));
      setDatabase(current.database || 'rozana');
      setUser(current.user || 'postgres');
      setErrorMsg(null);
      handleTestConnection();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await databaseService.checkStatus();
      if (res.connected) {
        setHost(res.host || 'localhost');
        setPort(String(res.port || 5432));
        setDatabase(res.database || 'rozana');
        setUser(res.user || 'postgres');
        setSuccessMsg(
          `Successfully connected to PostgreSQL database "${res.database}" on ${res.host}:${res.port}!`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await databaseService.configure({
        host: host.trim() || 'localhost',
        port: parseInt(port, 10) || 5432,
        database: database.trim() || 'rozana',
        user: user.trim() || 'postgres',
        ...(password !== '' ? { password } : {}),
      });

      if (res.success && res.status) {
        setHost(res.status.host || host);
        setSuccessMsg(
          `Connected to "${res.status.database}" on ${res.status.host}:${res.status.port} and saved configuration to .env!`
        );
      } else {
        setErrorMsg(res.error || 'Failed to connect with provided settings.');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePullFromPostgres = async () => {
    setSyncLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const snapshot = await databaseService.pullAllFromPostgres();
      if (!snapshot) {
        setErrorMsg('Could not pull records from PostgreSQL. Verify the database connection first.');
        return;
      }
      const { syncedTables, totalRows } = hydrateFromPostgresSnapshot(snapshot);
      setSuccessMsg(
        `Synced ${totalRows} rows across ${syncedTables} tables from local PostgreSQL "${status.database}"!`
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const psqlCommand = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f schema.sql`;

  const copyPsql = () => {
    navigator.clipboard.writeText(psqlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const expectedTables = Object.values(TABLE_NAMES).filter(
    (tbl) => tbl !== 'SUB_CATEGORIES' && tbl !== 'SETTINGS'
  );

  const isAuthError = Boolean(
    status.error && /password authentication failed|28P01|SASL/i.test(status.error)
  );
  const isCloudHost =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const isConnRefusedOnCloud =
    isCloudHost &&
    Boolean(status.error && /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(status.error));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  PostgreSQL Connection Manager
                </h2>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
                    status.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {status.connected ? 'Live Connected' : 'Disconnected / Standby'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Database:{' '}
                <span className="text-blue-300 font-mono font-medium">"{status.database || 'rozana'}"</span>{' '}
                &bull; Port: <span className="text-blue-300 font-mono font-medium">{status.port || 5432}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 text-sm">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick status card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block mb-1">Database Name</span>
              <div className="text-base font-bold text-white font-mono flex items-center gap-1.5">
                <span>{status.database || 'rozana'}</span>
                {status.database === 'rozana' && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-sans">
                    Default
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block mb-1">Host & Port</span>
              <div className="text-base font-bold text-white font-mono">
                {status.host || 'localhost'}:{status.port || 5432}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block mb-1">Uppercase Tables</span>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4" />
                <span>
                  {status.connected && status.tables
                    ? `${status.tables.length} Detected`
                    : `${expectedTables.length} Expected`}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic details if disconnected */}
          {!status.connected && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-amber-100">
                    Cannot reach PostgreSQL "{status.database || 'rozana'}" on {status.host}:{status.port}
                  </p>
                  <p className="text-amber-300/90 font-mono text-[11px]">
                    {status.error || 'Connection refused or credentials unverified.'}
                  </p>
                  {isAuthError ? (
                    <p className="text-slate-200 pt-0.5">
                      PostgreSQL is running, but the password for user{' '}
                      <strong className="font-mono text-white">{status.user || 'postgres'}</strong> does not
                      match <code className="text-amber-300">.env</code>. Enter your local PostgreSQL password
                      (same as DBeaver) below and click <strong>"Save & Reconnect"</strong> — it will be saved
                      automatically to <code className="text-amber-300">.env</code>.
                    </p>
                  ) : isConnRefusedOnCloud ? (
                    <p className="text-slate-200 pt-0.5">
                      You are viewing the cloud preview URL (<code className="text-amber-300">{window.location.hostname}</code>).
                      Cloud preview servers cannot access <code className="text-amber-300">localhost:5432</code> on
                      your PC. Pull the latest code locally, run <code className="text-emerald-300">npm run dev</code>,
                      and open <code className="text-emerald-300">http://localhost:3000</code> to connect to your
                      local <code className="text-emerald-300">rozana</code> database.
                    </p>
                  ) : (
                    <p className="text-slate-300 pt-0.5">
                      Verify your PostgreSQL host, port (<code className="text-amber-300">5432</code>), database
                      (<code className="text-amber-300">rozana</code>), username, and password below, then click{' '}
                      <strong>"Save & Reconnect"</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Connection settings form */}
          <form onSubmit={handleSaveAndReconnect} className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                PostgreSQL Connection Parameters
              </h3>
              <div className="flex items-center gap-2">
                {status.connected && (
                  <button
                    type="button"
                    onClick={handlePullFromPostgres}
                    disabled={syncLoading}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Download className={`w-3.5 h-3.5 ${syncLoading ? 'animate-bounce' : ''}`} />
                    {syncLoading ? 'Syncing...' : 'Pull Data from rozana'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="localhost"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="5432"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Database</label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="rozana"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">User</label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="postgres"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password {isAuthError && <span className="text-amber-400">(Required)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-1.5 bg-slate-900 border rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    isAuthError ? 'border-amber-500' : 'border-slate-700'
                  }`}
                  placeholder="Enter PostgreSQL password"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${saveLoading ? 'animate-spin' : ''}`} />
                  Save & Reconnect
                </button>
              </div>
            </div>
          </form>

          {/* Quick CLI command helper */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Deploy / Re-apply Schema to Database "{database || 'rozana'}"
              </span>
              <button
                type="button"
                onClick={copyPsql}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied command' : 'Copy command'}
              </button>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
              {psqlCommand}
            </div>
          </div>

          {/* Synchronized Uppercase Tables Grid */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Standardized Uppercase PostgreSQL Tables ({expectedTables.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
              {expectedTables.map((tbl) => {
                const isPresent = Boolean(status.connected && status.tables?.includes(tbl));
                const rowCount = status.table_counts?.[tbl];
                return (
                  <div
                    key={tbl}
                    className={`p-2 rounded-lg border flex items-center justify-between font-mono text-[11px] ${
                      isPresent
                        ? 'bg-slate-800/80 border-emerald-700/50'
                        : 'bg-slate-800/40 border-slate-700/50 opacity-80'
                    }`}
                  >
                    <span className="text-white font-medium truncate">"{tbl}"</span>
                    {isPresent ? (
                      <span className="text-emerald-400 text-[10px] font-bold shrink-0 ml-1">
                        {rowCount !== undefined ? `${rowCount}✓` : '✓'}
                      </span>
                    ) : status.connected ? (
                      <span className="text-amber-400 text-[10px] shrink-0 ml-1" title="Table missing">
                        ?
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] shrink-0 ml-1">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>Targeting PostgreSQL 12+ on port {status.port || 5432}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
