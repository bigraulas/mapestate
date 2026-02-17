import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';

interface InvitationInfo {
  email: string;
  firstName: string;
  lastName: string;
  agencyName: string;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link de invitatie invalid.');
      setLoading(false);
      return;
    }

    api
      .get(`/auth/invitation/${token}`)
      .then((res) => {
        setInvitation(res.data);
        setFirstName(res.data.firstName);
        setLastName(res.data.lastName);
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message || 'Invitatie invalida sau expirata.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie sa aiba minim 6 caractere.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        token,
        firstName,
        lastName,
        password,
        phone: phone || undefined,
      });

      // Store token and redirect
      localStorage.setItem('mapestate_token', res.data.accessToken);
      localStorage.setItem('mapestate_user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Eroare la inregistrare.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Invitatie Invalida
          </h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <a href="/login" className="btn-primary inline-flex">
            Inapoi la Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 mb-4">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Creeaza Cont
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Te alturi agentiei{' '}
            <span className="font-medium text-slate-700">
              {invitation.agencyName}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={invitation.email}
                className="input bg-slate-50"
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prenume</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Nume</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Telefon</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+40..."
              />
            </div>

            <div>
              <label className="label">Parola</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Minim 6 caractere"
                required
              />
            </div>

            <div>
              <label className="label">Confirma Parola</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repeta parola"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>
                {submitting ? 'Se creeaza contul...' : 'Creeaza Cont'}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-2xs text-slate-400 mt-6">
          Ai deja cont?{' '}
          <a href="/login" className="text-primary-600 hover:underline">
            Conecteaza-te
          </a>
        </p>
      </div>
    </div>
  );
}
