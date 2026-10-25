import { AlertTriangle, ArrowLeft, CalendarPlus, ChefHat, Clock, Flame, Minus, Plus, Repeat, ShoppingCart, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AddToPlanDialog } from '@/components/AddToPlanDialog'
import { AllergyDisclaimer, ErrorState } from '@/components/common'
import { OrderDialog } from '@/components/OrderDialog'
import { RecipeArt } from '@/components/RecipeArt'
import { MatchBadge, SaveButton } from '@/components/RecipeCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecipe } from '@/hooks/recipes'
import { formatMinutes, formatQty, scaleQty } from '@/lib/format'
import type { RecipeIngredient } from '@/types/api'

function IngredientGroup({ title, items, from, to, tone }: { title: string; items: RecipeIngredient[]; from: number; to: number; tone: 'ok' | 'warn' | 'muted' }) {
  if (!items.length) return null
  const dot = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-muted-foreground/40'
  return (
    <div>
      <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({items.length})
      </h3>
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((i) => (
          <li key={i.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="flex items-center gap-2.5 capitalize">
              <span className={`size-2 rounded-full ${dot}`} aria-hidden />
              {i.name}
            </span>
            <span className="text-sm text-muted-foreground">{formatQty(scaleQty(i.quantity, from, to), i.unit) || 'to taste'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RecipeDetail() {
  const { id } = useParams()
  const recipe = useRecipe(Number(id) || undefined)
  const [servings, setServings] = useState(2)
  const [planOpen, setPlanOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  useEffect(() => {
    if (recipe.data) setServings(recipe.data.servings)
  }, [recipe.data])

  if (recipe.isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading recipe">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (recipe.isError) return <ErrorState error={recipe.error} title="Couldn't load this recipe" onRetry={() => recipe.refetch()} />

  const r = recipe.data
  const have = r.ingredients.filter((i) => i.status === 'available')
  const missing = r.ingredients.filter((i) => i.status === 'missing')
  const optional = r.ingredients.filter((i) => i.status === 'optional')

  return (
    <article>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/app/recipes">
          <ArrowLeft /> Recipes
        </Link>
      </Button>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-(--shadow-card)">
        <RecipeArt title={r.title} size="lg" />
        <div className="p-6 sm:p-8">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <MatchBadge recipe={r} />
            {r.cuisine && <Badge variant="outline">{r.cuisine}</Badge>}
            {r.diet_tags.map((t) => (
              <Badge key={t} variant="sage" className="capitalize">
                {t}
              </Badge>
            ))}
            {r.source === 'mock' && <Badge variant="warn">Sample recipe (mock mode)</Badge>}
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{r.title}</h1>
          <p className="mt-2 max-w-3xl text-lg text-muted-foreground">{r.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Timer, label: 'Prep', value: formatMinutes(r.prep_minutes) },
              { icon: Flame, label: 'Cook', value: formatMinutes(r.cook_minutes) },
              { icon: Clock, label: 'Total', value: formatMinutes(r.total_minutes) },
              { icon: ChefHat, label: 'Difficulty', value: r.difficulty },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-muted/70 px-4 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <m.icon className="size-3.5" aria-hidden /> {m.label}
                </dt>
                <dd className="mt-0.5 font-semibold capitalize">{m.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <SaveButton recipe={r} size="default" />
            <Button variant="outline" onClick={() => setPlanOpen(true)}>
              <CalendarPlus /> Add to meal plan
            </Button>
            {missing.length > 0 && (
              <Button onClick={() => setOrderOpen(true)}>
                <ShoppingCart /> Order {missing.length} missing
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section aria-labelledby="ing-h" className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ing-h" className="text-2xl font-semibold">
              Ingredients
            </h2>
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1" role="group" aria-label="Servings">
              <Button variant="ghost" size="icon-sm" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">
                <Minus />
              </Button>
              <span className="min-w-20 text-center text-sm font-medium" aria-live="polite">
                {servings} serving{servings === 1 ? '' : 's'}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="More servings">
                <Plus />
              </Button>
            </div>
          </div>
          {servings !== r.servings && <p className="text-xs text-muted-foreground">Quantities scaled from {r.servings} servings. Cooking times may change.</p>}
          <IngredientGroup title="You have" items={have} from={r.servings} to={servings} tone="ok" />
          <IngredientGroup title="Need to buy" items={missing} from={r.servings} to={servings} tone="warn" />
          <IngredientGroup title="Optional & pantry staples" items={optional} from={r.servings} to={servings} tone="muted" />
          {r.substitutions.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Repeat className="size-4" aria-hidden /> Substitutions
              </h3>
              <ul className="space-y-1.5 text-sm">
                {r.substitutions.map((s) => (
                  <li key={s.ingredient + s.substitute} className="rounded-lg bg-sage-soft px-3 py-2">
                    <span className="font-medium capitalize">{s.ingredient}</span> → {s.substitute}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="steps-h" className="space-y-6">
          <h2 id="steps-h" className="text-2xl font-semibold">
            Method
          </h2>
          <ol className="space-y-4">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{i + 1}</span>
                <p className="pt-1 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
          {r.warnings.length > 0 && (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertTitle>Good to know</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {r.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {r.nutrition_note && (
            <p className="rounded-xl border bg-card p-4 text-sm">
              <span className="font-medium">Nutrition (rough, AI-estimated):</span> {r.nutrition_note}
            </p>
          )}
          <AllergyDisclaimer />
        </section>
      </div>
      {planOpen && <AddToPlanDialog recipe={r} open={planOpen} onOpenChange={setPlanOpen} />}
      {orderOpen && (
        <OrderDialog
          open={orderOpen}
          onOpenChange={setOrderOpen}
          items={missing.map((i) => ({ key: i.name, name: i.name, quantity: scaleQty(i.quantity, r.servings, servings), unit: i.unit }))}
        />
      )}
    </article>
  )
}
