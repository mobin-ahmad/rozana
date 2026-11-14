import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Eye,
  Home,
  Users,
  GitBranch,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Globe,
  Shield,
  Calendar,
  CreditCard,
  Layers,
  ArrowRightLeft,
  History,
  Check,
  Store,
  Lock,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import {
  StoreChain,
  SubscriptionPlan,
  SubscriptionHistoryEntry,
  OrganizationStatus,
  User,
} from '../types';
import {
  ALL_MODULE_KEYS,
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  getSubscriptionPlans,
  saveSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  getSubscriptionHistory,
  registerOrganization,
  updateStoreChain,
  setOrganizationStatus,
  assignOrganizationPlan,
  getOrganizationUsageStats,
  getPlanById,
  subscribeToStorage,
  isUserSuperAdmin,
} from '../lib/storage';
import { formatCurrency } from '../lib/cft';

interface OrganizationsPlansProps {
  currentUser: User;
  onSwitchOrganization?: (chainId: string) => void;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'POS Terminal',
  inventory: 'Inventory & Items',
  purchases: 'Purchases (Stock-In)',
  sales: 'Sales & Invoices',
  customers: 'Customers & Loyalty',
  suppliers: 'Suppliers & Ledger',
  payments: 'Payments Ledger',
  expenses: 'Expenses',
  reports: 'Reports & Analytics',
  organization: 'Organization & Branches',
  users: 'Users & Roles',
  settings: 'System Settings',
  audit_logs: 'Audit Logs',
};

