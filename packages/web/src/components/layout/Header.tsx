import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/proprietati': 'Proprietati',
  '/companii': 'Companii',
  '/persoane': 'Persoane',
  '/cereri': 'Cereri',
  '/oferte': 'Oferte',
  '/deals': 'Deals',
  '/activitati': 'Activitati',
  '/utilizatori': 'Utilizatori',
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = routeLabels[location.pathname] || 'Pagina';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-2xs flex items-center justify-center font-medium">
            3
          </span>
        </button>

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
