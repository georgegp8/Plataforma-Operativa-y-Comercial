import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type MetricCardProps } from '@/types';
import { cn } from '@/lib/utils';

/**
 * MetricCard - Displays financial metrics with intentional design for invoice/ledger context
 * 
 * Design Principles:
 * - Typography: Always tabular-nums for number alignment (like accounting ledger)
 * - Signature: Document receipt strip (subtle gradient border-left)
 * - Craft: Subtle layering, no harsh shadows, borders-only depth
 * - Domain: Evokes professionalism of fiscal documents
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  details,
  className,
  variant = 'default',
  href,
}: MetricCardProps) {
  const isNavy = variant === 'navy';
  const isNubofact = variant === 'nubofact';

  if (isNubofact) {
    // Variant Nubofact: Diseño original de Nubofact con colores #0c5078
    const inner = (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-[10px]',
        'bg-[#0c5078] text-white',
        'transition-all duration-200',
        href && 'cursor-pointer hover:brightness-110',
      )}>
        <div className="shrink-0 bg-[#164a6b] rounded p-3">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="text-[12px] font-normal uppercase">
            {title}
          </p>
          <p className="text-[24px] font-bold tabular-nums tracking-tight whitespace-nowrap">
            {value}
          </p>
        </div>
      </div>
    );
    // className (con lg:col-span-*) debe ir en el elemento raíz del grid
    return href
      ? <Link to={href} className={cn('block', className)}>{inner}</Link>
      : <div className={className}>{inner}</div>;
  }

  if (isNavy) {
    // Variant Navy: Professional ledger-style with signature receipt strip
    return (
      <Card className={cn(
        'hover:shadow-lg transition-all duration-200 border',
        'bg-[hsl(var(--dashboard-dark))] text-[hsl(var(--dashboard-dark-foreground))]',
        'dark:border-none',
        // Signature Element: Document Receipt Strip (subtle gradient)
        'border-l-[3px] border-l-primary/60',
        'relative overflow-hidden',
        className
      )}>
        {/* Subtle receipt strip gradient */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.75 opacity-40"
          style={{
            background: 'linear-gradient(to bottom, hsl(142 76% 36%), hsl(221 83% 53%))',
          }}
          aria-hidden="true"
        />
        
        <CardContent className="p-4 sm:p-5 lg:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 mt-0.5">
              <Icon className="h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 opacity-80" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <CardTitle className="text-xs sm:text-sm font-medium opacity-70 leading-tight">
                {title}
              </CardTitle>
              {/* Financial data: tabular-nums for ledger-style alignment */}
              <div className="text-sm sm:text-base lg:text-lg font-bold leading-tight tabular-nums tracking-tight">
                {value}
              </div>
              {description && (
                <p className="text-xs opacity-60 mt-1 leading-tight line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variant Default: Clean layout for general metrics
  return (
    <Card className={cn(
      'hover:shadow-lg transition-shadow duration-200',
      'border-l-2 border-l-primary/30', // Subtle receipt strip for default too
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        {/* Financial data: tabular-nums for alignment */}
        <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {details && details.length > 0 && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {details.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span>{item.label}</span>
                <span className="tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

