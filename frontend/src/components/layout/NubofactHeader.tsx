import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Settings,
  ShoppingCart,
  Package,
  FileText,
  Archive,
  BarChart3,
  ChevronDown,
  User,
  Users,
  Truck,
  UserCog,
  CreditCard,
  Scan,
  Landmark,
  Grid3x3,
  Tag,
  ListTree,
  Ruler,
  ArrowLeftRight,
  UserCircle,
  TruckIcon,
  ClipboardList,
  Plus,
  Gift,
  Inbox,
  MoveHorizontal,
  Receipt,
  ShoppingBag,
  FileEdit,
  DollarSign,
  TrendingUp,
  XCircle,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

interface DropdownItem {
  label: string;
  path: string;
  icon: React.ElementType;
  isSectionTitle?: boolean;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  hasDropdown?: boolean;
  dropdownItems?: DropdownItem[];
}

const mantenimientoItems: DropdownItem[] = [
  { label: 'Clientes', path: '/mantenimiento/clientes', icon: Users },
  { label: 'Proveedores', path: '/mantenimiento/proveedores', icon: Truck },
  { label: 'Vendedores', path: '/mantenimiento/vendedores', icon: UserCircle },
  { label: 'Personal de la empresa', path: '/mantenimiento/personal', icon: UserCog },
  { label: 'Cuentas Bancarias', path: '/mantenimiento/cuentas-bancarias', icon: CreditCard },
  { label: 'Bancos', path: '/mantenimiento/bancos', icon: Landmark },
  { label: 'Categorías', path: '/mantenimiento/categorias', icon: Grid3x3 },
  { label: 'Marcas', path: '/mantenimiento/marcas', icon: Tag },
  { label: 'Atributos', path: '/mantenimiento/atributos', icon: ListTree },
  { label: 'Unidades de Medida', path: '/mantenimiento/unidades-medida', icon: Ruler },
  { label: 'Tipo de transacciones - Inventario', path: '/mantenimiento/tipo-transacciones', icon: ArrowLeftRight },
  { label: 'Conductores', path: '/mantenimiento/conductores', icon: UserCircle },
  { label: 'Vehículos de Transporte', path: '/mantenimiento/vehiculos', icon: TruckIcon },
];

const comprasItems: DropdownItem[] = [
  { label: 'Lista de Compras', path: '/compras/listas', icon: ClipboardList },
  { label: 'Nuevas Compras', path: '/compras/nuevas', icon: Plus },
  { label: 'Digitalización de Documentos', path: '/compras/digitalizacion', icon: Scan },
];

const inventarioItems: DropdownItem[] = [
  { label: 'Productos', path: '/productos', icon: Package },
  { label: 'Productos Compuestos', path: '/inventario/productos-compuestos', icon: Gift },
  { label: 'Ingreso y Salida de Productos', path: '/inventario/ingreso-salida', icon: Inbox },
  { label: 'Guías de Remisión', path: '/inventario/guias-remision', icon: FileText },
  { label: 'Traslados', path: '/inventario/traslados', icon: MoveHorizontal },
];

const cpeItems: DropdownItem[] = [
  { label: 'COMPROBANTES ELECTRÓNICOS', path: '', icon: FileText, isSectionTitle: true },
  { label: 'Boletas y Facturas', path: '/cpes/boletas-facturas', icon: Receipt },
  { label: 'Nota de Venta', path: '/cpes/nota-venta', icon: ShoppingBag },
  { label: 'Nota Crédito/Débito - Otros', path: '/cpes/notas-credito-debito', icon: FileEdit },
  { label: 'Cotizaciones', path: '/cpes/cotizaciones', icon: DollarSign },
  { label: 'Finanzas', path: '/cpes/finanzas', icon: TrendingUp },
  { label: 'PROCESOS SUNAT', path: '', icon: FileCheck, isSectionTitle: true },
  { label: 'No Enviados Sunat', path: '/cpes/no-enviados-sunat', icon: XCircle },
  { label: 'Resumenes Sunat', path: '/cpes/resumenes-sunat', icon: FileCheck },
  { label: 'Anulados Sunat', path: '/cpes/anulados-sunat', icon: AlertCircle },
  { label: 'CONFIGURACION', path: '', icon: Settings, isSectionTitle: true },
  { label: 'Configuracion Empresa', path: '/configuracion/empresa', icon: Settings },
];

