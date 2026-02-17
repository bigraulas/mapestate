import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Building,
  Users,
  Handshake,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  ClipboardList,
  Shield,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ElementType;
  children?: { label: string; path: string; icon: React.ElementType }[];
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Proprietati', path: '/proprietati', icon: Building2 },
  {
    label: 'Contacte',
    icon: Users,
    children: [
      { label: 'Companii', path: '/companii', icon: Building },
      { label: 'Persoane', path: '/persoane', icon: Users },
    ],
  },
  { label: 'Deals', path: '/deals', icon: Handshake },
  { label: 'Activitati', path: '/activitati', icon: Calendar },
  {
    label: 'Admin',
    icon: Shield,
    adminOnly: true,
    children: [
      { label: 'Echipa', path: '/utilizatori', icon: Users },
      { label: 'Jurnal Activitate', path: '/jurnal', icon: ClipboardList },
      { label: 'Setari Agentie', path: '/setari', icon: Settings },
    ],
  },
  {
    label: 'Platform',
    icon: Globe,
    platformAdminOnly: true,
    children: [
      { label: 'Agentii', path: '/platform', icon: Building2 },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Contacte']);
  const location = useLocation();
  const { isAdmin, isPlatformAdmin } = useAuth();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  const isActiveParent = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return false;
  };

  const filteredNavigation = navigation.filter((item) => {
    if (item.platformAdminOnly) return isPlatformAdmin;
    if (item.adminOnly) return isAdmin && !isPlatformAdmin;
    return true;
  });

  // On mobile the sidebar is never collapsed (always full width in overlay)
  const isMobileOverlay = !!onNavigate;
  const isCollapsed = isMobileOverlay ? false : collapsed;

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-semibold text-slate-900 truncate">
              MapEstate
            </span>
          )}
        </div>
        {/* Close button on mobile overlay */}
        {isMobileOverlay && (
          <button
            onClick={onNavigate}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 active:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActiveParent(item)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {expandedMenus.includes(item.label) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </button>
                  {!isCollapsed && expandedMenus.includes(item.label) && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <NavLink
                            to={child.path}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                                isActive
                                  ? 'text-primary-600 bg-primary-50 font-medium'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                              )
                            }
                          >
                            <child.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{child.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.path!}
                  end={item.path === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle - only on desktop */}
      {!isMobileOverlay && (
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {collapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5" />
                <span className="flex-1 text-left">Restrange</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
