import React, { useState, useEffect } from 'react';
import {
  Store,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  AlertCircle,
  MonitorCheck,
  Layers,
  Globe
} from 'lucide-react';
import {
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  getUsers,
  getSettings,
  loginUser,
  getIsAuthenticated
} from '../lib/storage';
import { StoreChain, User } from '../types';
import { RegisterStoreChainModal } from './RegisterStoreChainModal';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [storeChains, setStoreChainsState] = useState<StoreChain[]>(() => getStoreChains());
  const [selectedChainId, setSelectedChainId] = useState<string>(() => getActiveStoreChain().id);
  const [isRegisterChainModalOpen, setIsRegisterChainModalOpen] = useState<boolean>(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState<boolean>(false);

  // Form inputs
  const [identifier, setIdentifier] = useState<string>('mobin');
  const [password, setPassword] = useState<string>('123456');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('br-head-office');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // UI States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const activeChain = storeChains.find((c) => c.id === selectedChainId) || getActiveStoreChain();
  const currentSettings = getSettings();
  const currentChainUsers = getUsers();

  // Update chain selection
  const handleChainChange = (chainId: string) => {
    setSelectedChainId(chainId);
    setActiveStoreChain(chainId);
    setErrorMsg(null);

    // Refresh users for the new chain and prefill top user
    const chainUsers = getUsers();
    if (chainUsers && chainUsers.length > 0) {
      setIdentifier(chainUsers[0].email || chainUsers[0].username);
      setPassword(chainUsers[0].pos_pin || chainUsers[0].password || '1234');
    } else {
      setIdentifier('');
      setPassword('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your email, username, or employee code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = loginUser(identifier, password, selectedChainId);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'Login failed. Please verify your credentials.');
      }
    }, 400);
  };

  const handleQuickRoleSelect = (u: User) => {
    setIdentifier(u.email || u.username);
    setPassword(u.pos_pin || u.password || '1234');
    if (u.assigned_branch_id && u.assigned_branch_id !== 'all') {
      setSelectedBranchId(u.assigned_branch_id);
    }
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-slate-900/60 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
                rozana
              </h1>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Enterprise v4.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-Tenant POS & Enterprise ERP System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-[11px]">System Online</span>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterChainModalOpen(true)}
            className="px-3.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border border-indigo-400/30"
          >
            <Plus className="w-3.5 h-3.5" /> New Store Chain
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Left Hero Section (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Store className="w-64 h-64 text-indigo-400" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> SaaS Multi-Tenant Cloud Architecture
              </div>

              <div>
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                  Departmental Store & Retail POS Terminal
                </h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Fast barcode billing, multi-currency ledgers, stock CFT tracking, customer credit ledgers, and real-time branch sync.
                </p>
              </div>

              {/* Active Organization Info Box */}
              <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Selected Organization</span>
                  <span className="text-indigo-400 font-mono">CODE: {activeChain.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 border border-indigo-400/40">
                    {activeChain.code || 'SC'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {activeChain.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeChain.address || 'Head Office Branch'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Features List */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sub-second rozana Barcode Checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Isolated Data & Inventory Tenant Security</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-Currency Sales & Expense Accounting</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Wood CFT Log Measurement & Standard Hardware</span>
                </div>
              </div>
            </div>

            {/* Bottom Security Badge */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 256-bit AES Session Encryption
              </div>
              <span className="font-mono text-[10px]">POS NODE #1024</span>
            </div>
          </div>

          {/* Right Login Form (lg:col-span-7) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                System Operator Sign In
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your store chain organization and enter credentials to log in.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Store Chain Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" /> Store Chain Organization
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRegisterChainModalOpen(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Register New
                  </button>
                </label>
                <select
                  value={selectedChainId}
                  onChange={(e) => handleChainChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  {storeChains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} ({chain.code}) — {chain.address || 'Head Office'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email / Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email, Username, or Employee Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@askari.com or cashier1"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Password / PIN Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password or POS PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordModalOpen(true)}
                    className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Branch Selection (If available) */}
              {currentSettings.branches && currentSettings.branches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Assigned Branch Outlet
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    {currentSettings.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remember me & Submit */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span>Remember session on this terminal</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-indigo-400/30"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In to POS System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Login Accounts Section */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  ⚡ 1-Click Demo Accounts (Test Preview)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">PIN: 1234 / 5678</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentChainUsers.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickRoleSelect(u)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      identifier === u.email || identifier === u.username
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px] text-white">{u.full_name}</div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 mt-0.5">
                      {u.role.replace('_', ' ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-[11px] text-slate-500 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          &copy; {new Date().getFullYear()} rozana Enterprise. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Help Center</span>
        </div>
      </footer>

      {/* Register Store Chain Modal */}
      <RegisterStoreChainModal
        isOpen={isRegisterChainModalOpen}
        onClose={() => setIsRegisterChainModalOpen(false)}
        onChainRegistered={() => {
          setStoreChainsState(getStoreChains());
          const active = getActiveStoreChain();
          setSelectedChainId(active.id);
          handleChainChange(active.id);
        }}
      />

      {/* Forgot Password Modal */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Password Recovery</h3>
                <p className="text-xs text-slate-400">Default System Passwords & Admin Support</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="font-semibold text-white">Initial Default Credentials:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] font-mono">
                <li>Super Admin: <span className="text-indigo-300">mobin</span> | Password/PIN: <span className="text-emerald-400">123456</span></li>
                <li>Admin Email: <span className="text-indigo-300">admin@askari.com</span> | PIN: <span className="text-emerald-400">1234</span></li>
                <li>Manager Email: <span className="text-indigo-300">manager.gulberg@askari.com</span> | PIN: <span className="text-emerald-400">5678</span></li>
                <li>Cashier Email: <span className="text-indigo-300">cashier.gulberg@askari.com</span> | PIN: <span className="text-emerald-400">1122</span></li>
                <li>Accountant Email: <span className="text-indigo-300">finance@askari.com</span> | PIN: <span className="text-emerald-400">9900</span></li>
              </ul>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                If you have changed your password or created a custom store chain, ask your Store Chain Administrator to reset your password from the User Management module.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsForgotPasswordModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors border border-slate-700"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
