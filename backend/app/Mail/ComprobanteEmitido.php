<?php

namespace App\Mail;

use App\Models\Comprobante;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class ComprobanteEmitido extends Mailable
{
    use Queueable, SerializesModels;

    public Comprobante $comprobante;

    /**
     * Create a new message instance.
     */
    public function __construct(Comprobante $comprobante)
    {
        $this->comprobante = $comprobante;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $tipoDoc = $this->comprobante->tipo_doc === '01' ? 'Factura' : 'Boleta';

        return new Envelope(
            subject: "{$tipoDoc} Electrónica {$this->comprobante->numero_completo}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.comprobante-emitido',
            with: [
                'comprobante' => $this->comprobante,
                'tipoDoc' => $this->comprobante->tipo_doc === '01' ? 'Factura' : 'Boleta',
                'moneda' => $this->comprobante->codigo_tipo_moneda === 'PEN' ? 'S/' : 'USD',
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        // Adjuntar PDF si está disponible
        if ($this->comprobante->nubefact_pdf_url) {
            try {
                $pdfContent = @file_get_contents($this->comprobante->nubefact_pdf_url);

                if ($pdfContent) {
                    $attachments[] = Attachment::fromData(fn () => $pdfContent, $this->comprobante->numero_completo . '.pdf')
                        ->withMime('application/pdf');
                }
            } catch (\Exception $e) {
                // Si falla la descarga del PDF, continuar sin adjunto
                \Log::warning("No se pudo descargar PDF para email: " . $e->getMessage());
            }
        }

        // Adjuntar XML si está disponible
        if ($this->comprobante->nubefact_xml_url) {
            try {
                $xmlContent = @file_get_contents($this->comprobante->nubefact_xml_url);

                if ($xmlContent) {
                    $attachments[] = Attachment::fromData(fn () => $xmlContent, $this->comprobante->numero_completo . '.xml')
                        ->withMime('application/xml');
                }
            } catch (\Exception $e) {
                \Log::warning("No se pudo descargar XML para email: " . $e->getMessage());
            }
        }

        return $attachments;
    }
}