const formatDateShort = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StatusPill: React.FC<{ status?: OrganizationStatus; isActive?: boolean }> = ({ status, isActive }) => {
  const effective: OrganizationStatus = status || (isActive === false ? 'suspended' : 'active');
  const styles: Record<OrganizationStatus, { wrap: string; dot: string; label: string }> = {
    active: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
    suspended: { wrap: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Suspended' },
    expired: { wrap: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Expired' },
    pending: { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500', label: 'Pending' },
  };
  const cfg = styles[effective] || styles.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const OrganizationsPlans: React.FC<OrganizationsPlansProps> = ({
  currentUser,
  onSwitchOrganization,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'organizations' | 'plans'>('organizations');
  const [organizations, setOrganizations] = useState<StoreChain[]>(() => getStoreChains());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => getSubscriptionPlans());
  const [history, setHistory] = useState<SubscriptionHistoryEntry[]>(() => getSubscriptionHistory());
  const [activeChainId, setActiveChainIdState] = useState<string>(() => getActiveStoreChain().id);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrganizationStatus>('all');

  // Toast/Banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Organization Form Modal (Create & Edit)
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<StoreChain | null>(null);
  const [orgFormError, setOrgFormError] = useState<string | null>(null);

  const defaultExpiryDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [orgForm, setOrgForm] = useState({
    name: '',
    code: '',
    logo_url: '',
    business_type: 'Departmental Store & Retail',
    registration_number: '',
    tax_id: '',
    email: '',
    phone: '',
    website: '',
    country: 'Pakistan',
    city: '',
    address: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    admin_username: '',
    admin_password: '',
    plan_id: 'plan-starter',
    subscription_start_date: new Date().toISOString().split('T')[0],
    subscription_expiry_date: defaultExpiryDate(),
    max_branches: 5,
    max_users: 25,
    max_pos_terminals: 5,
    status: 'active' as OrganizationStatus,
  });

  // Organization Details View Modal
  const [viewingOrgId, setViewingOrgId] = useState<string | null>(null);

  // Plan Form Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFormError, setPlanFormError] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    monthly_price: 0,
    annual_price: 0,
    max_branches: 5,
    max_users: 25,
    max_pos_terminals: 5,
    storage_limit_mb: 2048,
    available_modules: ['dashboard', 'pos', 'inventory', 'sales', 'customers', 'organization', 'users'] as string[],
    status: 'active' as 'active' | 'inactive',
  });

  const refreshData = () => {
    setOrganizations(getStoreChains());
    setPlans(getSubscriptionPlans());
    setHistory(getSubscriptionHistory());
    setActiveChainIdState(getActiveStoreChain().id);
  };

  useEffect(() => {
    const unsub = subscribeToStorage(refreshData);
    return unsub;
  }, []);

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const orgUsageMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getOrganizationUsageStats>> = {};
    organizations.forEach((org) => {
      map[org.id] = getOrganizationUsageStats(org.id);
    });
    return map;
  }, [organizations, plans]);

  const summaryStats = useMemo(() => {
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter((o) => (o.status || (o.is_active ? 'active' : 'suspended')) === 'active').length;
    const suspendedOrgs = organizations.filter((o) => (o.status || (o.is_active ? 'active' : 'suspended')) === 'suspended').length;
    const totalBranches = organizations.reduce((sum, o) => sum + (orgUsageMap[o.id]?.branchCount || 0), 0);
    const totalUsers = organizations.reduce((sum, o) => sum + (orgUsageMap[o.id]?.userCount || 0), 0);
    return { totalOrgs, activeOrgs, suspendedOrgs, totalBranches, totalUsers };
  }, [organizations, orgUsageMap]);

  const filteredOrganizations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return organizations.filter((org) => {
      const effectiveStatus: OrganizationStatus = org.status || (org.is_active === false ? 'suspended' : 'active');
      const matchesSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        (org.code || '').toLowerCase().includes(q) ||
        (org.admin_name || '').toLowerCase().includes(q) ||
        (org.admin_email || '').toLowerCase().includes(q) ||
        (org.city || '').toLowerCase().includes(q);
      const matchesPlan = planFilter === 'all' || (org.plan_id || 'plan-free') === planFilter;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [organizations, searchQuery, planFilter, statusFilter]);

  const openRegisterOrgModal = () => {
    setEditingOrg(null);
    setOrgFormError(null);
    const defaultPlan = plans.find((p) => p.id === 'plan-starter' && p.status === 'active') || plans.find((p) => p.status === 'active') || plans[0];
    setOrgForm({
      name: '',
      code: '',
      logo_url: '',
      business_type: 'Departmental Store & Retail',
      registration_number: '',
      tax_id: '',
      email: '',
      phone: '',
      website: '',
      country: 'Pakistan',
      city: '',
      address: '',
      admin_name: '',
      admin_email: '',
      admin_phone: '',
      admin_username: '',
      admin_password: '',
      plan_id: defaultPlan?.id || 'plan-free',
      subscription_start_date: new Date().toISOString().split('T')[0],
      subscription_expiry_date: defaultExpiryDate(),
      max_branches: defaultPlan?.max_branches || 5,
      max_users: defaultPlan?.max_users || 25,
      max_pos_terminals: defaultPlan?.max_pos_terminals || 5,
      status: 'active',
    });
    setIsOrgModalOpen(true);
  };

  const openEditOrgModal = (org: StoreChain) => {
    setEditingOrg(org);
    setOrgFormError(null);
    const assignedPlan = getPlanById(org.plan_id);
    setOrgForm({
      name: org.name,
      code: org.code,
      logo_url: org.logo_url || '',
      business_type: org.business_type || 'Departmental Store & Retail',
      registration_number: org.registration_number || '',
      tax_id: org.tax_id || '',
      email: org.admin_email || '',
      phone: org.phone || '',
      website: org.website || '',
      country: org.country || 'Pakistan',
      city: org.city || '',
      address: org.address || '',
      admin_name: org.admin_name || '',
      admin_email: org.admin_email || '',
      admin_phone: org.admin_phone || org.phone || '',
      admin_username: org.admin_username || '',
      admin_password: '',
      plan_id: org.plan_id || assignedPlan.id,
      subscription_start_date: org.subscription_start_date || new Date().toISOString().split('T')[0],
      subscription_expiry_date: org.subscription_expiry_date || defaultExpiryDate(),
      max_branches: org.max_branches || assignedPlan.max_branches,
      max_users: org.max_users || assignedPlan.max_users,
      max_pos_terminals: org.max_pos_terminals || assignedPlan.max_pos_terminals,
      status: org.status || (org.is_active === false ? 'suspended' : 'active'),
    });
    setIsOrgModalOpen(true);
  };

  const handlePlanSelectionInOrgForm = (planId: string) => {
    const p = getPlanById(planId);
    setOrgForm((prev) => ({
      ...prev,
      plan_id: planId,
      max_branches: p.max_branches,
      max_users: p.max_users,
      max_pos_terminals: p.max_pos_terminals,
    }));
  };

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrgFormError(null);

    if (!orgForm.name.trim()) {
      setOrgFormError('Organization Name is required.');
      return;
    }
    if (!orgForm.admin_name.trim() || !orgForm.admin_email.trim()) {
      setOrgFormError('Organization Administrator Full Name and Email are required.');
      return;
    }

    if (editingOrg) {
      const updateRes = updateStoreChain(editingOrg.id, {
        name: orgForm.name.trim(),
        code: orgForm.code.trim().toUpperCase() || editingOrg.code,
        logo_url: orgForm.logo_url.trim(),
        business_type: orgForm.business_type.trim(),
        registration_number: orgForm.registration_number.trim(),
        tax_id: orgForm.tax_id.trim(),
        phone: orgForm.phone.trim(),
        website: orgForm.website.trim(),
        country: orgForm.country.trim(),
        city: orgForm.city.trim(),
        address: orgForm.address.trim(),
        admin_name: orgForm.admin_name.trim(),
        admin_email: orgForm.admin_email.trim(),
        admin_phone: orgForm.admin_phone.trim(),
        admin_username: orgForm.admin_username.trim(),
        status: orgForm.status,
        subscription_start_date: orgForm.subscription_start_date,
        subscription_expiry_date: orgForm.subscription_expiry_date,
        max_branches: Number(orgForm.max_branches),
        max_users: Number(orgForm.max_users),
        max_pos_terminals: Number(orgForm.max_pos_terminals),
      });

      if (!updateRes.success) {
        setOrgFormError(updateRes.message);
        return;
      }

      if (orgForm.plan_id !== editingOrg.plan_id) {
        assignOrganizationPlan(editingOrg.id, orgForm.plan_id, {
          subscription_start_date: orgForm.subscription_start_date,
          subscription_expiry_date: orgForm.subscription_expiry_date,
          max_branches: Number(orgForm.max_branches),
          max_users: Number(orgForm.max_users),
          max_pos_terminals: Number(orgForm.max_pos_terminals),
        });
      }

      showToast('success', `Organization "${orgForm.name.trim()}" updated successfully.`);
      setIsOrgModalOpen(false);
      refreshData();
    } else {
      const res = registerOrganization({
        name: orgForm.name.trim(),
        code: orgForm.code.trim(),
        logo_url: orgForm.logo_url.trim(),
        business_type: orgForm.business_type.trim(),
        registration_number: orgForm.registration_number.trim(),
        tax_id: orgForm.tax_id.trim(),
        email: orgForm.email.trim() || orgForm.admin_email.trim(),
        phone: orgForm.phone.trim(),
        website: orgForm.website.trim(),
        country: orgForm.country.trim(),
        city: orgForm.city.trim(),
        address: orgForm.address.trim(),
        admin_name: orgForm.admin_name.trim(),
        admin_email: orgForm.admin_email.trim(),
        admin_phone: orgForm.admin_phone.trim(),
        admin_username: orgForm.admin_username.trim(),
        admin_password: orgForm.admin_password.trim() || 'Admin@123',
        plan_id: orgForm.plan_id,
        subscription_start_date: orgForm.subscription_start_date,
        subscription_expiry_date: orgForm.subscription_expiry_date,
        max_branches: Number(orgForm.max_branches),
        max_users: Number(orgForm.max_users),
        max_pos_terminals: Number(orgForm.max_pos_terminals),
        status: orgForm.status,
        switchContext: false,
      });

      if (!res.success) {
        setOrgFormError(res.message);
        return;
      }

      showToast('success', res.message);
      setIsOrgModalOpen(false);
      refreshData();
    }
  };

  const handleInlinePlanChange = (org: StoreChain, newPlanId: string) => {
    const res = assignOrganizationPlan(org.id, newPlanId);
    if (res.success) {
      showToast('success', res.message);
      refreshData();
    } else {
      showToast('error', res.message);
    }
  };

  const handleToggleSuspend = (org: StoreChain) => {
    const isCurrentlyActive = (org.status || (org.is_active ? 'active' : 'suspended')) === 'active';
    const nextStatus: OrganizationStatus = isCurrentlyActive ? 'suspended' : 'active';
    const res = setOrganizationStatus(org.id, nextStatus);
    if (res.success) {
      showToast('success', res.message);
      refreshData();
    } else {
      showToast('error', res.message);
    }
  };

  const handleEnterOrgWorkspace = (orgId: string) => {
    setActiveStoreChain(orgId);
    refreshData();
    if (onSwitchOrganization) {
      onSwitchOrganization(orgId);
    }
  };

  // Plan Management handlers
  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanFormError(null);
    setPlanForm({
      name: '',
      description: '',
      monthly_price: 49,
      annual_price: 490,
      max_branches: 10,
      max_users: 40,
      max_pos_terminals: 10,
      storage_limit_mb: 5120,
      available_modules: ['dashboard', 'pos', 'inventory', 'purchases', 'sales', 'customers', 'suppliers', 'payments', 'reports', 'organization', 'users'],
      status: 'active',
    });
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanFormError(null);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      max_branches: plan.max_branches,
      max_users: plan.max_users,
      max_pos_terminals: plan.max_pos_terminals,
      storage_limit_mb: plan.storage_limit_mb,
      available_modules: [...plan.available_modules],
      status: plan.status,
    });
    setIsPlanModalOpen(true);
  };

  const handleToggleModuleInPlan = (modKey: string) => {
    setPlanForm((prev) => {
      const exists = prev.available_modules.includes(modKey);
      return {
        ...prev,
        available_modules: exists
          ? prev.available_modules.filter((m) => m !== modKey)
          : [...prev.available_modules, modKey],
      };
    });
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlanFormError(null);
    const res = saveSubscriptionPlan({
      ...(editingPlan ? { id: editingPlan.id } : {}),
      ...planForm,
    });
    if (!res.success) {
      setPlanFormError(res.message);
      return;
    }
    showToast('success', res.message);
    setIsPlanModalOpen(false);
    refreshData();
  };

  const handleTogglePlanStatus = (planId: string) => {
    const res = toggleSubscriptionPlanStatus(planId);
    showToast(res.success ? 'success' : 'error', res.message);
    refreshData();
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <Lock className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-lg font-extrabold text-slate-900">Platform Administration Restricted</h2>
          <p className="text-xs text-slate-500">
            Organizations & Subscription Plans management is reserved exclusively for Global Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  const viewingOrg = viewingOrgId ? organizations.find((o) => o.id === viewingOrgId) || null : null;
  const viewingUsage = viewingOrg ? orgUsageMap[viewingOrg.id] : null;
  const viewingHistory = viewingOrg ? history.filter((h) => h.organization_id === viewingOrg.id) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Feedback Toast */}
      {toast && (
        <div
          className={`p-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-xs ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            {toast.text}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Pulse-Inspired Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Organizations</h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Every organization running on Rozana POS, and the subscription plan each one is on. Each tenant maintains isolated branches, staff, inventory, and sales; only Global Administrators see this console.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={refreshData}
              title="Refresh organizations & usage counts"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={activeSubTab === 'organizations' ? openRegisterOrgModal : openCreatePlanModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {activeSubTab === 'organizations' ? 'Register organization' : 'Create plan'}
            </button>
          </div>
        </div>

        {/* Segmented Sub-Tabs: Organizations (N) / Plans (N) */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('organizations')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
              activeSubTab === 'organizations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Organizations ({organizations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('plans')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
              activeSubTab === 'plans'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Plans ({plans.length})
          </button>
        </div>
      </div>

      {/* ================= TAB 1: ORGANIZATIONS ================= */}
      {activeSubTab === 'organizations' && (
        <div className="space-y-5">
          {/* 5 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Organizations
                </span>
                <span className="text-2xl font-black text-slate-900 tabular-nums mt-1 block">
                  {summaryStats.totalOrgs}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Organizations
                </span>
                <span className="text-2xl font-black text-emerald-700 tabular-nums mt-1 block">
                  {summaryStats.activeOrgs}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                <PlayCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Suspended
                </span>
                <span className="text-2xl font-black text-rose-600 tabular-nums mt-1 block">
                  {summaryStats.suspendedOrgs}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0">
                <PauseCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Branches
                </span>
                <span className="text-2xl font-black text-slate-900 tabular-nums mt-1 block">
                  {summaryStats.totalBranches}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-2xs col-span-2 sm:col-span-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Users
                </span>
                <span className="text-2xl font-black text-slate-900 tabular-nums mt-1 block">
                  {summaryStats.totalUsers}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Search, Filters & Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, code, or administrator..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All plans</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | OrganizationStatus)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Any status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-slate-500 tabular-nums shrink-0 text-right">
                {filteredOrganizations.length} of {organizations.length}
              </div>
            </div>

            {/* Organizations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Administrator</th>
                    <th className="py-3 px-3 text-right">Branches</th>
                    <th className="py-3 px-3 text-right">Users</th>
                    <th className="py-3 px-3">Registered</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrganizations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        No organizations match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrganizations.map((org) => {
                      const usage = orgUsageMap[org.id];
                      const isHome = org.id === 'chain-default';
                      const isCurrentlyActiveWorkspace = org.id === activeChainId;
                      const effectiveStatus: OrganizationStatus =
                        org.status || (org.is_active === false ? 'suspended' : 'active');

                      return (
                        <tr
                          key={org.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrentlyActiveWorkspace ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          {/* Organization */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden font-black text-indigo-700 text-xs">
                                {org.logo_url ? (
                                  <img src={org.logo_url} alt={org.name} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  (org.code || org.name).substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 truncate max-w-[190px]">
                                    {org.name}
                                  </span>
                                  {isHome && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                      <Home className="w-2.5 h-2.5" /> Home
                                    </span>
                                  )}
                                  {isCurrentlyActiveWorkspace && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-400 block">
                                  @{(org.code || org.id).toLowerCase()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Plan Inline Selector */}
                          <td className="py-3.5 px-3">
                            <select
                              value={org.plan_id || 'plan-free'}
                              onChange={(e) => handleInlinePlanChange(org, e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            <StatusPill status={effectiveStatus} isActive={org.is_active} />
                          </td>

                          {/* Administrator */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800 truncate max-w-[160px]">{org.admin_name}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{org.admin_email}</div>
                          </td>

                          {/* Branches */}
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                            <span className="font-extrabold text-slate-900">{usage?.branchCount || 0}</span>
                            <span className="text-slate-400"> / {usage?.maxBranches || 0}</span>
                          </td>

                          {/* Users */}
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                            <span className="font-extrabold text-slate-900">{usage?.userCount || 0}</span>
                            <span className="text-slate-400"> / {usage?.maxUsers || 0}</span>
                          </td>

                          {/* Registered */}
                          <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                            {formatDateShort(org.subscription_start_date || org.created_at)}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                            {formatDateShort(org.subscription_expiry_date)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditOrgModal(org)}
                                title="Edit organization"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setViewingOrgId(org.id)}
                                title="View complete organization details"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEnterOrgWorkspace(org.id)}
                                title="Switch into this organization workspace"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              {!isHome && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(org)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                    effectiveStatus === 'active'
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  {effectiveStatus === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SUBSCRIPTION PLANS ================= */}
      {activeSubTab === 'plans' && (
        <div className="space-y-5">
          {/* Plans Grid / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Available Subscription Plans</h2>
                <p className="text-[11px] text-slate-500">
                  Configure tier pricing, branch quotas, employee seats, terminal limits, and permitted POS modules.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreatePlanModal}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Plan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Plan Name</th>
                    <th className="py-3 px-3 text-right">Monthly / Annual</th>
                    <th className="py-3 px-3 text-right">Max Branches</th>
                    <th className="py-3 px-3 text-right">Max Users</th>
                    <th className="py-3 px-3 text-right">POS Terminals</th>
                    <th className="py-3 px-3 text-right">Storage</th>
                    <th className="py-3 px-3">Included Modules</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => {
                    const orgsOnPlan = organizations.filter((o) => o.plan_id === plan.id).length;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{plan.name}</div>
                          <div className="text-[11px] text-slate-500 max-w-xs line-clamp-1">{plan.description}</div>
                          <span className="text-[10px] text-indigo-600 font-bold">
                            {orgsOnPlan} organization{orgsOnPlan === 1 ? '' : 's'} subscribed
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                          <div className="font-extrabold text-slate-900">${plan.monthly_price}/mo</div>
                          <div className="text-[11px] text-slate-400">${plan.annual_price}/yr</div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {plan.max_branches}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {plan.max_users}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {plan.max_pos_terminals}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                          {plan.storage_limit_mb >= 1024
                            ? `${(plan.storage_limit_mb / 1024).toFixed(0)} GB`
                            : `${plan.storage_limit_mb} MB`}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] tabular-nums">
                            {plan.available_modules.length} / {ALL_MODULE_KEYS.length} modules
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              plan.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                plan.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {plan.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditPlanModal(plan)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePlanStatus(plan.id)}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                                plan.status === 'active'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Subscription Change History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Subscription Change & Audit History</h3>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No subscription upgrades, downgrades, or status transitions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {history.slice(0, 15).map((entry) => (
                  <div key={entry.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{entry.organization_name}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold uppercase">
                          {entry.action.replace('_', ' ')}
                        </span>
                        {entry.previous_plan_name && entry.previous_plan_name !== entry.new_plan_name ? (
                          <span className="text-slate-600 font-semibold">
                            {entry.previous_plan_name} → {entry.new_plan_name}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-semibold">{entry.new_plan_name}</span>
                        )}
                      </div>
                      {entry.notes && <p className="text-[11px] text-slate-500">{entry.notes}</p>}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <span className="font-semibold text-slate-600 block">By {entry.changed_by}</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= REGISTER / EDIT ORGANIZATION MODAL ================= */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-extrabold">
                    {editingOrg ? `Edit Organization — ${editingOrg.name}` : 'Register New Organization'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Provision an independent tenant workspace with administrator credentials and subscription plan limits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOrgModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrgSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {orgFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {orgFormError}
                </div>
              )}

              {/* Section 1: Organization Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-600" /> 1. Organization Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      placeholder="e.g. Metro Supermart Chain"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization Code *</label>
                    <input
                      type="text"
                      value={orgForm.code}
                      onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. METRO"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Type</label>
                    <input
                      type="text"
                      value={orgForm.business_type}
                      onChange={(e) => setOrgForm({ ...orgForm, business_type: e.target.value })}
                      placeholder="Departmental Store / Pharmacy"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Registration Number (Optional)</label>
                    <input
                      type="text"
                      value={orgForm.registration_number}
                      onChange={(e) => setOrgForm({ ...orgForm, registration_number: e.target.value })}
                      placeholder="REG-2026-001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tax Number (Optional)</label>
                    <input
                      type="text"
                      value={orgForm.tax_id}
                      onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })}
                      placeholder="NTN / VAT ID"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization Email</label>
                    <input
                      type="email"
                      value={orgForm.email}
                      onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                      placeholder="info@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                      placeholder="+92 300 0000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Website (Optional)</label>
                    <input
                      type="text"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                      placeholder="https://company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={orgForm.country}
                      onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={orgForm.city}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                      placeholder="Lahore"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Complete Address</label>
                    <input
                      type="text"
                      value={orgForm.address}
                      onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                      placeholder="Street, Plaza, Sector / Commercial Area"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Organization Logo</label>
                  <div className="flex items-center gap-3">
                    {orgForm.logo_url ? (
                      <img src={orgForm.logo_url} alt="Logo" className="w-10 h-10 rounded-lg border border-slate-200 object-contain bg-slate-50 p-0.5" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                        <Upload className="w-4 h-4" />
                      </div>
                    )}
                    <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setOrgForm((prev) => ({ ...prev, logo_url: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={orgForm.logo_url}
                      onChange={(e) => setOrgForm({ ...orgForm, logo_url: e.target.value })}
                      placeholder="Or paste logo URL"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Organization Administrator */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" /> 2. Organization Administrator
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Administrator Full Name *</label>
                    <input
                      type="text"
                      required
                      value={orgForm.admin_name}
                      onChange={(e) => setOrgForm({ ...orgForm, admin_name: e.target.value })}
                      placeholder="Ahmed Khalid"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admin Email Address *</label>
                    <input
                      type="email"
                      required
                      value={orgForm.admin_email}
                      onChange={(e) => setOrgForm({ ...orgForm, admin_email: e.target.value })}
                      placeholder="admin@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={orgForm.admin_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, admin_phone: e.target.value })}
                      placeholder="+92 321 0000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={orgForm.admin_username}
                      onChange={(e) => setOrgForm({ ...orgForm, admin_username: e.target.value })}
                      placeholder="Auto-generated from email if left blank"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {editingOrg ? 'Update Password (Optional)' : 'Initial Account Password'}
                    </label>
                    <input
                      type="password"
                      value={orgForm.admin_password}
                      onChange={(e) => setOrgForm({ ...orgForm, admin_password: e.target.value })}
                      placeholder={editingOrg ? 'Leave blank to keep unchanged' : 'Default: Admin@123'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Subscription Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> 3. Subscription Information & Quotas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subscription Plan *</label>
                    <select
                      value={orgForm.plan_id}
                      onChange={(e) => handlePlanSelectionInOrgForm(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white cursor-pointer"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.monthly_price}/mo)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization Status</label>
                    <select
                      value={orgForm.status}
                      onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value as OrganizationStatus })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={orgForm.subscription_start_date}
                      onChange={(e) => setOrgForm({ ...orgForm, subscription_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={orgForm.subscription_expiry_date}
                      onChange={(e) => setOrgForm({ ...orgForm, subscription_expiry_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Maximum Branches</label>
                    <input
                      type="number"
                      min={1}
                      value={orgForm.max_branches}
                      onChange={(e) => setOrgForm({ ...orgForm, max_branches: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Maximum Users</label>
                    <input
                      type="number"
                      min={1}
                      value={orgForm.max_users}
                      onChange={(e) => setOrgForm({ ...orgForm, max_users: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Maximum POS Terminals</label>
                    <input
                      type="number"
                      min={1}
                      value={orgForm.max_pos_terminals}
                      onChange={(e) => setOrgForm({ ...orgForm, max_pos_terminals: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrgModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingOrg ? 'Save Organization Changes' : 'Register Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW COMPLETE ORGANIZATION DETAILS MODAL ================= */}
      {viewingOrg && viewingUsage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm">
                  {viewingOrg.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold">{viewingOrg.name}</h3>
                    <StatusPill status={viewingOrg.status} isActive={viewingOrg.is_active} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {viewingOrg.business_type || 'Retail Organization'} • Plan: {viewingUsage.plan.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrgId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Top Stats & Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Branches Usage</span>
                  <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {viewingUsage.branchCount} / {viewingUsage.maxBranches}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Users Usage</span>
                  <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {viewingUsage.userCount} / {viewingUsage.maxUsers}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Recorded Sales</span>
                  <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {viewingUsage.salesCount} invoices
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Volume</span>
                  <span className="text-lg font-black text-emerald-700 font-mono tabular-nums">
                    {formatCurrency(viewingUsage.totalRevenue)}
                  </span>
                </div>
              </div>

              {/* Profile & Subscription Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5">
                    Organization & Primary Admin
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <span className="text-slate-400">Admin Name:</span>
                    <span className="font-bold text-slate-800">{viewingOrg.admin_name}</span>
                    <span className="text-slate-400">Admin Email:</span>
                    <span className="font-medium text-slate-700">{viewingOrg.admin_email}</span>
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-medium text-slate-700">{viewingOrg.phone || '—'}</span>
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-700">
                      {[viewingOrg.city, viewingOrg.country].filter(Boolean).join(', ') || viewingOrg.address || '—'}
                    </span>
                    <span className="text-slate-400">Tax / Reg ID:</span>
                    <span className="font-mono text-slate-700">
                      {viewingOrg.tax_id || viewingOrg.registration_number || '—'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5">
                    Subscription & Validity
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <span className="text-slate-400">Assigned Plan:</span>
                    <span className="font-bold text-indigo-700">{viewingUsage.plan.name}</span>
                    <span className="text-slate-400">Start Date:</span>
                    <span className="font-mono text-slate-700">{formatDateShort(viewingOrg.subscription_start_date || viewingOrg.created_at)}</span>
                    <span className="text-slate-400">Expiry Date:</span>
                    <span className="font-mono text-slate-700">{formatDateShort(viewingOrg.subscription_expiry_date)}</span>
                    <span className="text-slate-400">Max POS Terminals:</span>
                    <span className="font-mono text-slate-700">{viewingUsage.maxPosTerminals}</span>
                    <span className="text-slate-400">Plan Modules:</span>
                    <span className="font-bold text-slate-700">{viewingUsage.plan.available_modules.length} enabled</span>
                  </div>
                </div>
              </div>

              {/* Branches & Users Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Registered Branches ({viewingUsage.branchCount})</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {viewingUsage.branches.map((br) => (
                      <div key={br.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{br.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {br.code} {br.city ? `• ${br.city}` : ''}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            br.status === 'inactive' || br.is_active === false
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {br.status === 'inactive' || br.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Organization Staff ({viewingUsage.userCount})</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {viewingUsage.users.length === 0 ? (
                      <div className="p-4 text-slate-400 text-center">No staff records found.</div>
                    ) : (
                      viewingUsage.users.map((u) => (
                        <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800">{u.full_name}</div>
                            <div className="text-[10px] text-slate-400">@{u.username} • {u.role.replace('_', ' ')}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {viewingHistory.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-extrabold text-slate-800">
                    Recent Subscription History
                  </div>
                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {viewingHistory.slice(0, 5).map((h) => (
                      <div key={h.id} className="px-4 py-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 font-medium">{h.notes || `${h.action}: ${h.new_plan_name}`}</span>
                        <span className="text-slate-400">{formatDateShort(h.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const org = viewingOrg;
                    setViewingOrgId(null);
                    openEditOrgModal(org);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Organization
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewingOrg.id;
                      setViewingOrgId(null);
                      handleEnterOrgWorkspace(id);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Switch Into Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingOrgId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT SUBSCRIPTION PLAN MODAL ================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-extrabold">
                    {editingPlan ? `Edit Plan — ${editingPlan.name}` : 'Create Subscription Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define dynamic resource quotas and module entitlements for Rozana organizations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {planFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold">
                  {planFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Professional"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Status</label>
                  <select
                    value={planForm.status}
                    onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Target store segment and key benefits"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.monthly_price}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Annual Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.annual_price}
                    onChange={(e) => setPlanForm({ ...planForm, annual_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Limit (MB)</label>
                  <input
                    type="number"
                    min={100}
                    value={planForm.storage_limit_mb}
                    onChange={(e) => setPlanForm({ ...planForm, storage_limit_mb: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maximum Branches</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.max_branches}
                    onChange={(e) => setPlanForm({ ...planForm, max_branches: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maximum Users</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.max_users}
                    onChange={(e) => setPlanForm({ ...planForm, max_users: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max POS Terminals</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.max_pos_terminals}
                    onChange={(e) => setPlanForm({ ...planForm, max_pos_terminals: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Available Modules Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800">Available Modules in Plan</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPlanForm((prev) => ({
                        ...prev,
                        available_modules:
                          prev.available_modules.length === ALL_MODULE_KEYS.length ? ['dashboard', 'pos'] : [...ALL_MODULE_KEYS],
                      }))
                    }
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {planForm.available_modules.length === ALL_MODULE_KEYS.length ? 'Select Minimum' : 'Select All Modules'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {ALL_MODULE_KEYS.map((modKey) => {
                    const checked = planForm.available_modules.includes(modKey);
                    return (
                      <label
                        key={modKey}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'bg-white border-indigo-300 text-slate-900 font-bold' : 'border-transparent text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleModuleInPlan(modKey)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className="truncate">{MODULE_LABELS[modKey] || modKey}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPlan ? 'Save Plan Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
