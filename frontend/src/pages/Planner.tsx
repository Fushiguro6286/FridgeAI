import {
  CalendarDays,
  Info,
  Loader2,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Replace,
  ShoppingBasket,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, ListSkeleton, MockBadge, PageHeader } from '@/components/common'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RecipeArt } from '@/components/RecipeArt'
import { RecipePickerDialog } from '@/components/RecipePickerDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHealth } from '@/hooks/health'
import {
  useDeletePlan,
  useGeneratePlan,
  useMealPlan,
  useMealPlans,
  useRegenerateEntry,
  useRemoveEntry,
  useRenamePlan,
  useSetEntry,
  useUpdateEntry,
} from '@/hooks/mealPlans'
import { usePreferences } from '@/hooks/preferences'
import { useBuildShoppingList, useShoppingList } from '@/hooks/shopping'
import { errorMessage } from '@/lib/api'
import { addDays, formatMinutes, formatQty, isoDate, shortDay, slotLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MealPlan, PlanEntry, Recipe, Slot } from '@/types/api'

function GenerateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (p: MealPlan) => void }) {
  const prefs = usePreferences()
  const gen = useGeneratePlan()
  const [start, setStart] = useState(isoDate())
  const [days, setDays] = useState('7')
  const [snacks, setSnacks] = useState(false)
  const [servings, setServings] = useState(2)
  useEffect(() => {
    if (prefs.data) setServings(prefs.data.servings)
  }, [prefs.data])

  async function submit() {
    if (!start) return
    try {
      const plan = await gen.mutateAsync({ start_date: start, days: Number(days), include_snacks: snacks, servings })
      toast.success(`${plan.name} is ready`)
      onDone(plan)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !gen.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a meal plan</DialogTitle>
          <DialogDescription>Uses your confirmed ingredients and preferences. Recipes you already have are reused first.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gp-start">Start date</Label>
              <Input id="gp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gp-days">Length</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="gp-days" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Whole week (7 days)</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="1">Just one day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gp-servings">Servings per meal</Label>
            <Input id="gp-servings" type="number" min={1} max={20} value={servings} onChange={(e) => setServings(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={snacks} onCheckedChange={(v) => setSnacks(v === true)} /> Include snacks
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={gen.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={gen.isPending || !start}>
            {gen.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {gen.isPending ? 'Planning your meals…' : 'Generate plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({ plan, open, onOpenChange }: { plan: MealPlan; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rename = useRenamePlan()
  const [name, setName] = useState(plan.name)
  useEffect(() => setName(plan.name), [plan.name, open])
  async function submit() {
    if (!name.trim()) return
    try {
      await rename.mutateAsync({ id: plan.id, name: name.trim() })
      toast.success('Plan renamed')
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename plan</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Label htmlFor="rn-name" className="sr-only">
            Plan name
          </Label>
          <Input id="rn-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} aria-invalid={!name.trim()} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || rename.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MealSlot({ plan, day, slot, entry, aiReady }: { plan: MealPlan; day: string; slot: Slot; entry?: PlanEntry; aiReady: boolean }) {
  const [picking, setPicking] = useState(false)
  const setEntry = useSetEntry()
  const update = useUpdateEntry()
  const remove = useRemoveEntry()
  const regen = useRegenerateEntry()
  const busy = setEntry.isPending || update.isPending || remove.isPending || regen.isPending

  async function act(p: Promise<unknown>, msg: string) {
    try {
      await p
      toast.success(msg)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  function pick(r: Recipe) {
    setPicking(false)
    if (entry) act(update.mutateAsync({ planId: plan.id, entryId: entry.id, recipe_id: r.id }), `Replaced with ${r.title}`)
    else act(setEntry.mutateAsync({ planId: plan.id, day_date: day, slot, recipe_id: r.id, servings: plan.entries[0]?.servings ?? 2 }), `Added ${r.title}`)
  }

  return (
    <li className={cn('rounded-xl border bg-card shadow-(--shadow-card)', busy && 'opacity-70')} aria-busy={busy}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">{slotLabel(slot)}</h3>
        {entry && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${slotLabel(slot)}`} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setPicking(true)}>
                <Replace /> Replace with my recipe
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!aiReady} onSelect={() => act(regen.mutateAsync({ planId: plan.id, entryId: entry.id }), 'Meal regenerated')}>
                <RefreshCw /> Regenerate this meal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => act(remove.mutateAsync({ planId: plan.id, entryId: entry.id }), 'Meal removed')}>
                <X /> Remove meal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {entry ? (
        <div className="flex gap-4 p-4">
          <RecipeArt title={entry.recipe.title} size="sm" className="hidden w-20 shrink-0 rounded-lg sm:grid" />
          <div className="min-w-0 flex-1 space-y-2">
            <Link to={`/app/recipes/${entry.recipe.id}`} className="block rounded font-heading text-lg font-semibold leading-snug hover:text-primary">
              {entry.recipe.title}
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>{formatMinutes(entry.recipe.total_minutes)}</span>
              <span className="flex items-center gap-1" role="group" aria-label="Servings">
                <Button
                  variant="outline"
                  size="icon-xs"
                  aria-label="Fewer servings"
                  disabled={busy || entry.servings <= 1}
                  onClick={() => act(update.mutateAsync({ planId: plan.id, entryId: entry.id, servings: entry.servings - 1 }), 'Servings updated')}
                >
                  <Minus />
                </Button>
                <span className="min-w-16 text-center">{entry.servings} servings</span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  aria-label="More servings"
                  disabled={busy || entry.servings >= 20}
                  onClick={() => act(update.mutateAsync({ planId: plan.id, entryId: entry.id, servings: entry.servings + 1 }), 'Servings updated')}
                >
                  <Plus />
                </Button>
              </span>
            </div>
            <p className="text-sm">
              {entry.recipe.available.length > 0 && (
                <span>
                  <span className="font-medium text-ok">Uses:</span> {entry.recipe.available.join(', ')}
                </span>
              )}
              {entry.recipe.missing.length > 0 && (
                <span className="block">
                  <span className="font-medium text-warn-foreground">Missing:</span> {entry.recipe.missing.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-sm text-muted-foreground">Nothing planned</span>
          <Button variant="outline" size="sm" onClick={() => setPicking(true)} disabled={busy}>
            <Plus /> Add recipe
          </Button>
        </div>
      )}
      {picking && (
        <RecipePickerDialog open={picking} onOpenChange={setPicking} onPick={pick} slot={slot} title={entry ? `Replace ${slotLabel(slot).toLowerCase()}` : `Add ${slotLabel(slot).toLowerCase()}`} />
      )}
    </li>
  )
}

export function Planner() {
  const health = useHealth()
  const plans = useMealPlans()
  const shopping = useShoppingList()
  const build = useBuildShoppingList()
  const del = useDeletePlan()
  const today = isoDate()
  const [planId, setPlanId] = useState<number | null>(null)
  const [day, setDay] = useState(today)
  const [genOpen, setGenOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const aiReady = health.data?.ai_configured ?? true

  const items = useMemo(() => plans.data?.items ?? [], [plans.data])
  useEffect(() => {
    if (planId && items.some((p) => p.id === planId)) return
    const current = items.find((p) => p.start_date <= today && today < addDays(p.start_date, p.days)) ?? items[0]
    setPlanId(current?.id ?? null)
  }, [items, planId, today])

  const plan = useMealPlan(planId)
  const days = useMemo(() => (plan.data ? Array.from({ length: plan.data.days }, (_, i) => addDays(plan.data!.start_date, i)) : []), [plan.data])
  useEffect(() => {
    if (days.length && !days.includes(day)) setDay(days.includes(today) ? today : days[0])
  }, [days, day, today])

  const slots: Slot[] = plan.data?.include_snacks ? ['breakfast', 'lunch', 'dinner', 'snack'] : ['breakfast', 'lunch', 'dinner']
  const byKey = new Map(plan.data?.entries.map((e) => [`${e.day_date}|${e.slot}`, e]))
  const linked = shopping.data?.meal_plan_id === planId

  async function deletePlan() {
    if (!planId) return
    try {
      await del.mutateAsync(planId)
      toast.success('Plan deleted')
      setPlanId(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
    setDeleteOpen(false)
  }

  async function useForShopping() {
    if (!planId) return
    try {
      await build.mutateAsync(planId)
      toast.success('Shopping list updated from this plan')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Meal Planner"
        description="Plan breakfast, lunch and dinner around what you have. Change any meal without touching the rest."
        actions={
          <Button onClick={() => setGenOpen(true)} disabled={!aiReady && !items.length}>
            <Sparkles /> New plan
          </Button>
        }
      />

      {plans.isPending ? (
        <ListSkeleton rows={4} />
      ) : plans.isError ? (
        <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No meal plans yet"
          description={aiReady ? 'Generate a daily or weekly plan from your ingredients and preferences.' : 'AI is not configured on the server, so plans cannot be generated yet.'}
          action={
            <Button onClick={() => setGenOpen(true)} disabled={!aiReady}>
              <Sparkles /> Generate a plan
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={planId ? String(planId) : undefined} onValueChange={(v) => setPlanId(Number(v))}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Choose plan">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {items.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} · {p.days === 1 ? shortDay(p.start_date) : `${p.days} days`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {plan.data && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Plan actions">
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={useForShopping} disabled={build.isPending}>
                    <ShoppingBasket /> {linked ? 'Rebuild shopping list' : 'Use for shopping list'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 /> Delete plan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {plan.data?.mock && <MockBadge />}
          </div>

          {plan.isPending ? (
            <ListSkeleton rows={3} />
          ) : plan.isError ? (
            <ErrorState error={plan.error} onRetry={() => plan.refetch()} />
          ) : (
            <>
              {plan.data.notes.length > 0 && (
                <Alert>
                  <Info aria-hidden />
                  <AlertTitle>About this plan</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {plan.data.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div role="tablist" aria-label="Days" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.map((d) => {
                  const count = slots.filter((s) => byKey.has(`${d}|${s}`)).length
                  return (
                    <button
                      key={d}
                      role="tab"
                      aria-selected={d === day}
                      onClick={() => setDay(d)}
                      className={cn(
                        'min-w-24 shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
                        d === day ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
                      )}
                    >
                      <span className="block text-sm font-semibold">{shortDay(d)}</span>
                      <span className={cn('text-xs', d === day ? 'opacity-85' : 'text-muted-foreground')}>
                        {d === today ? 'Today · ' : ''}
                        {count}/{slots.length} meals
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <ul className="space-y-3" aria-label={`Meals for ${shortDay(day)}`}>
                  {slots.map((s) => (
                    <MealSlot key={`${day}-${s}`} plan={plan.data} day={day} slot={s} entry={byKey.get(`${day}|${s}`)} aiReady={aiReady} />
                  ))}
                </ul>

                <aside className="space-y-3">
                  <div className="rounded-xl border bg-card p-5 shadow-(--shadow-card)">
                    <h2 className="text-lg font-semibold">Ingredients this plan needs</h2>
                    {plan.data.missing.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Your inventory covers every planned meal.</p>
                    ) : (
                      <>
                        {(['buy', 'check'] as const).map((st) => {
                          const rows = plan.data.missing.filter((m) => m.status === st)
                          if (!rows.length) return null
                          return (
                            <div key={st} className="mt-3">
                              <h3 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {st === 'buy' ? `To buy (${rows.length})` : `Check you have enough (${rows.length})`}
                              </h3>
                              <ul className="flex flex-wrap gap-1.5">
                                {rows.map((m) => (
                                  <li key={m.name + (m.unit ?? '')}>
                                    <Badge variant={st === 'buy' ? 'warn' : 'outline'} title={`For ${m.recipes.join(', ')}`}>
                                      {m.name}
                                      {m.quantity != null && ` · ${formatQty(m.quantity, m.unit)}`}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {linked ? (
                        <Button asChild variant="outline" size="sm">
                          <Link to="/app/shopping">
                            <ShoppingBasket /> Open shopping list
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" onClick={useForShopping} disabled={build.isPending}>
                          <ShoppingBasket /> Use for shopping list
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="hidden rounded-xl border bg-card p-5 lg:block">
                    <h2 className="mb-3 text-lg font-semibold">Week at a glance</h2>
                    <ul className="space-y-2 text-sm">
                      {days.map((d) => (
                        <li key={d}>
                          <button type="button" onClick={() => setDay(d)} className={cn('w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted', d === day && 'bg-muted')}>
                            <span className="font-medium">{shortDay(d)}</span>
                            <span className="block truncate text-muted-foreground">
                              {slots.map((s) => byKey.get(`${d}|${s}`)?.recipe.title ?? '—').join(' · ')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      )}

      <GenerateDialog open={genOpen} onOpenChange={setGenOpen} onDone={(p) => setPlanId(p.id)} />
      {plan.data && <RenameDialog plan={plan.data} open={renameOpen} onOpenChange={setRenameOpen} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this meal plan?"
        description="Its meals will be removed. Your recipes and custom shopping items are kept."
        onConfirm={deletePlan}
        pending={del.isPending}
      />
    </div>
  )
}

