import { AlertTriangle, ArrowLeft, CalendarPlus, ChefHat, Circle, CircleCheck, CircleDot, Clock, Minus, Plus, Repeat, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AddToPlanDialog } from '@/components/AddToPlanDialog'
import { AllergyDisclaimer, ErrorState } from '@/components/common'
import { OrderDialog } from '@/components/OrderDialog'
import { photoFor } from '@/components/RecipeArt'
import { MatchPill, SaveButton } from '@/components/RecipeCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecipe } from '@/hooks/recipes'
import { formatMinutes, formatQty, scaleQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RecipeIngredient } from '@/types/api'

const TONE = {
  ok: { label: 'text-ok', icon: CircleCheck, iconClass: 'fill-ok text-card', name: 'text-heading' },
  warn: { label: 'text-terracotta', icon: CircleDot, iconClass: 'text-terracotta/70', name: 'text-muted-foreground' },
  muted: { label: 'text-muted-foreground', icon: Circle, iconClass: 'text-muted-foreground/40', name: 'text-muted-foreground' },
}

function IngredientGroup({ title, items, from, to, tone }: { title: string; items: RecipeIngredient[]; from: number; to: number; tone: keyof typeof TONE }) {
  if (!items.length) return null
  const t = TONE[tone]
  return (
    <div>
      <h3 className={cn('mb-3 font-sans text-[0.72rem] font-bold uppercase tracking-[0.14em]', t.label)}>
        {title} ({items.length})
      </h3>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.name} className="flex items-center justify-between gap-3">
            <span className={cn('flex items-center gap-3 capitalize', t.name)}>
              <t.icon className={cn('size-5 shrink-0', t.iconClass)} aria-hidden />
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

  const photo = photoFor(r.title)
  const course = r.meal_types[0]

  return (
    <article>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/app/recipes">
          <ArrowLeft /> Back to recipes
        </Link>
      </Button>

      <header className="relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-sidebar p-6 text-white shadow-xl shadow-primary/10 sm:min-h-[26rem] sm:p-10">
        {photo ? (
          <img src={photo} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover" />
        ) : (
          <>
            <img src="/img/star-anise.webp" alt="" aria-hidden className="absolute -right-6 -top-6 -z-10 w-48 opacity-25" />
            <img src="/img/curry-leaf.webp" alt="" aria-hidden className="absolute bottom-6 right-24 -z-10 w-32 opacity-20" />
          </>
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/35 to-black/5" aria-hidden />
        <div className="flex flex-wrap gap-2">
          {course && <span className="rounded-md bg-terracotta px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider">{course}</span>}
          {r.cuisine && <span className="rounded-md bg-black/45 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider backdrop-blur">{r.cuisine}</span>}
          {r.diet_tags.map((t) => (
            <span key={t} className="rounded-md bg-white/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider backdrop-blur">
              {t.replace(/_/g, ' ')}
            </span>
          ))}
          {r.source === 'mock' && <Badge variant="warn">Sample recipe (mock mode)</Badge>}
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium leading-tight text-white sm:text-6xl">{r.title}</h1>
        <p className="mt-3 max-w-2xl text-white/80">{r.description}</p>
        <dl className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2 font-semibold">
          <div className="flex items-center gap-2">
            <Clock className="size-4" aria-hidden />
            <dt className="sr-only">Total time</dt>
            <dd>
              {formatMinutes(r.total_minutes)}
              <span className="font-normal text-white/65">
                {' '}
                ({formatMinutes(r.prep_minutes)} prep, {formatMinutes(r.cook_minutes)} cook)
              </span>
            </dd>
          </div>
          <div className="flex items-center gap-2 capitalize">
            <ChefHat className="size-4" aria-hidden />
            <dt className="sr-only">Difficulty</dt>
            <dd>{r.difficulty}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            <dt className="sr-only">Servings</dt>
            <dd>{servings} servings</dd>
          </div>
          <MatchPill recipe={r} />
        </dl>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-14">
        <section aria-labelledby="ing-h" className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ing-h" className="text-3xl font-medium">
              Ingredients
            </h2>
            <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm" role="group" aria-label="Servings">
              <Button variant="ghost" size="icon-sm" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">
                <Minus />
              </Button>
              <span className="min-w-8 text-center font-semibold text-heading" aria-live="polite">
                {servings}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="More servings">
                <Plus />
              </Button>
            </div>
          </div>
          {servings !== r.servings && <p className="text-xs text-muted-foreground">Quantities scaled from {r.servings} servings. Cooking times may change.</p>}
          <IngredientGroup title="You have" items={have} from={r.servings} to={servings} tone="ok" />
          <IngredientGroup title="Missing" items={missing} from={r.servings} to={servings} tone="warn" />
          <IngredientGroup title="Optional & pantry staples" items={optional} from={r.servings} to={servings} tone="muted" />
          {missing.length > 0 && (
            <Button variant="warm" size="lg" className="h-14 w-full rounded-2xl text-base" onClick={() => setOrderOpen(true)}>
              <ShoppingCart /> Order {missing.length} missing item{missing.length === 1 ? '' : 's'}
            </Button>
          )}
          {r.substitutions.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-sans text-[0.72rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Repeat className="size-4" aria-hidden /> Substitutions
              </h3>
              <ul className="space-y-2 text-sm">
                {r.substitutions.map((s) => (
                  <li key={s.ingredient + s.substitute} className="rounded-xl bg-sage-soft px-4 py-2.5">
                    <span className="font-semibold capitalize text-heading">{s.ingredient}</span> → {s.substitute}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="steps-h" className="space-y-8">
          <h2 id="steps-h" className="text-3xl font-medium">
            Instructions
          </h2>
          <ol className="space-y-7">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border bg-card font-semibold text-heading shadow-sm">{i + 1}</span>
                <p className="pt-2 leading-relaxed text-muted-foreground">{s}</p>
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
            <p className="rounded-2xl border bg-card p-5 text-sm">
              <span className="font-semibold text-heading">Nutrition (rough, AI-estimated):</span> {r.nutrition_note}
            </p>
          )}
          <div className="flex flex-wrap gap-3 border-t pt-8">
            <Button size="lg" className="h-14 rounded-2xl px-7 text-base" onClick={() => setPlanOpen(true)}>
              <CalendarPlus /> Add to meal plan
            </Button>
            <SaveButton recipe={r} size="default" />
          </div>
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
