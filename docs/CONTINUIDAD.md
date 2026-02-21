# Continuidad de Desarrollo

## 1. Entorno de Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git
cd Nubofact-Web-y-Facturador

# Levantar infraestructura
docker-compose up -d

# Backend
cd backend
composer install
cp .env.example .env   # Configurar con credenciales locales
php artisan key:generate
php artisan migrate
php artisan db:seed --class=CatalogosSunatSeeder
php artisan storage:link
php artisan serve

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

Editar `backend/.env` con las variables descritas en [DESPLIEGUE.md](DESPLIEGUE.md#b-despliegue-local-desarrollo).

---

## 2. Patrón del Proyecto

### Backend — Laravel 11

El proyecto sigue el patrón **Controller → Service → Model** con repositorio implícito en Eloquent.

**Convenciones:**
- Controllers en `app/Http/Controllers/Api/` — solo validan request y llaman servicios
- Lógica de negocio en `app/Services/` — sin acceso directo HTTP
- Models en `app/Models/` — Eloquent, fillable, casts, relaciones
- Rutas en `routes/api.php` — grupos con middleware Sanctum y roles
- Autenticación: Laravel Sanctum (tokens en tabla `personal_access_tokens`)

**Crear un endpoint nuevo:**

```bash
# 1. Crear migration si hace falta
php artisan make:migration create_mi_tabla_table

# 2. Crear modelo
php artisan make:model MiModelo -m  # -m = con migration

# 3. Crear controlador
php artisan make:controller Api/MiModeloController --api

# 4. Agregar ruta en routes/api.php
Route::apiResource('mis-modelos', MiModeloController::class);
# o dentro del grupo v1:
Route::apiResource('mis-modelos', MiModeloController::class);
```

**Ejemplo — Controlador típico:**
```php
// app/Http/Controllers/Api/MiModeloController.php
public function index(Request $request): JsonResponse
{
    $empresaId = $request->user()->empresa_id ?? 1;
    $query = MiModelo::where('empresa_id', $empresaId);
    // ... filtros, paginate
    return response()->json(['data' => $query->get(), 'success' => true]);
}

public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'nombre' => 'required|string|max:255',
        'empresa_id' => 'required|integer|exists:empresas,id',
    ]);
    $modelo = MiModelo::create($validated);
    return response()->json(['data' => $modelo, 'success' => true], 201);
}
```

### Frontend — React + TypeScript

**Convenciones:**
- Páginas en `src/pages/` — cada ruta es una página
- Componentes reutilizables en `src/components/`
- Llamadas API centralizadas en `src/lib/api.ts`
- Estado global con Zustand en `src/stores/`
- Formularios con react-hook-form + zod
- UI con shadcn/ui (basado en Radix)
- Notificaciones con sonner (toast)

**Agregar una página nueva:**

```tsx
// 1. Crear src/pages/MiPagina.tsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function MiPagina() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const res = await api.miRecurso.listar();
      setDatos(res.data);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDatos(); }, []);

  return <div>...</div>;
}

// 2. Agregar en src/App.tsx (o router)
import MiPagina from './pages/MiPagina';
// <Route path="/mi-pagina" element={<MiPagina />} />

// 3. Agregar al api.ts
export const api = {
  // ... existentes
  miRecurso: {
    listar: (params?: object) => apiClient.get('/v1/mis-modelos', { params }),
    crear: (data: object) => apiClient.post('/v1/mis-modelos', data),
    actualizar: (id: number, data: object) => apiClient.put(`/v1/mis-modelos/${id}`, data),
    eliminar: (id: number) => apiClient.delete(`/v1/mis-modelos/${id}`),
  },
};
```

---

## 3. Estructura de Módulos — Dónde Vive Cada Cosa

### Emisión de CPE (Comprobantes)

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/BoletasFacturas.tsx` | Formulario principal de emisión |
| `frontend/src/components/ClienteCard.tsx` | Sección de datos del cliente |
| `frontend/src/components/ItemsSection.tsx` | Lista de ítems en el formulario |
| `frontend/src/components/ItemModal.tsx` | Modal para editar un ítem |
| `backend/app/Http/Controllers/Api/NubefactController.php` | Endpoint de emisión |
| `backend/app/Services/NubefactClient.php` | HTTP call a NubeFact API |
| `backend/app/Services/NubefactMapper.php` | Transforma datos → JSON NubeFact |
| `backend/app/Models/Comprobante.php` | Modelo CPE |
| `backend/app/Models/ComprobanteItem.php` | Líneas del CPE |
| `backend/app/Mail/ComprobanteEmitido.php` | Email automático al emitir |

### Guías de Remisión (GRE)

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/GuiasRemision.tsx` | CRUD + emisión GRE |
| `backend/app/Http/Controllers/Api/NubefactController.php` | `emitirGuia()` |
| `backend/app/Http/Controllers/Api/GuiaRemisionController.php` | CRUD local |
| `backend/app/Models/GuiaRemision.php` | Modelo GRE |
| `backend/app/Services/NubefactSyncService.php` | `sincronizarGuia()` |

### Dashboard

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Dashboard.tsx` | Vista principal |
| `frontend/src/components/dashboard/` | Todos los paneles y tablas |
| `backend/app/Http/Controllers/Api/DashboardController.php` | Todos los endpoints `/v1/dashboard/*` |

### Inventario

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/IngresoSalidaProductos.tsx` | Movimientos |
| `frontend/src/pages/GestionProductos.tsx` | Catálogo |
| `backend/app/Http/Controllers/Api/MovimientoInventarioController.php` | CRUD movimientos |
| `backend/app/Http/Controllers/Api/ProductoController.php` | CRUD productos |
| `backend/app/Models/MovimientoInventario.php` | Enum: INGRESO, SALIDA, DEVOLUCION |

### Sincronización NubeFact

| Archivo | Rol |
|---------|-----|
| `backend/app/Services/NubefactSyncService.php` | Core: `sincronizarComprobante()`, `sincronizarRango()` |
| `backend/app/Http/Controllers/Api/NubefactSyncController.php` | Endpoints `/api/nubefact-sync/*` |
| `backend/app/Console/Commands/NubefactSyncCommand.php` | `php artisan nubefact:sync` |

---

## 4. Cómo Agregar una Nueva Funcionalidad

### Nuevo tipo de comprobante (ej: Retención)

1. Agregar constante en `frontend/src/services/nubefact.ts`
2. Agregar mapper en `NubefactMapper::mapRetencionToNubefact()`
3. Agregar método en `NubefactClient::emitirRetencion()`
4. Agregar endpoint en `NubefactController`
5. Crear migration si necesita tabla propia
6. Crear página en frontend

### Nuevo campo en Productos

1. Crear migration: `php artisan make:migration add_campo_to_productos_table`
2. Agregar en `Producto::$fillable`
3. Agregar en el formulario `frontend/src/pages/GestionProductos.tsx`
4. Agregar al tipo `Producto` en `frontend/src/lib/api.ts`

### Nuevo filtro en Dashboard

1. Agregar endpoint en `DashboardController` (`/v1/dashboard/nuevo-panel`)
2. Agregar ruta en `routes/api.php`
3. Agregar llamada en `frontend/src/lib/api.ts` dentro de `api.dashboard`
4. Crear componente en `frontend/src/components/dashboard/NuevoPanelComponent.tsx`
5. Importar y usar en `frontend/src/pages/Dashboard.tsx`

---

## 5. Base de Datos — Tablas Clave

### Tablas más importantes

| Tabla | Descripción | Relaciones clave |
|-------|-------------|-----------------|
| `empresas` | Empresa emisora con credenciales NubeFact | Padre de casi todo |
| `comprobantes` | CPE emitidos (19 campos NubeFact) | → `comprobante_items`, → `empresas`, → `entidades` |
| `comprobante_items` | Líneas de cada CPE | → `comprobantes` |
| `guia_remisions` | GRE completas | → `guia_remision_items`, → `vehiculos`, → `conductores` |
| `productos` | Catálogo con stock | → `categorias`, → `marcas`, → `empresas` |
| `movimientos_inventario` | Movimientos de stock | → `productos`, → `users` |
| `entidades` | Clientes y proveedores | → `empresas` |
| `series` | Control de numeración | → `empresas` |
| `users` | Usuarios (roles) | — |

### Migraciones

Ubicación: `backend/database/migrations/`

```bash
# Crear nueva migration
php artisan make:migration add_campo_to_tabla_table

# Ejecutar pendientes
php artisan migrate

# Rollback último batch
php artisan migrate:rollback

# Ver estado de migraciones
php artisan migrate:status
```

---

## 6. Variables de Entorno Importantes para Dev

```env
APP_DEBUG=true          # Muestra stack traces
LOG_LEVEL=debug         # Log verboso
NUBEFACT_MODE=demo      # Nunca cambiar a production en dev
MAIL_MAILER=log         # Log emails en lugar de enviarlos (útil en dev)
```

Para simular envío de emails sin SMTP real, cambiar `MAIL_MAILER=log` y los emails aparecerán en `storage/logs/laravel.log`.

---

## 7. Tests

```bash
cd backend

# Todos los tests
vendor/bin/phpunit

# Tests de NubeFact
vendor/bin/phpunit tests/Feature/NubefactIntegrationTest.php

# Test específico
vendor/bin/phpunit --filter test_mapear_factura_a_nubefact
```

Los tests de integración con NubeFact real están marcados como `@skip` por defecto para no gastar cuota de la API en CI.

---

## 8. Deuda Técnica y Pendientes

### Pendiente de implementar

| Feature | Prioridad | Nota |
|---------|-----------|------|
| Notas de Crédito/Débito (UI completa) | Alta | El backend existe, falta frontend en BoletasFacturas |
| **Archivo de Caja** | Alta | Módulo para control de caja diaria: apertura, cierre, movimientos de caja chica, arqueo. Requiere migration `cajas` + `movimientos_caja`, modelo, controller y página frontend `ArchivoCaja.tsx` |
| **Reportes** | Alta | Módulo de reportes gerenciales: ventas por período, inventario valorizado, top clientes, exportación Excel/PDF. Requiere endpoints en `ReportesController` y página frontend `Reportes.tsx` |
| Resúmenes Diarios SUNAT | Media | Página existe (ResumenesSunat.tsx) pero sin backend real |
| Retenciones y Percepciones | Media | Comentadas en FacturacionService, pendiente NubeFact |
| Tests E2E frontend | Media | Sin cobertura de pruebas en React |
| Paginación en todas las tablas | Media | Algunos endpoints retornan todos los registros sin paginar |
| Exportación GRE a Excel | Baja | Solo existe para comprobantes |
| Módulo de auditoría UI | Baja | Modelo Auditoria existe, sin vista frontend |

### Decisiones técnicas conocidas

- **MinIO local vs S3**: En desarrollo se usa MinIO Docker. En producción se puede usar MinIO propio o migrar a AWS S3 cambiando variables en `.env`.
- **Email síncrono**: Los emails se envían síncronos (`Mail::to()->send()`), no en cola. Si el SMTP falla no bloquea la emisión (try/catch). Para volúmenes altos, migrar a `Mail::to()->queue()` e implementar `QUEUE_CONNECTION=database`.
- **NubeFact modo demo**: Las credenciales en `.env.example` apuntan a `api.pse.pe` (demo). En producción cambiar a `api.nubefact.com`.
- **Correlativo concurrente**: `FacturacionService::obtenerCorrelativoSeguro()` usa bloqueo optimista para evitar duplicados. Si se usa concurrencia alta, migrar a secuencia PostgreSQL.

### Bugs conocidos

| Bug | Módulo | Reproducción | Estado |
|-----|--------|--------------|--------|
| Sync GRE falla con duplicate key | GuiasRemision | Sincronizar rango de GREs que ya existen en BD con serie diferente | Sin fix |
| Stock no se descuenta automáticamente al emitir CPE | Inventario | Emitir CPE → stock_actual no cambia en productos | Sin implementar (manual vía movimientos) |
| `loadingNumero` error en GuiasRemision | GuiasRemision.tsx L97 | Variable declarada pero no inicializada en algún path | Sin confirmar |

---

## 9. Convenciones de Commits

```
feat:      Nueva funcionalidad
fix:       Corrección de bug
docs:      Documentación
refactor:  Refactorización sin cambio de comportamiento
test:      Tests
chore:     Tareas de build, configs, deps
```

Ejemplo: `feat: agregar exportación Excel en GuiasRemision`

---

## 10. Referencia Rápida — Comandos Artisan

```bash
# Desarrollo
php artisan serve                    # Iniciar servidor de desarrollo
php artisan migrate                  # Ejecutar migraciones pendientes
php artisan migrate:rollback         # Revertir último batch
php artisan db:seed --class=X        # Ejecutar seeder específico
php artisan route:list               # Listar todas las rutas
php artisan make:model X -mc         # Crear modelo + migration + controller

# Cache (producción)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
php artisan config:clear             # Limpiar caché

# NubeFact
php artisan nubefact:sync --pendientes
php artisan nubefact:sync --tipo=01 --serie=F010 --inicio=1 --fin=50

# Colas
php artisan queue:work               # Correr worker manual
php artisan queue:failed             # Ver jobs fallidos
php artisan queue:retry all          # Reintentar todos

# Logs
php artisan log:clear                # Limpiar logs (si el paquete está instalado)
```
