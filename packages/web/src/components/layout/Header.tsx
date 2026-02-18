import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  LogOut,
  User,
  Menu,
  Loader2,
  Building,
  FileText,
  UserPlus,
  Settings,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
import { auditService } from '@/services';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/proprietati': 'Proprietati',
  '/companii': 'Companii',
  '/persoane': 'Persoane',
  '/cereri': 'Cereri',
  '/oferte': 'Oferte',
  '/deals': 'Ofertare',
  '/activitati': 'Activitati',
  '/utilizatori': 'Utilizatori',
};

interface AuditEntry {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  details?: Record<string, unknown> | null;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
}

const actionLabels: Record<string, string> = {
  CREATE: 'a creat',
  UPDATE: 'a actualizat',
  DELETE: 'a sters',
  STATUS_CHANGE: 'a schimbat statusul',
  REASSIGN: 'a reasignat',
};

const entityLabels: Record<string, string> = {
  DEAL: 'deal',
  BUILDING: 'proprietate',
  UNIT: 'unitate',
  COMPANY: 'companie',
  PERSON: 'persoana',
  OFFER: 'oferta',
  ACTIVITY: 'activitate',
  USER: 'utilizator',
  SETTINGS: 'setari',
};

const entityIcons: Record<string, typeof Building> = {
  DEAL: FileText,
  BUILDING: Building,
  COMPANY: Building,
  PERSON: UserPlus,
  USER: UserPlus,
  OFFER: FileText,
  SETTINGS: Settings,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'acum';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}z`;
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notifications state (admin only)
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifEntries, setNotifEntries] = useState<AuditEntry[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentLabel = routeLabels[location.pathname] || 'Pagina';

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await auditService.getAll({ page: 1, limit: 15 });
      const entries: AuditEntry[] = res.data.data;
      setNotifEntries(entries);
      setNotifCount(res.data.meta.total);
    } catch {
      setNotifEntries([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && isAdmin) {
      fetchNotifications();
    }
  }, [notifOpen, isAdmin, fetchNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const breadcrumbs = [{ label: 'MapEstate', path: '/' }];
  if (location.pathname !== '/') {
    breadcrumbs.push({ label: currentLabel, path: location.pathname });
  }

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-2">
        {/* Hamburger - mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 active:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb - hidden on mobile, show page label instead */}
        <div className="hidden md:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span
                className={cn(
                  index === breadcrumbs.length - 1
                    ? 'text-slate-900 font-medium'
                    : 'text-slate-400',
                )}
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile: just show current page label */}
        <span className="md:hidden text-sm font-medium text-slate-800">
          {currentLabel}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Notifications - admin only */}
        {isAdmin && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-2xs flex items-center justify-center font-medium">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Activitate agenti</h3>
                  <span className="text-2xs text-slate-400">{notifCount} total</span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  ) : notifEntries.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      Nu exista activitate recenta.
                    </div>
                  ) : (
                    notifEntries.map((entry) => {
                      const Icon = entityIcons[entry.entity] || ArrowRightLeft;
                      const actionLabel = actionLabels[entry.action] || entry.action.toLowerCase();
                      const entityLabel = entityLabels[entry.entity] || entry.entity.toLowerCase();
                      const detailName = (entry.details as Record<string, string> | null)?.name || '';

                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 leading-snug">
                              <span className="font-medium">{entry.user.firstName} {entry.user.lastName}</span>
                              {' '}{actionLabel}{' '}
                              <span className="text-slate-500">{entityLabel}</span>
                              {detailName && (
                                <span className="font-medium text-slate-600"> "{detailName}"</span>
                              )}
                            </p>
                            <p className="text-2xs text-slate-400 mt-0.5">{timeAgo(entry.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user
                  ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
                  : 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-700 leading-none">
                {user ? `${user.firstName} ${user.lastName}` : 'Utilizator'}
              </p>
              <p className="text-2xs text-slate-400 mt-0.5">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Agent'}
              </p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1 z-50">
              <button
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profilul meu</span>
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Deconectare</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
