import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Search, Building2, Filter } from 'lucide-react';
import { getActivityLogs, getBranchesForOrg, subscribeToStorage } from '../lib/storage';
import { ActivityLog } from '../types';

const ACTION_BADGE_STYLE: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  SUSPEND: 'bg-rose-50 text-rose-700 border-rose-200',
  ACTIVATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PLAN_CHANGE: 'bg-purple-50 text-purple-700 border-purple-200',
  ROLE_CHANGE: 'bg-amber-50 text-amber-800 border-amber-200',
  TOGGLE_STATUS: 'bg-amber-50 text-amber-800 border-amber-200',
  CANCEL: 'bg-rose-50 text-rose-700 border-rose-200',
  RETURN_ITEM: 'bg-orange-50 text-orange-700 border-orange-200',
  LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
  LOGOUT: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>(() => getActivityLogs());
  const [branches, setBranches] = useState(() => getBranchesForOrg());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setLogs(getActivityLogs());
      setBranches(getBranchesForOrg());
    });
    return unsub;
  }, []);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (branchFilter !== 'ALL' && log.branch_id !== branchFilter) return false;
      if (!q) return true;
      return (
        (log.details || '').toLowerCase().includes(q) ||
        (log.username || '').toLowerCase().includes(q) ||
        (log.table_name || '').toLowerCase().includes(q) ||
        (log.branch_name || '').toLowerCase().includes(q) ||
        String(log.record_id || '').toLowerCase().includes(q)
      );
    });
  }, [logs, actionFilter, branchFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">System Activity Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable multi-tenant trail of organization changes, role edits, POS checkouts, and stock mutations.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
          Showing {filteredLogs.length} of {logs.length} events
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, entity, details, or branch..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Organization / Branch</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">@{log.username}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${
                        ACTION_BADGE_STYLE[log.action] || 'bg-slate-900 text-indigo-300 border-slate-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                    {log.table_name}
                    {log.record_id ? <span className="text-slate-400 ml-1">#{log.record_id}</span> : null}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {log.branch_name || log.organization_name || 'Platform'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {log.details || `${log.action} on ${log.table_name}`}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    No activity logs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

