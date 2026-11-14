import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Shield,
  UserCheck,
  Trash2,
  Building2,
  Key,
  Check,
  Search,
  Filter,
  Lock,
  Edit3,
  Crown,
  Smartphone,
  Mail,
  Briefcase,
  Layers,
  Sparkles,
  LayoutGrid,
  ListFilter,
  Store,
  RefreshCw
} from 'lucide-react';
import {
  getUsers,
  saveUser,
  deleteUser,
  toggleUserStatus,
  getSettings,
  getCurrentUser,
  getStoreChains,
  getActiveStoreChain,
  setActiveStoreChain,
  subscribeToStorage,
  setCurrentUser,
  isUserSuperAdmin,
  defaultPermissionsByRole,
  getRoles,
  getEffectiveOrgLimits
} from '../lib/storage';
import { User, UserRole, UserPermissions, StoreChain, SystemSettings, RoleDefinition } from '../types';

interface UserManagementProps {
  currentUser?: User;
  onUserSwitched?: (user: User) => void;
  embedded?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser: propUser,
  onUserSwitched,
  embedded = false,
}) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => propUser || getCurrentUser());
  const [settings, setSettingsState] = useState<SystemSettings>(() => getSettings());
  const [storeChains, setStoreChains] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChain] = useState<StoreChain>(() => getActiveStoreChain());
  const [users, setUsersState] = useState<User[]>(() => getUsers());
  const [orgRoles, setOrgRoles] = useState<RoleDefinition[]>(() => getRoles());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'security'>('profile');

  // Quick PIN modal
  const [pinModalUser, setPinModalUser] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const branches = settings.branches || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync propUser if it changes in parent
  useEffect(() => {
    if (propUser) {
      setCurrentUserState(propUser);
    }
  }, [propUser]);

  // Real-time synchronization with localStorage
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      setUsersState(getUsers());
      setSettingsState(getSettings());
      setStoreChains(getStoreChains());
      setActiveChain(getActiveStoreChain());
      setCurrentUserState(getCurrentUser());
      setOrgRoles(getRoles());
    });
    return unsubscribe;
  }, []);

  const activeUser = propUser || currentUser;
  const isSuperAdmin = isUserSuperAdmin(activeUser);
  const orgLimits = getEffectiveOrgLimits(activeChain);

  const handleSwitchStoreChain = (chainId: string) => {
    if (!isSuperAdmin) {
      showToast('Access Restricted: Only Global Super Administrator can switch business organizations.');
      return;
    }
    setActiveStoreChain(chainId);
    const updatedChain = getActiveStoreChain();
    const updatedSettings = getSettings();
    const updatedUsers = getUsers();
    setActiveChain(updatedChain);
    setSettingsState(updatedSettings);
    setUsersState(updatedUsers);
    showToast(`Switched business context to: ${updatedChain.name}`);
  };

  const [formData, setFormData] = useState<Partial<User>>({
    full_name: '',
    username: '',
    employee_code: '',
    email: '',
    phone: '',
    designation: '',
    role: 'cashier',
    custom_role_id: '',
    assigned_branch_id: 'br-1',
    assigned_branches: ['br-1'],
    pos_pin: '1234',
    password: '',
    is_active: true,
    permissions: defaultPermissionsByRole('cashier'),
  });

  const handleOpenCreateModal = () => {
    const tenantNonSuperCount = (Array.isArray(users) ? users : []).filter((u) => !isUserSuperAdmin(u)).length;
    if (tenantNonSuperCount >= orgLimits.maxUsers) {
      showToast(`User limit reached (${tenantNonSuperCount}/${orgLimits.maxUsers}) for "${orgLimits.plan.name}" plan. Upgrade plan to add more staff.`);
      return;
    }
    setEditingUserId(null);
    setActiveTab('profile');
    const safeUsers = Array.isArray(users) ? users : [];
    const nextCode = `EMP-${(safeUsers.length + 1).toString().padStart(3, '0')}`;
    const defaultBr = branches[0]?.id || 'br-1';
    const cashierRole = orgRoles.find((r) => r.base_role === 'cashier');
    setFormData({
      full_name: '',
      username: '',
      employee_code: nextCode,
      email: '',
      phone: '',
      designation: 'POS Terminal Cashier',
      role: 'cashier',
      custom_role_id: cashierRole?.id || '',
      assigned_branch_id: defaultBr,
      assigned_branches: [defaultBr],
      pos_pin: '1234',
      password: '',
      is_active: true,
      permissions: cashierRole?.permissions ? { ...cashierRole.permissions } : defaultPermissionsByRole('cashier'),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUserId(user.id);
    setActiveTab('profile');
    const brList =
      Array.isArray(user.assigned_branches) && user.assigned_branches.length > 0
        ? user.assigned_branches
        : user.assigned_branch_id
        ? [user.assigned_branch_id]
        : [branches[0]?.id || 'br-1'];
    setFormData({
      ...user,
      assigned_branches: brList,
      permissions: user.permissions || defaultPermissionsByRole(user.role || 'cashier'),
    });
    setIsModalOpen(true);
  };

  const handleRoleChangeInForm = (newRole: UserRole) => {
    const updatedPerms = defaultPermissionsByRole(newRole);
    let defaultDesignation = formData.designation;
    if (!editingUserId) {
      if (newRole === 'admin') defaultDesignation = 'Organization Admin';
      else if (newRole === 'manager') defaultDesignation = 'Branch Manager';
      else if (newRole === 'cashier') defaultDesignation = 'POS Cashier';
      else if (newRole === 'salesperson') defaultDesignation = 'Retail Salesperson';
      else if (newRole === 'inventory_manager') defaultDesignation = 'Inventory Manager';
      else if (newRole === 'purchase_manager') defaultDesignation = 'Purchase Manager';
      else if (newRole === 'accountant') defaultDesignation = 'Accountant';
      else if (newRole === 'warehouse_staff') defaultDesignation = 'Warehouse Staff';
    }
    const matchingTemplate = orgRoles.find((r) => r.base_role === newRole);

    setFormData({
      ...formData,
      role: newRole,
      custom_role_id: matchingTemplate?.id || '',
      designation: defaultDesignation,
      permissions: matchingTemplate?.permissions ? { ...matchingTemplate.permissions } : updatedPerms,
    });
  };

  const handleCustomRoleSelect = (roleId: string) => {
    const found = orgRoles.find((r) => r.id === roleId);
    if (!found) return;
    setFormData({
      ...formData,
      custom_role_id: found.id,
      role: found.base_role,
      designation: editingUserId ? formData.designation : found.name,
      permissions: { ...found.permissions },
      ...(found.branch_access === 'all' ? { assigned_branch_id: 'all', assigned_branches: ['all'] } : {}),
    });
  };

  const handleTogglePermission = (permKey: keyof UserPermissions) => {
    const currentPerms = formData.permissions || defaultPermissionsByRole(formData.role || 'cashier');
    setFormData({
      ...formData,
      permissions: {
        ...currentPerms,
        [permKey]: !currentPerms[permKey],
      },
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.role) return;

    const safeName = formData.full_name.trim();
    const usernameVal = formData.username?.trim() || safeName.toLowerCase().replace(/\s+/g, '');
    const assignedBranchesList =
      Array.isArray(formData.assigned_branches) && formData.assigned_branches.length > 0
        ? formData.assigned_branches
        : [formData.assigned_branch_id || branches[0]?.id || 'br-1'];
    const primaryBranch = assignedBranchesList.includes('all') ? 'all' : assignedBranchesList[0];

    const userToSave: Partial<User> & { full_name: string; role: UserRole } = {
      ...(editingUserId ? { id: editingUserId } : {}),
      full_name: safeName,
      username: usernameVal,
      employee_code: formData.employee_code || `EMP-${Date.now().toString().slice(-3)}`,
      email: formData.email || `${usernameVal}@${(activeChain.code || 'rozana').toLowerCase()}.pos`,
      phone: formData.phone || '',
      designation: formData.designation || `${(formData.role || 'cashier').replace('_', ' ').toUpperCase()} Staff`,
      role: formData.role || 'cashier',
      custom_role_id: formData.custom_role_id || undefined,
      assigned_branch_id: primaryBranch,
      assigned_branches: assignedBranchesList,
      pos_pin: formData.pos_pin || '1234',
      password: formData.password || '',
      is_active: formData.is_active ?? true,
      permissions: formData.permissions || defaultPermissionsByRole(formData.role || 'cashier'),
    };

    const res = saveUser(userToSave as any);
    setUsersState(getUsers());
    if (res.success) {
      setIsModalOpen(false);
    }
    showToast(res.message || 'User saved successfully');
  };

  const handleToggleStatus = (id: number) => {
    const res = toggleUserStatus(id);
    setUsersState(getUsers());
    showToast(res.message || 'Status updated');
  };

  const handleDelete = (id: number, name: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (targetUser && ((targetUser.username || '').toLowerCase() === 'mobin' || targetUser.is_super_admin)) {
      showToast('Global Super Administrator (Mobin) cannot be deleted.');
      return;
    }
    const res = deleteUser(id);
    setUsersState(getUsers());
    showToast(res.message || `User "${name}" removed`);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser || !newPin) return;
    saveUser({ id: pinModalUser.id, full_name: pinModalUser.full_name, role: pinModalUser.role, pos_pin: newPin });
    setUsersState(getUsers());
    showToast(`POS PIN for ${pinModalUser.full_name} updated to ${newPin}`);
    setPinModalUser(null);
    setNewPin('');
  };

  const handleQuickSwitchToUser = (user: User) => {
    if (!isSuperAdmin && ((user.username || '').toLowerCase() === 'mobin' || user.is_super_admin)) {
      showToast('Access Restricted: Cannot switch to Global Super Administrator.');
      return;
    }
    setCurrentUser(user);
    setCurrentUserState(user);
    if (onUserSwitched) onUserSwitched(user);
    showToast(`Switched active operator to: ${user.full_name} (${(user.role || '').toUpperCase()})`);
  };

  // Safe filtered users list: Non-super admins (like JKS admin) can NEVER see or manage Global Super Admin (Mobin)
  const rawUsers = Array.isArray(users) ? users : [];
  const safeUsers = isSuperAdmin
    ? rawUsers
    : rawUsers.filter(
        (u) =>
          u &&
          (u.username || '').toLowerCase() !== 'mobin' &&
          !u.is_super_admin &&
          !(u.designation && u.designation.toLowerCase().includes('super admin'))
      );
  const filteredUsers = safeUsers.filter((u) => {
    if (!u) return false;
    const fullName = (u.full_name || '').toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const empCode = (u.employee_code || '').toLowerCase();
    const phone = String(u.phone || '');
    const email = (u.email || '').toLowerCase();
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      fullName.includes(search) ||
      uname.includes(search) ||
      empCode.includes(search) ||
      phone.includes(search) ||
      email.includes(search);

    const matchesBranch =
      selectedBranchFilter === 'all' ||
      u.assigned_branch_id === 'all' ||
      u.assigned_branch_id === selectedBranchFilter ||
      (Array.isArray(u.assigned_branches) && (u.assigned_branches.includes('all') || u.assigned_branches.includes(selectedBranchFilter)));

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'active' && u.is_active) ||
      (selectedStatusFilter === 'inactive' && !u.is_active);

    return matchesSearch && matchesBranch && matchesRole && matchesStatus;
  });

  // Role Badges & Colors
  const getRoleBadge = (role?: UserRole, isSuperAdminUser?: boolean) => {
    if (isSuperAdminUser) {
      return {
        label: 'Global Super Admin',
        cls: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold',
        icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
      };
    }
    switch (role) {
      case 'admin':
        return {
          label: 'Organization Admin',
          cls: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Crown className="w-3 h-3 text-purple-600" />,
        };
      case 'manager':
        return {
          label: 'Branch Manager',
          cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Shield className="w-3 h-3 text-indigo-600" />,
        };
      case 'cashier':
        return {
          label: 'Cashier',
          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <UserCheck className="w-3 h-3 text-emerald-600" />,
        };
      case 'salesperson':
        return {
          label: 'Salesperson',
          cls: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: <UserCheck className="w-3 h-3 text-teal-600" />,
        };
      case 'inventory_manager':
        return {
          label: 'Inventory Manager',
          cls: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Layers className="w-3 h-3 text-amber-600" />,
        };
      case 'purchase_manager':
        return {
          label: 'Purchase Manager',
          cls: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Briefcase className="w-3 h-3 text-orange-600" />,
        };
      case 'accountant':
        return {
          label: 'Accountant',
          cls: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Briefcase className="w-3 h-3 text-blue-600" />,
        };
      case 'warehouse_staff':
      default:
        return {
          label: 'Warehouse Staff',
          cls: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Building2 className="w-3 h-3 text-slate-500" />,
        };
    }
  };

  const getBranchName = (branchId?: string, assignedBranches?: string[]) => {
    const list = Array.isArray(assignedBranches) && assignedBranches.length > 0 ? assignedBranches : branchId ? [branchId] : [];
    if (list.length === 0 || list.includes('all')) return 'All Branches (Head Office)';
    if (list.length > 1) return `${list.length} Branches Assigned`;
    const found = branches.find((b) => b && b.id === list[0]);
    return found ? `${found.name || 'Branch'}${found.city ? ` (${found.city})` : ''}` : 'Primary Branch';
  };

  // Metrics
  const totalUsersCount = safeUsers.length;
  const activeCashiersCount = safeUsers.filter((u) => u && u.role === 'cashier' && u.is_active).length;
  const managersCount = safeUsers.filter((u) => u && u.role === 'manager' && u.is_active).length;
  const adminCount = safeUsers.filter((u) => u && u.role === 'admin' && u.is_active).length;

  return (
    <div className={embedded ? 'space-y-4 font-sans' : 'p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header with Multi-Store Context */}
      {!embedded ? (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCog className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System User Management</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Active Organization: {activeChain.name || 'Rozana'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Seats: {safeUsers.filter((u) => !isUserSuperAdmin(u)).length} / {orgLimits.maxUsers}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Define system operator credentials, multi-branch station access, POS quick PINs, and module permission matrices.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isSuperAdmin ? (
              <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-xs">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-extrabold uppercase text-amber-400 tracking-wider">Organization:</span>
                  <select
                    value={activeChain.id}
                    onChange={(e) => handleSwitchStoreChain(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                  >
                    {storeChains.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider leading-none mb-0.5">
                    Organization
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 leading-none">
                    {activeChain.name}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add System User
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 px-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-extrabold text-slate-900">Employee Seat Quota:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 tabular-nums">
              {safeUsers.filter((u) => !isUserSuperAdmin(u)).length} / {orgLimits.maxUsers} ({orgLimits.plan.name})
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Employee / User
          </button>
        </div>
      )}

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">Total System Staff</span>
          <div className="text-xl font-extrabold text-slate-900">{totalUsersCount} Registered Users</div>
          <p className="text-[10px] text-slate-500">{safeUsers.filter((u) => u && u.is_active).length} Active Operators</p>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
          <span className="text-emerald-700 font-medium text-[11px] uppercase tracking-wider block">POS Register Cashiers</span>
          <div className="text-xl font-extrabold text-emerald-900">{activeCashiersCount} Active Cashiers</div>
          <p className="text-[10px] text-emerald-700">Ready for Counter Register Billing</p>
        </div>

        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 shadow-2xs space-y-1">
          <span className="text-indigo-700 font-medium text-[11px] uppercase tracking-wider block">Store Managers</span>
          <div className="text-xl font-extrabold text-indigo-900">{managersCount} Branch Managers</div>
          <p className="text-[10px] text-indigo-700">Full Store Operations Access</p>
        </div>

        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/80 shadow-2xs space-y-1">
          <span className="text-purple-700 font-medium text-[11px] uppercase tracking-wider block">Head Office Admins</span>
          <div className="text-xl font-extrabold text-purple-900">{adminCount} System Admins</div>
          <p className="text-[10px] text-purple-700">Full System & Settings Control</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, username, employee ID (e.g. EMP-001), phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                <option value="all">All Store Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                <option value="all">All Roles</option>
                <option value="admin">Organization Admin</option>
                <option value="manager">Branch Manager</option>
                <option value="cashier">POS Cashier</option>
                <option value="salesperson">Salesperson</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="purchase_manager">Purchase Manager</option>
                <option value="accountant">Accountant</option>
                <option value="warehouse_staff">Warehouse Staff</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 outline-none cursor-pointer text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Display Section */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">No system users found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or filter selections to view registered system operators.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-xs inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-4 h-4" /> Add First User for {activeChain.name}
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="p-4">Employee / User</th>
                  <th className="p-4">Assigned Store Branch</th>
                  <th className="p-4">System Role</th>
                  <th className="p-4">POS Register PIN</th>
                  <th className="p-4">Allowed Modules</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isUserSuperAdmin = u.is_super_admin || (u.username || '').toLowerCase() === 'mobin';
                  const roleBadge = getRoleBadge(u.role, isUserSuperAdmin);
                  const branchLabel = getBranchName(u.assigned_branch_id, u.assigned_branches);
                  const perms = u.permissions || defaultPermissionsByRole(u.role || 'cashier');
                  const firstChar = (u.full_name || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee / User Column */}
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {firstChar}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-900 text-xs font-bold">{u.full_name || 'Unnamed User'}</span>
                              {u.employee_code && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono text-[9px] font-bold rounded">
                                  {u.employee_code}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal flex items-center gap-2 mt-0.5">
                              <span>@{u.username || 'user'}</span>
                              {u.designation && <span>• {u.designation}</span>}
                            </div>
                            {u.phone && <div className="text-[10px] text-slate-400 font-normal">{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Store Branch Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{branchLabel}</span>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${roleBadge.cls}`}>
                          {roleBadge.icon}
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* POS PIN Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-extrabold text-[11px] rounded border border-slate-200 flex items-center gap-1">
                            <Key className="w-3 h-3 text-indigo-600" />
                            {u.pos_pin ? `PIN: ${u.pos_pin}` : 'No PIN'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPinModalUser(u);
                              setNewPin(u.pos_pin || '1234');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      </td>

                      {/* Allowed Modules Column */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {perms.pos_billing && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">POS Register</span>
                          )}
                          {perms.sales_view && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded">Sales</span>
                          )}
                          {perms.inventory_manage && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded">Inventory</span>
                          )}
                          {perms.expenses_manage && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded">Finance</span>
                          )}
                          {perms.users_manage && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-bold rounded">User Admin</span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 cursor-pointer ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickSwitchToUser(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Operate as this User"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit User Details & Permissions"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!isUserSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id, u.full_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isUserSuperAdmin = u.is_super_admin || (u.username || '').toLowerCase() === 'mobin';
            const roleBadge = getRoleBadge(u.role, isUserSuperAdmin);
            const branchLabel = getBranchName(u.assigned_branch_id, u.assigned_branches);
            const perms = u.permissions || defaultPermissionsByRole(u.role || 'cashier');
            const firstChar = (u.full_name || 'U').charAt(0).toUpperCase();

            return (
              <div
                key={u.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 bg-white shadow-2xs ${
                  !u.is_active ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shadow-2xs">
                        {firstChar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{u.full_name || 'User'}</h3>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>@{u.username || 'user'}</span>
                          {u.employee_code && (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono text-[9px] font-bold rounded">
                              {u.employee_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${roleBadge.cls}`}>
                      {roleBadge.icon}
                      {roleBadge.label}
                    </span>
                  </div>

                  {/* Designation & Branch */}
                  <div className="space-y-1.5 pt-1 text-slate-600 text-xs">
                    {u.designation && (
                      <p className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.designation}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{branchLabel}</span>
                    </p>
                    {u.phone && (
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* POS PIN & Status Badge */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                      <Key className="w-3 h-3 text-indigo-600" />
                      <span>POS PIN: {u.pos_pin || '1234'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.is_active ? 'Active Staff' : 'Inactive'}
                    </button>
                  </div>

                  {/* Permissions Pills */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Module Access
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {perms.pos_billing && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                          POS Register
                        </span>
                      )}
                      {perms.sales_view && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md">
                          Sales Invoices
                        </span>
                      )}
                      {perms.inventory_manage && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md">
                          Inventory
                        </span>
                      )}
                      {perms.expenses_manage && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-md">
                          Finance / Expenses
                        </span>
                      )}
                      {perms.users_manage && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md">
                          User Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalUser(u);
                      setNewPin(u.pos_pin || '1234');
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Key className="w-3 h-3" /> Reset PIN
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickSwitchToUser(u)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Operate as this user"
                    >
                      <UserCheck className="w-3 h-3" /> Switch
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    {!isUserSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, u.full_name)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      )}

      {/* Redefined System User Modal (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-indigo-600" />
                  {editingUserId ? 'Edit System User Profile' : 'Add New System User'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure user identity, branch location access, role authorization, and POS terminal PIN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`pb-2 px-3 font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> 1. Basic Profile & Location
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`pb-2 px-3 font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'permissions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> 2. Role & Permissions Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`pb-2 px-3 font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'security'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" /> 3. POS PIN & Credentials
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* TAB 1: BASIC PROFILE & BRANCH */}
              {activeTab === 'profile' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Muhammad Ali"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. mali"
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Employee ID / Code</label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-006"
                        value={formData.employee_code || ''}
                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Job Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Counter Cashier, Store Supervisor"
                        value={formData.designation || ''}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="staff@askari.com"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+92 300 1234567"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Assigned Store Branch Selection (Multi-Branch Support) */}
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-600" /> Assigned Branch Access *
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            formData.assigned_branch_id === 'all' ||
                            Boolean(formData.assigned_branches?.includes('all'))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, assigned_branch_id: 'all', assigned_branches: ['all'] });
                            } else {
                              const firstId = branches[0]?.id || 'br-1';
                              setFormData({ ...formData, assigned_branch_id: firstId, assigned_branches: [firstId] });
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        All Branches (Head Office)
                      </label>
                    </div>
                    {!(formData.assigned_branch_id === 'all' || formData.assigned_branches?.includes('all')) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {branches.map((b) => {
                          const selectedList = formData.assigned_branches || [];
                          const checked = selectedList.includes(b.id) || formData.assigned_branch_id === b.id;
                          return (
                            <label
                              key={b.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-white border-indigo-400 text-slate-900 font-bold'
                                  : 'bg-white/60 border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const curr = new Set(formData.assigned_branches || (formData.assigned_branch_id ? [formData.assigned_branch_id] : []));
                                  curr.delete('all');
                                  if (e.target.checked) {
                                    curr.add(b.id);
                                  } else if (curr.size > 1) {
                                    curr.delete(b.id);
                                  }
                                  const nextArr = Array.from(curr);
                                  setFormData({
                                    ...formData,
                                    assigned_branches: nextArr,
                                    assigned_branch_id: nextArr[0] || branches[0]?.id || 'br-1',
                                  });
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                              />
                              <span className="truncate">{b.name} {b.code ? `[${b.code}]` : ''}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE & PERMISSIONS MATRIX */}
              {activeTab === 'permissions' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Organization Role Template</label>
                      <select
                        value={formData.custom_role_id || ''}
                        onChange={(e) => handleCustomRoleSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 cursor-pointer"
                      >
                        <option value="">Custom / Base Role Selection</option>
                        {orgRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.base_role.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-extrabold text-slate-900 mb-1">Base System Role Preset</label>
                      <select
                        value={formData.role || 'cashier'}
                        onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold text-slate-900 cursor-pointer"
                      >
                        <option value="admin">Organization Admin (Full Access)</option>
                        <option value="manager">Branch Manager (Branch Operations)</option>
                        <option value="cashier">POS Terminal Cashier</option>
                        <option value="salesperson">Salesperson</option>
                        <option value="inventory_manager">Inventory Manager</option>
                        <option value="purchase_manager">Purchase Manager</option>
                        <option value="accountant">Financial Accountant</option>
                        <option value="warehouse_staff">Warehouse Staff</option>
                      </select>
                    </div>
                  </div>

                  {/* Granular Checkbox Matrix */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center justify-between text-xs">
                      <span>Granular Module Access Matrix</span>
                      <button
                        type="button"
                        onClick={() => handleRoleChangeInForm(formData.role || 'cashier')}
                        className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        Reset to Role Defaults
                      </button>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* POS & Billing */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
                          🛒 POS Terminal & Sales
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.pos_billing || false}
                            onChange={() => handleTogglePermission('pos_billing')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Operate POS Billing Register</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.sales_discount || false}
                            onChange={() => handleTogglePermission('sales_discount')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Grant Custom Sales Discounts</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.sales_refund || false}
                            onChange={() => handleTogglePermission('sales_refund')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Process Sales Refunds / Voids</span>
                        </label>
                      </div>

                      {/* Stock & Catalog */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
                          📦 Inventory & Wood Stock
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.inventory_view || false}
                            onChange={() => handleTogglePermission('inventory_view')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">View Catalog & Stock Levels</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.inventory_manage || false}
                            onChange={() => handleTogglePermission('inventory_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Add/Edit Items & Wood Logs</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.purchases_manage || false}
                            onChange={() => handleTogglePermission('purchases_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Manage Purchases & Suppliers</span>
                        </label>
                      </div>

                      {/* Finance & Ledgers */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
                          💳 Customers & Finance
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.customers_manage || false}
                            onChange={() => handleTogglePermission('customers_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Manage Customer Ledgers & Credit</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.expenses_manage || false}
                            onChange={() => handleTogglePermission('expenses_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Record Daily Shop Expenses</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.reports_view || false}
                            onChange={() => handleTogglePermission('reports_view')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">View Financial & Sales Reports</span>
                        </label>
                      </div>

                      {/* System & Security */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
                          ⚙️ System & Administration
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.settings_manage || false}
                            onChange={() => handleTogglePermission('settings_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Manage Store Settings & Currencies</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.users_manage || false}
                            onChange={() => handleTogglePermission('users_manage')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">Manage System Users & Roles</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.audit_logs_view || false}
                            onChange={() => handleTogglePermission('audit_logs_view')}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="font-semibold text-slate-700">View System Audit Logs</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: POS PIN & SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
                    <label className="block font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-600" /> POS Register 4-Digit Quick PIN
                    </label>
                    <p className="text-[11px] text-amber-900">
                      This 4-digit PIN allows cashiers to instantly unlock POS terminals and switch registers during active shifts.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 1234"
                      value={formData.pos_pin || ''}
                      onChange={(e) => setFormData({ ...formData, pos_pin: e.target.value.replace(/\D/g, '') })}
                      className="w-full sm:w-48 px-3 py-2 bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-mono font-black text-base text-slate-900 tracking-widest text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Web Portal Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep existing password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="font-extrabold text-slate-900">Account Active (Staff member can log in)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {activeTab !== 'profile' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === 'security' ? 'permissions' : 'profile')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {activeTab !== 'security' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === 'profile' ? 'permissions' : 'security')}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 cursor-pointer"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    {editingUserId ? 'Update User' : 'Create System User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick PIN Modal */}
      {pinModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600" /> Update POS Register PIN
              </h3>
              <button
                type="button"
                onClick={() => setPinModalUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter a new 4-digit PIN for cashier <strong className="text-slate-900">{pinModalUser.full_name}</strong>:
            </p>

            <form onSubmit={handleSavePin} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-center font-mono font-black text-xl tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalUser(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
