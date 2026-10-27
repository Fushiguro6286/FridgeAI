import { CalendarDays, Camera, ChefHat, CircleAlert, CircleCheck, Flame, Hourglass, Package, ShoppingCart, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { CardGridSkeleton, EmptyState, ErrorState, ListSkeleton } from '@/components/common'
import { RecipeArt } from '@/components/RecipeArt'
import { MatchPill } from '@/components/RecipeCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useInventory } from '@/hooks/inventory'
import { useMealPlan, useMealPlans } from '@/hooks/mealPlans'
import { useRecipes } from '@/hooks/recipes'
import { useShoppingList, useUpdateShoppingItem } from '@/hooks/shopping'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { addDays, categoryEmoji, daysUntil, expiryLabel, formatMinutes, formatQty, greeting, isoDate, slotLabel } from '@/lib/format'
import { cn } from '@/lib/utils'

// General food-storage tips, one per day. Not personalised, so no claims about the user's savings.
const TIPS = [
  ['Store coriander longer', 'Wash it, dry it completely, and wrap it in a paper towel before putting it in an airtight box in the fridge.'],
  ['Keep onions and potatoes apart', 'Stored together they spoil faster. Keep both somewhere cool, dry and dark, in separate baskets.'],
  ['Freeze ripe tomatoes', 'Freeze them whole. Grate them straight from the freezer into curries and dals; the skin slips off.'],
  ['Green chillies stay fresh without stems', 'Pull off the stems, dry the chillies and keep them in a closed jar lined with tissue.'],
  ['Cool leftover rice quickly', 'Spread it out to cool, refrigerate within an hour or two, and use it within a day.'],
  ['Revive soft biscuits and chips', 'A few minutes in a hot, dry pan or the oven brings back the crunch.'],
] as const

const TONES = {
  green: 'bg-sage-soft text-primary',
  amber: 'bg-warn-soft text-warn-foreground',
  terracotta: 'bg-terracotta/10 text-terracotta',
  grey: 'bg-muted text-muted-foreground',
}

function StatCard({ icon: Icon, tone, value, label, tag, to }: { icon: LucideIcon; tone: keyof typeof TONES; value: ReactNode; label: string; tag?: ReactNode; to: string }) {
  return (
    <Link to={to} className="group rounded-3xl border bg-card/90 p-6 shadow-(--shadow-card) transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('grid size-10 place-items-center rounded-xl', TONES[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
        {tag}
      </div>
      <div className="mt-4 font-heading text-4xl font-medium text-heading">{value}</div>
      <div className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </Link>
  )
}

function SectionTitle({ children, to, cta }: { children: string; to: string; cta: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-[1.75rem] font-medium">{children}</h2>
      <Link to={to} className="rounded text-sm font-semibold text-terracotta hover:underline">
        {cta}
      </Link>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const today = isoDate()
  const inventory = useInventory()
  const shopping = useShoppingList()
  const updateItem = useUpdateShoppingItem()
  const plans = useMealPlans()
  const suggested = useRecipes({ sort: 'best_match', limit: 3 })

  const currentPlan = plans.data?.items.find((p) => p.start_date <= today && today < addDays(p.start_date, p.days))
  const plan = useMealPlan(currentPlan?.id)
  const todays = plan.data?.entries.filter((e) => e.day_date === today) ?? []

  const items = inventory.data?.items ?? []
  const useSoon = items
    .filter((i) => i.priority === 'use_soon' || (daysUntil(i.expiry_date) ?? 99) <= 3)
    .sort((a, b) => (daysUntil(a.expiry_date) ?? 99) - (daysUntil(b.expiry_date) ?? 99))
  const toBuy = shopping.data?.items.filter((i) => !i.checked) ?? []
  const listPreview = [...toBuy, ...(shopping.data?.items.filter((i) => i.checked) ?? [])].slice(0, 5)
  const [tipTitle, tipBody] = TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length]

  async function tick(id: number, checked: boolean) {
    try {
      await updateItem.mutateAsync({ id, checked })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2.3rem] font-medium leading-tight sm:text-[2.8rem]">
            {greeting()}, {user?.display_name}
          </h1>
          <p className="mt-1 text-[1.05rem] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button asChild size="lg" className="h-14 rounded-2xl px-7 text-base">
          <Link to="/app/scan">
            <Camera /> Scan new fridge photo
          </Link>
        </Button>
      </header>

      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard icon={Package} tone="green" value={inventory.isPending ? '…' : items.length} label="Items in pantry" to="/app/ingredients" />
        <StatCard
          icon={Hourglass}
          tone="amber"
          value={inventory.isPending ? '…' : useSoon.length}
          label="Items to use soon"
          to="/app/ingredients"
          tag={useSoon.length > 0 && <span className="rounded-md bg-terracotta/10 px-2 py-1 text-xs font-semibold text-terracotta">Expiring soon</span>}
        />
        <StatCard icon={CalendarDays} tone="terracotta" value={plans.isPending ? '…' : (plan.data?.entries.length ?? 0)} label="Meals planned" to="/app/planner" />
        <StatCard icon={ShoppingCart} tone="grey" value={shopping.isPending ? '…' : toBuy.length} label="Items to buy" to="/app/shopping" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-10">
        <div className="min-w-0 space-y-10">
          {/* Cook these first */}
          <section className="relative overflow-hidden rounded-3xl border border-terracotta/15 bg-[#f6eee4]/80 p-6 shadow-(--shadow-card) sm:p-8 dark:bg-terracotta/10">
            <ChefHat className="pointer-events-none absolute -right-6 -top-6 size-44 text-terracotta/8" aria-hidden />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[1.75rem] font-medium">
                  <Flame className="size-6 text-terracotta" aria-hidden /> Cook these first
                </h2>
                {inventory.isPending ? (
                  <ListSkeleton rows={1} />
                ) : useSoon.length ? (
                  <>
                    <p className="mt-1 text-muted-foreground">Use these ingredients before they spoil.</p>
                    <ul className="mt-5 flex flex-wrap gap-3">
                      {useSoon.slice(0, 3).map((i) => (
                        <li key={i.id} className="flex items-center gap-3 rounded-xl bg-card px-4 py-2.5 shadow-sm">
                          <span className="text-2xl" aria-hidden>
                            {categoryEmoji(i.category)}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold capitalize text-heading">{i.name}</span>
                            <span className="block text-[0.68rem] font-semibold uppercase tracking-wide text-terracotta">
                              {expiryLabel(i.expiry_date) ?? 'Marked use soon'}
                            </span>
                          </span>
                        </li>
                      ))}
                      {useSoon.length > 3 && (
                        <li className="flex items-center rounded-xl bg-card/70 px-4 py-2.5 text-sm text-muted-foreground shadow-sm">+{useSoon.length - 3} others</li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="mt-1 max-w-md text-muted-foreground">
                    Nothing is about to expire. Add expiry dates or mark items “Use soon” and they'll show up here first.
                  </p>
                )}
              </div>
              {useSoon.length > 0 && (
                <Button asChild variant="warm" size="lg" className="h-auto shrink-0 rounded-2xl px-8 py-4 text-base">
                  <Link to={`/app/recipes?use=${encodeURIComponent(useSoon.slice(0, 6).map((i) => i.name).join(','))}`}>Find recipes for these</Link>
                </Button>
              )}
            </div>
          </section>

          {/* Today's meal plan */}
          <section>
            <SectionTitle to="/app/planner" cta={todays.length ? 'Edit plan' : 'Open planner'}>
              Today's Meal Plan
            </SectionTitle>
            {plans.isPending || (currentPlan && plan.isPending) ? (
              <ListSkeleton rows={2} />
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
              <ul className="grid gap-4 md:grid-cols-2">
                {todays.map((e) => {
                  const missing = e.recipe.missing.length
                  return (
                    <li key={e.id} className="min-w-0">
                      <Link
                        to={`/app/recipes/${e.recipe.id}`}
                        className={cn(
                          'group flex items-center gap-5 rounded-3xl border bg-card p-5 shadow-(--shadow-card) transition-all hover:shadow-lg',
                          missing > 0 && 'border-l-4 border-l-warn',
                        )}
                      >
                        <RecipeArt title={e.recipe.title} size="sm" className="size-24 shrink-0 rounded-2xl" />
                        <div className="min-w-0">
                          <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-terracotta">{slotLabel(e.slot)}</div>
                          <div className="mt-0.5 truncate text-lg font-semibold text-heading">{e.recipe.title}</div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{e.recipe.description}</p>
                          <div className={cn('mt-2 flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide', missing ? 'text-warn-foreground' : 'text-ok')}>
                            {missing ? <CircleAlert className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
                            {missing ? `Missing ${missing} item${missing === 1 ? '' : 's'}` : 'Ingredients ready'}
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Suggestions */}
          <section>
            <SectionTitle to="/app/recipes" cta="See all">
              New for you
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
              <ul className="grid gap-5 sm:grid-cols-3">
                {suggested.data.items.map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/recipes/${r.id}`} className="group block rounded-2xl">
                      <div className="relative overflow-hidden rounded-2xl shadow-(--shadow-card)">
                        <RecipeArt title={r.title} className="aspect-square h-auto" />
                        <MatchPill recipe={r} className="absolute right-3 top-3 px-2 py-0.5 text-[0.65rem]" />
                      </div>
                      <div className="mt-3 font-semibold text-heading group-hover:text-terracotta">{r.title}</div>
                      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatMinutes(r.total_minutes)} • {r.difficulty}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-card/90 p-6 shadow-(--shadow-card)">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-medium">Shopping List</h2>
              {toBuy.length > 0 && (
                <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-label={`${toBuy.length} to buy`}>
                  {toBuy.length}
                </span>
              )}
            </div>
            {shopping.isPending ? (
              <ListSkeleton rows={3} />
            ) : shopping.isError ? (
              <ErrorState error={shopping.error} onRetry={() => shopping.refetch()} />
            ) : !listPreview.length ? (
              <p className="text-sm text-muted-foreground">Your list is empty. Build one from a meal plan or add items yourself.</p>
            ) : (
              <ul className="space-y-4">
                {listPreview.map((i) => (
                  <li key={i.id} className="flex items-start gap-3">
                    <Checkbox id={`dash-${i.id}`} checked={i.checked} onCheckedChange={(v) => tick(i.id, v === true)} className="mt-0.5 size-5" />
                    <label htmlFor={`dash-${i.id}`} className={cn('cursor-pointer leading-tight', i.checked && 'text-muted-foreground line-through')}>
                      <span className="block font-semibold capitalize text-heading">{i.name}</span>
                      {i.quantity != null && <span className="text-[0.7rem] font-semibold uppercase text-muted-foreground">{formatQty(i.quantity, i.unit)}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {toBuy.length > 0 && (
              <Button asChild variant="outline" size="lg" className="mt-6 w-full rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:border-primary">
                <Link to="/app/shopping?order=1">
                  <ShoppingCart /> Order missing items
                </Link>
              </Button>
            )}
            <Link to="/app/shopping" className="mt-4 block rounded text-center text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary">
              View full list
            </Link>
          </section>

          <section className="relative overflow-hidden rounded-3xl bg-sidebar p-7 text-white shadow-xl shadow-primary/15">
            <span className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full border-[14px] border-white/5" aria-hidden />
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#df8a64]">Kitchen tip</p>
            <h2 className="mt-2 text-2xl font-medium text-white">{tipTitle}</h2>
            <p className="mt-3 leading-relaxed text-white/75">{tipBody}</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
