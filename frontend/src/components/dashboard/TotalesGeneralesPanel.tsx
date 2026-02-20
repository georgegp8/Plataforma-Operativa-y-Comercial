import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface HourlyData {
  hora: string;
  total: number;
}

interface TotalesGeneralesPanelProps {
  totalNotaVenta: number;
  totalComprobantes: number;
  totalGeneral: number;
  hourlyData: HourlyData[];
  className?: string;
}

/**
 * TotalesGeneralesPanel Component
 * Panel de totales generales con gráfico de ventas por hora (diseño Nubofact)
 */
const CHART_CONFIG = {
  total: { label: 'Total', color: '#5ec9c7' },
} as const;

export function TotalesGeneralesPanel({ 
  totalNotaVenta, 
  totalComprobantes, 
  totalGeneral,
  hourlyData,
  className 
}: TotalesGeneralesPanelProps) {
  return (
    <Card className={`overflow-hidden shadow-md p-0 ${className}`}>
      <CardHeader className="bg-primary text-primary-foreground px-4 py-2 space-y-0">
        <Link to="/cpes/finanzas" className="hover:opacity-80 transition-opacity">
          <CardTitle className="text-sm font-semibold">Totales Generales →</CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="bg-muted px-4 py-3">
        {/* Resumen boxes */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <div className="text-xxs text-muted-foreground mb-1">Total Nota Venta</div>
            <div className="text-orange-700 dark:text-orange-600 text-sm font-semibold">
              {formatCurrency(totalNotaVenta)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <div className="text-xxs text-muted-foreground mb-1">Total Comprobantes</div>
            <div className="text-info text-sm font-semibold">
              {formatCurrency(totalComprobantes)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <div className="text-xxs text-muted-foreground mb-1">Total General</div>
            <div className="text-foreground text-sm font-semibold">
              {formatCurrency(totalGeneral)}
            </div>
          </div>
        </div>

        {/* Gráfico de área por horas */}
        <div className="h-32 w-full">
          <ChartContainer
            config={CHART_CONFIG}
            className="h-full w-full"
          >
            <AreaChart width={300} height={128} data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="hora"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#5ec9c7" 
                fill="#5ec9c7" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
