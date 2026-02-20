import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl font-bold text-slate-200 mb-2">404</p>
      <h1 className="text-xl font-semibold text-slate-700 mb-1">Pagina nu a fost gasita</h1>
      <p className="text-sm text-slate-400 mb-6">Adresa accesata nu exista sau a fost mutata.</p>
      <Link to="/" className="btn-primary">
        <Home className="w-4 h-4" />
        <span>Inapoi la Dashboard</span>
      </Link>
    </div>
  );
}
