import { AlertTriangle, FlaskConical, RefreshCw, Refrigerator, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 rounded-lg font-heading text-xl font-semibold text-foreground', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Refrigerator className="size-[18px]" aria-hidden />
      </span>
      <span>
        Fridge<span className="text-primary">AI</span>
      </span>
    </Link>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center', className)}>
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTriangle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function CardGridSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="h-32 rounded-none" />
          <div className="space-y-2 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function MockBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warn" className={className} title="Development mock mode: sample data, not real AI output">
      <FlaskConical aria-hidden /> Sample data (mock mode)
    </Badge>
  )
}

export function Stat({ icon: Icon, label, value, to }: { icon: LucideIcon; label: string; value: ReactNode; to?: string }) {
  const body = (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-(--shadow-card) transition-colors hover:border-primary/30">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sage-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        <div className="truncate text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="rounded-xl">
      {body}
    </Link>
  ) : (
    body
  )
}

export function AllergyDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Recipes are AI-generated and filtered against your diet, allergy and exclusion settings, but they are not
      guaranteed to be allergen-free. Always check ingredient labels.
    </p>
  )
}
