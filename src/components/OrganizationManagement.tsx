import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  GitBranch,
  Users,
  Shield,
  Plus,
  Search,
  Edit3,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  PauseCircle,
  PlayCircle,
  Check,
  Crown,
  Store,
  UserCheck,
  Briefcase,
  Lock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  User,
  UserRole,
  UserPermissions,
  StoreChain,
  StoreBranch,
  RoleDefinition,
  RoleModuleKey,
  ModulePermissionActions,
  GranularPermissionMatrix,
  SystemSettings,
  Sale,
} from '../types';
import {
  ALL_MODULE_KEYS,
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  updateStoreChain,
  getEffectiveOrgLimits,
  getOrganizationAccessState,
  getBranchesForOrg,
  saveBranchForOrg,
  toggleBranchStatus,
  deleteBranchForOrg,
  setActiveBranch,
  getSettings,
  getUsers,
  getSales,
  getRoles,
  saveRole,
  deleteRole,
  createMatrixForRole,
  defaultPermissionsByRole,
  subscribeToStorage,
  isUserSuperAdmin,
} from '../lib/storage';
import { formatCurrency } from '../lib/cft';
import { UserManagement } from './UserManagement';

interface OrganizationManagementProps {
  currentUser: User;
  onUserSwitched?: (user: User) => void;
  initialSubTab?: 'profile' | 'branches' | 'users' | 'roles';
}

const MODULE_ROWS: Array<{ key: RoleModuleKey; label: string; desc: string }> = [
  { key: 'dashboard', label: 'Dashboard', desc: 'KPI cards, trends & summaries' },
  { key: 'pos', label: 'POS Terminal', desc: 'Counter checkout, discounts & holds' },
  { key: 'inventory', label: 'Inventory & Items', desc: 'Categories, brands, items & stock' },
  { key: 'purchases', label: 'Purchases (Stock-In)', desc: 'Purchase orders & stock receiving' },
  { key: 'sales', label: 'Sales & Invoices', desc: 'Invoices, returns & cancellations' },
  { key: 'customers', label: 'Customers & Loyalty', desc: 'Customer accounts, credit & points' },
  { key: 'suppliers', label: 'Suppliers & Ledger', desc: 'Vendors, payables & supply history' },
  { key: 'payments', label: 'Payments Ledger', desc: 'Receipts & supplier payouts' },
  { key: 'expenses', label: 'Expenses', desc: 'Operational expense entries' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'Sales, profit & tax analytics' },
  { key: 'organization', label: 'Organization & Branches', desc: 'Profile & branch configuration' },
  { key: 'users', label: 'Users & Roles', desc: 'Staff directory & role matrix' },
  { key: 'settings', label: 'System Settings', desc: 'Receipts, tax & POS defaults' },
  { key: 'audit_logs', label: 'Activity Audit Logs', desc: 'System-wide compliance history' },
];

const ACTION_COLS: Array<{ key: keyof ModulePermissionActions; label: string }> = [
  { key: 'access', label: 'Access' },
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
  { key: 'print', label: 'Print' },
  { key: 'export', label: 'Export' },
];

const BRANCH_TYPE_LABELS: Record<NonNullable<StoreBranch['branch_type']>, string> = {
  head_office: 'Head Office',
  retail_outlet: 'Retail Outlet',
  warehouse: 'Warehouse / Depot',
  express_mart: 'Express Mart',
  franchise: 'Franchise Store',
};

