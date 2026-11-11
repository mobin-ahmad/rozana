import React, { useState, useEffect } from 'react';
import {
  TreePine,
  Search,
  RotateCcw,
  UserCheck,
  Menu,
  Coins,
  Building2,
  Plus,
  Layers,
  Store,
  LogOut,
  Crown,
  Database
} from 'lucide-react';
import { User, UserRole, StoreChain, SystemSettings } from '../types';
import {
  getUsers,
  getCurrentUser,
  setCurrentUser,
  resetToDemoData,
  getSettings,
  setActiveDisplayCurrency,
  setActiveBranch,
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  subscribeToStorage,
  isUserSuperAdmin
} from '../lib/storage';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { RegisterStoreChainModal } from './RegisterStoreChainModal';
import { DatabaseModal } from './DatabaseModal';

interface NavbarProps {
  currentUser: User;
  onOpenSearch: () => void;
  onToggleSidebarMobile: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSearch,
  onToggleSidebarMobile,
  onLogout,
}) => {
  const [isRegisterChainModalOpen, setIsRegisterChainModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>(() => databaseService.getLastStatus());
  const [settings, setSettingsState] = useState<SystemSettings>(() => getSettings());
  const [storeChains, setStoreChainsState] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChainState] = useState<StoreChain>(() => getActiveStoreChain());
  const [users, setUsersState] = useState<User[]>(() => getUsers());
  const [currentUserNavbar, setCurrentUserNavbar] = useState<User>(() => currentUser);

  useEffect(() => {
    databaseService.checkStatus();
    const unsubDb = databaseService.subscribe((s) => setDbStatus(s));
    return () => unsubDb();
  }, []);

  useEffect(() => {
    setCurrentUserNavbar(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setSettingsState(getSettings());
      setStoreChainsState(getStoreChains());
      setActiveChainState(getActiveStoreChain());
      setUsersState(getUsers());
      setCurrentUserNavbar(getCurrentUser());
    });
    return unsub;
  }, []);

  const isSuperAdmin = isUserSuperAdmin(currentUserNavbar);
  const visibleOperators = isSuperAdmin
    ? users
    : users.filter(
        (u) =>
          u &&
          (u.username || '').toLowerCase() !== 'mobin' &&
          !u.is_super_admin &&
          !(u.designation && u.designation.toLowerCase().includes('super admin'))
      );

  const activeCurrencyCode = settings.active_display_currency || settings.base_currency || 'PKR';
  const availableCurrencies = (settings.currencies || []).filter((c) => c.is_active);
  const branches = settings.branches || [];
  const activeBranchId = settings.active_branch_id || (branches[0] && branches[0].id) || '';

  const handleRoleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    const selected = users.find((u) => u.id === selectedId);
    if (selected) {
      setCurrentUser(selected);
      setCurrentUserNavbar(selected);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setActiveDisplayCurrency(code);
    setSettingsState(getSettings());
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value;
    setActiveBranch(branchId);
    setSettingsState(getSettings());
  };

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isSuperAdmin) {
      alert('Access Restricted: Only Global Super Administrator can switch store organizations.');
      return;
    }
    const val = e.target.value;
    if (val === '__REGISTER_NEW__') {
      setIsRegisterChainModalOpen(true);
    } else if (val && val !== activeChain.id) {
      setActiveStoreChain(val);
      const updatedChain = getActiveStoreChain();
      const updatedSettings = getSettings();
      setActiveChainState(updatedChain);
      setSettingsState(updatedSettings);
      setUsersState(getUsers());
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all system data to initial demo state? All custom changes will be restored to defaults.')) {
      resetToDemoData();
      setSettingsState(getSettings());
      setStoreChainsState(getStoreChains());
      setActiveChainState(getActiveStoreChain());
      setUsersState(getUsers());
      setCurrentUserNavbar(getCurrentUser());
    }
  };

  const selectedCurrencyObj = availableCurrencies.find((c) => c.code === activeCurrencyCode);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebarMobile}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-sm overflow-hidden">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Store Logo" className="w-full h-full object-contain bg-white p-0.5" />
              ) : (
                <TreePine className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight uppercase text-slate-900">
                  {settings.business_name || 'Lumina Wood POS'}
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                  POS v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Timber Inventory & Point of Sale System
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Global Search Input */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between pl-10 pr-4 py-2 bg-slate-100 border border-slate-200/80 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition-all outline-none relative"
          >
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <span className="font-medium">Search wood serials, customers, invoices...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white text-slate-500 rounded font-mono border border-slate-200 shadow-xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Store Chain Switcher, Branch Selector, Currency Selector, Role Switcher, Reset Demo Data, Operator Profile */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* SaaS Store Chain Switcher (Super Admin) or Static Badge (Store Admin) */}
          {isSuperAdmin ? (
            <div className="relative flex items-center bg-slate-900 text-white border border-slate-700 rounded-lg px-2 py-1 shadow-2xs">
              <span className="w-5 h-5 bg-amber-500 text-white rounded flex items-center justify-center font-black text-xs shrink-0 mr-1.5 shadow-2xs">
                <Crown className="w-3.5 h-3.5" />
              </span>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-widest font-extrabold text-amber-300 hidden sm:block leading-none mb-0.5">
                  SaaS Store Chain
                </span>
                <select
                  value={activeChain.id}
                  onChange={handleChainChange}
                  className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer pr-1 leading-none max-w-[140px] sm:max-w-[170px] truncate"
                  title="Switch active SaaS store chain organization"
                >
                  {storeChains.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-semibold">
                      🏢 {c.name} ({c.code})
                    </option>
                  ))}
                  <option value="__REGISTER_NEW__" className="bg-indigo-950 text-indigo-200 font-bold">
                    ➕ Register New Store Chain...
                  </option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center bg-slate-900 text-white border border-slate-700 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="w-5 h-5 bg-indigo-600 text-white rounded flex items-center justify-center font-black text-xs shrink-0 mr-1.5 shadow-2xs">
                <Store className="w-3.5 h-3.5" />
              </span>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-300 hidden sm:block leading-none mb-0.5">
                  Store Chain
                </span>
                <span className="text-xs font-extrabold text-white max-w-[140px] sm:max-w-[170px] truncate leading-none">
                  {activeChain.name}
                </span>
              </div>
            </div>
          )}

          {/* Active Store Branch Dropdown Switcher */}
          {branches.length > 0 && (
            <div className="relative flex items-center bg-indigo-50/80 border border-indigo-200 rounded-lg px-2 py-1 shadow-2xs">
              <span className="w-5 h-5 bg-indigo-600 text-white rounded flex items-center justify-center font-black text-xs shrink-0 mr-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-700 hidden sm:block leading-none mb-0.5">
                  Store Branch
                </span>
                <select
                  value={activeBranchId}
                  onChange={handleBranchChange}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1 leading-none max-w-[150px] sm:max-w-[180px] truncate"
                  title="Switch active store branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white text-slate-900 font-medium">
                      {b.name} ({b.city || b.country || 'Branch'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Multi-Currency Dropdown Switcher */}
          <div className="relative flex items-center bg-emerald-50/80 border border-emerald-200 rounded-lg px-2 py-1 shadow-2xs">
            <span className="w-5 h-5 bg-emerald-600 text-white rounded flex items-center justify-center font-black text-xs shrink-0 mr-1.5 shadow-2xs">
              {selectedCurrencyObj?.symbol || settings.currency_symbol || 'Rs.'}
            </span>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-700 hidden sm:block leading-none mb-0.5">
                Currency
              </span>
              <select
                value={activeCurrencyCode}
                onChange={handleCurrencyChange}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-2 leading-none"
                title="Switch active viewing currency"
              >
                {availableCurrencies.map((c) => (
                  <option key={c.code} value={c.code} className="bg-white text-slate-900 font-medium">
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Switch User Demo Role Selector */}
          <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 mr-2 shrink-0 hidden sm:inline" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 hidden sm:block">
                Operator
              </span>
              <select
                value={currentUser?.id}
                onChange={handleRoleSwitch}
                className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-4"
              >
                {visibleOperators.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-900">
                    {u.full_name || 'User'} ({(u.role || 'staff').replace('_', ' ').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PostgreSQL rozana:5432 Database Badge */}
          <button
            onClick={() => setIsDbModalOpen(true)}
            title={`PostgreSQL Database Connection (Target: ${dbStatus.database || 'rozana'}:${dbStatus.port || 5432})`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer ${
              dbStatus.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline font-mono text-[11px] font-bold">
              {dbStatus.database || 'rozana'}:{dbStatus.port || 5432}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </button>

          {/* Reset Demo Data Button - Super Admin Only */}
          {isSuperAdmin && (
            <button
              onClick={handleResetData}
              title="Reset to initial demo data"
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* User Profile Avatar & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="hidden lg:flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                (currentUser?.username || '').toLowerCase() === 'mobin' || currentUser?.is_super_admin
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-white border-2 border-amber-300 shadow-xs'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                {(currentUser?.username || '').toLowerCase() === 'mobin' || currentUser?.is_super_admin ? '👑' : (currentUser?.full_name || 'U').charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {(currentUser?.username || '').toLowerCase() === 'mobin' || currentUser?.is_super_admin ? (
                    <span className="text-amber-600 font-black">Global Super Admin</span>
                  ) : (
                    <span className="text-slate-400">Operator</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser?.full_name || 'Logged In User'}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out of POS System"
                className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/80 flex items-center gap-1 text-xs font-bold shrink-0 ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Register Store Chain Modal */}
      <RegisterStoreChainModal
        isOpen={isRegisterChainModalOpen}
        onClose={() => setIsRegisterChainModalOpen(false)}
        onChainRegistered={() => {
          window.location.reload();
        }}
      />

      {/* PostgreSQL Database Connection Modal */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </header>
  );
};
