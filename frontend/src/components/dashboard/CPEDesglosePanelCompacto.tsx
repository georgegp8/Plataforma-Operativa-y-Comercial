import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface CPEDesglosePanelCompactoProps {
  totalPagado: number;
  totalPorPagar: number;
  total: number;
  className?: string;
}

/**
 * CPEDesglosePanelCompacto Component
 * Panel de desglose de CPE con métricas de pagos (diseño Nubofact)
 */
export function CPEDesglosePanelCompacto({ 
  totalPagado, 
  totalPorPagar, 
  total,
  className 
}: CPEDesglosePanelCompactoProps) {
  return (
    <Card className={`overflow-hidden shadow-md p-0 ${className}`}>
      <CardHeader className="bg-primary text-primary-foreground px-4 py-2 space-y-0">
        <Link to="/cpes/boletas-facturas" className="hover:opacity-80 transition-opacity">
          <CardTitle className="text-sm font-semibold">CPE →</CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="bg-muted px-4 py-3">
        {/* Desglose de pagos */}
        <div className="space-y-3">
          {/* Total Pagado */}
          <div className="flex justify-between items-center border-b border-dashed border-border pb-2">
            <span className="text-xs text-muted-foreground">Total Pagado</span>
            <span className="text-sm font-semibold text-info">{formatCurrency(totalPagado)}</span>
          </div>
          
          {/* Total por Pagar */}
          <div className="flex justify-between items-center border-b border-dashed border-border pb-2">
            <span className="text-xs text-muted-foreground">Total por Pagar</span>
            <span className="text-sm font-semibold text-orange-700 dark:text-orange-600">{formatCurrency(totalPorPagar)}</span>
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-base font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
