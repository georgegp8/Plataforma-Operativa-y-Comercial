<?php

use App\Http\Controllers\Api\AlertaController;
use App\Http\Controllers\Api\AtributoController;
use App\Http\Controllers\Api\BancoController;
use App\Http\Controllers\Api\CatalogoSunatController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\ConductorController;
use App\Http\Controllers\Api\CuentaBancariaController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\DocumentoDigitalizadoController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\EntidadController;
use App\Http\Controllers\Api\FacturacionController;
use App\Http\Controllers\Api\MarcaController;
use App\Http\Controllers\Api\NubefactController;
use App\Http\Controllers\Api\NubefactSyncController;
use App\Http\Controllers\Api\OportunidadController;
use App\Http\Controllers\Api\PagoController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\SerieController;
use App\Http\Controllers\Api\TransaccionController;
use App\Http\Controllers\Api\UnidadMedidaController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\VendedorController;
use Illuminate\Support\Facades\Route;

/* |-------------------------------------------------------------------------- | API Routes |-------------------------------------------------------------------------- */

// Rutas de facturación electrónica
Route::prefix('facturacion')->group(function () {
    // Listar y buscar comprobantes
    Route::get('/comprobantes', [FacturacionController::class , 'index']);
    Route::get('/comprobantes/export', [FacturacionController::class , 'exportarExcel']);
    Route::get('/items/export', [FacturacionController::class , 'exportarItems']);
    Route::get('/comprobantes/{id}', [FacturacionController::class , 'show']);

    // NOTA: La emisión de comprobantes se realiza mediante /nubefact/comprobantes
    // Las siguientes rutas están deshabilitadas porque FacturacionService no está implementado
    // Route::post('/emitir/factura', [FacturacionController::class , 'emitirFactura']);
    // Route::post('/emitir/boleta', [FacturacionController::class , 'emitirBoleta']);
    // Route::post('/emitir/nota-credito', [FacturacionController::class , 'emitirNotaCredito']);
    // Route::post('/emitir/nota-debito', [FacturacionController::class , 'emitirNotaDebito']);
    // Route::post('/emitir/resumen', [FacturacionController::class , 'emitirResumen']);
    // Route::post('/emitir/comunicacion-baja', [FacturacionController::class , 'emitirComunicacionBaja']);
    // Route::post('/emitir/retencion', [FacturacionController::class , 'emitirRetencion']);
    // Route::post('/emitir/percepcion', [FacturacionController::class , 'emitirPercepcion']);

    // Consultas SUNAT
    Route::get('/consultar/{id}', [FacturacionController::class , 'consultarTicket']);
    Route::get('/descargar/xml/{id}', [FacturacionController::class , 'descargarXml']);
    Route::get('/descargar/cdr/{id}', [FacturacionController::class , 'descargarCdr']);
    Route::get('/descargar/pdf/{id}', [FacturacionController::class , 'descargarPdf']);
    Route::get('/descargar/html/{id}', [FacturacionController::class , 'descargarHtml']); // NUEVO
    Route::post('/enviar-email/{id}', [FacturacionController::class , 'enviarEmail']);

    // Estadísticas y reportes
    Route::get('/estadisticas', [FacturacionController::class , 'estadisticas']);
    Route::get('/reporte/ventas', [FacturacionController::class , 'reporteVentas']);
});

// Rutas de emisión y sincronización con NubeFact
Route::prefix('nubefact')->middleware('api')->group(function () {
    // Comprobantes
    Route::post('/comprobantes', [NubefactController::class , 'emitirComprobante']);
    Route::get('/comprobantes/{tipo}/{serie}/{numero}', [NubefactController::class , 'consultarComprobante']);
    Route::delete('/comprobantes/{tipo}/{serie}/{numero}', [NubefactController::class , 'anularComprobante']);

    // Guías de remisión
    Route::post('/guias', [NubefactController::class , 'emitirGuia']);
    Route::get('/guias/{tipo}/{serie}/{numero}', [NubefactController::class , 'consultarGuia']);
});

