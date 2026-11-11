import React from 'react';
import { History, Clock, ShieldAlert } from 'lucide-react';
import { getActivityLogs } from '../lib/storage';

export const AuditLogs: React.FC = () => {
  const logs = getActivityLogs();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System Activity Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">Immutable historical record of POS checkout, inventory additions, returns, and adjustments.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 text-xs">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-slate-900 text-indigo-300 font-mono font-bold rounded text-[10px] uppercase">
                  {log.action}
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{log.details || `${log.action} on ${log.table_name}`}</p>
                  <p className="text-[10px] text-slate-400">Target Entity: {log.table_name}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-slate-700 block">@{log.username}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
