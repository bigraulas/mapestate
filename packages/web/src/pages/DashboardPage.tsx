import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Square,
  CheckCircle,
  Loader2,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { dashboardService } from '@/services/dashboard.service';
import { usersService } from '@/services/users.service';
import { useAuth } from '@/hooks/useAuth';

interface KpiData {
  activeRequests: number;
  totalEstimatedFee: number;
  totalSqm: number;
  closedDealsCount: number;
}

interface PipelineItem {
  status: string;
  count: number;
}

interface MonthlySalesItem {
  month: string;
  won: number;
  lost: number;
}

interface ExpiringLease {
  id: number;
  company: { name: string } | null;
  unit: { name: string; floor?: number };
  building: { name: string };
  endDate: string;
  daysUntilExpiry: number;
  priority: 'critical' | 'warning' | 'normal';
}

interface BrokerPerf {
  id: number;
  name: string;
  email: string;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  estimatedFee: number;
}

interface BrokerOption {
  id: number;
  firstName: string;
  lastName: string;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nou',
  QUALIFYING: 'Calificare',
  VIEWING: 'Vizionare',
  OFFER_SENT: 'Oferta trimisa',
  NEGOTIATION: 'Negociere',
  WON: 'Castigat',
  LOST: 'Pierdut',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1',
  QUALIFYING: '#8b5cf6',
  VIEWING: '#3b82f6',
  OFFER_SENT: '#f59e0b',
  NEGOTIATION: '#f97316',
  WON: '#22c55e',
  LOST: '#ef4444',
};

const PRIORITY_STYLES: Record<string, string> = {
  critical:
    'bg-red-100 text-red-700 border-red-200',
  warning:
    'bg-yellow-100 text-yellow-700 border-yellow-200',
  normal:
    'bg-green-100 text-green-700 border-green-200',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critic',
  warning: 'Atentie',
  normal: 'Normal',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ro-RO').format(value);
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesItem[]>([]);
  const [expiringLeases, setExpiringLeases] = useState<ExpiringLease[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin-specific
  const [brokerPerformance, setBrokerPerformance] = useState<BrokerPerf[]>([]);
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | undefined>(undefined);

  // Fetch broker list for filter (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchBrokers = async () => {
      try {
        const res = await usersService.getAll(1, 100);
        setBrokers(res.data.data ?? []);
      } catch {}
    };
    fetchBrokers();
  }, [isAdmin]);

  // Fetch broker performance (admin only, once)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchPerf = async () => {
      try {
        const res = await dashboardService.getBrokerPerformance();
        setBrokerPerformance(res.data);
      } catch {}
    };
    fetchPerf();
  }, [isAdmin]);

  // Fetch dashboard data (filtered by broker when selected)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [kpiRes, pipelineRes, salesRes, leasesRes] = await Promise.all([
          dashboardService.getKpis(selectedBrokerId),
          dashboardService.getPipeline(selectedBrokerId),
          dashboardService.getMonthlySales(selectedBrokerId),
          dashboardService.getExpiringLeases(selectedBrokerId),
        ]);

        setKpis(kpiRes.data);
        setPipeline(pipelineRes.data);
        setMonthlySales(salesRes.data);
        setExpiringLeases(leasesRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedBrokerId]);

  if (loading && !kpis) {
    return (
      <div className="page-container">
        <Spinner />
      </div>
    );
  }

  const pipelineChartData = pipeline.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    count: item.count,
    fill: STATUS_COLORS[item.status] || '#94a3b8',
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Prezentare generala a activitatii</p>
          </div>
        </div>

        {/* Broker filter - admin only */}
        {isAdmin && (
          <select
            value={selectedBrokerId ?? ''}
            onChange={(e) => setSelectedBrokerId(e.target.value ? Number(e.target.value) : undefined)}
            className="input !w-auto min-w-[200px]"
          >
            <option value="">Toti brokerii</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.firstName} {b.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cereri Active</p>
              <p className="text-2xl font-semibold text-slate-900">
                {kpis?.activeRequests ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Fee Estimat Total</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(kpis?.totalEstimatedFee ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
              <Square className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">mp Solicitati</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(kpis?.totalSqm ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Dealuri Inchise</p>
              <p className="text-2xl font-semibold text-slate-900">
                {kpis?.closedDealsCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Broker Performance Table - admin only */}
      {isAdmin && !selectedBrokerId && brokerPerformance.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Performanta Brokeri
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Broker</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Dealuri Active</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Castigate</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Pierdute</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Fee Total</th>
                </tr>
              </thead>
              <tbody>
                {brokerPerformance.map((bp) => (
                  <tr key={bp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{bp.name}</div>
                      <div className="text-xs text-slate-400">{bp.email}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{bp.activeDeals}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-600 font-medium">{bp.wonDeals}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-red-500 font-medium">{bp.lostDeals}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(bp.estimatedFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Pipeline Cereri
          </h2>
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [value, 'Cereri']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">
              Nu exista date pentru pipeline.
            </p>
          )}
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Vanzari Lunare
          </h2>
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="won"
                  name="Castigate"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="lost"
                  name="Pierdute"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">
              Nu exista date pentru vanzari lunare.
            </p>
          )}
        </div>
      </div>

      {/* Expiring Leases Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Contracte care Expira
        </h2>
        {expiringLeases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Unit
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Companie
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Data expirare
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Prioritate
                  </th>
                </tr>
              </thead>
              <tbody>
                {expiringLeases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {lease.unit?.name || '-'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {lease.building?.name || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {lease.company?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(lease.endDate).toLocaleDateString('ro-RO')}
                      <span className="ml-2 text-xs text-slate-400">
                        ({lease.daysUntilExpiry} zile)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_STYLES[lease.priority]}`}
                      >
                        {PRIORITY_LABELS[lease.priority]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">
            Niciun contract nu expira in curand.
          </p>
        )}
      </div>
    </div>
  );
}
