import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  X,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  GitBranch,
  Users,
  Box,
  Layers,
  FolderTree,
  Truck,
  UserCheck,
  Crown,
  CheckSquare,
  Square
} from 'lucide-react';
import { databaseService } from '../lib/databaseService';
import {
  PurgeTargetKey,
  getLocalPurgeCounts,
  purgeSelectedLocalData,
  getStoreChains
} from '../lib/storage';

interface DatabasePurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurged?: () => void;
}

interface OrgOption {
  id: string;
  name: string;
  code: string;
}

interface PurgeOptionConfig {
  key: PurgeTargetKey;
  orderLabel: string;
  label: string;
  tableName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const PURGE_OPTIONS: PurgeOptionConfig[] = [
  {
    key: 'organizations',
    orderLabel: '1',
    label: 'Organizations',
    tableName: 'STORE_CHAINS',
    description: 'Store chains, tenant configs & subscription history',
    icon: Building2,
  },
  {
    key: 'branches',
    orderLabel: '2',
    label: 'Branches',
    tableName: 'BRANCHES',
    description: 'Branch outlets & terminal location records',
    icon: GitBranch,
  },
  {
    key: 'users',
    orderLabel: '3',
    label: 'Users',
    tableName: 'USERS',
    description: 'All organization admins, managers, cashiers & staff',
    icon: Users,
    badge: 'Except Global User',
  },
  {
    key: 'item_definitions',
    orderLabel: '4',
    label: 'Item Definitions',
    tableName: 'ITEM_DEFINITIONS',
    description: 'Product catalog, barcodes, pricing & stock quantities',
    icon: Box,
  },
  {
    key: 'item_groups',
    orderLabel: '5',
    label: 'Item Groups',
    tableName: 'ITEM_GROUPS',
    description: 'Top-level merchandise & item group classifications',
    icon: Layers,
  },
  {
    key: 'categories',
    orderLabel: '6',
    label: 'Item Categories',
    tableName: 'CATEGORIES',
    description: 'Product categories linked to item groups',
    icon: FolderTree,
  },
  {
    key: 'suppliers',
    orderLabel: '7',
    label: 'Suppliers',
    tableName: 'SUPPLIERS',
    description: 'Registered suppliers, vendors & distributor contacts',
    icon: Truck,
  },
  {
    key: 'customers',
    orderLabel: '8',
    label: 'Customers',
    tableName: 'CUSTOMERS',
    description: 'Customer directory, QR cards & loyalty point balances',
    icon: UserCheck,
  },
];

function mergeOrgLists(
  dbOrgs: Array<{ id: string; name: string; code: string }> | undefined,
  includeLocal: boolean = true
): OrgOption[] {
  const byId = new Map<string, OrgOption>();
  if (includeLocal) {
    for (const c of getStoreChains()) {
      if (!c?.id) continue;
      byId.set(c.id, {
        id: c.id,
        name: String(c.name || c.id).toUpperCase(),
        code: String(c.code || '').toUpperCase(),
      });
    }
  }
  if (Array.isArray(dbOrgs)) {
    for (const o of dbOrgs) {
      if (!o?.id) continue;
      byId.set(o.id, {
        id: o.id,
        name: String(o.name || o.id).toUpperCase(),
        code: String(o.code || '').toUpperCase(),
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const DatabasePurgeModal: React.FC<DatabasePurgeModalProps> = ({
  isOpen,
  onClose,
  onPurged,
}) => {
  const [selected, setSelected] = useState<Set<PurgeTargetKey>>(new Set());
  const [selectedChainId, setSelectedChainId] = useState<string>('ALL');
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>(() => mergeOrgLists(undefined, true));
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [purging, setPurging] = useState(false);

  const [dbConnected, setDbConnected] = useState(false);
  const [dbName, setDbName] = useState('rozana');
  const [dbHostPort, setDbHostPort] = useState('localhost:5432');
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});
  const [localCounts, setLocalCounts] = useState<Record<PurgeTargetKey, number>>(() =>
    getLocalPurgeCounts('ALL')
  );
  const [globalPreservedCount, setGlobalPreservedCount] = useState(1);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshCounts = useCallback(async (chainScope: string = 'ALL') => {
    setLoadingCounts(true);
    setLocalCounts(getLocalPurgeCounts(chainScope));
    try {
      const res = await databaseService.getPurgeCounts(chainScope);
      setDbConnected(Boolean(res.connected));
      if (res.database) setDbName(res.database);
      if (res.host && res.port) setDbHostPort(`${res.host}:${res.port}`);
      if (res.counts) setDbCounts(res.counts);
      if (typeof res.globalUsersPreserved === 'number') {
        setGlobalPreservedCount(res.globalUsersPreserved);
      }
      setOrgOptions(mergeOrgLists(res.organizationsList, true));
      if (!res.connected && res.error) {
        setErrorMsg(`PostgreSQL offline (${res.error}). Deleting will still clear local cache; reconnect DB to purge PostgreSQL rows.`);
      } else {
        setErrorMsg(null);
      }
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setSelectedChainId('ALL');
      setConfirmChecked(false);
      setSuccessMsg(null);
      setErrorMsg(null);
      setOrgOptions(mergeOrgLists(undefined, true));
      void refreshCounts('ALL');
    }
  }, [isOpen, refreshCounts]);

  if (!isOpen) return null;

  const selectedOrg =
    selectedChainId !== 'ALL' ? orgOptions.find((o) => o.id === selectedChainId) : undefined;
  const scopeDisplayName = selectedOrg
    ? `${selectedOrg.name}${selectedOrg.code ? ` (${selectedOrg.code})` : ''}`
    : 'ALL ORGANIZATIONS';

  const handleOrgScopeChange = (newChainId: string) => {
    setSelectedChainId(newChainId);
    setConfirmChecked(false);
    setSuccessMsg(null);
    void refreshCounts(newChainId);
  };

  const toggleTarget = (key: PurgeTargetKey) => {
    setSuccessMsg(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = selected.size === PURGE_OPTIONS.length;

  const handleToggleAll = () => {
    setSuccessMsg(null);
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(PURGE_OPTIONS.map((o) => o.key)));
    }
  };

  const getDisplayCount = (key: PurgeTargetKey): number => {
    if (dbConnected && typeof dbCounts[key] === 'number') {
      return dbCounts[key];
    }
    return localCounts[key] ?? 0;
  };

  const totalSelectedRecords = Array.from(selected).reduce(
    (sum, key) => sum + getDisplayCount(key),
    0
  );

  const handleDeleteSelected = async () => {
    if (selected.size === 0 || !confirmChecked) return;
    const targets = Array.from(selected);
    const activeScope = selectedChainId;
    const activeScopeLabel = scopeDisplayName;

    setPurging(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let pgSummary = '';
      let latestDbOrgs: Array<{ id: string; name: string; code: string }> | undefined;
      if (dbConnected) {
        const pgRes = await databaseService.purgeRecords(targets, activeScope);
        if (!pgRes.success) {
          setErrorMsg(pgRes.error || 'Failed to delete selected records from PostgreSQL.');
          setPurging(false);
          return;
        }
        const totalPgDeleted = Object.values(pgRes.deletedCounts || {}).reduce(
          (sum, val) => sum + Number(val || 0),
          0
        );
        pgSummary = `${totalPgDeleted} record(s) removed from PostgreSQL "${pgRes.database || dbName}"`;
        latestDbOrgs = pgRes.organizationsList;
        if (pgRes.remainingCounts) {
          setDbCounts(pgRes.remainingCounts);
        }
        if (typeof pgRes.globalUsersPreserved === 'number') {
          setGlobalPreservedCount(pgRes.globalUsersPreserved);
        }
      }

      purgeSelectedLocalData(targets, activeScope);
      await databaseService.checkStatus();

      const deletedLabels = PURGE_OPTIONS.filter((o) => selected.has(o.key))
        .map((o) => o.label)
        .join(', ');

      // If the currently scoped organization itself was deleted, reset scope back to ALL and refresh
      const orgWasDeleted = targets.includes('organizations') && activeScope !== 'ALL';
      const nextScope = orgWasDeleted ? 'ALL' : activeScope;
      if (orgWasDeleted) {
        setSelectedChainId('ALL');
      }

      const mergedOrgs = mergeOrgLists(latestDbOrgs, true);
      setOrgOptions(mergedOrgs);
      setLocalCounts(getLocalPurgeCounts(nextScope));

      if (orgWasDeleted && dbConnected) {
        const refreshed = await databaseService.getPurgeCounts('ALL');
        if (refreshed.counts) setDbCounts(refreshed.counts);
        if (refreshed.organizationsList) {
          setOrgOptions(mergeOrgLists(refreshed.organizationsList, true));
        }
      }

      setSuccessMsg(
        `${pgSummary ? `${pgSummary} and local storage synced` : 'Local storage records cleared'} (${activeScope === 'ALL' ? 'All Organizations' : `Organization: ${activeScopeLabel}`}) for: ${deletedLabels}. Global User (mobin) was preserved.`
      );
      setSelected(new Set());
      setConfirmChecked(false);
      if (onPurged) onPurged();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Unexpected error during record deletion.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                Delete Database Records
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Select organization scope and database tables to purge from local PostgreSQL &amp; terminal cache
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                dbConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <Database className="w-3 h-3" />
              {dbConnected ? `${dbName} (${dbHostPort})` : 'DB Offline'}
            </span>
            <button
              type="button"
              onClick={() => void refreshCounts(selectedChainId)}
              disabled={loadingCounts || purging}
              title="Refresh record counts"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingCounts ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={purging}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Protected Global User Banner (#9 Except Global User) */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-emerald-300">
                  9. Except Global User (Protected)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {globalPreservedCount} Global Account Preserved
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                The Global Super Administrator (<span className="font-mono text-amber-300">mobin</span>) is always excluded from deletion so platform access and administration remain available.
              </p>
            </div>
          </div>

          {/* Organization Scope Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="purge-org-select"
                  className="block text-xs font-extrabold text-white"
                >
                  Select Organization Scope
                </label>
                <p className="text-[11px] text-slate-400 truncate">
                  {selectedChainId === 'ALL'
                    ? 'Applies to all registered organizations & store chains'
                    : `Scoped only to ${scopeDisplayName} — other organizations stay intact`}
                </p>
              </div>
            </div>

            <select
              id="purge-org-select"
              value={selectedChainId}
              disabled={purging || loadingCounts}
              onChange={(e) => handleOrgScopeChange(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
            >
              <option value="ALL">
                ALL ORGANIZATIONS ({orgOptions.length})
              </option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                  {org.code ? ` (${org.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Selection Toolbar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-bold text-slate-300">
              Select Tables / Modules to Delete ({selected.size} of {PURGE_OPTIONS.length} selected)
            </span>
            <button
              type="button"
              onClick={handleToggleAll}
              disabled={purging}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-1.5 cursor-pointer"
            >
              {allSelected ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Clear All
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Select All 8 Items
                </>
              )}
            </button>
          </div>

          {/* 8 Checkbox Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PURGE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isChecked = selected.has(opt.key);
              const count = getDisplayCount(opt.key);

              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-rose-500/15 border-rose-500/60 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={purging}
                    onChange={() => toggleTarget(opt.key)}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isChecked ? 'text-rose-400' : 'text-indigo-400'}`} />
                        <span className="text-xs font-extrabold text-white truncate">
                          {opt.orderLabel}. {opt.label}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                          count > 0
                            ? isChecked
                              ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {count} {count === 1 ? 'rec' : 'recs'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">{opt.tableName}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Safety Confirmation & Action Footer */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmChecked}
                disabled={purging || selected.size === 0}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium">
                I confirm permanent deletion of{' '}
                <strong className="text-white">{selected.size}</strong> selected category/categories (
                <strong className="text-rose-300">{totalSelectedRecords}</strong> record(s) in{' '}
                <strong className="text-indigo-300">{scopeDisplayName}</strong>), keeping the Global User safe.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Action executes inside a database transaction on <span className="font-mono text-slate-300">{dbName}</span>.
              </span>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={purging}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  disabled={selected.size === 0 || !confirmChecked || purging}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-45 disabled:hover:bg-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {purging ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Deleting Records...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Delete Selected Records
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
