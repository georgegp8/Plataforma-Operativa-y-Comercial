import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/format';
import type { MonthlyComparisonData } from '@/types';

interface MonthlyComparisonChartProps {
  data: MonthlyComparisonData[];
  className?: string;
  incluirAnuladas?: boolean;
  onToggleAnuladas?: (value: boolean) => void;
}

/**
 * MonthlyComparisonChart Component
 * Gráfico de barras agrupadas comparando Facturas, Boletas, Notas de Crédito, Notas de Débito y Compras por mes
 * (diseño Nubofact)
 */
// Vercel Best Practice: Extract color config outside component
const CHART_CONFIG = {
  facturas: { label: 'Facturas', color: '#ef4444' },
  boletas: { label: 'Boletas', color: '#fb923c' },
  notasCredito: { label: 'Notas de Crédito', color: '#22c55e' },
  notasDebito: { label: 'Notas de Débito', color: '#eab308' },
  compras: { label: 'Compras', color: '#60a5fa' },
} as const;

const LEGEND_ITEMS = [
  { label: 'FACTURAS', color: 'bg-red-500' },
  { label: 'BOLETAS', color: 'bg-orange-400' },
  { label: 'NOTAS DE CRÉDITO', color: 'bg-green-500' },
  { label: 'NOTAS DE DÉBITO', color: 'bg-yellow-500' },
  { label: 'COMPRAS', color: 'bg-blue-400' },
] as const;

// Tipos para el tooltip
interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

// Tooltip personalizado con formato mejorado
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const value = Number(entry.value);
          if (value === 0) return null; // No mostrar si es 0

          let label = '';
          switch (entry.dataKey) {
            case 'facturas':
              label = 'Facturas';
              break;
            case 'boletas':
              label = 'Boletas';
              break;
            case 'notasCredito':
              label = 'Notas de Crédito';
              break;
            case 'notasDebito':
              label = 'Notas de Débito';
              break;
            case 'compras':
              label = 'Compras';
              break;
          }

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{label}:</span>
              </div>
              <span className="font-medium text-foreground">{formatCurrency(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function MonthlyComparisonChart({ data, className, incluirAnuladas = false, onToggleAnuladas }: MonthlyComparisonChartProps) {
  return (
    <div className={`bg-muted rounded-lg shadow-md p-4 min-h-70 ${className}`}>
      {/* Leyenda + filtro */}
      <div className="bg-card border border-border rounded p-2 mb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-4 text-xs flex-wrap">
            {LEGEND_ITEMS.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 ${color} rounded`}></div>
                <span className="text-foreground">{label}</span>
              </div>
            ))}
          </div>
          {/* Filtro anuladas */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={incluirAnuladas}
              onChange={(e) => onToggleAnuladas?.(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Incluir anuladas</span>
          </label>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-100 w-full">
        <ChartContainer
          config={CHART_CONFIG}
          className="h-full w-full"
        >
          <BarChart width={520} height={400} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="mes"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
              interval={0}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
              tickFormatter={(value) => `S/ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="facturas" fill="#ef4444" />
            <Bar dataKey="boletas" fill="#fb923c" />
            <Bar dataKey="notasCredito" fill="#22c55e" />
            <Bar dataKey="notasDebito" fill="#eab308" />
            <Bar dataKey="compras" fill="#60a5fa" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