// Rutas para sincronización directa con NubeFact API (sin archivos Excel)
Route::prefix('nubefact-sync')->middleware('api')->group(function () {
    // Verificar estado de conexión
    Route::get('/estado', [NubefactSyncController::class , 'verificarEstado']);

    // Estadísticas de sincronización
    Route::get('/estadisticas', [NubefactSyncController::class , 'estadisticas']);

    // Consultar comprobante directo (sin guardar)
    Route::get('/consultar/{tipo_doc}/{serie}/{numero}', [NubefactSyncController::class , 'consultarEnNubefact']);

    // Sincronizar comprobante específico
    Route::post('/comprobante', [NubefactSyncController::class , 'sincronizarComprobante']);

    // Sincronizar rango de comprobantes
    Route::post('/rango', [NubefactSyncController::class , 'sincronizarRango']);

    // Sincronizar pendientes
    Route::post('/pendientes', [NubefactSyncController::class , 'sincronizarPendientes']);
});

Route::prefix('v1')->group(function () {
    // Guías de Remisión (Módulo Interno)
    Route::get('guias-remision', [App\Http\Controllers\Api\GuiaRemisionController::class , 'index']);
    Route::post('guias-remision', [App\Http\Controllers\Api\GuiaRemisionController::class , 'store']);
    Route::get('guias-remision/{id}', [App\Http\Controllers\Api\GuiaRemisionController::class , 'show']);
    Route::put('guias-remision/{id}', [App\Http\Controllers\Api\GuiaRemisionController::class , 'update']);
    Route::delete('guias-remision/{id}', [App\Http\Controllers\Api\GuiaRemisionController::class , 'destroy']);

    // Rutas adicionales para futuras implementaciones
    // Empresas
    Route::get('empresas', [EmpresaController::class , 'index']);
    Route::post('empresas', [EmpresaController::class , 'store']);
    Route::get('empresas/{id}', [EmpresaController::class , 'show']);
    Route::put('empresas/{id}', [EmpresaController::class , 'update']);
    Route::delete('empresas/{id}', [EmpresaController::class , 'destroy']);
    Route::patch('empresas/{id}/toggle-activo', [EmpresaController::class , 'toggleActivo']);
    Route::patch('empresas/{id}/cambiar-modo', [EmpresaController::class , 'cambiarModo']);

    // Oportunidades
    Route::get('oportunidades', [OportunidadController::class , 'index']);
    Route::post('oportunidades', [OportunidadController::class , 'store']);
    Route::get('oportunidades/{id}', [OportunidadController::class , 'show']);
    Route::put('oportunidades/{id}', [OportunidadController::class , 'update']);
    Route::delete('oportunidades/{id}', [OportunidadController::class , 'destroy']);
    Route::patch('oportunidades/{id}/estado', [OportunidadController::class , 'cambiarEstado']);
    Route::get('oportunidades/estadisticas/general', [OportunidadController::class , 'estadisticas']);

    // Documentos
    Route::get('documentos', [DocumentoController::class , 'index']);
    Route::post('documentos', [DocumentoController::class , 'store']);
    Route::get('documentos/{id}', [DocumentoController::class , 'show']);
    Route::put('documentos/{id}', [DocumentoController::class , 'update']);
    Route::delete('documentos/{id}', [DocumentoController::class , 'destroy']);
    Route::get('documentos/{id}/descargar', [DocumentoController::class , 'descargar']);
    Route::get('documentos/{id}/url', [DocumentoController::class , 'getUrl']);
    Route::get('documentos/oportunidad/{oportunidadId}', [DocumentoController::class , 'porOportunidad']);

    // Pagos
    Route::get('pagos', [PagoController::class , 'index']);
    Route::post('pagos', [PagoController::class , 'store']);
    Route::get('pagos/{id}', [PagoController::class , 'show']);
    Route::put('pagos/{id}', [PagoController::class , 'update']);
    Route::delete('pagos/{id}', [PagoController::class , 'destroy']);
    Route::get('pagos/{id}/comprobante', [PagoController::class , 'descargarComprobante']);
    Route::get('pagos/oportunidad/{oportunidadId}', [PagoController::class , 'porOportunidad']);
    Route::get('pagos/estadisticas/general', [PagoController::class , 'estadisticas']);

    // Catálogos SUNAT
    Route::get('catalogos', [CatalogoSunatController::class , 'catalogos']);
    Route::get('catalogos/lista', [CatalogoSunatController::class , 'index']);
    Route::get('catalogos/{catalogo}', [CatalogoSunatController::class , 'show']);

    // Alertas
    Route::get('alertas', [AlertaController::class , 'index']);
    Route::patch('alertas/{id}/leida', [AlertaController::class , 'marcarLeida']);
    Route::post('alertas/marcar-todas-leidas', [AlertaController::class , 'marcarTodasLeidas']);
    Route::delete('alertas/{id}', [AlertaController::class , 'destroy']);
    Route::post('alertas/verificar-sla', [AlertaController::class , 'verificarSla']);
    Route::get('alertas/no-leidas', [AlertaController::class , 'noLeidas']);

    // Dashboard
    Route::get('dashboard', [DashboardController::class , 'index']);
    Route::get('dashboard/tv', [DashboardController::class , 'tv']);
    Route::get('dashboard/ventas-mes', [DashboardController::class , 'ventasPorMes']);
    Route::get('dashboard/stats', [DashboardController::class , 'getStats']);
    Route::get('dashboard/cpe-ranking', [DashboardController::class , 'getCPERanking']);
    Route::get('dashboard/productos-top', [DashboardController::class , 'getProductosTop']);
    Route::get('dashboard/clientes-top', [DashboardController::class , 'getClientesTop']);
    Route::get('dashboard/stock-minimo', [DashboardController::class , 'getStockMinimo']);
    Route::get('dashboard/monthly-comparison', [DashboardController::class , 'getMonthlyComparison']);

    // Entidades (clientes y proveedores)
    // Usar query params para filtrar: ?tipo=cliente o ?tipo=proveedor
    Route::get('entidades', [EntidadController::class , 'index']);
    Route::post('entidades', [EntidadController::class , 'store']);
    Route::get('entidades/{id}', [EntidadController::class , 'show']);
    Route::put('entidades/{id}', [EntidadController::class , 'update']);
    Route::delete('entidades/{id}', [EntidadController::class , 'destroy']);

    // Series de facturación
    Route::get('/series', [SerieController::class , 'index']);
    Route::post('/series', [SerieController::class , 'store']);
    Route::put('/series/{id}', [SerieController::class , 'update']);
    Route::delete('/series/{id}', [SerieController::class , 'destroy']);

    // Productos
    Route::get('productos', [ProductoController::class , 'index']);
    Route::post('productos', [ProductoController::class , 'store']);
    Route::get('productos/destacados', [ProductoController::class , 'destacados']);
    Route::get('productos/{id}', [ProductoController::class , 'show']);
    Route::put('productos/{id}', [ProductoController::class , 'update']);
    Route::delete('productos/{id}', [ProductoController::class , 'destroy']);
    Route::patch('productos/{id}/restaurar', [ProductoController::class , 'restore']);
    Route::patch('productos/{id}/toggle-destacado', [ProductoController::class , 'toggleDestacado']);
    Route::post('productos/importar', [ProductoController::class , 'importar']);

    // Vendedores
    Route::get('vendedores', [VendedorController::class , 'index']);
    Route::post('vendedores', [VendedorController::class , 'store']);
    Route::get('vendedores/{id}', [VendedorController::class , 'show']);
    Route::put('vendedores/{id}', [VendedorController::class , 'update']);
    Route::delete('vendedores/{id}', [VendedorController::class , 'destroy']);

    // Personal
    Route::get('personal', [PersonalController::class , 'index']);
    Route::post('personal', [PersonalController::class , 'store']);
    Route::get('personal/{id}', [PersonalController::class , 'show']);
    Route::put('personal/{id}', [PersonalController::class , 'update']);
    Route::delete('personal/{id}', [PersonalController::class , 'destroy']);

    // Cuentas Bancarias
    Route::get('cuentas-bancarias', [CuentaBancariaController::class , 'index']);
    Route::post('cuentas-bancarias', [CuentaBancariaController::class , 'store']);
    Route::get('cuentas-bancarias/{id}', [CuentaBancariaController::class , 'show']);
    Route::put('cuentas-bancarias/{id}', [CuentaBancariaController::class , 'update']);
    Route::delete('cuentas-bancarias/{id}', [CuentaBancariaController::class , 'destroy']);

    // Bancos
    Route::get('bancos', [BancoController::class , 'index']);
    Route::post('bancos', [BancoController::class , 'store']);
    Route::get('bancos/{id}', [BancoController::class , 'show']);
    Route::put('bancos/{id}', [BancoController::class , 'update']);
    Route::delete('bancos/{id}', [BancoController::class , 'destroy']);
    Route::post('bancos/{id}/upload-image', [BancoController::class , 'uploadImage']);

    // Categorías
    Route::get('categorias', [CategoriaController::class , 'index']);
    Route::post('categorias', [CategoriaController::class , 'store']);
    Route::get('categorias/{id}', [CategoriaController::class , 'show']);
    Route::put('categorias/{id}', [CategoriaController::class , 'update']);
    Route::delete('categorias/{id}', [CategoriaController::class , 'destroy']);

    // Marcas
    Route::get('marcas', [MarcaController::class , 'index']);
    Route::post('marcas', [MarcaController::class , 'store']);
    Route::get('marcas/{id}', [MarcaController::class , 'show']);
    Route::put('marcas/{id}', [MarcaController::class , 'update']);
    Route::delete('marcas/{id}', [MarcaController::class , 'destroy']);

    // Atributos
    Route::get('atributos', [AtributoController::class , 'index']);
    Route::post('atributos', [AtributoController::class , 'store']);
    Route::get('atributos/{id}', [AtributoController::class , 'show']);
    Route::put('atributos/{id}', [AtributoController::class , 'update']);
    Route::delete('atributos/{id}', [AtributoController::class , 'destroy']);

    // Unidades de Medida
    Route::get('unidades-medida', [UnidadMedidaController::class , 'index']);
    Route::post('unidades-medida', [UnidadMedidaController::class , 'store']);
    Route::get('unidades-medida/{id}', [UnidadMedidaController::class , 'show']);
    Route::put('unidades-medida/{id}', [UnidadMedidaController::class , 'update']);
    Route::delete('unidades-medida/{id}', [UnidadMedidaController::class , 'destroy']);

    // Transacciones
    Route::get('transacciones', [TransaccionController::class , 'index']);
    Route::post('transacciones', [TransaccionController::class , 'store']);
    Route::get('transacciones/{id}', [TransaccionController::class , 'show']);
    Route::put('transacciones/{id}', [TransaccionController::class , 'update']);
    Route::delete('transacciones/{id}', [TransaccionController::class , 'destroy']);

    // Vehículos
    Route::get('vehiculos', [VehiculoController::class , 'index']);
    Route::post('vehiculos', [VehiculoController::class , 'store']);
    Route::get('vehiculos/{id}', [VehiculoController::class , 'show']);
    Route::put('vehiculos/{id}', [VehiculoController::class , 'update']);
    Route::delete('vehiculos/{id}', [VehiculoController::class , 'destroy']);

    // Conductores
    Route::get('conductores', [ConductorController::class , 'index']);
    Route::post('conductores', [ConductorController::class , 'store']);
    Route::get('conductores/{id}', [ConductorController::class , 'show']);
    Route::put('conductores/{id}', [ConductorController::class , 'update']);
    Route::delete('conductores/{id}', [ConductorController::class , 'destroy']);

    // Compras
    Route::get('compras', [CompraController::class , 'index']);
    Route::post('compras', [CompraController::class , 'store']);
    Route::get('compras/{id}', [CompraController::class , 'show']);
    Route::put('compras/{id}', [CompraController::class , 'update']);
    Route::delete('compras/{id}', [CompraController::class , 'destroy']);

    // Documentos Digitalizados (OCR de facturas)
    Route::get('documentos-digitalizados', [DocumentoDigitalizadoController::class , 'index']);
    Route::post('documentos-digitalizados/upload', [DocumentoDigitalizadoController::class , 'upload']);
    Route::post('documentos-digitalizados/{id}/procesar-ocr', [DocumentoDigitalizadoController::class , 'procesarConOCRManual']);
    Route::get('documentos-digitalizados/{id}/descargar', [DocumentoDigitalizadoController::class , 'descargar']);
    Route::get('documentos-digitalizados/{id}', [DocumentoDigitalizadoController::class , 'show']);
    Route::put('documentos-digitalizados/{id}', [DocumentoDigitalizadoController::class , 'update']);
    Route::post('documentos-digitalizados/{id}/validar', [DocumentoDigitalizadoController::class , 'validar']);
    Route::post('documentos-digitalizados/{id}/convertir-compra', [DocumentoDigitalizadoController::class , 'convertirACompra']);
    Route::delete('documentos-digitalizados/{id}', [DocumentoDigitalizadoController::class , 'destroy']);
});
