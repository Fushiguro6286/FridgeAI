import { ArrowRight, CalendarDays, Camera, ChefHat, Clock, Hourglass, Refrigerator, ShoppingBasket, ShoppingCart, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { CardGridSkeleton, EmptyState, ErrorState, ListSkeleton, Stat } from '@/components/common'
import { RecipeArt } from '@/components/RecipeArt'
import { RecipeCard } from '@/components/RecipeCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInventory } from '@/hooks/inventory'
import { useMealPlan, useMealPlans } from '@/hooks/mealPlans'
import { useRecipes } from '@/hooks/recipes'
import { useShoppingList } from '@/hooks/shopping'
import { useAuth } from '@/lib/auth'
import { addDays, daysUntil, formatMinutes, formatQty, greeting, isoDate, slotLabel } from '@/lib/format'

function SectionTitle({ children, to, cta }: { children: string; to: string; cta: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-semibold">{children}</h2>
      <Link to={to} className="flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline">
        {cta} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const today = isoDate()
  const inventory = useInventory()
  const shopping = useShoppingList()
  const plans = useMealPlans()
  const suggested = useRecipes({ sort: 'best_match', limit: 3 })
  const saved = useRecipes({ saved: true, limit: 4 })

  const currentPlan = plans.data?.items.find((p) => p.start_date <= today && today < addDays(p.start_date, p.days))
  const plan = useMealPlan(currentPlan?.id)
  const todays = plan.data?.entries.filter((e) => e.day_date === today) ?? []

  const items = inventory.data?.items ?? []
  const useSoon = items
    .filter((i) => i.priority === 'use_soon' || ((daysUntil(i.expiry_date) ?? 99) <= 3))
    .sort((a, b) => (daysUntil(a.expiry_date) ?? 99) - (daysUntil(b.expiry_date) ?? 99))
  const toBuy = shopping.data?.items.filter((i) => !i.checked) ?? []

  return (
    <div className="space-y-10">
      <section className="relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/15 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <span className="absolute -right-12 -top-20 size-64 rounded-full bg-white/10" aria-hidden />
        <span className="absolute -bottom-24 right-52 size-48 rounded-full bg-white/5" aria-hidden />
        <span className="absolute right-[34%] top-5 hidden text-3xl opacity-90 lg:block" aria-hidden>
          🥕 🍅 🥚
        </span>
        <div className="relative">
          <p className="text-sm opacity-80">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
            {greeting()}, {user?.display_name}
          </h1>
          <p className="mt-2 opacity-85">
            {items.length ? `You have ${items.length} ingredient${items.length === 1 ? '' : 's'} ready to cook with.` : 'Start by scanning your fridge or adding ingredients.'}
          </p>
        </div>
        <Button asChild size="lg" variant="secondary" className="relative">
          <Link to="/app/scan">
            <Camera /> Scan fridge
          </Link>
        </Button>
      </section>

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Refrigerator} label="Ingredients in stock" value={inventory.isPending ? '…' : items.length} to="/app/ingredients" />
        <Stat icon={Hourglass} label="Use soon" value={inventory.isPending ? '…' : useSoon.length} to="/app/ingredients" />
        <Stat icon={CalendarDays} label="Meals planned today" value={plans.isPending ? '…' : todays.length} to="/app/planner" />
        <Stat icon={ShoppingBasket} label="Items to buy" value={shopping.isPending ? '…' : toBuy.length} to="/app/shopping" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionTitle to="/app/planner" cta="Open planner">
            Today's meals
          </SectionTitle>
          {plans.isPending || (currentPlan && plan.isPending) ? (
            <ListSkeleton rows={3} />
          ) : plans.isError ? (
            <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
          ) : !todays.length ? (
            <EmptyState
              icon={CalendarDays}
              title={currentPlan ? 'Nothing planned for today' : 'No meal plan for this week'}
              description="Generate a plan from your ingredients and it will show up here."
              action={
                <Button asChild>
                  <Link to="/app/planner">Plan meals</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {todays.map((e) => (
                <li key={e.id}>
                  <Link to={`/app/recipes/${e.recipe.id}`} className="flex items-center gap-4 overflow-hidden rounded-xl border bg-card pr-4 shadow-(--shadow-card) hover:border-primary/40">
                    <RecipeArt title={e.recipe.title} size="sm" className="w-20 shrink-0" />
                    <div className="min-w-0 flex-1 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{slotLabel(e.slot)}</div>
                      <div className="truncate font-heading text-lg font-semibold">{e.recipe.title}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden /> {formatMinutes(e.recipe.total_minutes)} · {e.servings} servings
                      </div>
                    </div>
                    {e.recipe.missing.length > 0 && <Badge variant="warn">{e.recipe.missing.length} missing</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle to="/app/ingredients" cta="All ingredients">
            Use these soon
          </SectionTitle>
          {inventory.isPending ? (
            <ListSkeleton rows={3} />
          ) : !useSoon.length ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                Nothing flagged. Mark ingredients as “Use soon” or add expiry dates and they'll be prioritised in recipes and plans.
              </CardContent>
            </Card>
          ) : (
            <>
            <ul className="divide-y rounded-xl border bg-card shadow-(--shadow-card)">
              {useSoon.slice(0, 6).map((i) => {
                const d = daysUntil(i.expiry_date)
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="font-medium capitalize">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{formatQty(i.quantity, i.unit) || 'Quantity unknown'}</div>
                    </div>
                    <Badge variant={d !== null && d < 0 ? 'destructive' : 'warn'}>
                      {d === null ? 'Use soon' : d < 0 ? 'Past expiry date' : d === 0 ? 'Expires today' : `Expires in ${d} day${d === 1 ? '' : 's'}`}
                    </Badge>
                  </li>
                )
              })}
            </ul>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to={`/app/recipes?use=${encodeURIComponent(useSoon.slice(0, 6).map((i) => i.name).join(','))}`}>
                <Sparkles /> Cook these first
              </Link>
            </Button>
            </>
          )}
        </section>
      </div>

      <section>
        <SectionTitle to="/app/recipes" cta="Discover more">
          Suggested for you
        </SectionTitle>
        {suggested.isPending ? (
          <CardGridSkeleton />
        ) : suggested.isError ? (
          <ErrorState error={suggested.error} onRetry={() => suggested.refetch()} />
        ) : !suggested.data.items.length ? (
          <EmptyState
            icon={ChefHat}
            title="No recipes yet"
            description="Generate recipes from your confirmed ingredients. They'll be ranked by what you already have."
            action={
              <Button asChild>
                <Link to="/app/recipes">Generate recipes</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {suggested.data.items.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle to="/app/recipes?tab=saved" cta="All saved">
            Recently saved
          </SectionTitle>
          {saved.isPending ? (
            <ListSkeleton rows={2} />
          ) : !saved.data?.items.length ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">Save recipes you like with the bookmark button to find them quickly here.</CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {saved.data.items.map((r) => (
                <li key={r.id}>
                  <Link to={`/app/recipes/${r.id}`} className="flex items-center gap-3 overflow-hidden rounded-xl border bg-card pr-3 hover:border-primary/40">
                    <RecipeArt title={r.title} size="sm" className="h-16 w-16 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{formatMinutes(r.total_minutes)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle to="/app/shopping" cta="Open list">
            Shopping list
          </SectionTitle>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                {shopping.data?.meal_plan_name ? `For ${shopping.data.meal_plan_name}` : 'Not linked to a meal plan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shopping.isPending ? (
                <ListSkeleton rows={2} />
              ) : !toBuy.length ? (
                <p className="text-sm text-muted-foreground">Nothing left to buy.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {toBuy.slice(0, 10).map((i) => (
                    <li key={i.id}>
                      <Badge variant={i.status === 'check' ? 'warn' : 'sage'}>
                        {i.name}
                        {i.quantity != null && ` · ${formatQty(i.quantity, i.unit)}`}
                      </Badge>
                    </li>
                  ))}
                  {toBuy.length > 10 && <li className="text-sm text-muted-foreground">+{toBuy.length - 10} more</li>}
                </ul>
              )}
              {toBuy.length > 0 && (
                <Button asChild className="mt-4">
                  <Link to="/app/shopping?order=1">
                    <ShoppingCart /> Order missing items
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
