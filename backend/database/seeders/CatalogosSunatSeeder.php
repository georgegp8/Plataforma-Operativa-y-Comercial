<?php

namespace Database\Seeders;

use App\Models\CatalogoSunat;
use Illuminate\Database\Seeder;

class CatalogosSunatSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Catálogo 01: Tipo de Documento
        $this->catalogoTipoDocumento();

        // Catálogo 02: Tipo de Moneda
        $this->catalogoTipoMoneda();

        // Catálogo 03: Tipo de Unidad de Medida
        $this->catalogoUnidadMedida();

        // Catálogo 05: Tipo de Tributo
        $this->catalogoTipoTributo();

        // Catálogo 06: Tipo de Documento de Identidad
        $this->catalogoTipoDocumentoIdentidad();

        // Catálogo 07: Tipo de Afectación del IGV
        $this->catalogoTipoAfectacionIGV();

        // Catálogo 09: Tipo de Nota de Crédito
        $this->catalogoTipoNotaCredito();

        // Catálogo 10: Tipo de Nota de Débito
        $this->catalogoTipoNotaDebito();

        // Catálogo 51: Tipo de Operación
        $this->catalogoTipoOperacion();

        // Catálogo 53: Tipo de Descuento
        $this->catalogoTipoDescuento();
    }

    private function catalogoTipoDocumento()
    {
        $catalogos = [
            ['codigo' => '01', 'descripcion' => 'Factura'],
            ['codigo' => '03', 'descripcion' => 'Boleta de Venta'],
            ['codigo' => '07', 'descripcion' => 'Nota de Crédito'],
            ['codigo' => '08', 'descripcion' => 'Nota de Débito'],
            ['codigo' => '09', 'descripcion' => 'Guía de Remisión Remitente'],
            ['codigo' => '12', 'descripcion' => 'Ticket de Máquina Registradora'],
            ['codigo' => '13', 'descripcion' => 'Documento emitido por bancos'],
            ['codigo' => '20', 'descripcion' => 'Comprobante de Retención'],
            ['codigo' => '31', 'descripcion' => 'Guía de Remisión Transportista'],
            ['codigo' => '40', 'descripcion' => 'Comprobante de Percepción'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '01', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoMoneda()
    {
        $catalogos = [
            ['codigo' => 'PEN', 'descripcion' => 'Sol'],
            ['codigo' => 'USD', 'descripcion' => 'Dólar estadounidense'],
            ['codigo' => 'EUR', 'descripcion' => 'Euro'],
            ['codigo' => 'GBP', 'descripcion' => 'Libra Esterlina'],
            ['codigo' => 'JPY', 'descripcion' => 'Yen'],
            ['codigo' => 'CAD', 'descripcion' => 'Dólar Canadiense'],
            ['codigo' => 'CHF', 'descripcion' => 'Franco Suizo'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '02', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoUnidadMedida()
    {
        $catalogos = [
            ['codigo' => 'NIU', 'descripcion' => 'Unidad (Bienes)'],
            ['codigo' => 'ZZ', 'descripcion' => 'Unidad (Servicios)'],
            ['codigo' => 'KGM', 'descripcion' => 'Kilogramo'],
            ['codigo' => 'GRM', 'descripcion' => 'Gramo'],
            ['codigo' => 'MTR', 'descripcion' => 'Metro'],
            ['codigo' => 'MTK', 'descripcion' => 'Metro cuadrado'],
            ['codigo' => 'MTQ', 'descripcion' => 'Metro cúbico'],
            ['codigo' => 'LTR', 'descripcion' => 'Litro'],
            ['codigo' => 'MLT', 'descripcion' => 'Mililitro'],
            ['codigo' => 'TNE', 'descripcion' => 'Tonelada'],
            ['codigo' => 'DZN', 'descripcion' => 'Docena'],
            ['codigo' => 'SET', 'descripcion' => 'Conjunto'],
            ['codigo' => 'DAY', 'descripcion' => 'Día'],
            ['codigo' => 'HUR', 'descripcion' => 'Hora'],
            ['codigo' => 'MIN', 'descripcion' => 'Minuto'],
            ['codigo' => 'BX', 'descripcion' => 'Caja'],
            ['codigo' => 'PK', 'descripcion' => 'Paquete'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '03', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoTributo()
    {
        $catalogos = [
            ['codigo' => '1000', 'descripcion' => 'IGV - Impuesto General a las Ventas'],
            ['codigo' => '1016', 'descripcion' => 'IVAP - Impuesto a la Venta de Arroz Pilado'],
            ['codigo' => '2000', 'descripcion' => 'ISC - Impuesto Selectivo al Consumo'],
            ['codigo' => '7152', 'descripcion' => 'ICBPER - Impuesto a las Bolsas Plásticas'],
            ['codigo' => '9995', 'descripcion' => 'EXP - Exportación'],
            ['codigo' => '9996', 'descripcion' => 'GRA - Gratuito'],
            ['codigo' => '9997', 'descripcion' => 'EXO - Exonerado'],
            ['codigo' => '9998', 'descripcion' => 'INA - Inafecto'],
            ['codigo' => '9999', 'descripcion' => 'OTROS - Otros conceptos de pago'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '05', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoDocumentoIdentidad()
    {
        $catalogos = [
            ['codigo' => '0', 'descripcion' => 'DOC.TRIB.NO.DOM.SIN.RUC'],
            ['codigo' => '1', 'descripcion' => 'DNI - Documento Nacional de Identidad'],
            ['codigo' => '4', 'descripcion' => 'Carnet de Extranjería'],
            ['codigo' => '6', 'descripcion' => 'RUC - Registro Único de Contribuyentes'],
            ['codigo' => '7', 'descripcion' => 'Pasaporte'],
            ['codigo' => 'A', 'descripcion' => 'Cédula Diplomática de Identidad'],
            ['codigo' => 'B', 'descripcion' => 'DOC.IDENT.PAIS.RESIDENCIA-NO.D'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '06', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoAfectacionIGV()
    {
        $catalogos = [
            ['codigo' => '10', 'descripcion' => 'Gravado - Operación Onerosa'],
            ['codigo' => '11', 'descripcion' => 'Gravado – Retiro por premio'],
            ['codigo' => '12', 'descripcion' => 'Gravado – Retiro por donación'],
            ['codigo' => '13', 'descripcion' => 'Gravado – Retiro'],
            ['codigo' => '14', 'descripcion' => 'Gravado – Retiro por publicidad'],
            ['codigo' => '15', 'descripcion' => 'Gravado – Bonificaciones'],
            ['codigo' => '16', 'descripcion' => 'Gravado – Retiro por entrega a trabajadores'],
            ['codigo' => '17', 'descripcion' => 'Gravado – IVAP'],
            ['codigo' => '20', 'descripcion' => 'Exonerado - Operación Onerosa'],
            ['codigo' => '21', 'descripcion' => 'Exonerado – Transferencia Gratuita'],
            ['codigo' => '30', 'descripcion' => 'Inafecto - Operación Onerosa'],
            ['codigo' => '31', 'descripcion' => 'Inafecto – Retiro por Bonificación'],
            ['codigo' => '32', 'descripcion' => 'Inafecto – Retiro'],
            ['codigo' => '33', 'descripcion' => 'Inafecto – Retiro por Muestras Médicas'],
            ['codigo' => '34', 'descripcion' => 'Inafecto - Retiro por Convenio Colectivo'],
            ['codigo' => '35', 'descripcion' => 'Inafecto – Retiro por premio'],
            ['codigo' => '36', 'descripcion' => 'Inafecto - Retiro por publicidad'],
            ['codigo' => '40', 'descripcion' => 'Exportación'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '07', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoNotaCredito()
    {
        $catalogos = [
            ['codigo' => '01', 'descripcion' => 'Anulación de la operación'],
            ['codigo' => '02', 'descripcion' => 'Anulación por error en el RUC'],
            ['codigo' => '03', 'descripcion' => 'Corrección por error en la descripción'],
            ['codigo' => '04', 'descripcion' => 'Descuento global'],
            ['codigo' => '05', 'descripcion' => 'Descuento por ítem'],
            ['codigo' => '06', 'descripcion' => 'Devolución total'],
            ['codigo' => '07', 'descripcion' => 'Devolución por ítem'],
            ['codigo' => '08', 'descripcion' => 'Bonificación'],
            ['codigo' => '09', 'descripcion' => 'Disminución en el valor'],
            ['codigo' => '10', 'descripcion' => 'Otros Conceptos'],
            ['codigo' => '11', 'descripcion' => 'Ajustes de operaciones de exportación'],
            ['codigo' => '12', 'descripcion' => 'Ajustes afectos al IVAP'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '09', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoNotaDebito()
    {
        $catalogos = [
            ['codigo' => '01', 'descripcion' => 'Intereses por mora'],
            ['codigo' => '02', 'descripcion' => 'Aumento en el valor'],
            ['codigo' => '03', 'descripcion' => 'Penalidades/ otros conceptos'],
            ['codigo' => '10', 'descripcion' => 'Ajustes de operaciones de exportación'],
            ['codigo' => '11', 'descripcion' => 'Ajustes afectos al IVAP'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '10', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoOperacion()
    {
        $catalogos = [
            ['codigo' => '0101', 'descripcion' => 'Venta Interna'],
            ['codigo' => '0102', 'descripcion' => 'Exportación'],
            ['codigo' => '0103', 'descripcion' => 'No Domiciliados'],
            ['codigo' => '0104', 'descripcion' => 'Venta Interna - Anticipos'],
            ['codigo' => '0105', 'descripcion' => 'Venta Itinerante'],
            ['codigo' => '0106', 'descripcion' => 'Factura Guía'],
            ['codigo' => '0107', 'descripcion' => 'Venta Arroz Pilado'],
            ['codigo' => '0108', 'descripcion' => 'Factura - Comprobante de Percepción'],
            ['codigo' => '0110', 'descripcion' => 'Factura - Guía remitente'],
            ['codigo' => '0111', 'descripcion' => 'Factura - Guía transportista'],
            ['codigo' => '0112', 'descripcion' => 'Factura - Recibo de servicios públicos'],
            ['codigo' => '0200', 'descripcion' => 'Exportación de Bienes'],
            ['codigo' => '0201', 'descripcion' => 'Exportación de Servicios – Prestación servicios'],
            ['codigo' => '0202', 'descripcion' => 'Exportación de Servicios – Hospedaje No Domiciliado'],
            ['codigo' => '0203', 'descripcion' => 'Exportación de Servicios – Transporte de navieras'],
            ['codigo' => '0204', 'descripcion' => 'Exportación de Servicios – Servicios a naves y aeronaves'],
            ['codigo' => '0205', 'descripcion' => 'Exportación de Servicios – Servicios de transporte de carga'],
            ['codigo' => '0206', 'descripcion' => 'Exportación de Servicios – Paquete Turístico'],
            ['codigo' => '0207', 'descripcion' => 'Exportación de Servicios – Servicios Complementarios al Transporte de Carga'],
            ['codigo' => '0208', 'descripcion' => 'Exportación de Servicios – Suministros en naves y aeronaves'],
            ['codigo' => '0301', 'descripcion' => 'Operaciones con Carta de porte aéreo'],
            ['codigo' => '0302', 'descripcion' => 'Venta de combustible - FEBAN'],
            ['codigo' => '0303', 'descripcion' => 'Operaciones sujetas al SPOT'],
            ['codigo' => '0401', 'descripcion' => 'Venta Interna - Montos anticipados'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '51', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }

    private function catalogoTipoDescuento()
    {
        $catalogos = [
            ['codigo' => '00', 'descripcion' => 'Descuento global que no afecta la base imponible del IGV/ISC'],
            ['codigo' => '01', 'descripcion' => 'Descuento global que afecta la base imponible del IGV/ISC'],
            ['codigo' => '02', 'descripcion' => 'Descuento por ítem que no afecta la base imponible del IGV/ISC'],
            ['codigo' => '03', 'descripcion' => 'Descuento por ítem que afecta la base imponible del IGV/ISC'],
        ];

        foreach ($catalogos as $item) {
            CatalogoSunat::updateOrCreate(
                ['catalogo' => '53', 'codigo' => $item['codigo']],
                ['descripcion' => $item['descripcion'], 'activo' => true]
            );
        }
    }
}
