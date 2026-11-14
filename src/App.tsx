import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
  getCurrentUser,
  getIsAuthenticated,
  logoutUser,
  subscribeToStorage,
  isUserSuperAdmin,
  getActiveStoreChain,
  getOrganizationAccessState
} from './lib/storage';
import { User } from './types';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RetailZPos } from './components/RetailZPos';
import { CategoriesAndCars } from './components/CategoriesAndCars';
import { Purchases } from './components/Purchases';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Sales } from './components/Sales';
import { Payments } from './components/Payments';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { AuditLogs } from './components/AuditLogs';
import { Settings } from './components/Settings';
import { OrganizationsPlans } from './components/OrganizationsPlans';
import { OrganizationManagement } from './components/OrganizationManagement';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AlertTriangle, RotateCcw, Lock, LogOut } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTab: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ContentErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Content Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Module Display Issue</h2>
          <p className="text-xs text-slate-500">
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.fallbackTab();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Return to POS Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(() => getIsAuthenticated());
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('zpos');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Subscribe to storage changes to keep currentUser and authentication in sync across screens
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      setCurrentUserState(getCurrentUser());
      setIsAuthenticatedState(getIsAuthenticated());
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    setIsAuthenticatedState(true);
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticatedState(false);
  };

  // If user is not authenticated, render the system Login Screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const activeChain = getActiveStoreChain();
  const orgAccess = getOrganizationAccessState(activeChain);

  const renderContent = () => {
    if (!isUserSuperAdmin(currentUser) && orgAccess.blocked) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Organization {orgAccess.status.toUpperCase()}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">{orgAccess.reason}</p>
          <p className="text-[11px] text-slate-400">
            Please contact your Global Platform Administrator to reactivate or renew this organization&apos;s subscription.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'zpos':
        return <RetailZPos userRole={currentUser?.role || 'cashier'} onNavigateToInvoices={() => setActiveTab('sales')} />;
      case 'dashboard':
        return <Dashboard userRole={currentUser?.role || 'cashier'} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'categories':
      case 'inventory':
        return <CategoriesAndCars userRole={currentUser?.role || 'cashier'} />;
      case 'purchases':
        return <Purchases userRole={currentUser?.role || 'cashier'} />;
      case 'customers':
        return <Customers userRole={currentUser?.role || 'cashier'} />;
      case 'suppliers':
        return <Suppliers userRole={currentUser?.role || 'cashier'} />;
      case 'sales':
        return <Sales userRole={currentUser?.role || 'cashier'} onNavigateToPos={() => setActiveTab('zpos')} />;
      case 'payments':
        return <Payments userRole={currentUser?.role || 'cashier'} />;
      case 'expenses':
        return <Expenses userRole={currentUser?.role || 'cashier'} />;
      case 'reports':
        return <Reports />;
      case 'org-management':
        return (
          <OrganizationManagement
            currentUser={currentUser}
            onUserSwitched={(u) => {
              setCurrentUserState(u);
            }}
          />
        );
      case 'users':
        return (
          <UserManagement
            currentUser={currentUser}
            onUserSwitched={(u) => {
              setCurrentUserState(u);
            }}
          />
        );
      case 'organizations':
      case 'businesses':
        if (!isUserSuperAdmin(currentUser)) {
          return <Dashboard userRole={currentUser?.role || 'cashier'} onNavigate={(tab) => setActiveTab(tab)} />;
        }
        return (
          <OrganizationsPlans
            currentUser={currentUser}
            onSwitchOrganization={() => {
              setCurrentUserState(getCurrentUser());
              setActiveTab('dashboard');
            }}
          />
        );
      case 'logs':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <RetailZPos userRole={currentUser?.role || 'cashier'} onNavigateToInvoices={() => setActiveTab('sales')} />;
    }
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-800 flex font-sans antialiased overflow-hidden">
      {/* Left Navigation Sidebar (Z-POS SaaS badge card at top aligns with header bar) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userRole={currentUser?.role || 'admin'}
        currentUser={currentUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Right Workspace Column: Unified Z-POS Dark Header across all screens */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100">
        <Navbar
          currentUser={currentUser}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onLogout={handleLogout}
        />

        {/* Main Working View Area wrapped in resilient error boundary */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <ContentErrorBoundary fallbackTab={() => setActiveTab('zpos')}>
            {renderContent()}
          </ContentErrorBoundary>
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}

export default App;
