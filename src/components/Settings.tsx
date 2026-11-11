import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Save, Coins, Plus, RefreshCw, CheckCircle, Globe, ShieldCheck,
  Award, Gift, Sparkles, Building2, MapPin, Phone, Mail, Trash2, Edit3, Crown, X, Check, Store,
  Image as ImageIcon, Upload, Layers
} from 'lucide-react';
import { getSettings, saveSettings, getStoreChains, getActiveStoreChain, setActiveStoreChain } from '../lib/storage';
import { defaultCurrencies } from '../lib/currency';
import { Currency, StoreBranch, StoreChain } from '../types';
import { RegisterStoreChainModal } from './RegisterStoreChainModal';

export const Settings: React.FC = () => {
  const [isRegisterChainModalOpen, setIsRegisterChainModalOpen] = useState(false);
  const storeChains = getStoreChains();
  const activeChain = getActiveStoreChain();
  const [settings, setSettingsState] = useState(() => {
    const s = getSettings();
    if (!s.currencies || s.currencies.length === 0) {
      s.currencies = defaultCurrencies;
    }
    if (!s.base_currency) s.base_currency = 'BDT';
    if (!s.active_display_currency) s.active_display_currency = s.base_currency;
    return s;
  });

  const [saved, setSaved] = useState(false);

  // New Currency State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState<number | ''>('');

  // Branch Modal State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<StoreBranch>>({
    name: '',
    code: '',
    address: '',
    address_line_2: '',
    email: '',
    phone: '',
    cell_phone: '',
    region: '',
    city: '',
    postal_code: '',
    country: '',
    is_head_office: false,
  });

  const branches = settings.branches || [];

  const handleOpenAddBranch = () => {
    setEditingBranchId(null);
    setBranchForm({
      name: '',
      code: `ASK-${(branches.length + 1).toString().padStart(2, '0')}`,
      address: '',
      address_line_2: '',
      email: settings.email || '',
      phone: '',
      cell_phone: '',
      region: '',
      city: '',
      postal_code: '',
      country: '',
      is_head_office: branches.length === 0,
    });
    setShowBranchModal(true);
  };

  const handleOpenEditBranch = (branch: StoreBranch) => {
    setEditingBranchId(branch.id);
    setBranchForm({ ...branch });
    setShowBranchModal(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name?.trim()) return;

    let updatedBranches = [...branches];

    if (branchForm.is_head_office) {
      updatedBranches = updatedBranches.map((b) => ({ ...b, is_head_office: false }));
    }

    if (editingBranchId) {
      updatedBranches = updatedBranches.map((b) =>
        b.id === editingBranchId
          ? {
              ...b,
              ...branchForm,
              name: branchForm.name!.trim(),
              code: branchForm.code?.trim() || b.code,
              address: branchForm.address?.trim() || '',
            }
          : b
      );
    } else {
      const newBranch: StoreBranch = {
        id: `br-${Date.now()}`,
        name: branchForm.name.trim(),
        code: branchForm.code?.trim() || `ASK-${branches.length + 1}`,
        address: branchForm.address?.trim() || '',
        address_line_2: branchForm.address_line_2?.trim() || '',
        email: branchForm.email?.trim() || '',
        phone: branchForm.phone?.trim() || '',
        cell_phone: branchForm.cell_phone?.trim() || '',
        region: branchForm.region?.trim() || '',
        city: branchForm.city?.trim() || '',
        postal_code: branchForm.postal_code?.trim() || '',
        country: branchForm.country?.trim() || '',
        is_head_office: branchForm.is_head_office || branches.length === 0,
      };
      updatedBranches.push(newBranch);
    }

    const activeId = settings.active_branch_id && updatedBranches.some((b) => b.id === settings.active_branch_id)
      ? settings.active_branch_id
      : updatedBranches[0]?.id;

    const activeObj = updatedBranches.find((b) => b.id === activeId) || updatedBranches[0];

    const updatedSettings = {
      ...settings,
      branches: updatedBranches,
      active_branch_id: activeId,
      ...(activeObj ? {
        branch_name: activeObj.name,
        business_address: activeObj.address,
        address_line_2: activeObj.address_line_2 || '',
        business_phone: activeObj.phone || '',
        cell_phone: activeObj.cell_phone || '',
        email: activeObj.email || '',
        region: activeObj.region || '',
        city: activeObj.city || '',
        postal_code: activeObj.postal_code || '',
        country: activeObj.country || '',
      } : {})
    };

    setSettingsState(updatedSettings);
    saveSettings(updatedSettings);
    setShowBranchModal(false);
  };

  const handleSetHeadOffice = (branchId: string) => {
    const updatedBranches = branches.map((b) => ({
      ...b,
      is_head_office: b.id === branchId,
    }));
    const updatedSettings = { ...settings, branches: updatedBranches };
    setSettingsState(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleSetActiveStoreBranch = (branchId: string) => {
    const activeObj = branches.find((b) => b.id === branchId);
    if (!activeObj) return;

    const updatedSettings = {
      ...settings,
      active_branch_id: branchId,
      branch_name: activeObj.name,
      business_address: activeObj.address,
      address_line_2: activeObj.address_line_2 || '',
      business_phone: activeObj.phone || '',
      cell_phone: activeObj.cell_phone || '',
      email: activeObj.email || '',
      region: activeObj.region || '',
      city: activeObj.city || '',
      postal_code: activeObj.postal_code || '',
      country: activeObj.country || '',
    };

    setSettingsState(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (branches.length <= 1) {
      alert('You must have at least one store branch configured.');
      return;
    }
    const branch = branches.find((b) => b.id === branchId);
    if (window.confirm(`Are you sure you want to remove branch "${branch?.name}"?`)) {
      const updatedBranches = branches.filter((b) => b.id !== branchId);
      const newActiveId = settings.active_branch_id === branchId ? updatedBranches[0].id : settings.active_branch_id;
      const activeObj = updatedBranches.find((b) => b.id === newActiveId) || updatedBranches[0];

      const updatedSettings = {
        ...settings,
        branches: updatedBranches,
        active_branch_id: newActiveId,
        ...(activeObj ? {
          branch_name: activeObj.name,
          business_address: activeObj.address,
          address_line_2: activeObj.address_line_2 || '',
          business_phone: activeObj.phone || '',
          cell_phone: activeObj.cell_phone || '',
          email: activeObj.email || '',
          region: activeObj.region || '',
          city: activeObj.city || '',
          postal_code: activeObj.postal_code || '',
          country: activeObj.country || '',
        } : {})
      };

      setSettingsState(updatedSettings);
      saveSettings(updatedSettings);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBaseCurrencyChange = (newBaseCode: string) => {
    const updatedCurrencies = settings.currencies.map((c) => ({
      ...c,
      is_base: c.code === newBaseCode,
    }));

    const baseObj = updatedCurrencies.find((c) => c.code === newBaseCode);

    setSettingsState({
      ...settings,
      base_currency: newBaseCode,
      currency_symbol: baseObj ? baseObj.symbol : settings.currency_symbol,
      currencies: updatedCurrencies,
    });
  };

  const handleExchangeRateChange = (code: string, rate: number) => {
    const updated = settings.currencies.map((c) =>
      c.code === code ? { ...c, exchange_rate: Math.max(0.000001, rate) } : c
    );
    setSettingsState({ ...settings, currencies: updated });
  };

  const handleToggleCurrency = (code: string) => {
    const updated = settings.currencies.map((c) => {
      if (c.code === code) {
        if (c.is_base) return c; // Cannot disable base currency
        return { ...c, is_active: !c.is_active };
      }
      return c;
    });
    setSettingsState({ ...settings, currencies: updated });
  };

  const handleResetRates = () => {
    if (window.confirm('Reset all currency exchange rates to default global benchmark values?')) {
      setSettingsState({
        ...settings,
        currencies: defaultCurrencies,
      });
    }
  };

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newSymbol || !newRate) return;

    const codeUpper = newCode.toUpperCase().trim();
    if (settings.currencies.some((c) => c.code === codeUpper)) {
      alert('Currency code already exists!');
      return;
    }

    const newCurr: Currency = {
      code: codeUpper,
      name: newName.trim(),
      symbol: newSymbol.trim(),
      exchange_rate: Number(newRate),
      is_base: false,
      is_active: true,
    };

    setSettingsState({
      ...settings,
      currencies: [...settings.currencies, newCurr],
    });

    setShowAddModal(false);
    setNewCode('');
    setNewName('');
    setNewSymbol('');
    setNewRate('');
  };

  const baseCurrencyObj = settings.currencies.find((c) => c.code === settings.base_currency) || settings.currencies[0];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">System & Multi-Currency Settings</h1>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
              Multi-Currency Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company details, base accounting currency, exchange rates, and supported global currencies.
          </p>
        </div>
        {saved && (
          <span className="px-3.5 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4" /> Settings Saved!
          </span>
        )}
      </div>

      {/* SaaS Multi-Tenant Store Chain Organizations Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/90 text-white rounded-xl flex items-center justify-center shadow-md border border-indigo-400/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  SaaS Store Chain Organizations
                </h2>
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-extrabold rounded-md uppercase">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Register completely new departmental store chains with isolated users, databases, inventory, and sales records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterChainModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center justify-center gap-2 shrink-0 border border-indigo-400/40"
          >
            <Plus className="w-4 h-4" /> Register New Store Chain
          </button>
        </div>

        {/* List of Store Chains */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storeChains.map((chain) => {
            const isActive = chain.id === activeChain.id;
            return (
              <div
                key={chain.id}
                className={`p-4 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-slate-800/90 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 font-extrabold flex items-center justify-center text-xs">
                      {chain.code || 'SC'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white leading-snug">
                        {chain.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>CODE: {chain.code}</span>
                        <span>•</span>
                        <span>Admin: {chain.admin_email}</span>
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold rounded-lg inline-flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> Active Context
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStoreChain(chain.id);
                        window.location.reload();
                      }}
                      className="px-3 py-1 bg-slate-700 hover:bg-indigo-600 text-white text-[11px] font-bold rounded-lg transition-colors border border-slate-600"
                    >
                      Switch Context
                    </button>
                  )}
                </div>

                {chain.address && (
                  <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-2 font-medium">
                    <MapPin className="w-3 h-3 text-indigo-400 shrink-0" /> {chain.address}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Settings Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h2 className="text-sm font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-indigo-600" /> Company & General Business Information
          </h2>

          <div className="space-y-4">
            {/* Store / Company Logo Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" /> Store / Company Logo
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Appears on receipts, invoices & header</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview */}
                <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 shrink-0 relative overflow-hidden group shadow-2xs">
                  {settings.logo_url ? (
                    <>
                      <img src={settings.logo_url} alt="Store Logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setSettingsState({ ...settings, logo_url: '' })}
                        className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-[10px] gap-1"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-4 h-4 text-rose-300" /> Remove
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400">
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <span className="text-[9px] font-semibold block">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Options & Controls */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload Logo File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Logo image should be under 2MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSettingsState((prev) => ({ ...prev, logo_url: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {settings.logo_url && (
                      <button
                        type="button"
                        onClick={() => setSettingsState({ ...settings, logo_url: '' })}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold shrink-0">Or Web Image URL</span>
                    <input
                      type="url"
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettingsState({ ...settings, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Supports PNG, JPEG, SVG, WEBP files (Max 2MB) or direct image URL links.
                  </p>
                </div>
              </div>
            </div>

            {/* Business / Company Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Business Name *</label>
              <input
                type="text"
                required
                value={settings.business_name}
                onChange={(e) => setSettingsState({ ...settings, business_name: e.target.value })}
                placeholder="e.g. Askari Departmental Store"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
              />
            </div>

            {/* Tax ID / VAT Registration & Default Tax Percentage (%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax ID / VAT Registration</label>
                <input
                  type="text"
                  value={settings.tax_id || ''}
                  onChange={(e) => setSettingsState({ ...settings, tax_id: e.target.value })}
                  placeholder="Tax ID / VAT Registration Number"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Tax Percentage (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={settings.default_tax_rate || 0}
                  onChange={(e) => setSettingsState({ ...settings, default_tax_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Receipt Footer Terms & Policy & Receipt Footer Terms & Policy (In National Languages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Terms & Policy</label>
                <textarea
                  rows={2}
                  value={settings.invoice_footer || settings.receipt_footer_note || ''}
                  onChange={(e) => setSettingsState({ ...settings, invoice_footer: e.target.value, receipt_footer_note: e.target.value })}
                  placeholder="Thank you for trading with us!"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Terms & Policy (In National Languages)</label>
                <textarea
                  rows={2}
                  value={settings.receipt_footer_national || ''}
                  onChange={(e) => setSettingsState({ ...settings, receipt_footer_national: e.target.value })}
                  placeholder="Terms and policy in national or local language..."
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Store Branches & Regional / Global Locations Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> Store Branches & Global Locations
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure single or multiple branches for your store across local cities, regions, or worldwide locations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] rounded-lg">
                {branches.length} {branches.length === 1 ? 'Branch Configured' : 'Branches Configured'}
              </span>
              <button
                type="button"
                onClick={handleOpenAddBranch}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Branch
              </button>
            </div>
          </div>

          {/* List of Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => {
              const isActive = b.id === settings.active_branch_id;
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{b.name}</h3>
                          {b.code && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded">
                              {b.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {b.is_head_office && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" /> Head Office
                            </span>
                          )}
                          {isActive && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Active POS Store
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-600 text-[11px]">
                      {b.address && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {b.address}{b.address_line_2 ? `, ${b.address_line_2}` : ''}
                          </span>
                        </p>
                      )}
                      {(b.city || b.region || b.country) && (
                        <p className="flex items-center gap-1.5 text-slate-700 font-semibold pl-5">
                          {[b.city, b.region, b.postal_code, b.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {b.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.phone} {b.cell_phone ? `(${b.cell_phone})` : ''}</span>
                        </p>
                      )}
                      {b.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between gap-1 flex-wrap">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => handleSetActiveStoreBranch(b.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/60 px-2 py-1 rounded-lg transition-colors"
                      >
                        Set as Active POS
                      </button>
                    ) : (
                      <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                        Current Store
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {!b.is_head_office && (
                        <button
                          type="button"
                          onClick={() => handleSetHeadOffice(b.id)}
                          title="Set as Head Office"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditBranch(b)}
                        title="Edit Branch Details"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(b.id)}
                          title="Remove Branch"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loyalty Program & Formula Setup Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Customer Loyalty Program & Formula Setup
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure point earning formulas, redemption conversion values, and default customer rewards.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.loyalty_enabled ?? true}
                onChange={(e) => setSettingsState({ ...settings, loyalty_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              <span className="ml-2 text-xs font-bold text-slate-800">
                {settings.loyalty_enabled ?? true ? 'Loyalty Active' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <Gift className="w-4 h-4 text-amber-600" /> Earning Formula Rate
              </div>
              <label className="block text-[11px] text-slate-600">
                Amount spent ({settings.currency_symbol || '৳'}) per 1 Point Earned:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">{settings.currency_symbol || '৳'}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={settings.loyalty_earn_amount_per_point ?? 100}
                  onChange={(e) => setSettingsState({ ...settings, loyalty_earn_amount_per_point: Math.max(1, Number(e.target.value)) })}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Formula: Points Earned = Subtotal / {settings.loyalty_earn_amount_per_point ?? 100}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Global Redemption Formula Value
              </div>
              <label className="block text-[11px] text-slate-600">
                Currency value ({settings.currency_symbol || '৳'}) per 1 Point Redeemed:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">{settings.currency_symbol || '৳'}</span>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={settings.loyalty_redemption_rate ?? 1.0}
                  onChange={(e) => setSettingsState({ ...settings, loyalty_redemption_rate: Math.max(0.0001, Number(e.target.value)) })}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Example: 10 Points = {settings.currency_symbol || '৳'}{((settings.loyalty_redemption_rate ?? 1.0) * 10).toFixed(2)} payment credit
              </p>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-200/70 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                <Award className="w-4 h-4 text-indigo-600" /> Redemption Minimum Threshold
              </div>
              <label className="block text-[11px] text-slate-600">
                Minimum points required to redeem in sale:
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={settings.loyalty_min_points_to_redeem ?? 5}
                onChange={(e) => setSettingsState({ ...settings, loyalty_min_points_to_redeem: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-500 italic">
                Note: Customer-specific formulas can also be customized in Customer Directory.
              </p>
            </div>
          </div>
        </div>

        {/* Store POS Setup Settings / Duplicate SKU Scan Behavior Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-indigo-600" /> Duplicate SKU / Barcode Scan Behavior (Note b)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Controls how Z-POS handles scanning an item that is already present in the active sale grid.
            </p>
          </div>

          <div className="space-y-3 max-w-2xl">
            <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              (settings.duplicate_scan_behavior || 'increase_qty') === 'increase_qty'
                ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
            }`}>
              <input
                type="radio"
                name="duplicate_scan_behavior"
                checked={(settings.duplicate_scan_behavior || 'increase_qty') === 'increase_qty'}
                onChange={() => setSettingsState({ ...settings, duplicate_scan_behavior: 'increase_qty' })}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-900 block text-xs">Option A: Increase Quantity</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Increments the quantity counter on the existing line item in the grid.
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              settings.duplicate_scan_behavior === 'new_line'
                ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
            }`}>
              <input
                type="radio"
                name="duplicate_scan_behavior"
                checked={settings.duplicate_scan_behavior === 'new_line'}
                onChange={() => setSettingsState({ ...settings, duplicate_scan_behavior: 'new_line' })}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-900 block text-xs">Option B: Add as New Line Item</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Appends a new separate row in the grid for each scan.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Multi-Currency & Exchange Rates Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" /> Multi-Currency & Exchange Rate Management
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set accounting base currency and configure active exchange rates for multi-currency transactions and viewing.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetRates}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Reset Rates
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Currency
              </button>
            </div>
          </div>

          {/* Base Currency Selection */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Globe className="w-4 h-4 text-emerald-700" /> Base Accounting Currency:
                <span className="text-emerald-800 font-black uppercase text-sm">{baseCurrencyObj.code} ({baseCurrencyObj.symbol})</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                All ledger records and stock prices are stored fundamentally in this base currency.
              </p>
            </div>
            <div className="sm:w-64">
              <select
                value={settings.base_currency}
                onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {settings.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Currencies & Exchange Rates Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Exchange Rate (1 {baseCurrencyObj.code} = )</th>
                  <th className="py-2.5 px-3">Inverse Benchmark</th>
                  <th className="py-2.5 px-3 text-center">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {settings.currencies.map((c) => {
                  const isBase = c.code === settings.base_currency;
                  const inverseRate = c.exchange_rate > 0 ? (1 / c.exchange_rate).toFixed(2) : 0;

                  return (
                    <tr key={c.code} className={`hover:bg-slate-50/80 transition-colors ${isBase ? 'bg-emerald-50/30' : ''}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs uppercase">{c.code}</span>
                          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">{c.name}</span>
                          {isBase && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded">
                              BASE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 text-sm">
                        {c.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        {isBase ? (
                          <span className="font-bold text-slate-400">1.000000 (Base)</span>
                        ) : (
                          <div className="flex items-center gap-1 max-w-[140px]">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={c.exchange_rate}
                              onChange={(e) => handleExchangeRateChange(c.code, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                            <span className="text-slate-400 font-bold">{c.symbol}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">
                        {isBase ? '1 ' + c.code : `1 ${c.code} ≈ ${inverseRate} ${baseCurrencyObj.code}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          disabled={isBase}
                          checked={c.is_active}
                          onChange={() => handleToggleCurrency(c.code)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all text-sm"
          >
            <Save className="w-4 h-4" /> Save System & Multi-Currency Settings
          </button>
        </div>
      </form>

      {/* Add Custom Currency Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" /> Add Custom Currency
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCurrency} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency Code (3 letters)</label>
                <input
                  type="text"
                  maxLength={3}
                  required
                  placeholder="e.g. KWD"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none font-bold uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kuwaiti Dinar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. د.ك"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exchange Rate (1 {baseCurrencyObj.code} = ? {newCode || 'NEW'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 0.0025"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Add Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingBranchId ? 'Edit Store Branch' : 'Add New Store Branch'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulberg III Shop, Times Square, Oxford St"
                    value={branchForm.name || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ASK-LHR-01"
                    value={branchForm.code || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="Main Boulevard, Street 12"
                    value={branchForm.address || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    placeholder="Block B, Plot 42 / Suite 400"
                    value={branchForm.address_line_2 || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, address_line_2: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore, New York"
                    value={branchForm.city || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Region / State</label>
                  <input
                    type="text"
                    placeholder="e.g. Punjab, NY"
                    value={branchForm.region || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 54660, 10036"
                    value={branchForm.postal_code || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, postal_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. Pakistan, USA"
                    value={branchForm.country || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+92 42 35710000"
                    value={branchForm.phone || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cell Phone Number</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={branchForm.cell_phone || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, cell_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Email</label>
                  <input
                    type="email"
                    placeholder="branch@askari.com"
                    value={branchForm.email || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branchForm.is_head_office || false}
                    onChange={(e) => setBranchForm({ ...branchForm, is_head_office: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Set as Head Office / Main Branch</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingBranchId ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Store Chain Modal */}
      <RegisterStoreChainModal
        isOpen={isRegisterChainModalOpen}
        onClose={() => setIsRegisterChainModalOpen(false)}
        onChainRegistered={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};
