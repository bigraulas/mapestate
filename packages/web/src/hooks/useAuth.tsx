import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import api from '@/services/api';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  agencyId?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('mapestate_token'),
  );
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mapestate_token');
    localStorage.removeItem('mapestate_user');
  }, []);

  // On mount only, check for existing token and fetch user
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const initAuth = async () => {
      const savedToken = localStorage.getItem('mapestate_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userData = response.data;
        setUser(userData);
        localStorage.setItem('mapestate_user', JSON.stringify(userData));
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data;

    const accessToken = data.accessToken;
    const userData = data.user;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('mapestate_token', accessToken);
    localStorage.setItem('mapestate_user', JSON.stringify(userData));
  };

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isPlatformAdmin;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isPlatformAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
