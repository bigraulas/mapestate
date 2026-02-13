import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { usersService } from '@/services/users.service';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import Modal from '@/components/shared/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  BROKER: 'Broker',
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700',
  BROKER: 'bg-blue-50 text-blue-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('BROKER');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ----- Data fetching -----

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersService.getAll(page, 20);
      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ----- Form -----

  const openCreateForm = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('BROKER');
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (user: UserRow) => {
    setEditingUser(user);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPassword('');
    setPhone(user.phone ?? '');
    setRole(user.role);
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          role,
        };
        if (password) payload.password = password;
        await usersService.update(editingUser.id, payload);
      } else {
        await usersService.create({
          firstName,
          lastName,
          email,
          password,
          phone: phone || undefined,
          role,
        });
      }
      setFormOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvare.';
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Delete -----

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await usersService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      // Silently fail
    } finally {
      setDeleting(false);
    }
  };

  // ----- Format helpers -----

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // ----- Table columns -----

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Nume',
      render: (r) => `${r.firstName} ${r.lastName}`,
    },
    { key: 'email', header: 'Email' },
    {
      key: 'phone',
      header: 'Telefon',
      render: (r) => r.phone ?? '-',
    },
    {
      key: 'role',
      header: 'Rol',
      render: (r) => (
        <span
          className={`badge ${ROLE_BADGE[r.role] ?? 'bg-gray-50 text-gray-700'}`}
        >
          {ROLE_LABELS[r.role] ?? r.role}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data crearii',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(r);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Editeaza"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(r);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sterge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Utilizatori</h1>
            <p className="page-subtitle">
              Gestioneaza conturile utilizatorilor
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>
          <Plus className="w-4 h-4" />
          <span>Adauga utilizator</span>
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyMessage="Nu exista utilizatori suplimentari. Invita primul coleg."
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingUser ? 'Editeaza utilizator' : 'Adauga utilizator nou'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-first" className="label">
                Prenume *
              </label>
              <input
                id="user-first"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="user-last" className="label">
                Nume *
              </label>
              <input
                id="user-last"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="user-email" className="label">
              Email *
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="user-password" className="label">
              {editingUser ? 'Parola noua (optional)' : 'Parola *'}
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={editingUser ? 'Lasa gol pentru a pastra' : 'Minim 6 caractere'}
              required={!editingUser}
              minLength={editingUser ? 0 : 6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-phone" className="label">
                Telefon
              </label>
              <input
                id="user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+40..."
              />
            </div>
            <div>
              <label htmlFor="user-role" className="label">
                Rol
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input"
              >
                <option value="BROKER">Broker</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-secondary"
            >
              Anuleaza
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              <span>{submitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirma stergerea"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Esti sigur ca vrei sa stergi utilizatorul{' '}
            <strong>
              {deleteTarget?.firstName} {deleteTarget?.lastName}
            </strong>
            ? Aceasta actiune nu poate fi anulata.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Anuleaza
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {deleting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{deleting ? 'Se sterge...' : 'Sterge'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
