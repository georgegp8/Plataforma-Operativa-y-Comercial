import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CPERankingItem {
  name: string;
  value: number | string;
  percentage?: number;
}

interface CPERankingPanelProps {
  data: CPERankingItem[];
  className?: string;
}

export function CPERankingPanel({ data, className }: CPERankingPanelProps) {
  const maxValue = Math.max(...data.map(item => typeof item.value === 'number' ? item.value : 0));

  return (
    // 'p-0' elimina el margen interno de la tarjeta para que el header toque los bordes
    // 'border-0' es opcional si quieres quitar el borde gris fino
    <Card className={`overflow-hidden shadow-md p-0 ${className}`}>
      
      {/* 'py-2' reduce la altura de la barra azul para que esté más ajustada al texto */}
      <CardHeader className="bg-primary text-primary-foreground px-4 py-2 space-y-0">
        <Link to="/cpes/boletas-facturas" className="hover:opacity-80 transition-opacity">
          <CardTitle className="text-sm font-semibold">CPE Emitidos →</CardTitle>
        </Link>
      </CardHeader>

      <CardContent className="bg-muted px-4 py-3">
        <div className="space-y-2">
          {data.map((item, index) => {
            const barWidth = item.percentage 
              ? item.percentage 
              : typeof item.value === 'number' ? (item.value / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-foreground w-6">{index + 1}</span>
                  <span className="text-foreground font-medium flex-1">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-foreground w-12 text-right">{item.value}</span>
                  <div className="w-20 h-2 bg-secondary/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(barWidth, 100)}%`,
                        backgroundColor: '#5ec9c7'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}