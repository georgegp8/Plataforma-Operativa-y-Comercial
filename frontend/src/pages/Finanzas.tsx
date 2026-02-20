import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { dashboardApi } from '@/services/api';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, RefreshCw,
  Receipt, ShoppingBag, CheckCircle2, Clock,
} from 'lucide-react';
import { formatCurrencyKpi, formatCurrency } from '@/lib/format';
import type { DashboardStats, DashboardFiltros, MonthlyComparisonData } from '@/types';

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colors = {
    blue:   'bg-primary/10 text-primary border border-primary/25',
    green:  'bg-success/10 text-success border border-success/25',
    amber:  'bg-warning/10 text-warning border border-warning/25',
    red:    'bg-destructive/10 text-destructive border border-destructive/25',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
  };
  const iconColors = {
    blue:   'text-primary',
    green:  'text-success',
    amber:  'text-warning',
    red:    'text-destructive',
    purple: 'text-purple-500 dark:text-purple-400',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`h-6 w-6 ${iconColors[color]} opacity-70`} />
      </div>
    </div>
  );
}

const PERIODOS: { value: DashboardFiltros['periodo']; label: string }[] = [
  { value: 'HOY', label: 'Hoy' },
  { value: 'ESTA_SEMANA', label: 'Esta semana' },
  { value: 'ESTE_MES', label: 'Este mes' },
  { value: 'ESTE_AÑO', label: 'Este año' },
  { value: 'COMPLETO', label: 'Histórico' },
];

const hoy = new Date().toISOString().split('T')[0];

export default function Finanzas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyComparisonData[]>([]);
  // COMPLETO: desde 2000-01-01 hasta hoy → muestra todo el historial
  const [periodo, setPeriodo] = useState<DashboardFiltros['periodo']>('COMPLETO');

  const filtros: DashboardFiltros = {
    establecimiento: '1',
    periodo,
    fechaDel: '2000-01-01',
    fechaHasta: undefined,
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, monthly] = await Promise.allSettled([
        dashboardApi.getStats(filtros),
        dashboardApi.getMonthlyComparison(filtros),
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
      if (monthly.status === 'fulfilled') {
        const data = monthly.value as { data?: MonthlyComparisonData[] } | MonthlyComparisonData[];
        const arr = Array.isArray(data) ? data : (data as { data?: MonthlyComparisonData[] }).data || [];
        setMonthlyData(arr);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  }, [periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando datos financieros...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalVentas = (stats?.cpeTotal ?? 0) + (stats?.boletasTotal ?? 0);
  const totalCobrado = (stats?.cpePagado ?? 0) + (stats?.boletasPagado ?? 0);
  const totalPorCobrar = (stats?.cpePorPagar ?? 0) + (stats?.boletasPorPagar ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Finanzas</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as DashboardFiltros['periodo'])}>
              <SelectTrigger className="h-8 w-44 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void cargarDatos()}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-primary-foreground border-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Total Ventas"
              value={formatCurrencyKpi(totalVentas)}
              subtitle="Facturas + Boletas"
              icon={DollarSign}
              color="blue"
            />
            <StatCard
              title="Cobrado"
              value={formatCurrencyKpi(totalCobrado)}
              subtitle="Pagado"
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              title="Por Cobrar"
              value={formatCurrencyKpi(totalPorCobrar)}
              subtitle="Pendiente de pago"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Facturas"
              value={formatCurrencyKpi(stats?.cpeTotal ?? 0)}
              subtitle={`${formatCurrencyKpi(stats?.cpePagado ?? 0)} cobrado`}
              icon={Receipt}
              color="purple"
            />
            <StatCard
              title="Boletas"
              value={formatCurrencyKpi(stats?.boletasTotal ?? 0)}
              subtitle={`${formatCurrencyKpi(stats?.boletasPagado ?? 0)} cobrado`}
              icon={ShoppingBag}
              color="blue"
            />
            <StatCard
              title="Utilidad Neta"
              value={formatCurrencyKpi(stats?.utilidadNeta ?? 0)}
              subtitle="Ingresos - Egresos"
              icon={(stats?.utilidadNeta ?? 0) >= 0 ? TrendingUp : TrendingDown}
              color={(stats?.utilidadNeta ?? 0) >= 0 ? 'green' : 'red'}
            />
          </div>
        </div>

        {/* Desglose CPE vs Boletas */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Facturas */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-500" />
                Facturas Electrónicas
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total emitido</span>
                  <span className="font-semibold">{formatCurrency(stats?.cpeTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobrado</span>
                  <span className="font-semibold text-green-600">{formatCurrency(stats?.cpePagado ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Por cobrar</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(stats?.cpePorPagar ?? 0)}</span>
                </div>
                {/* Barra de progreso */}
                {(stats?.cpeTotal ?? 0) > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((stats?.cpePagado ?? 0) / (stats?.cpeTotal ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(((stats?.cpePagado ?? 0) / (stats?.cpeTotal ?? 1)) * 100)}% cobrado
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Boletas */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-blue-500" />
                Boletas de Venta
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total emitido</span>
                  <span className="font-semibold">{formatCurrency(stats?.boletasTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobrado</span>
                  <span className="font-semibold text-green-600">{formatCurrency(stats?.boletasPagado ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Por cobrar</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(stats?.boletasPorPagar ?? 0)}</span>
                </div>
                {/* Barra de progreso */}
                {(stats?.boletasTotal ?? 0) > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((stats?.boletasPagado ?? 0) / (stats?.boletasTotal ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(((stats?.boletasPagado ?? 0) / (stats?.boletasTotal ?? 1)) * 100)}% cobrado
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla mensual */}
        {monthlyData.length > 0 && (
          <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Comparativa Mensual
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Mes</th>
                    <th className="px-4 py-3 text-right font-medium">Facturas</th>
                    <th className="px-4 py-3 text-right font-medium">Boletas</th>
                    <th className="px-4 py-3 text-right font-medium">N. Crédito</th>
                    <th className="px-4 py-3 text-right font-medium">N. Débito</th>
                    <th className="px-4 py-3 text-right font-medium">Compras</th>
                    <th className="px-4 py-3 text-right font-medium">Total Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.slice().reverse().map((row, i) => {
                    const totalMes = (row.facturas || 0) + (row.boletas || 0);
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium capitalize">{row.mes}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(row.facturas || 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(row.boletas || 0)}</td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {row.notasCredito ? `- ${formatCurrency(row.notasCredito)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600">
                          {row.notasDebito ? `+ ${formatCurrency(row.notasDebito)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {row.compras ? formatCurrency(row.compras) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(totalMes)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-3 font-bold text-sm">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.facturas || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.boletas || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.notasCredito || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.notasDebito || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-muted-foreground">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.compras || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {formatCurrency(monthlyData.reduce((s, r) => s + (r.facturas || 0) + (r.boletas || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {!monthlyData.length && !loading && (
          <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg p-8 text-center text-muted-foreground">
            No hay datos para el período seleccionado
          </div>
        )}
      </div>
    </div>
  );
}