const deriveUserPermissionsFromMatrix = (
  matrix: GranularPermissionMatrix,
  fallbackBase: UserRole
): UserPermissions => {
  const base = defaultPermissionsByRole(fallbackBase);
  return {
    ...base,
    pos_billing: Boolean(matrix.pos?.access && (matrix.pos?.add || matrix.pos?.view)),
    sales_view: Boolean(matrix.sales?.access || matrix.sales?.view),
    sales_discount: Boolean(matrix.pos?.edit || matrix.sales?.edit),
    sales_refund: Boolean(matrix.pos?.delete || matrix.sales?.delete || matrix.sales?.approve),
    inventory_view: Boolean(matrix.inventory?.access || matrix.inventory?.view),
    inventory_manage: Boolean(matrix.inventory?.add || matrix.inventory?.edit || matrix.inventory?.delete),
    purchases_manage: Boolean(matrix.purchases?.access && (matrix.purchases?.add || matrix.purchases?.edit)),
    customers_manage: Boolean(matrix.customers?.access && (matrix.customers?.view || matrix.customers?.add)),
    suppliers_manage: Boolean(matrix.suppliers?.access && (matrix.suppliers?.view || matrix.suppliers?.add)),
    expenses_manage: Boolean(matrix.expenses?.access && (matrix.expenses?.add || matrix.expenses?.edit)),
    reports_view: Boolean(matrix.reports?.access || matrix.reports?.view),
    settings_manage: Boolean(matrix.settings?.access && (matrix.settings?.edit || matrix.settings?.add)),
    users_manage: Boolean(matrix.users?.access && (matrix.users?.add || matrix.users?.edit)),
    audit_logs_view: Boolean(matrix.audit_logs?.access || matrix.audit_logs?.view),
  };
};

