<?php

namespace Tests\Feature;

use App\Services\NubefactClient;
use Tests\TestCase;

/**
 * @method void markTestSkipped(string $message = '')
 * @method void expectNotToPerformAssertions()
 * @method void assertIsArray($actual, string $message = '')
 * @method void assertArrayHasKey($key, $array, string $message = '')
 * @method void assertEquals($expected, $actual, string $message = '')
 */
class NubefactIntegrationTest extends TestCase
{
    /**
     * Test: Validar credenciales de NubeFact
     */
    public function test_credenciales_nubefact_validas(): void
    {
        $this->markTestSkipped('Test manual - ejecutar solo cuando se necesite validar credenciales');

        $client = app(NubefactClient::class);

        // Esto debería no lanzar excepción si las credenciales son válidas
        $this->expectNotToPerformAssertions();
        $client->validarCredenciales();
    }

    /**
     * Test: Consultar un comprobante de prueba
     */
    public function test_consultar_comprobante_prueba(): void
    {
        $this->markTestSkipped('Test manual - requiere comprobante real en NubeFact');

        $client = app(NubefactClient::class);

        // Ajustar con un comprobante real de prueba
        $tipo = 2; // Boleta
        $serie = 'B001';
        $numero = 1;

        $response = $client->consultarComprobante($tipo, $serie, $numero);

        $this->assertIsArray($response);
        $this->assertArrayHasKey('enlace', $response);
    }

    /**
     * Test: Mapear tipos de comprobante
     */
    public function test_mapear_tipo_comprobante(): void
    {
        // Desde nombres
        $this->assertEquals(1, NubefactClient::mapearTipoComprobante('FACTURA'));
        $this->assertEquals(2, NubefactClient::mapearTipoComprobante('BOLETA'));
        $this->assertEquals(3, NubefactClient::mapearTipoComprobante('NC'));
        $this->assertEquals(4, NubefactClient::mapearTipoComprobante('ND'));
        $this->assertEquals(7, NubefactClient::mapearTipoComprobante('GRE_REMITENTE'));
        $this->assertEquals(8, NubefactClient::mapearTipoComprobante('GRE_TRANSPORTISTA'));

        // Desde códigos SUNAT
        $this->assertEquals(1, NubefactClient::mapearTipoComprobante('01'));
        $this->assertEquals(2, NubefactClient::mapearTipoComprobante('03'));
        $this->assertEquals(3, NubefactClient::mapearTipoComprobante('07'));
        $this->assertEquals(4, NubefactClient::mapearTipoComprobante('08'));
    }

    /**
     * Test: Mapear tipos de documento
     */
    public function test_mapear_tipo_documento(): void
    {
        $this->assertEquals('6', NubefactClient::mapearTipoDocumento('RUC'));
        $this->assertEquals('1', NubefactClient::mapearTipoDocumento('DNI'));
        $this->assertEquals('4', NubefactClient::mapearTipoDocumento('CE'));
        $this->assertEquals('7', NubefactClient::mapearTipoDocumento('PASAPORTE'));
        $this->assertEquals('-', NubefactClient::mapearTipoDocumento('VARIOS'));
    }
}