const navItems: NavItem[] = [
  { label: 'Mantenimiento', icon: Settings, path: '/mantenimiento', hasDropdown: true, dropdownItems: mantenimientoItems },
  { label: 'Compras', icon: ShoppingCart, path: '/compras', hasDropdown: true, dropdownItems: comprasItems },
  { label: 'Inventario', icon: Package, path: '/inventario', hasDropdown: true, dropdownItems: inventarioItems },
  { label: "CPE's", icon: FileText, path: '/cpes', hasDropdown: true, dropdownItems: cpeItems },
  { label: 'Archivo De Caja', icon: Archive, path: '/archivo-caja', hasDropdown: true },
  { label: 'Reportes', icon: BarChart3, path: '/reportes', hasDropdown: true },
];

const dashboardTabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Dashboard Caja', path: '/dashboard-caja' },
];

export function NubofactHeader() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('/');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="bg-[hsl(var(--nubofact-header))] text-white">
      {/* Top Bar - Altura ajustada para logo más grande */}
      <div className="flex items-center justify-between px-4 h-16">
        {/* Logo y Navigation Menu */}
        <div className="flex items-center gap-8">
          {/* Logo Nubefact - SVG inline, pegado a la izquierda */}
          <Link to="/" className="cursor-pointer" onClick={() => setActiveTab('/')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 170 32"
              height="40"
              aria-label="Nubefact Logo"
              style={{ display: 'block' }}
            >
              <text
                x="0"
                y="24"
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                fontWeight="800"
                fontSize="32"
                style={{ fill: 'rgb(var(--nubofact-logo-text))', transition: 'fill 0.3s ease' }}
              >
                Nubofact
              </text>

              <circle
                cx="161"
                cy="18"
                r="6"
                style={{ fill: 'rgb(var(--nubofact-logo-dot))' }}
              />
            </svg>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isOpen = openDropdown === item.path;

              return (
                <div
                  key={item.path}
                  className="relative"
                  onMouseEnter={() => item.hasDropdown && setOpenDropdown(item.path)}
                  onMouseLeave={() => item.hasDropdown && setOpenDropdown(null)}
                >
                  {item.hasDropdown ? (
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1 px-3 h-9 rounded text-sm transition-colors',
                        'hover:bg-white/10',
                        isOpen && 'bg-white/20'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      className={cn(
                        'flex items-center gap-1 px-3 h-9 rounded text-sm transition-colors',
                        'hover:bg-white/10',
                        location.pathname === item.path && 'bg-white/20'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.hasDropdown && <ChevronDown className="h-3.5 w-3.5" />}
                    </Link>
                  )}

                  {/* Dropdown Menu */}
                  {item.hasDropdown && item.dropdownItems && isOpen && (
                    <div className="absolute top-full left-0 w-72 bg-card border border-border rounded-md shadow-lg z-50 pt-1">
                      {item.dropdownItems.map((dropdownItem, idx) => {
                        const DropdownIcon = dropdownItem.icon;
                        
                        // Si es un título de sección
                        if (dropdownItem.isSectionTitle) {
                          return (
                            <div
                              key={`section-${idx}`}
                              className={cn(
                                "px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider",
                                idx > 0 && "border-t border-border mt-1 pt-3"
                              )}
                            >
                              {dropdownItem.label}
                            </div>
                          );
                        }
                        
                        // Item normal
                        return (
                          <Link
                            key={dropdownItem.path}
                            to={dropdownItem.path}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <DropdownIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{dropdownItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            <User className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[hsl(var(--nubofact-accent))] text-xs">
              Administrador
            </span>
            <span className="text-xs">PRODUCCION</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar - Altura reducida */}
      <div className="bg-[hsl(var(--nubofact-header-dark))] h-8 flex items-center">
        {dashboardTabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={cn(
              'px-6 py-2 text-sm transition-colors h-full flex items-center text-white',
              activeTab === tab.path
                ? 'hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground'
                : 'hover:bg-white/10'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
