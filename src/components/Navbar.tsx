import React, { useState, useEffect } from 'react';
import {
  Store as StoreIcon,
  Building2,
  MapPin,
  Crown,
  Database,
  Menu,
  CheckCircle2
} from 'lucide-react';
import { User, StoreChain, SystemSettings } from '../types';
import {
  getCurrentUser,
  getSettings,
  setActiveBranch,
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  subscribeToStorage,
  isUserSuperAdmin
} from '../lib/storage';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { DatabaseModal } from './DatabaseModal';

interface NavbarProps {
  currentUser: User;
  onOpenSearch?: () => void;
  onToggleSidebarMobile: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onToggleSidebarMobile,
}) => {
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>(() => databaseService.getLastStatus());
  const [settings, setSettingsState] = useState<SystemSettings>(() => getSettings());
  const [storeChains, setStoreChainsState] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChainState] = useState<StoreChain>(() => getActiveStoreChain());
  const [activeUser, setActiveUser] = useState<User>(() => currentUser);
  const [currentTime, setCurrentTime] = useState<string>(() => new Date().toLocaleString());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const stationNumber = 'Register #01';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    databaseService.checkStatus();
    const unsubDb = databaseService.subscribe((s) => setDbStatus(s));
    return () => unsubDb();
  }, []);

  useEffect(() => {
    setActiveUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setSettingsState(getSettings());
      setStoreChainsState(getStoreChains());
      setActiveChainState(getActiveStoreChain());
      setActiveUser(getCurrentUser());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSuperAdmin = isUserSuperAdmin(activeUser);
  const isStoreAdmin = !isSuperAdmin && (activeUser.role === 'admin' || activeUser.role === 'manager');

  const businessName = activeChain.name || settings.business_name || 'Askari Departmental Store Chain';
  const branchName = settings.branch_name || (settings.branches && settings.branches[0]?.name) || 'Main Branch';
  const branchAddress = settings.business_address || (settings.branches && settings.branches[0]?.address) || activeChain.address || '';
  const branches = settings.branches && settings.branches.length > 0
    ? settings.branches
    : [{ id: 'br-1', name: branchName, address: branchAddress, code: '01' }];

  const handleSwitchBusiness = (chainId: string) => {
    if (!isSuperAdmin) {
      alert('Access Restricted: Only Global Super Administrator can switch store organizations.');
      return;
    }
    setActiveStoreChain(chainId);
    const updatedChain = getActiveStoreChain();
    const updatedSettings = getSettings();
    setActiveChainState(updatedChain);
    setSettingsState(updatedSettings);
    showToast(`Switched active business to: ${updatedChain.name}`);
  };

  const handleSwitchBranch = (branchId: string) => {
    const res = setActiveBranch(branchId);
    if (res.success) {
      const updatedSettings = getSettings();
      setSettingsState(updatedSettings);
      showToast(`Branch switched to: ${updatedSettings.branch_name}`);
    }
  };

  return (
    <header className="px-2 sm:px-4 pt-2 sm:pt-4 pb-2 shrink-0 bg-slate-100 z-30">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* Main Store & Branch Info Header */}
        <div className="md:col-span-8 lg:col-span-9 bg-[#0B0F19] text-white rounded-xl p-3 px-4 sm:px-5 border border-slate-800 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          {/* Left Side: Mobile Menu + Store / Business Name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebarMobile}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 shrink-0 cursor-pointer"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/90 text-white flex items-center justify-center font-black text-sm shrink-0 border border-indigo-400/30 shadow-xs overflow-hidden">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Store Logo" className="w-full h-full object-contain bg-white p-0.5" />
              ) : (
                <StoreIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-wide truncate">
                  {businessName}
                </h1>
                {activeChain.code && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700 shrink-0">
                    {activeChain.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Business & Branch Switcher Controls */}
          {isSuperAdmin && (
            <div className="flex flex-wrap items-center justify-start xl:justify-center gap-2 bg-slate-900/95 p-1.5 px-3 rounded-xl border border-amber-500/30 shadow-inner">
              {/* Business Switcher for Super Admin */}
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Business:</span>
                <select
                  value={activeChain.id}
                  onChange={(e) => handleSwitchBusiness(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 hover:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
                  title="Switch Business Profile (Global Super Admin Only)"
                >
                  {storeChains.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block" />

              {/* Branch Switcher for Super Admin */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Branch:</span>
                <select
                  value={settings.active_branch_id || branches[0]?.id}
                  onChange={(e) => handleSwitchBranch(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 hover:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
                  title="Switch Branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.name} {b.code ? `[${b.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isStoreAdmin && (
            <div className="flex items-center justify-start xl:justify-center gap-2 bg-slate-900/95 p-1.5 px-3 rounded-xl border border-indigo-500/30 shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Switch Branch:</span>
              <select
                value={settings.active_branch_id || branches[0]?.id}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 hover:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer max-w-[180px] sm:max-w-[220px] truncate"
                title="Switch Store Branch"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name} {b.code ? `[${b.code}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Side: Branch Name and Address */}
          <div className="text-left xl:text-right min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-slate-100 flex items-center xl:justify-end gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{branchName}</span>
            </div>
            {branchAddress && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center xl:justify-end gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{branchAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Register & Operator Controls */}
        <div className="md:col-span-4 lg:col-span-3 bg-[#0B0F19] text-white rounded-xl p-3 px-4 border border-slate-800 shadow-sm flex items-center justify-between gap-3">
          {/* PostgreSQL rozana:5432 Status Badge */}
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            title={`PostgreSQL Database: ${dbStatus.database || 'rozana'} on port ${dbStatus.port || 5432}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition cursor-pointer shadow-xs ${
              dbStatus.connected
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/80 text-amber-400 border-amber-700/60 hover:bg-amber-900/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-none">{dbStatus.database || 'rozana'}:{dbStatus.port || 5432}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>

          <div className="text-right text-xs shrink-0">
            <div className="font-bold text-slate-100 text-[11px] tracking-tight flex items-center justify-end gap-2">
              <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 text-[9px] font-mono font-bold rounded border border-indigo-800/60">
                {stationNumber}
              </span>
              <span className="truncate max-w-[110px] sm:max-w-none">{activeUser?.full_name || 'User'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 text-right">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      {/* PostgreSQL Database Connection Modal */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      {/* Toast Popup Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </header>
  );
};
