import { CalendarPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMealPlan, useMealPlans, useSetEntry } from '@/hooks/mealPlans'
import { errorMessage } from '@/lib/api'
import { addDays, isoDate, SLOTS, shortDay } from '@/lib/format'
import type { Recipe, Slot } from '@/types/api'

export function AddToPlanDialog({ recipe, open, onOpenChange }: { recipe: Recipe; open: boolean; onOpenChange: (o: boolean) => void }) {
  const plans = useMealPlans()
  const today = isoDate()
  const [planId, setPlanId] = useState<number | null>(null)
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState<Slot>(recipe.meal_types[0] ?? 'dinner')
  const [servings, setServings] = useState(recipe.servings)
  const setEntry = useSetEntry()

  const items = useMemo(() => plans.data?.items ?? [], [plans.data])
  useEffect(() => {
    if (!open || planId || !items.length) return
    const current = items.find((p) => p.start_date <= today && today < addDays(p.start_date, p.days)) ?? items[0]
    setPlanId(current.id)
  }, [open, items, planId, today])

  const plan = items.find((p) => p.id === planId)
  const days = useMemo(() => (plan ? Array.from({ length: plan.days }, (_, i) => addDays(plan.start_date, i)) : []), [plan])
  useEffect(() => {
    if (plan && !days.includes(day)) setDay(days.includes(today) ? today : days[0])
  }, [plan, day, days, today])

  const detail = useMealPlan(planId)
  const occupied = detail.data?.entries.find((e) => e.day_date === day && e.slot === slot)

  async function submit() {
    if (!planId || !day) return
    try {
      await setEntry.mutateAsync({ planId, day_date: day, slot, recipe_id: recipe.id, servings })
      toast.success(`Added ${recipe.title} to ${shortDay(day)} ${slot}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to meal plan</DialogTitle>
          <DialogDescription>{recipe.title}</DialogDescription>
        </DialogHeader>
        {plans.isPending ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : !items.length ? (
          <div className="space-y-3 text-sm">
            <p>You don't have a meal plan yet. Create one first, then add this recipe to any slot.</p>
            <Button asChild>
              <Link to="/app/planner">Go to Meal Planner</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="atp-plan">Plan</Label>
              <Select value={planId ? String(planId) : undefined} onValueChange={(v) => setPlanId(Number(v))}>
                <SelectTrigger id="atp-plan" className="w-full">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="atp-day">Day</Label>
                <Select value={day || undefined} onValueChange={setDay}>
                  <SelectTrigger id="atp-day" className="w-full">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {shortDay(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="atp-slot">Meal</Label>
                <Select value={slot} onValueChange={(v) => setSlot(v as Slot)}>
                  <SelectTrigger id="atp-slot" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="atp-servings">Servings</Label>
              <Input
                id="atp-servings"
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(e) => setServings(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
            </div>
            {occupied && (
              <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-foreground">
                This replaces <strong>{occupied.recipe.title}</strong> in that slot. Other meals stay as they are.
              </p>
            )}
          </div>
        )}
        {!!items.length && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!planId || !day || setEntry.isPending}>
              <CalendarPlus /> {setEntry.isPending ? 'Adding…' : 'Add to plan'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
