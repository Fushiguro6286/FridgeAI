import { zodResolver } from '@hookform/resolvers/zod'
import { Monitor, Moon, ShieldAlert, Sun } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ErrorState, ListSkeleton, PageHeader } from '@/components/common'
import { TagInput } from '@/components/TagInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePreferences, useUpdatePreferences } from '@/hooks/preferences'
import { errorMessage } from '@/lib/api'
import { CUISINES, DIETS } from '@/lib/format'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { settingsSchema, toNumberOrNull, type SettingsValues } from '@/schemas/forms'
import type { Preferences } from '@/types/api'

function toForm(p: Preferences): SettingsValues {
  return {
    ...p,
    max_cook_minutes: p.max_cook_minutes == null ? '' : String(p.max_cook_minutes),
    weekly_budget: p.weekly_budget == null ? '' : String(p.weekly_budget),
  }
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export function Settings() {
  const prefs = usePreferences()
  const save = useUpdatePreferences()
  const { setTheme } = useTheme()
  const form = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema) })
  const e = form.formState.errors

  useEffect(() => {
    if (prefs.data) form.reset(toForm(prefs.data))
  }, [prefs.data, form])

  const submit = form.handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync({
        ...v,
        currency: v.currency.toUpperCase(),
        max_cook_minutes: toNumberOrNull(v.max_cook_minutes),
        weekly_budget: toNumberOrNull(v.weekly_budget),
      })
      form.reset(toForm(saved))
      toast.success('Preferences saved')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  if (prefs.isPending) return <ListSkeleton rows={6} />
  if (prefs.isError) return <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title="Settings"
        description="These preferences shape every recipe, meal plan and shopping list."
        actions={
          <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="rounded-2xl border bg-card p-6 shadow-(--shadow-card) sm:p-8">
        <Section title="Diet" description="Recipes that don't fit are hidden, with the reason shown.">
          <Controller
            control={form.control}
            name="diet"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Dietary preference" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {DIETS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === d.value}
                    onClick={() => field.onChange(d.value)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      field.value === d.value ? 'border-primary bg-secondary ring-1 ring-primary' : 'hover:border-primary/40',
                    )}
                  >
                    <span className="block font-medium">{d.label}</span>
                    <span className="text-sm text-muted-foreground">{d.hint}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </Section>

        <Section title="Allergies & exclusions" description="Recipes containing these are never shown. Type and press Enter.">
          <div className="flex gap-3 rounded-xl bg-warn-soft p-4 text-sm text-warn-foreground">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              We filter AI suggestions against this list, but we can't guarantee a recipe is allergen-free. Always read labels, especially
              for severe allergies.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Allergies</Label>
            <Controller
              control={form.control}
              name="allergies"
              render={({ field }) => <TagInput label="Allergies" value={field.value ?? []} onChange={field.onChange} placeholder="e.g. peanut, shellfish, gluten, dairy" />}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Never use</Label>
            <Controller
              control={form.control}
              name="exclusions"
              render={({ field }) => <TagInput label="Excluded ingredients" value={field.value ?? []} onChange={field.onChange} placeholder="e.g. mushroom, garlic, onion" />}
            />
          </div>
        </Section>

        <Section title="Cuisines" description="Preferred cuisines rank higher. Leave empty for variety.">
          <Controller
            control={form.control}
            name="cuisines"
            render={({ field }) => {
              const value = field.value ?? []
              const custom = value.filter((c) => !CUISINES.includes(c))
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {CUISINES.map((c) => {
                      const on = value.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? value.filter((x) => x !== c) : [...value, c])}
                          className={cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40')}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  <TagInput
                    label="Other cuisines"
                    value={custom}
                    onChange={(next) => field.onChange([...value.filter((c) => CUISINES.includes(c)), ...next])}
                    placeholder="Add another cuisine"
                  />
                </div>
              )
            }}
          />
        </Section>

        <Section title="Household" description="Used for default servings, cooking time and budget.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="s-household">Household size</Label>
              <Input id="s-household" type="number" min={1} max={20} {...form.register('household_size', { valueAsNumber: true })} aria-invalid={!!e.household_size} />
              {e.household_size && <p className="text-xs text-destructive">{e.household_size.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-servings">Servings per meal</Label>
              <Input id="s-servings" type="number" min={1} max={20} {...form.register('servings', { valueAsNumber: true })} aria-invalid={!!e.servings} />
              {e.servings && <p className="text-xs text-destructive">{e.servings.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-time">Max cooking time (minutes)</Label>
              <Input id="s-time" inputMode="numeric" placeholder="No limit" {...form.register('max_cook_minutes')} aria-invalid={!!e.max_cook_minutes} />
              {e.max_cook_minutes && <p className="text-xs text-destructive">{e.max_cook_minutes.message}</p>}
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="s-budget">Weekly budget</Label>
                <Input id="s-budget" inputMode="decimal" placeholder="Optional" {...form.register('weekly_budget')} aria-invalid={!!e.weekly_budget} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="s-currency">Currency</Label>
                <Input id="s-currency" maxLength={3} className="uppercase" {...form.register('currency')} aria-invalid={!!e.currency} />
              </div>
              {(e.weekly_budget || e.currency) && <p className="col-span-2 text-xs text-destructive">{(e.weekly_budget ?? e.currency)?.message}</p>}
            </div>
          </div>
        </Section>

        <Section title="Display" description="Units for recipe quantities and how FridgeAI looks.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="s-units">Measurement units</Label>
              <Controller
                control={form.control}
                name="measurement_system"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="s-units" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (g, ml)</SelectItem>
                      <SelectItem value="us">US (cups, oz)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label id="s-theme-label">Theme</Label>
              <Controller
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <div role="radiogroup" aria-labelledby="s-theme-label" className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'light' as const, icon: Sun, label: 'Light' },
                      { v: 'dark' as const, icon: Moon, label: 'Dark' },
                      { v: 'system' as const, icon: Monitor, label: 'System' },
                    ].map(({ v, icon: Icon, label }) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={field.value === v}
                        onClick={() => {
                          field.onChange(v)
                          setTheme(v)
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border py-2 text-sm',
                          field.value === v ? 'border-primary bg-secondary ring-1 ring-primary' : 'hover:border-primary/40',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg" disabled={save.isPending || !form.formState.isDirty}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
