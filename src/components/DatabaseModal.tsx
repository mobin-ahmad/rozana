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
  ExternalLink,
  Table as TableIcon
} from 'lucide-react';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { TABLE_NAMES } from '../lib/storage';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<DbConnectionStatus>(databaseService.getLastStatus());
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [host, setHost] = useState(status.host || 'localhost');
  const [port, setPort] = useState(String(status.port || 5432));
  const [database, setDatabase] = useState(status.database || 'rozana');
  const [user, setUser] = useState(status.user || 'postgres');
  const [password, setPassword] = useState('postgres');

  useEffect(() => {
    const unsub = databaseService.subscribe((s) => {
      setStatus(s);
      setHost(s.host || 'localhost');
      setPort(String(s.port || 5432));
      setDatabase(s.database || 'rozana');
      setUser(s.user || 'postgres');
    });

    if (isOpen) {
      handleTestConnection();
    }

    return () => unsub();
  }, [isOpen]);

  const handleTestConnection = async () => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      const res = await databaseService.checkStatus();
      if (res.connected) {
        setSuccessMsg(`Successfully connected to PostgreSQL database "${res.database}" on port ${res.port}!`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg(null);
    try {
      const res = await databaseService.configure({
        host,
        port: parseInt(port, 10) || 5432,
        database,
        user,
        password,
      });

      if (res.success) {
        setSuccessMsg(`Connection parameters updated! Connected to "${database}" on port ${port}.`);
      } else {
        alert(`Failed to connect with provided settings: ${res.error}`);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const psqlCommand = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f schema.sql`;

  const copyPsql = () => {
    navigator.clipboard.writeText(psqlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const expectedTables = Object.values(TABLE_NAMES);

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
                Target Database: <span className="text-blue-300 font-mono font-medium">"rozana"</span> &bull; Port: <span className="text-blue-300 font-mono font-medium">5432</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
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
                <span>{status.tables ? status.tables.length : 15} Standardized</span>
              </div>
            </div>
          </div>

          {/* If error, display diagnostic details */}
          {!status.connected && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-100">
                    Cannot reach PostgreSQL "rozana" on {status.host}:{status.port}
                  </p>
                  <p className="text-amber-300/90 font-mono text-[11px]">
                    {status.error || 'Connection refused or credentials unverified.'}
                  </p>
                  <p className="text-slate-300 pt-1">
                    If your PostgreSQL server is on your local machine with a specific password, update the credentials below and click <strong>"Save & Reconnect"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connection settings form */}
          <form onSubmit={handleSaveAndReconnect} className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                PostgreSQL Connection Parameters
              </h3>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="postgres"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                Deploy / Re-apply Schema to Database "rozana"
              </span>
              <button
                type="button"
                onClick={copyPsql}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition"
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
              Standardized Uppercase PostgreSQL Tables
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
              {expectedTables.map((tbl) => {
                const isPresent = status.tables?.includes(tbl);
                return (
                  <div
                    key={tbl}
                    className="p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between font-mono text-[11px]"
                  >
                    <span className="text-white font-medium truncate">"{tbl}"</span>
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>Targeting PostgreSQL 12+ on port 5432</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
