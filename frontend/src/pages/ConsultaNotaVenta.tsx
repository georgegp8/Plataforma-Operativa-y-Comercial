import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileCheck, 
  ShoppingBag
} from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { NotaVenta } from '@/lib/api'; 

const COLORS = {
  primaryBlue: '#256080',
  accentLime: '#A4E102',

};

export default function ConsultaNotaVenta() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotaVenta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [totales, setTotales] = useState({
    por_cobrar: 0.00,
    busqueda: 734547.00,
    documentos: 707204.00
  });

  const [filtros, setFiltros] = useState({
    serie: '',
    numero: '',
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    cliente: '',
    vendedor: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulación de datos para evitar errores de renderizado síncrono
      setTimeout(() => {
        const mockData: NotaVenta[] = Array.from({ length: 25 }).map((_, i) => ({
            id: i + 1,
            fecha_emision: '2026-02-04',
            cliente_razon_social: i % 2 === 0 ? 'DISTRIBUIDORA DEL SUR S.A.C.' : 'CLIENTE GENERICO',
            cliente_num_doc: i % 2 === 0 ? '20100100101' : '10456789',
            serie: 'NV01',
            numero: (123 + i).toString().padStart(6, '0'),
            metodo_pago: i % 3 === 0 ? 'Credito' : 'Contado',
            pagado: i % 3 !== 0,
            cpe_relacionado: i % 2 === 0 ? `F001-${4021 + i}` : undefined,
            motivo: 'Venta regular',
            estado_pago: i % 3 !== 0 ? 'Pagado' : 'Pendiente',
            moneda: 'PEN',
            total: 1500.00 + (i * 10),
            actividad: 'Venta',
        } as NotaVenta));

        setData(mockData);
        setTotales(prev => ({ ...prev, por_cobrar: 500.00 }));
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar notas de venta');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const dataPaginada = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg shadow-sm overflow-hidden border border-border bg-card">
          
          {/* Cabecera Azul */}
          <div 
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: COLORS.primaryBlue }}
          >
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Consulta de Nota de venta</span>
            </h1>
            
            <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant="ghost"
                  className="font-bold text-white hover:bg-white/10 hover:text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-1" style={{ color: COLORS.accentLime }} />
                  Nuevo
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="text-xs font-medium text-white hover:bg-white/10 hover:text-white bg-transparent"
                  style={{ borderColor: COLORS.accentLime }}
                >
                  Generar CPE de Multiples NV
                </Button>
            </div>
          </div>

          {/* Sección de Filtros Beige */}
          <div 
            className="px-4 py-4 border-b border-border space-y-3 dark:bg-muted/20">
            <div className="flex flex-wrap items-end gap-2">
                <div className="w-32">
                    <Select value={filtros.serie} onValueChange={(v) => setFiltros({...filtros, serie: v})}>
                        <SelectTrigger className="bg-white dark:bg-background border-0 h-9 rounded-sm">
                          <SelectValue placeholder="Serie CPE" />
                        </SelectTrigger>
                        <SelectContent><SelectItem value="NV01">NV01</SelectItem></SelectContent>
                    </Select>
                </div>

                <div className="w-40 relative">
                     <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input 
                        placeholder="Ingresar Nº Nota Venta" 
                        className="pl-8 bg-white dark:bg-background border-0 h-9 rounded-sm text-sm"
                        value={filtros.numero}
                        onChange={(e) => setFiltros({...filtros, numero: e.target.value})}
                     />
                </div>

                <Input 
                    type="date" 
                    className="w-36 bg-white dark:bg-background border-0 h-9 rounded-sm text-sm"
                    value={filtros.fechaInicio}
                    onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
                />

                <Input 
                    type="date" 
                    className="w-36 bg-white dark:bg-background border-0 h-9 rounded-sm text-sm"
                    value={filtros.fechaFin}
                    onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
                />

                <div className="w-48">
                    <Select value={filtros.estado} onValueChange={(v) => setFiltros({...filtros, estado: v})}>
                        <SelectTrigger className="bg-white dark:bg-background border-0 h-9 rounded-sm">
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="pagado">Pagado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="ml-auto flex flex-col items-end">
                    <span className="text-muted-foreground font-medium text-xs mb-1">Total por cobrar :</span>
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded font-bold text-lg min-w-24 text-center leading-none">
                        {totales.por_cobrar.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                 <div className="flex-1 relative">
                    <Input 
                        placeholder="Escriba el nombre o número de documento del cliente"
                        className="bg-white dark:bg-background border-blue-300 dark:border-border h-9 rounded-sm border text-sm"
                        value={filtros.cliente}
                        onChange={(e) => setFiltros({...filtros, cliente: e.target.value})}
                    />
                 </div>
                 <div className="w-64">
                    <Select value={filtros.vendedor} onValueChange={(v) => setFiltros({...filtros, vendedor: v})}>
                        <SelectTrigger className="bg-white dark:bg-background border-blue-300 dark:border-border h-9 rounded-sm text-sm">
                          <SelectValue placeholder="Seleccione un Asesor - Vendedor" />
                        </SelectTrigger>
                        <SelectContent><SelectItem value="v1">Vendedor 1</SelectItem></SelectContent>
                    </Select>
                 </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: COLORS.primaryBlue }}>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white">Actividad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white w-1/4">Cliente</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white">N.V.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white">Metodo de pago</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white">Pagado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white">CPE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white">Motivo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white">Estado pago</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white">Acciones</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y divide-border" >
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Cargando...</td></tr>
                ) : (
                  dataPaginada.map((item, index) => (
                    <tr key={item.id} className="hover:bg-background/50 dark:hover:bg-muted/50 transition-colors text-xs border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">{startIndex + index + 1}</td>
                      <td className="px-4 py-2 font-medium">{item.actividad}</td>
                      <td className="px-4 py-2">
                        <div className="font-semibold">{item.cliente_razon_social}</div>
                        <div className="text-[10px] text-muted-foreground">{item.cliente_num_doc}</div>
                      </td>
                      <td className="px-4 py-2 text-center font-bold">{item.serie}-{item.numero}</td>
                      <td className="px-4 py-2">{item.metodo_pago}</td>
                      <td className="px-4 py-2 text-center">
                        {item.pagado ? <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" /> : <span className="text-destructive font-bold">-</span>}
                      </td>
                      <td className="px-4 py-2 text-center text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline">
                        {item.cpe_relacionado || '-'}
                      </td>
                      <td className="px-4 py-2">{item.motivo}</td>
                      <td className="px-4 py-2 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${item.estado_pago === 'Pagado' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'}`}>
                            {item.estado_pago}
                         </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Search className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="p-4 flex flex-col items-end gap-1 border-t border-border">
                <div className="flex items-center gap-8 font-bold text-sm">
                    <span className="text-muted-foreground">Total Por busqueda</span>
                    <span>S/ {totales.busqueda.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-8 font-bold text-sm">
                    <span className="text-muted-foreground">Total Suma Documentos</span>
                    <span>S/ {totales.documentos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
          </div>

          {/* Footer y Paginación */}
          <div 
            className="px-4 py-3 border-t border-border relative"> 
             <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mostrar</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span className="text-sm text-muted-foreground">
                        registros | Mostrando {data.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, data.length)} de {data.length}
                    </span>
                </div>

                <div className="flex bg-background rounded border border-border shadow-sm">
                   <button 
                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                     disabled={currentPage === 1}
                     className="px-2 py-1 text-muted-foreground hover:text-primary border-r border-border disabled:opacity-50 transition-colors"
                   >
                     <ChevronLeft className="h-4 w-4" />
                   </button>
                   
                   {totalPages > 0 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = totalPages;
                        
                        return (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1 text-sm font-medium transition-colors ${
                                    currentPage === pageNum 
                                    ? 'text-primary bg-primary/10' 
                                    : 'text-muted-foreground hover:text-primary'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                   })}

                   <button 
                     onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="px-2 py-1 text-muted-foreground hover:text-primary border-l border-border disabled:opacity-50 transition-colors"
                   >
                     <ChevronRight className="h-4 w-4" />
                   </button>
                </div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
}