import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/layout/AppLayout';

// Vercel Bundle Critical: Code-split routes with React.lazy for optimal bundle size
// Landing page eager-loaded (first paint critical)
import Landing from '@/pages/Landing';

// Lazy-load all other routes (bundle-* rules: reduce main bundle)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DashboardTv = lazy(() => import('@/pages/DashboardTv'));
const Empresas = lazy(() => import('@/pages/Empresas'));
const Clientes = lazy(() => import('@/pages/Clientes'));
const Proveedores = lazy(() => import('@/pages/Proveedores'));
const Vendedores = lazy(() => import('@/pages/Vendedores'));
const Personal = lazy(() => import('@/pages/Personal'));
const CuentasBancarias = lazy(() => import('@/pages/CuentasBancarias'));
const Bancos = lazy(() => import('@/pages/Bancos'));
const Categorias = lazy(() => import('@/pages/Categorias'));
const Marcas = lazy(() => import('@/pages/Marcas'));
const Atributos = lazy(() => import('@/pages/Atributos'));
const UnidadesMedida = lazy(() => import('@/pages/UnidadesMedida'));
const Transacciones = lazy(() => import('@/pages/Transacciones'));
const Vehiculos = lazy(() => import('@/pages/Vehiculos'));
const Conductores = lazy(() => import('@/pages/Conductores'));
const ListaCompras = lazy(() => import('@/pages/ListaCompras'));
const NuevaCompra = lazy(() => import('@/pages/NuevaCompra'));
const DigitalizacionDocumentos = lazy(() => import('@/pages/DigitalizacionDocumentos'));
const Facturacion = lazy(() => import('@/pages/Facturacion'));
const FacturacionNubefact = lazy(() => import('@/pages/FacturacionNubefact'));
const Oportunidades = lazy(() => import('@/pages/Oportunidades'));
const DetalleOportunidad = lazy(() => import('@/pages/DetalleOportunidad'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));
const DocumentosPage = lazy(() => import('@/pages/Documentos'));
const PagosPage = lazy(() => import('@/pages/Pagos'));
const GestionProductos = lazy(() => import('@/pages/GestionProductos'));
const ProductosCompuestos = lazy(() => import('@/pages/ProductosCompuestos'));
const IngresoSalidaProductos = lazy(() => import('@/pages/IngresoSalidaProductos'));
const GuiasRemision = lazy(() => import('@/pages/GuiasRemision'));
const Traslados = lazy(() => import('@/pages/Traslados'));
const BoletasFacturas = lazy(() => import('@/pages/BoletasFacturas'));
const ConsultaNotaVenta = lazy(() => import('@/pages/ConsultaNotaVenta'));
const ConfiguracionEmpresa = lazy(() => import('@/pages/ConfiguracionEmpresa'));
// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="facturacion-theme">
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard-caja" element={<DashboardTv />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/mantenimiento/clientes" element={<Clientes />} />
            <Route path="/mantenimiento/proveedores" element={<Proveedores />} />
            <Route path="/mantenimiento/vendedores" element={<Vendedores />} />
            <Route path="/mantenimiento/personal" element={<Personal />} />
            <Route path="/mantenimiento/cuentas-bancarias" element={<CuentasBancarias />} />
            <Route path="/mantenimiento/bancos" element={<Bancos />} />
            <Route path="/mantenimiento/categorias" element={<Categorias />} />
            <Route path="/mantenimiento/marcas" element={<Marcas />} />
            <Route path="/mantenimiento/atributos" element={<Atributos />} />
            <Route path="/mantenimiento/unidades-medida" element={<UnidadesMedida />} />
            <Route path="/mantenimiento/tipo-transacciones" element={<Transacciones />} />
            <Route path="/mantenimiento/vehiculos" element={<Vehiculos />} />
            <Route path="/mantenimiento/vehiculos-transporte" element={<Navigate to="/mantenimiento/vehiculos" replace />} />
            <Route path="/mantenimiento/conductores" element={<Conductores />} />
            <Route path="/compras/listas" element={<ListaCompras />} />
            <Route path="/compras/nuevas" element={<NuevaCompra />} />
            <Route path="/compras/digitalizacion" element={<DigitalizacionDocumentos />} />
            <Route path="/productos" element={<GestionProductos />} />
            <Route path="/inventario/productos-compuestos" element={<ProductosCompuestos />} />
            <Route path="/inventario/ingreso-salida" element={<IngresoSalidaProductos />} />
            <Route path="/inventario/guias-remision" element={<GuiasRemision />} />
            <Route path="/inventario/traslados" element={<Traslados />} />
            <Route path="/cpes/boletas-facturas" element={<BoletasFacturas />} />
            <Route path="/cpes/nota-venta" element={<ConsultaNotaVenta />} />
            <Route path="/configuracion/empresa" element={<ConfiguracionEmpresa />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard-tv" element={<DashboardTv />} />
              <Route path="empresas" element={<Empresas />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="proveedores" element={<Proveedores />} />
              <Route path="mantenimiento/clientes" element={<Clientes />} />
              <Route path="mantenimiento/proveedores" element={<Proveedores />} />
              <Route path="mantenimiento/vendedores" element={<Vendedores />} />
              <Route path="mantenimiento/personal" element={<Personal />} />
              <Route path="mantenimiento/cuentas-bancarias" element={<CuentasBancarias />} />
              <Route path="mantenimiento/bancos" element={<Bancos />} />
              <Route path="mantenimiento/categorias" element={<Categorias />} />
              <Route path="mantenimiento/marcas" element={<Marcas />} />
              <Route path="mantenimiento/atributos" element={<Atributos />} />
              <Route path="mantenimiento/unidades-medida" element={<UnidadesMedida />} />
              <Route path="mantenimiento/tipo-transacciones" element={<Transacciones />} />
              <Route path="mantenimiento/vehiculos" element={<Vehiculos />} />
              <Route path="mantenimiento/conductores" element={<Conductores />} />
              <Route path="compras/listas" element={<ListaCompras />} />
              <Route path="compras/nuevas" element={<NuevaCompra />} />
              <Route path="compras/digitalizacion" element={<DigitalizacionDocumentos />} />
              <Route path="oportunidades" element={<Oportunidades />} />
              <Route path="oportunidades/:id" element={<DetalleOportunidad />} />
              <Route path="facturacion" element={<Facturacion />} />
              <Route path="facturacion-nubefact" element={<FacturacionNubefact />} />
              <Route path="productos" element={<GestionProductos />} />
              <Route path="documentos" element={<DocumentosPage />} />
              <Route path="pagos" element={<PagosPage />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
