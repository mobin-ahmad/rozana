import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Boxes,
  FolderTree,
  Truck,
  Users,
  Building2,
  Receipt,
  CreditCard,
  CircleDollarSign,
  BarChart3,
  UserCog,
  History,
  Settings as SettingsIcon,
  X,
  LogOut,
  Database
} from 'lucide-react';
import { User, UserRole } from '../types';
import { isUserSuperAdmin } from '../lib/storage';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { DatabaseModal } from './DatabaseModal';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  currentUser?: User;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  currentUser,
  isMobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const isSuper = isUserSuperAdmin(currentUser);
  const [isDbModalOpen, setIsDbModalOpen] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<DbConnectionStatus>(() => databaseService.getLastStatus());

  React.useEffect(() => {
    databaseService.checkStatus();
    const unsub = databaseService.subscribe((s) => setDbStatus(s));
    return () => unsub();
  }, []);

  const isAllowed = (item: { id: string; roles: UserRole[] }) => {
    // SaaS Business Profiles is strictly reserved for Global Super Admin
    if (item.id === 'businesses') {
      return isSuper;
    }
    if (item.id === 'users') {
      return isSuper || userRole === 'admin' || Boolean(currentUser?.permissions?.users_manage);
    }
    if (isSuper) return true;
    return item.roles.includes(userRole);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager', 'cashier', 'warehouse_staff'] as UserRole[],
    },
    {
      id: 'zpos',
      label: 'rozana Retail',
      icon: Store,
      roles: ['admin', 'manager', 'cashier'] as UserRole[],
      badge: 'MAIN',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'categories',
      label: 'Item Setup',
      icon: FolderTree,
      roles: ['admin', 'manager', 'warehouse_staff'] as UserRole[],
    },
    {
      id: 'purchases',
      label: 'Purchases (Stock-In)',
      icon: Truck,
      roles: ['admin', 'manager', 'warehouse_staff'] as UserRole[],
    },
    {
      id: 'customers',
      label: 'Customers & Ledger',
      icon: Users,
      roles: ['admin', 'manager', 'cashier'] as UserRole[],
    },
    {
      id: 'suppliers',
      label: 'Suppliers & Ledger',
      icon: Building2,
      roles: ['admin', 'manager', 'warehouse_staff'] as UserRole[],
    },
    {
      id: 'sales',
      label: 'Sales & Invoices',
      icon: Receipt,
      roles: ['admin', 'manager', 'cashier'] as UserRole[],
    },
    {
      id: 'payments',
      label: 'Payments Ledger',
      icon: CreditCard,
      roles: ['admin', 'manager', 'cashier'] as UserRole[],
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: CircleDollarSign,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'businesses',
      label: 'Business Profiles',
      icon: Building2,
      roles: ['admin'] as UserRole[],
      badge: 'SaaS',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCog,
      roles: ['admin'] as UserRole[],
    },
    {
      id: 'logs',
      label: 'Activity Audit Logs',
      icon: History,
      roles: ['admin'] as UserRole[],
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: SettingsIcon,
      roles: ['admin'] as UserRole[],
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-slate-100 text-slate-700 w-64 border-r border-slate-200/80 select-none">
      {/* Permanent Top Branding Banner Card - Rounded & Aligned with Center Store Header */}
      <div className="p-2 sm:p-4 pb-1">
        <div className="bg-[#0B0F19] text-white rounded-xl p-3 border border-slate-800 shadow-sm flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0 shadow-md flex items-center justify-center">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-white tracking-tight leading-none">rozana</h2>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-950/90 text-indigo-200 border border-indigo-700/80 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  RETAIL SAAS EDITION
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-normal mt-1 truncate">Next-Gen Point of Sale Terminal</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="p-1 text-slate-400 hover:text-white lg:hidden shrink-0" title="Close Menu">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          if (!isAllowed(item)) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-500 shadow-2xs border border-slate-200/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* PostgreSQL rozana:5432 Status Widget */}
      <div className="p-2.5 mx-3 mb-2 rounded-xl bg-slate-900 text-white border border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 truncate">
              PostgreSQL DB
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span className="truncate text-blue-300 font-bold">{dbStatus.database || 'rozana'}:{dbStatus.port || 5432}</span>
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-sans font-semibold underline underline-offset-2 ml-1 shrink-0"
          >
            Manage
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-slate-200/80 bg-white/60 flex items-center justify-between gap-2 text-[11px]">
        <div className="text-slate-500 min-w-0 truncate">
          POS • <span className="font-bold text-slate-700 uppercase">{(userRole || 'admin').replace('_', ' ')}</span>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Sign Out of POS System"
            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-200 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        )}
      </div>

      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block h-full shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-50 flex-1 max-w-xs">{content}</div>
        </div>
      )}
    </>
  );
};
