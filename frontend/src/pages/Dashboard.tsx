import { useState, useEffect, useCallback } from "react";
import { FileText, CreditCard, BarChart3, Wallet } from "lucide-react";
import { dashboardApi } from "@/services/api";
import { NubofactHeader } from "@/components/layout/NubofactHeader";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CPERankingPanel } from "@/components/dashboard/CPERankingPanel";
import { NotasVentaPanel } from "@/components/dashboard/NotasVentaPanel";
import { TotalComprasPanel } from "@/components/dashboard/TotalComprasPanel";
import { CPEDesglosePanelCompacto } from "@/components/dashboard/CPEDesglosePanelCompacto";
import { NotasVentaDesglosePanelCompacto } from "@/components/dashboard/NotasVentaDesglosePanelCompacto";
import { TotalesGeneralesPanel } from "@/components/dashboard/TotalesGeneralesPanel";
import { ProductosTopTable } from "@/components/dashboard/ProductosTopTable";
import { ClientesTopTable } from "@/components/dashboard/ClientesTopTable";
import { StockMinimoTable } from "@/components/dashboard/StockMinimoTable";
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart";
import { MonthlyTable } from "@/components/dashboard/MonthlyTable";
import type { 
  DashboardFiltros, 
  DashboardStats, 
  CPERankingItem,
  ProductoTopItem,
  ClienteTopItem,
  StockMinimoProduct,
  MonthlyComparisonData,
  MonthlyTableRow
} from "@/types";
import { formatCurrencyKpi } from "@/lib/format";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  // const [loadingCPE, setLoadingCPE] = useState(true); // TODO: Usar para loading spinner
  const [cpeRanking, setCpeRanking] = useState<CPERankingItem[]>([]);
  const [productosTop, setProductosTop] = useState<ProductoTopItem[]>([]);
  const [clientesTop, setClientesTop] = useState<ClienteTopItem[]>([]);
  const [clientesTopLimit, setClientesTopLimit] = useState(10);
  const [clientesTopAnulados, setClientesTopAnulados] = useState(false);
  const [stockMinimo, setStockMinimo] = useState<StockMinimoProduct[]>([]);
  const [stockMinimoTotal, setStockMinimoTotal] = useState(0);
  const [stockMinimoPage, setStockMinimoPage] = useState(1);
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<MonthlyComparisonData[]>([]);
  const [monthlyTableData, setMonthlyTableData] = useState<MonthlyTableRow[]>([]);
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);
  const [filtros, setFiltros] = useState<DashboardFiltros>({
    establecimiento: "1",
    periodo: "COMPLETO",
    fechaDel: "2000-01-01", // Desde el inicio
    fechaHasta: undefined,
  });

  const [stats, setStats] = useState<DashboardStats>({
    cpeEmitidos: 0,
    totalCPE: 0,
    cpePagado: 0,
    cpePorPagar: 0,
    cpeTotal: 0,
    totalBoletas: 0,
    boletasPagado: 0,
    boletasPorPagar: 0,
    boletasTotal: 0,
    montoTotalGeneral: 0,
    utilidadNeta: 0,
    ventasPorHora: [],
  });

  useEffect(() => {
    const cargarStats = async () => {
      try {
        setLoading(true);
        const data = await dashboardApi.getStats(filtros);
        setStats(data);
      } catch (error) {
        console.error("Error al cargar stats del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarStats();
  }, [filtros]);

  useEffect(() => {
    const cargarCPERanking = async () => {
      try {
        // setLoadingCPE(true); // TODO: Activar cuando se añada loading spinner
        const data = await dashboardApi.getCPERanking(filtros);
        setCpeRanking(data);
      } catch (error) {
        console.error("Error al cargar ranking de CPE:", error);
        setCpeRanking([]);
      } finally {
        // setLoadingCPE(false); // TODO: Activar cuando se añada loading spinner
      }
    };

    cargarCPERanking();
  }, [filtros]);

  useEffect(() => {
    const cargarProductosTop = async () => {
      try {
        const data = await dashboardApi.getProductosTop(filtros);
        setProductosTop(data);
      } catch (error) {
        console.error("Error al cargar productos top:", error);
        setProductosTop([]);
      }
    };

    cargarProductosTop();
  }, [filtros]);

  useEffect(() => {
    const cargarClientesTop = async () => {
      try {
        const data = await dashboardApi.getClientesTop(filtros, clientesTopLimit, clientesTopAnulados);
        setClientesTop(data);
      } catch (error) {
        console.error("Error al cargar clientes top:", error);
        setClientesTop([]);
      }
    };

    cargarClientesTop();
  }, [filtros, clientesTopLimit, clientesTopAnulados]);

  useEffect(() => {
    const cargarStockMinimo = async () => {
      try {
        const response = await dashboardApi.getStockMinimo(stockMinimoPage, 5);
        setStockMinimo(response.data);
        setStockMinimoTotal(response.total_pages);
      } catch (error) {
        console.error("Error al cargar stock mínimo:", error);
        setStockMinimo([]);
        setStockMinimoTotal(0);
      }
    };

    cargarStockMinimo();
  }, [stockMinimoPage]);

  useEffect(() => {
    const cargarMonthlyComparison = async () => {
      try {
        const data = await dashboardApi.getMonthlyComparison(filtros, incluirAnuladas);
        setMonthlyComparisonData(data.chart);
        setMonthlyTableData(data.table);
      } catch (error) {
        console.error("Error al cargar comparación mensual:", error);
        setMonthlyComparisonData([]);
        setMonthlyTableData([]);
      }
    };

    cargarMonthlyComparison();
  }, [filtros, incluirAnuladas]);

  // React Best Practice: Memoize callbacks to prevent child re-renders
  const handleFiltrosChange = useCallback(
    (nuevosFiltros: {
      establecimiento: string;
      periodo: string;
      fechaDel: string;
      fechaHasta?: string;
    }) => {
      setFiltros(nuevosFiltros as DashboardFiltros);
    },
    [],
  );

  const handleStockMinimoPageChange = useCallback((page: number) => {
    setStockMinimoPage(page);
  }, []);

  // Datos reales de compras y notas de venta (conectados a la API)
  const [totalComprasData, setTotalComprasData] = useState({
    totalCompras: 0,
    saldo: 0,
    monthlyData: [] as { month: string; value: number }[],
  });

  const [notasVentaData, setNotasVentaData] = useState({
    ingresos: 0,
    egresos: 0,
    flujo: 0,
  });

  // Cargar datos de compras cuando cambien los filtros
  useEffect(() => {
    const cargarCompras = async () => {
      try {
        // TODO: Implementar endpoint para obtener totales de compras
        // const data = await dashboardApi.getTotalCompras(filtros);
        // setTotalComprasData(data);

        // Por ahora, calcular desde los datos existentes
        setTotalComprasData({
          totalCompras: 0,
          saldo: 0,
          monthlyData: [],
        });
      } catch (error) {
        console.error("Error al cargar datos de compras:", error);
      }
    };

    cargarCompras();
  }, [filtros]);

  // Calcular ingresos y egresos desde los stats reales
  useEffect(() => {
    const ingresos = stats.cpeTotal + stats.boletasTotal;
    const egresos = totalComprasData.totalCompras;
    setNotasVentaData({
      ingresos,
      egresos,
      flujo: ingresos - egresos,
    });
  }, [stats, totalComprasData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="bg-muted/30 py-3 border-b">
          <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12">
            <div className="bg-primary/10 rounded-lg p-4 h-24 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-background py-4">
          <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-primary/10 rounded-lg h-24 animate-pulse lg:col-span-2"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="py-6">
          <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground text-sm">Cargando datos del dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-opacity duration-200">
      {/* Header Nubofact */}
      <NubofactHeader />

      {/* Dashboard General Section with Filters */}
      <div className="bg-muted/30 py-3 border-b">
        <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12">
          <DashboardFilters
            establecimiento={filtros.establecimiento}
            periodo={filtros.periodo}
            fechaDel={filtros.fechaDel}
            fechaHasta={filtros.fechaHasta}
            onFiltrosChange={handleFiltrosChange}
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="bg-background py-4 animate-in fade-in duration-300">
        <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
            <MetricCard
              variant="nubofact"
              icon={FileText}
              title="CPE Emitidos"
              value={stats.cpeEmitidos.toString()}
              className="lg:col-span-3"
              href="/cpes/boletas-facturas"
            />
            <MetricCard
              variant="nubofact"
              icon={CreditCard}
              title="Total CPE"
              value={formatCurrencyKpi(stats.cpeTotal)}
              className="lg:col-span-3"
              href="/cpes/boletas-facturas"
            />
            <MetricCard
              variant="nubofact"
              icon={BarChart3}
              title="Notas de Venta"
              value={formatCurrencyKpi(stats.boletasTotal)}
              className="lg:col-span-2"
              href="/cpes/nota-venta"
            />
            <MetricCard
              variant="nubofact"
              icon={Wallet}
              title="Total General"
              value={formatCurrencyKpi(stats.montoTotalGeneral)}
              className="lg:col-span-2"
              href="/cpes/finanzas"
            />
            <MetricCard
              variant="nubofact"
              icon={Wallet}
              title="Utilidad Neta"
              value={formatCurrencyKpi(stats.utilidadNeta)}
              className="lg:col-span-2"
              href="/cpes/finanzas"
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="py-6">
        <div className="max-w-480 mx-auto px-6 sm:px-8 lg:px-12 space-y-8">
          {/* FILA 0: Nuevos paneles de desglose compactos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <CPEDesglosePanelCompacto
              totalPagado={stats.cpePagado}
              totalPorPagar={stats.cpePorPagar}
              total={stats.cpeTotal}
              className="lg:col-span-4"
            />
            <NotasVentaDesglosePanelCompacto
              totalPagado={stats.boletasPagado}
              totalPorPagar={stats.boletasPorPagar}
              total={stats.boletasTotal}
              className="lg:col-span-4"
            />
            <TotalesGeneralesPanel
              totalNotaVenta={stats.boletasTotal}
              totalComprobantes={stats.cpeTotal}
              totalGeneral={stats.montoTotalGeneral}
              hourlyData={stats.ventasPorHora}
              className="lg:col-span-4"
            />
          </div>

          {/* FILA 1: Paneles de resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <CPERankingPanel data={cpeRanking} className="lg:col-span-4" />
            <NotasVentaPanel
              ingresos={notasVentaData.ingresos}
              egresos={notasVentaData.egresos}
              flujo={notasVentaData.flujo}
              className="lg:col-span-4"
            />
            <TotalComprasPanel
              totalCompras={totalComprasData.totalCompras}
              saldo={totalComprasData.saldo}
              monthlyData={totalComprasData.monthlyData}
              className="lg:col-span-4"
            />
          </div>

          {/* FILA 2: Tablas de productos, clientes y stock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <ProductosTopTable data={productosTop} className="lg:col-span-4" />
            <ClientesTopTable
              data={clientesTop}
              className="lg:col-span-4"
              limit={clientesTopLimit}
              onLimitChange={setClientesTopLimit}
              incluirAnulados={clientesTopAnulados}
              onToggleAnulados={setClientesTopAnulados}
            />
            <StockMinimoTable
              data={stockMinimo}
              totalPages={stockMinimoTotal}
              currentPage={stockMinimoPage}
              onPageChange={handleStockMinimoPageChange}
              onPedido={(id) => console.log("Pedido producto:", id)}
              className="lg:col-span-4"
            />
          </div>

          {/* FILA 3: Gráfico mensual y Tabla resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <MonthlyComparisonChart
              data={monthlyComparisonData}
              className="lg:col-span-6"
              incluirAnuladas={incluirAnuladas}
              onToggleAnuladas={setIncluirAnuladas}
            />
            <MonthlyTable data={monthlyTableData} className="lg:col-span-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
