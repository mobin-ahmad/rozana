import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Check,
  Edit3,
  Trash2,
  Layers,
  Crown,
  ShieldCheck,
  Store,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Users,
  Briefcase,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Lock,
  Globe
} from 'lucide-react';
import { StoreChain, User } from '../types';
import {
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  registerNewStoreChain,
  updateStoreChain,
  deleteStoreChain,
  toggleStoreChainStatus,
  getCurrentUser,
  isUserSuperAdmin
} from '../lib/storage';

interface BusinessProfilesProps {
  currentUser: User;
  onSwitchStore?: (chainId: string) => void;
}

export const BusinessProfiles: React.FC<BusinessProfilesProps> = ({
  currentUser,
  onSwitchStore,
}) => {
  const [chains, setChains] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChainState] = useState<StoreChain>(() => getActiveStoreChain());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    business_type: 'Timber & Wood Mart',
    industry: 'Wood POS & Inventory',
    description: '',
    logo_url: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    phone: '',
    address: '',
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<StoreChain | null>(null);
  const [editForm, setEditForm] = useState<Partial<StoreChain>>({});

  // Message / Alert State
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const refreshList = () => {
    const updated = getStoreChains();
    setChains(updated);
    setActiveChainState(getActiveStoreChain());
  };

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const handleSwitchStore = (chainId: string) => {
    setActiveStoreChain(chainId);
    setActiveChainState(getActiveStoreChain());
    if (onSwitchStore) {
      onSwitchStore(chainId);
    } else {
      window.location.reload();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      showAlert('error', 'Please provide a valid Business / Store Name.');
      return;
    }
    if (!createForm.admin_email.trim() || !createForm.admin_email.includes('@')) {
      showAlert('error', 'Please provide a valid Admin Email address.');
      return;
    }
    if (!createForm.admin_name.trim()) {
      showAlert('error', 'Please enter the Business Primary Admin Name.');
      return;
    }

    try {
      const newChain = registerNewStoreChain({
        name: createForm.name.trim(),
        code: createForm.code.trim() || createForm.name.substring(0, 4).toUpperCase(),
        business_type: createForm.business_type.trim(),
        industry: createForm.industry.trim(),
        description: createForm.description.trim(),
        logo_url: createForm.logo_url.trim(),
        admin_name: createForm.admin_name.trim(),
        admin_email: createForm.admin_email.trim(),
        admin_password: createForm.admin_password || 'Admin@123',
        phone: createForm.phone.trim(),
        address: createForm.address.trim(),
      });

      showAlert('success', `Business profile "${newChain.name}" created successfully! Super Admin Mobin has universal access.`);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        code: '',
        business_type: 'Timber & Wood Mart',
        industry: 'Wood POS & Inventory',
        description: '',
        logo_url: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        phone: '',
        address: '',
      });
      refreshList();
    } catch (err: any) {
      showAlert('error', err?.message || 'Failed to create business profile.');
    }
  };

  const handleOpenEdit = (chain: StoreChain) => {
    setEditingChain(chain);
    setEditForm({
      name: chain.name,
      code: chain.code,
      business_type: chain.business_type || 'Timber & Wood Mart',
      industry: chain.industry || '',
      description: chain.description || '',
      logo_url: chain.logo_url || '',
      admin_name: chain.admin_name,
      admin_email: chain.admin_email,
      phone: chain.phone || '',
      address: chain.address || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChain) return;

    const res = updateStoreChain(editingChain.id, editForm);
    if (res.success) {
      showAlert('success', 'Business Profile updated successfully!');
      setIsEditModalOpen(false);
      refreshList();
    } else {
      showAlert('error', res.message);
    }
  };

  const handleToggleStatus = (chain: StoreChain) => {
    const res = toggleStoreChainStatus(chain.id);
    if (res.success) {
      showAlert('success', res.message);
      refreshList();
    } else {
      showAlert('error', res.message);
    }
  };

  const handleDelete = (chain: StoreChain) => {
    if (chain.id === 'chain-default') {
      showAlert('error', 'The primary default store chain cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove the business profile "${chain.name}"? This action cannot be undone.`)) {
      const res = deleteStoreChain(chain.id);
      if (res.success) {
        showAlert('success', res.message);
        refreshList();
      } else {
        showAlert('error', res.message);
      }
    }
  };

  const filteredChains = chains.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.admin_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.business_type && c.business_type.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Alert */}
      {alertMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-sm ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Super Admin Authority Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> SaaS Global Super Admin
              </span>
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                Multi-Tenant SaaS Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-7 h-7 text-indigo-400" /> Business Profiles & Store Chains
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              As the Master Super Administrator (<strong className="text-white font-bold">{currentUser.full_name}</strong>), you have universal authority across all business profiles and store chains. Create new business profiles, provision departmental store chains, and switch contexts with one click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 border border-indigo-400/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Business Profile
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Businesses</p>
            <p className="text-2xl font-black text-slate-900 leading-tight">{chains.length}</p>
            <p className="text-[10px] text-slate-500 font-medium">Registered in SaaS Data</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Stores</p>
            <p className="text-2xl font-black text-emerald-600 leading-tight">
              {chains.filter((c) => c.is_active).length}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Live Operational Tenants</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Context</p>
            <p className="text-base font-black text-slate-900 truncate leading-tight">{activeChain.name}</p>
            <p className="text-[10px] text-amber-700 font-bold font-mono">CODE: {activeChain.code}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Master Access</p>
            <p className="text-sm font-black text-purple-900 leading-tight">Universal Admin</p>
            <p className="text-[10px] text-purple-700 font-semibold">Super Admin: {currentUser.full_name}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search business name, code, admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Businesses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Business Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredChains.map((chain) => {
          const isActive = chain.id === activeChain.id;
          return (
            <div
              key={chain.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs flex flex-col overflow-hidden ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {chain.logo_url ? (
                      <img src={chain.logo_url} alt="Logo" className="w-full h-full object-contain p-1 rounded-xl" />
                    ) : (
                      chain.code.substring(0, 4)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 truncate leading-snug">
                        {chain.name}
                      </h3>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Current
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {chain.code}
                      </span>
                      {chain.business_type && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          {chain.business_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                      chain.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${chain.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {chain.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              {/* Card Body Info */}
              <div className="p-5 space-y-3 flex-1 text-xs">
                {chain.description && (
                  <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{chain.description}"
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">Admin: <strong className="text-slate-900 font-bold">{chain.admin_name}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate text-slate-500 font-mono text-[11px]">{chain.admin_email}</span>
                  </div>

                  {chain.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate text-[11px]">{chain.phone}</span>
                    </div>
                  )}

                  {chain.address && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate text-[11px]">{chain.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registered: {new Date(chain.created_at).toLocaleDateString()}</span>
                  <span className="text-indigo-600 font-bold">Universal Super Admin: Mobin</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  {isActive ? (
                    <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-3.5 h-3.5" /> Active Store
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchStore(chain.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Switch to Business
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(chain)}
                    title="Edit Business Profile"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {chain.id !== 'chain-default' && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(chain)}
                      title={chain.is_active ? 'Suspend Business' : 'Activate Business'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        chain.is_active
                          ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                          : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {chain.id !== 'chain-default' && chain.id !== 'chain-jks' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(chain)}
                      title="Delete Business Profile"
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
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

      {/* Create New Business Profile Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-600/90 text-white rounded-xl flex items-center justify-center shadow-md border border-indigo-400/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block">
                    SaaS Multi-Business Creation
                  </span>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    Create New Business Profile
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Provision a completely isolated business dataset (inventories, sales, ledger, users) with Super Admin Mobin granted universal access.
              </p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> 1. Business Profile Identity
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business / Store Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JKS Timber & Wood Mart"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JKS"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business Type / Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Wholesale Timber Mart, Retail Chain"
                      value={createForm.business_type}
                      onChange={(e) => setCreateForm({ ...createForm, business_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Industry / Domain
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Timber & Hardwood"
                      value={createForm.industry}
                      onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Admin */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> 2. Business Manager / Store Admin
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Store Manager Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={createForm.admin_name}
                      onChange={(e) => setCreateForm({ ...createForm, admin_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Manager Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@jkswood.com"
                      value={createForm.admin_email}
                      onChange={(e) => setCreateForm({ ...createForm, admin_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Manager Initial Password / PIN
                    </label>
                    <input
                      type="text"
                      placeholder="Default: 123456 or Admin@123"
                      value={createForm.admin_password}
                      onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+92 300 0000000"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Head Office Address */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> 3. Location & Description
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Head Office / Store Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Timber Market, Ravi Road, Lahore"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional business summary..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Global Super Admin:</strong> Mobin will automatically have full unrestricted access to this new business profile.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create & Provision Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Business Profile Modal */}
      {isEditModalOpen && editingChain && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">
                  Edit Business Profile ({editingChain.code})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Code</label>
                  <input
                    type="text"
                    required
                    value={editForm.code || ''}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Type</label>
                  <input
                    type="text"
                    value={editForm.business_type || ''}
                    onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Name</label>
                  <input
                    type="text"
                    value={editForm.admin_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, admin_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={editForm.admin_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, admin_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
