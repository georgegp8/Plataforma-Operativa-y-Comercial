import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClienteTopItem {
  id: number;
  cliente: string;
  transacciones: number;
  total: number;
}

interface ClientesTopTableProps {
  data: ClienteTopItem[];
  className?: string;
}

export function ClientesTopTable({ data, className }: ClientesTopTableProps) {
  return (
    <Card className={`overflow-hidden shadow-md p-0 ${className}`}>
      <CardHeader className="bg-primary text-primary-foreground px-4 py-2 space-y-0">
        <CardTitle className="text-sm font-semibold">Clientes Top</CardTitle>
      </CardHeader>
      <CardContent className="bg-muted px-4 py-3">
        <div className="bg-card rounded overflow-x-auto border border-border">
          <table className="w-full text-xs">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">#</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Cliente</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Trans</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-3">{item.id}</td>
                    <td className="px-3 py-3">{item.cliente}</td>
                    <td className="px-3 py-3">{item.transacciones}</td>
                    <td className="px-3 py-3">S/ {item.total.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-3 text-center text-gray-500" colSpan={4}>
                      No hay datos disponibles
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-3" colSpan={4}>&nbsp;</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-3" colSpan={4}>&nbsp;</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
