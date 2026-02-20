import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const logoUrl = '/nubofact-logo.png';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="absolute inset-0 bg-linear-to-b from-muted/30 via-background to-background pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
          {/* Logo en caja, tamaño grande */}
          <div className="w-full max-w-105 h-40 flex items-center justify-center rounded-xl border bg-card overflow-hidden shadow-sm">
            <img
              src={logoUrl}
              alt="Nubofact - Facturación Electrónica"
              className="w-full h-full object-contain object-center"
              style={{
                imageRendering: 'auto',
                margin: '-30% -10%',
                transform: 'scale(1.6)'
              }}
              fetchPriority="high"
            />
          </div>

          <p className="text-muted-foreground text-sm max-w-sm">
            Gestiona tus comprobantes electrónicos, clientes y empresas desde un solo lugar.
          </p>

          <Button
            size="lg"
            className="gap-2 min-w-50"
            onClick={() => navigate('/app')}
          >
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground relative z-10">
        Facturación electrónica SUNAT · Nubofact
      </footer>
    </div>
  );
}