export const OrganizationManagement: React.FC<OrganizationManagementProps> = ({
  currentUser,
  onUserSwitched,
  initialSubTab = 'branches',
}) => {
  const isSuper = isUserSuperAdmin(currentUser);
  const canEditOrgWide = isSuper || currentUser.role === 'admin' || Boolean(currentUser.permissions?.settings_manage);
  const canManageUsers = isSuper || currentUser.role === 'admin' || Boolean(currentUser.permissions?.users_manage);

  const [subTab, setSubTab] = useState<'profile' | 'branches' | 'users' | 'roles'>(initialSubTab);
  const [storeChains, setStoreChains] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChain] = useState<StoreChain>(() => getActiveStoreChain());
  const [settings, setSettingsState] = useState<SystemSettings>(() => getSettings());
  const [branches, setBranches] = useState<StoreBranch[]>(() => getBranchesForOrg());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [sales, setSales] = useState<Sale[]>(() => getSales());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getRoles());

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setStoreChains(getStoreChains());
      setActiveChain(getActiveStoreChain());
      setSettingsState(getSettings());
      setBranches(getBranchesForOrg());
      setUsers(getUsers());
      setSales(getSales());
      setRoles(getRoles());
    });
    return unsub;
  }, []);

  const limits = useMemo(() => getEffectiveOrgLimits(activeChain), [activeChain]);
  const accessState = useMemo(() => getOrganizationAccessState(activeChain), [activeChain]);

  // ---------------- Organization Profile State ----------------
  const [profileForm, setProfileForm] = useState({
    name: activeChain.name || '',
    business_type: activeChain.business_type || '',
    registration_number: activeChain.registration_number || '',
    tax_id: activeChain.tax_id || '',
    website: activeChain.website || '',
    phone: activeChain.phone || '',
    admin_email: activeChain.admin_email || '',
    country: activeChain.country || 'Pakistan',
    city: activeChain.city || '',
    address: activeChain.address || '',
    logo_url: activeChain.logo_url || settings.logo_url || '',
    description: activeChain.description || '',
  });

  useEffect(() => {
    setProfileForm({
      name: activeChain.name || '',
      business_type: activeChain.business_type || '',
      registration_number: activeChain.registration_number || '',
      tax_id: activeChain.tax_id || '',
      website: activeChain.website || '',
      phone: activeChain.phone || '',
      admin_email: activeChain.admin_email || '',
      country: activeChain.country || 'Pakistan',
      city: activeChain.city || '',
      address: activeChain.address || '',
      logo_url: activeChain.logo_url || settings.logo_url || '',
      description: activeChain.description || '',
    });
  }, [activeChain.id]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileForm((prev) => ({ ...prev, logo_url: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditOrgWide) {
      showToast('Only Organization Administrators can edit the organization profile.', 'error');
      return;
    }
    if (!profileForm.name.trim()) {
      showToast('Organization name is required.', 'error');
      return;
    }
    const res = updateStoreChain(activeChain.id, {
      name: profileForm.name.trim(),
      business_type: profileForm.business_type.trim(),
      registration_number: profileForm.registration_number.trim(),
      tax_id: profileForm.tax_id.trim(),
      website: profileForm.website.trim(),
      phone: profileForm.phone.trim(),
      admin_email: profileForm.admin_email.trim(),
      country: profileForm.country.trim(),
      city: profileForm.city.trim(),
      address: profileForm.address.trim(),
      logo_url: profileForm.logo_url,
      description: profileForm.description.trim(),
    });
    if (res.success) {
      showToast('Organization profile updated successfully.');
    } else {
      showToast(res.message, 'error');
    }
  };

  // ---------------- Branch Management State ----------------
  const [branchSearch, setBranchSearch] = useState('');
  const [branchStatusFilter, setBranchStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<StoreBranch | null>(null);
  const [viewingBranch, setViewingBranch] = useState<StoreBranch | null>(null);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);

  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    branch_type: 'retail_outlet' as NonNullable<StoreBranch['branch_type']>,
    contact_person: '',
    manager_user_id: '' as string,
    phone: '',
    email: '',
    city: '',
    address: '',
    opening_date: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    is_head_office: false,
  });

  const branchMetricsMap = useMemo(() => {
    const map: Record<string, { employeeCount: number; salesCount: number; revenue: number; employees: User[] }> = {};
    for (const b of branches) {
      const assignedStaff = users.filter((u) => {
        if (u.assigned_branch_id === 'all' || (u.assigned_branches && u.assigned_branches.includes('all'))) {
          return true;
        }
        return u.assigned_branch_id === b.id || Boolean(u.assigned_branches?.includes(b.id));
      });
      const assignedIds = new Set(
        users
          .filter((u) => u.assigned_branch_id === b.id || Boolean(u.assigned_branches?.includes(b.id)))
          .map((u) => u.id)
      );
      const branchSales = sales.filter((s) => {
        if (s.status === 'cancelled') return false;
        const notes = (s.notes || '').toLowerCase();
        if (notes.includes(b.code.toLowerCase()) || notes.includes(b.name.toLowerCase())) return true;
        if (assignedIds.has(s.created_by)) return true;
        return b.is_head_office && s.created_by === 1;
      });
      const revenue = branchSales.reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
      map[b.id] = {
        employeeCount: assignedStaff.length,
        salesCount: branchSales.length,
        revenue,
        employees: assignedStaff,
      };
    }
    return map;
  }, [branches, users, sales]);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    return branches.filter((b) => {
      const matchesStatus =
        branchStatusFilter === 'all' || (b.status || (b.is_active === false ? 'inactive' : 'active')) === branchStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.city || '').toLowerCase().includes(q) ||
        (b.manager_name || '').toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q)
      );
    });
  }, [branches, branchSearch, branchStatusFilter]);

  const openAddBranchModal = () => {
    if (branches.length >= limits.maxBranches) {
      showToast(
        `Branch limit reached (${branches.length}/${limits.maxBranches}) under the ${limits.plan.name} plan.`,
        'error'
      );
      return;
    }
    setEditingBranch(null);
    setBranchFormError(null);
    setBranchForm({
      name: '',
      code: `${activeChain.code || 'BR'}-${String(branches.length + 1).padStart(2, '0')}`,
      branch_type: 'retail_outlet',
      contact_person: '',
      manager_user_id: '',
      phone: '',
      email: '',
      city: activeChain.city || '',
      address: '',
      opening_date: new Date().toISOString().split('T')[0],
      status: 'active',
      is_head_office: false,
    });
    setIsBranchModalOpen(true);
  };

  const openEditBranchModal = (b: StoreBranch) => {
    setEditingBranch(b);
    setBranchFormError(null);
    setBranchForm({
      name: b.name || '',
      code: b.code || '',
      branch_type: b.branch_type || (b.is_head_office ? 'head_office' : 'retail_outlet'),
      contact_person: b.contact_person || '',
      manager_user_id: b.manager_user_id ? String(b.manager_user_id) : '',
      phone: b.phone || '',
      email: b.email || '',
      city: b.city || '',
      address: b.address || '',
      opening_date: b.opening_date || new Date().toISOString().split('T')[0],
      status: b.status || (b.is_active === false ? 'inactive' : 'active'),
      is_head_office: Boolean(b.is_head_office),
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchFormError(null);
    const managerObj = users.find((u) => String(u.id) === branchForm.manager_user_id);
    const res = saveBranchForOrg({
      id: editingBranch?.id,
      name: branchForm.name,
      code: branchForm.code,
      branch_type: branchForm.branch_type,
      contact_person: branchForm.contact_person,
      manager_user_id: managerObj ? managerObj.id : null,
      manager_name: managerObj ? managerObj.full_name : branchForm.contact_person,
      phone: branchForm.phone,
      email: branchForm.email,
      city: branchForm.city,
      address: branchForm.address,
      opening_date: branchForm.opening_date,
      status: branchForm.status,
      is_head_office: branchForm.is_head_office,
    });
    if (!res.success) {
      setBranchFormError(res.message);
      return;
    }
    setIsBranchModalOpen(false);
    showToast(res.message);
  };

  // ---------------- Roles & Permissions State ----------------
  const [selectedRoleId, setSelectedRoleId] = useState<string>(() => roles[0]?.id || '');
  const [roleForm, setRoleForm] = useState<{
    id?: string;
    name: string;
    base_role: UserRole;
    description: string;
    branch_access: 'all' | 'assigned';
    matrix: GranularPermissionMatrix;
    is_system?: boolean;
  }>(() => {
    const first = roles[0];
    return {
      id: first?.id,
      name: first?.name || 'Custom Role',
      base_role: first?.base_role || 'cashier',
      description: first?.description || '',
      branch_access: first?.branch_access || 'assigned',
      matrix: first?.matrix || createMatrixForRole(first?.base_role || 'cashier'),
      is_system: first?.is_system,
    };
  });

  useEffect(() => {
    if (!roles.length) return;
    const match = roles.find((r) => r.id === selectedRoleId) || roles[0];
    if (match && match.id !== roleForm.id) {
      setSelectedRoleId(match.id);
      setRoleForm({
        id: match.id,
        name: match.name,
        base_role: match.base_role,
        description: match.description || '',
        branch_access: match.branch_access || 'assigned',
        matrix: match.matrix || createMatrixForRole(match.base_role),
        is_system: match.is_system,
      });
    }
  }, [roles, selectedRoleId]);

  const selectRoleForEdit = (role: RoleDefinition) => {
    setSelectedRoleId(role.id);
    setRoleForm({
      id: role.id,
      name: role.name,
      base_role: role.base_role,
      description: role.description || '',
      branch_access: role.branch_access || 'assigned',
      matrix: role.matrix || createMatrixForRole(role.base_role),
      is_system: role.is_system,
    });
  };

  const startNewCustomRole = () => {
    setSelectedRoleId('__new__');
    setRoleForm({
      id: undefined,
      name: '',
      base_role: 'cashier',
      description: '',
      branch_access: 'assigned',
      matrix: createMatrixForRole('cashier'),
      is_system: false,
    });
  };

  const toggleMatrixCell = (moduleKey: RoleModuleKey, actionKey: keyof ModulePermissionActions) => {
    setRoleForm((prev) => {
      const currentRow = prev.matrix[moduleKey] || {
        access: false,
        view: false,
        add: false,
        edit: false,
        delete: false,
        approve: false,
        print: false,
        export: false,
      };
      const nextVal = !currentRow[actionKey];
      const nextRow: ModulePermissionActions = {
        ...currentRow,
        [actionKey]: nextVal,
      };
      if (actionKey === 'access' && !nextVal) {
        nextRow.view = false;
        nextRow.add = false;
        nextRow.edit = false;
        nextRow.delete = false;
        nextRow.approve = false;
        nextRow.print = false;
        nextRow.export = false;
      } else if (actionKey !== 'access' && nextVal) {
        nextRow.access = true;
        if (actionKey !== 'view') {
          nextRow.view = true;
        }
      }
      return {
        ...prev,
        matrix: {
          ...prev.matrix,
          [moduleKey]: nextRow,
        },
      };
    });
  };

  const toggleModuleRowAll = (moduleKey: RoleModuleKey) => {
    setRoleForm((prev) => {
      const row = prev.matrix[moduleKey];
      const allOn = Boolean(row?.access && row?.view && row?.add && row?.edit);
      const nextVal = !allOn;
      return {
        ...prev,
        matrix: {
          ...prev.matrix,
          [moduleKey]: {
            access: nextVal,
            view: nextVal,
            add: nextVal,
            edit: nextVal,
            delete: nextVal,
            approve: nextVal,
            print: nextVal,
            export: nextVal,
          },
        },
      };
    });
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers && !canEditOrgWide) {
      showToast('Permission denied: Only Organization Administrators can manage roles.', 'error');
      return;
    }
    const derivedPerms = deriveUserPermissionsFromMatrix(roleForm.matrix, roleForm.base_role);
    const res = saveRole({
      id: roleForm.id,
      name: roleForm.name,
      base_role: roleForm.base_role,
      description: roleForm.description,
      branch_access: roleForm.branch_access,
      matrix: roleForm.matrix,
      permissions: derivedPerms,
    });
    if (res.success && res.role) {
      setSelectedRoleId(res.role.id);
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteRole = (roleId: string) => {
    const res = deleteRole(roleId);
    if (res.success) {
      const remaining = getRoles();
      if (remaining[0]) selectRoleForEdit(remaining[0]);
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const activeBranchesCount = branches.filter((b) => (b.status || (b.is_active === false ? 'inactive' : 'active')) === 'active').length;
  const branchQuotaPct = Math.min(100, Math.round((branches.length / Math.max(1, limits.maxBranches)) * 100));
  const userQuotaPct = Math.min(100, Math.round((users.length / Math.max(1, limits.maxUsers)) * 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Organization Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden font-black text-base">
              {activeChain.logo_url ? (
                <img src={activeChain.logo_url} alt={activeChain.name} className="w-full h-full object-contain p-1 bg-white" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">
                  Organization Management
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold">
                  {activeChain.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    accessState.blocked
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${accessState.blocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {accessState.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeChain.name} • Plan:{' '}
                <span className="font-bold text-indigo-700">{limits.plan.name}</span>
                {activeChain.subscription_expiry_date && (
                  <> • Expires {activeChain.subscription_expiry_date}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSuper && storeChains.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={activeChain.id}
                  onChange={(e) => setActiveStoreChain(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {storeChains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
              Branches: <span className="text-slate-900">{branches.length} / {limits.maxBranches}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
              Users: <span className="text-slate-900">{users.length} / {limits.maxUsers}</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('branches')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'branches'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Branch Management ({branches.length})
          </button>

          {canManageUsers && (
            <button
              type="button"
              onClick={() => setSubTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                subTab === 'users'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Users & Employees ({users.length})
            </button>
          )}

          {canEditOrgWide && (
            <button
              type="button"
              onClick={() => setSubTab('roles')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                subTab === 'roles'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Roles & Permissions ({roles.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Organization Profile
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ORGANIZATION PROFILE */}
      {subTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Business & Organization Profile</h2>
                <p className="text-xs text-slate-500">Manage legal registration, branding, and headquarters location.</p>
              </div>
              {!canEditOrgWide && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {profileForm.logo_url ? (
                  <img src={profileForm.logo_url} alt="Org logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Store className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">Organization Logo</p>
                <p className="text-[11px] text-slate-500">Displayed in the POS terminal top bar and printed receipts.</p>
                {canEditOrgWide && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  disabled={!canEditOrgWide}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Business Type</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.business_type}
                  onChange={(e) => setProfileForm({ ...profileForm, business_type: e.target.value })}
                  placeholder="e.g. Retail & Departmental Store"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.registration_number}
                  onChange={(e) => setProfileForm({ ...profileForm, registration_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tax / NTN / VAT Number</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.tax_id}
                  onChange={(e) => setProfileForm({ ...profileForm, tax_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary Email</label>
                <input
                  type="email"
                  disabled={!canEditOrgWide}
                  value={profileForm.admin_email}
                  onChange={(e) => setProfileForm({ ...profileForm, admin_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Number</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Website</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Country</label>
                  <input
                    type="text"
                    disabled={!canEditOrgWide}
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    disabled={!canEditOrgWide}
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Complete Address</label>
                <input
                  type="text"
                  disabled={!canEditOrgWide}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {canEditOrgWide && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Organization Profile
                </button>
              </div>
            )}
          </form>

          {/* Subscription & Quota Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Subscription Plan
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {limits.plan.name}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Branches Quota</span>
                    <span>
                      {branches.length} / {limits.maxBranches}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${branchQuotaPct >= 90 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                      style={{ width: `${branchQuotaPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Users & Staff Quota</span>
                    <span>
                      {users.length} / {limits.maxUsers}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${userQuotaPct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${userQuotaPct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">POS Terminals</span>
                    <span className="font-extrabold text-slate-900">{limits.maxPosTerminals} Max</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Expiry Date</span>
                    <span className="font-extrabold text-slate-900">
                      {activeChain.subscription_expiry_date || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                  Enabled Platform Modules ({limits.availableModules.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {limits.availableModules.map((mod) => (
                    <span
                      key={mod}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase"
                    >
                      {mod.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BRANCH MANAGEMENT */}
      {subTab === 'branches' && (
        <div className="space-y-5">
          {/* Branch Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Branches</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {branches.length} <span className="text-xs font-bold text-slate-400">/ {limits.maxBranches}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Outlets</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{activeBranchesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PlayCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Inactive Outlets</p>
                <p className="text-2xl font-black text-slate-700 mt-1">{branches.length - activeBranchesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <PauseCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Active Branch</p>
                <p className="text-xs font-black text-indigo-700 mt-1.5 truncate max-w-[150px]">
                  {settings.branch_name || branches[0]?.name || '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Search branch name, code, city, or manager..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <select
                  value={branchStatusFilter}
                  onChange={(e) => setBranchStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <span className="text-[11px] font-semibold text-slate-400 ml-1">
                  {filteredBranches.length} of {branches.length}
                </span>
              </div>

              {canEditOrgWide && (
                <button
                  type="button"
                  onClick={openAddBranchModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Branch
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Branch & Code</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Branch Manager</th>
                    <th className="py-3 px-4">Location & Contact</th>
                    <th className="py-3 px-4">Employees</th>
                    <th className="py-3 px-4">Branch Sales</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBranches.map((b) => {
                    const isActiveBranch = settings.active_branch_id === b.id;
                    const branchStatus = b.status || (b.is_active === false ? 'inactive' : 'active');
                    const stats = branchMetricsMap[b.id] || { employeeCount: 0, salesCount: 0, revenue: 0, employees: [] };

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                              {b.code}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">{b.name}</span>
                                {b.is_head_office && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase">
                                    HQ
                                  </span>
                                )}
                                {isActiveBranch && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-extrabold uppercase">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{b.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {BRANCH_TYPE_LABELS[b.branch_type || (b.is_head_office ? 'head_office' : 'retail_outlet')]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{b.manager_name || b.contact_person || 'Unassigned'}</div>
                          {b.email && <div className="text-[10px] text-slate-400">{b.email}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700 font-medium truncate max-w-[180px]">{b.city || b.address || '—'}</div>
                          {b.phone && <div className="text-[10px] text-slate-400">{b.phone}</div>}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{stats.employeeCount}</td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{formatCurrency(stats.revenue)}</div>
                          <div className="text-[10px] text-slate-400">{stats.salesCount} invoices</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              branchStatus === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                branchStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {branchStatus === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {branchStatus === 'active' && !isActiveBranch && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = setActiveBranch(b.id);
                                  showToast(res.message, res.success ? 'success' : 'error');
                                }}
                                title="Switch active terminal to this branch"
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Switch
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingBranch(b)}
                              title="View Branch Details & Performance"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEditOrgWide && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditBranchModal(b)}
                                  title="Edit Branch"
                                  className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = toggleBranchStatus(b.id);
                                    showToast(res.message, res.success ? 'success' : 'error');
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                    branchStatus === 'active'
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  {branchStatus === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                {branches.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = deleteBranchForOrg(b.id);
                                      showToast(res.message, res.success ? 'success' : 'error');
                                    }}
                                    title="Remove Branch"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBranches.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                        No branches matched your current search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USERS & EMPLOYEES */}
      {subTab === 'users' && (
        <UserManagement embedded currentUser={currentUser} onUserSwitched={onUserSwitched} />
      )}

      {/* SUB-TAB 4: ROLES & PERMISSIONS MATRIX */}
      {subTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Roles List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900">Organization Roles</h2>
                <p className="text-[11px] text-slate-500">Templates & custom role policies</p>
              </div>
              <button
                type="button"
                onClick={startNewCustomRole}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Role
              </button>
            </div>

            <div className="space-y-1.5">
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                const assignedCount = users.filter(
                  (u) => u.custom_role_id === r.id || (!u.custom_role_id && u.role === r.base_role)
                ).length;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRoleForEdit(r)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-extrabold ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                        {r.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                        {assignedCount} users
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className="uppercase font-bold text-indigo-600">{r.base_role.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{r.branch_access === 'all' ? 'All Branches' : 'Assigned Branches'}</span>
                      {r.is_system && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">System</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Matrix Editor */}
          <form
            onSubmit={handleSaveRole}
            className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {roleForm.id ? `Edit Role: ${roleForm.name}` : 'Create Custom Role'}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure module actions and branch visibility scope. Saved changes sync to assigned users.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {roleForm.id && !roleForm.is_system && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(roleForm.id!)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Role Policy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. Senior Counter Supervisor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Base Role Preset</label>
                <select
                  value={roleForm.base_role}
                  onChange={(e) => {
                    const nextBase = e.target.value as UserRole;
                    setRoleForm((prev) => ({
                      ...prev,
                      base_role: nextBase,
                      matrix: prev.id ? prev.matrix : createMatrixForRole(nextBase),
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="admin">Organization Admin</option>
                  <option value="manager">Branch Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="purchase_manager">Purchase Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="warehouse_staff">Warehouse Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Data Scope</label>
                <select
                  value={roleForm.branch_access}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, branch_access: e.target.value as 'all' | 'assigned' })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="assigned">Assigned Branches Only</option>
                  <option value="all">All Organization Branches</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe what responsibilities this role holds..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Granular Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Module</th>
                      {ACTION_COLS.map((col) => (
                        <th key={col.key} className="py-2.5 px-2 text-center">
                          {col.label}
                        </th>
                      ))}
                      <th className="py-2.5 px-2 text-center">All</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {MODULE_ROWS.map((mod) => {
                      const row = roleForm.matrix[mod.key] || {
                        access: false,
                        view: false,
                        add: false,
                        edit: false,
                        delete: false,
                        approve: false,
                        print: false,
                        export: false,
                      };
                      const planHasMod = limits.availableModules.includes(mod.key);
                      return (
                        <tr key={mod.key} className={`hover:bg-slate-50/70 ${!planHasMod ? 'opacity-50' : ''}`}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {mod.label}
                              {!planHasMod && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                                  Plan Upgrade
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{mod.desc}</div>
                          </td>
                          {ACTION_COLS.map((col) => (
                            <td key={col.key} className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(row[col.key])}
                                onChange={() => toggleMatrixCell(mod.key, col.key)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleModuleRowAll(mod.key)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ADD / EDIT BRANCH MODAL */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black">
                    {editingBranch ? `Edit Branch — ${editingBranch.name}` : 'Create New Branch / Outlet'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeChain.name} • {branches.length}/{limits.maxBranches} branches used
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {branchFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{branchFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="e.g. Johar Town Superstore"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Code * (Unique per org)</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ASK-02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Type</label>
                  <select
                    value={branchForm.branch_type}
                    onChange={(e) =>
                      setBranchForm({
                        ...branchForm,
                        branch_type: e.target.value as NonNullable<StoreBranch['branch_type']>,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="head_office">Head Office</option>
                    <option value="retail_outlet">Retail Outlet</option>
                    <option value="warehouse">Warehouse / Depot</option>
                    <option value="express_mart">Express Mart</option>
                    <option value="franchise">Franchise Store</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assign Branch Manager</label>
                  <select
                    value={branchForm.manager_user_id}
                    onChange={(e) => setBranchForm({ ...branchForm, manager_user_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Staff Member --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={branchForm.contact_person}
                    onChange={(e) => setBranchForm({ ...branchForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Email</label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Opening Date</label>
                  <input
                    type="date"
                    value={branchForm.opening_date}
                    onChange={(e) => setBranchForm({ ...branchForm, opening_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Status</label>
                  <select
                    value={branchForm.status}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, status: e.target.value as 'active' | 'inactive' })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Complete Address</label>
                  <input
                    type="text"
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    id="branch-hq-checkbox"
                    type="checkbox"
                    checked={branchForm.is_head_office}
                    onChange={(e) => setBranchForm({ ...branchForm, is_head_office: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <label htmlFor="branch-hq-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Designate as Organization Head Office
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BRANCH DETAILS MODAL */}
      {viewingBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-mono font-black text-xs">
                  {viewingBranch.code}
                </div>
                <div>
                  <h3 className="text-sm font-black">{viewingBranch.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    {BRANCH_TYPE_LABELS[viewingBranch.branch_type || 'retail_outlet']} • Opened{' '}
                    {viewingBranch.opening_date || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBranch(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Branch Sales Revenue</span>
                  <span className="text-base font-black text-slate-900">
                    {formatCurrency(branchMetricsMap[viewingBranch.id]?.revenue || 0)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Invoices Processed</span>
                  <span className="text-base font-black text-slate-900">
                    {branchMetricsMap[viewingBranch.id]?.salesCount || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Staff</span>
                  <span className="text-base font-black text-slate-900">
                    {branchMetricsMap[viewingBranch.id]?.employeeCount || 0}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Manager / Contact</span>
                  <span className="font-bold text-slate-800">
                    {viewingBranch.manager_name || viewingBranch.contact_person || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone & Email</span>
                  <span className="font-semibold text-slate-700">
                    {viewingBranch.phone || '—'} • {viewingBranch.email || '—'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Address</span>
                  <span className="font-semibold text-slate-700">
                    {viewingBranch.address || viewingBranch.city || '—'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Employees Authorized for this Branch
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {(branchMetricsMap[viewingBranch.id]?.employees || []).map((emp) => (
                    <div key={emp.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{emp.full_name}</span>
                        <span className="text-slate-400 ml-2 text-[11px]">@{emp.username}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        {emp.role.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {(branchMetricsMap[viewingBranch.id]?.employees || []).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No staff explicitly assigned to this branch yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
