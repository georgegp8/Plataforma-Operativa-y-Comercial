import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/AuthContext';
import PrivateRoute from '@/components/PrivateRoute';

// Landing page eager-loaded (first paint critical)
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';

// Lazy-load all other routes
const Dashboard = lazy(() => import('@/pages/Dashboard'));
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
const GestionProductos = lazy(() => import('@/pages/GestionProductos'));
const ProductosCompuestos = lazy(() => import('@/pages/ProductosCompuestos'));
const IngresoSalidaProductos = lazy(() => import('@/pages/IngresoSalidaProductos'));
const GuiasRemision = lazy(() => import('@/pages/GuiasRemision'));
const Traslados = lazy(() => import('@/pages/Traslados'));
const BoletasFacturas = lazy(() => import('@/pages/BoletasFacturas'));
const ConsultaNotaVenta = lazy(() => import('@/pages/ConsultaNotaVenta'));
const NotasCreditoDebito = lazy(() => import('@/pages/NotasCreditoDebito'));
const AnuladosSunat = lazy(() => import('@/pages/AnuladosSunat'));
const NoEnviadosSunat = lazy(() => import('@/pages/NoEnviadosSunat'));
const ResumenesSunat = lazy(() => import('@/pages/ResumenesSunat'));
const Cotizaciones = lazy(() => import('@/pages/Cotizaciones'));
const Finanzas = lazy(() => import('@/pages/Finanzas'));
const ConfiguracionEmpresa = lazy(() => import('@/pages/ConfiguracionEmpresa'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="facturacion-theme">
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/landing" element={<Landing />} />

              {/* Rutas protegidas */}
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/mantenimiento/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
              <Route path="/mantenimiento/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
              <Route path="/mantenimiento/vendedores" element={<PrivateRoute><Vendedores /></PrivateRoute>} />
              <Route path="/mantenimiento/personal" element={<PrivateRoute><Personal /></PrivateRoute>} />
              <Route path="/mantenimiento/cuentas-bancarias" element={<PrivateRoute><CuentasBancarias /></PrivateRoute>} />
              <Route path="/mantenimiento/bancos" element={<PrivateRoute><Bancos /></PrivateRoute>} />
              <Route path="/mantenimiento/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
              <Route path="/mantenimiento/marcas" element={<PrivateRoute><Marcas /></PrivateRoute>} />
              <Route path="/mantenimiento/atributos" element={<PrivateRoute><Atributos /></PrivateRoute>} />
              <Route path="/mantenimiento/unidades-medida" element={<PrivateRoute><UnidadesMedida /></PrivateRoute>} />
              <Route path="/mantenimiento/tipo-transacciones" element={<PrivateRoute><Transacciones /></PrivateRoute>} />
              <Route path="/mantenimiento/vehiculos" element={<PrivateRoute><Vehiculos /></PrivateRoute>} />
              <Route path="/mantenimiento/vehiculos-transporte" element={<Navigate to="/mantenimiento/vehiculos" replace />} />
              <Route path="/mantenimiento/conductores" element={<PrivateRoute><Conductores /></PrivateRoute>} />
              <Route path="/compras/listas" element={<PrivateRoute><ListaCompras /></PrivateRoute>} />
              <Route path="/compras/nuevas" element={<PrivateRoute><NuevaCompra /></PrivateRoute>} />
              <Route path="/compras/digitalizacion" element={<PrivateRoute><DigitalizacionDocumentos /></PrivateRoute>} />
              <Route path="/productos" element={<PrivateRoute><GestionProductos /></PrivateRoute>} />
              <Route path="/inventario/productos-compuestos" element={<PrivateRoute><ProductosCompuestos /></PrivateRoute>} />
              <Route path="/inventario/ingreso-salida" element={<PrivateRoute><IngresoSalidaProductos /></PrivateRoute>} />
              <Route path="/inventario/guias-remision" element={<PrivateRoute><GuiasRemision /></PrivateRoute>} />
              <Route path="/inventario/traslados" element={<PrivateRoute><Traslados /></PrivateRoute>} />
              <Route path="/cpes/boletas-facturas" element={<PrivateRoute><BoletasFacturas /></PrivateRoute>} />
              <Route path="/cpes/nota-venta" element={<PrivateRoute><ConsultaNotaVenta /></PrivateRoute>} />
              <Route path="/cpes/notas-credito-debito" element={<PrivateRoute><NotasCreditoDebito /></PrivateRoute>} />
              <Route path="/cpes/anulados-sunat" element={<PrivateRoute><AnuladosSunat /></PrivateRoute>} />
              <Route path="/cpes/no-enviados-sunat" element={<PrivateRoute><NoEnviadosSunat /></PrivateRoute>} />
              <Route path="/cpes/resumenes-sunat" element={<PrivateRoute><ResumenesSunat /></PrivateRoute>} />
              <Route path="/cpes/cotizaciones" element={<PrivateRoute><Cotizaciones /></PrivateRoute>} />
              <Route path="/cpes/finanzas" element={<PrivateRoute><Finanzas /></PrivateRoute>} />

              {/* Solo Admin */}
              <Route path="/configuracion/empresa" element={<PrivateRoute adminOnly><ConfiguracionEmpresa /></PrivateRoute>} />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
