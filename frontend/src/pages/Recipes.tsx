import { AlertTriangle, ChefHat, Info, Loader2, Minus, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AllergyDisclaimer, CardGridSkeleton, EmptyState, ErrorState, MockBadge, PageHeader } from '@/components/common'
import { RecipeCard } from '@/components/RecipeCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHealth } from '@/hooks/health'
import { useInventory } from '@/hooks/inventory'
import { usePreferences } from '@/hooks/preferences'
import { useGenerateRecipes, useRecipes } from '@/hooks/recipes'
import { errorMessage } from '@/lib/api'
import { CUISINES, DIETS, DIFFICULTIES, SLOTS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Diet, Difficulty, Slot } from '@/types/api'

const ANY = 'any'
const LABEL = 'text-[0.7rem] font-bold uppercase tracking-[0.14em] text-heading'

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-12! w-full rounded-xl bg-background/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function Recipes() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'saved' ? 'saved' : 'recent'
  const prefs = usePreferences()
  const health = useHealth()
  const inventory = useInventory()
  const generate = useGenerateRecipes()
  const list = useRecipes({ saved: tab === 'saved', sort: 'best_match', limit: 30 })

  const [cuisine, setCuisine] = useState(ANY)
  const [diet, setDiet] = useState<string>(ANY)
  const [maxMinutes, setMaxMinutes] = useState(ANY)
  const [servings, setServings] = useState(2)
  const [difficulty, setDifficulty] = useState(ANY)
  const [mealType, setMealType] = useState(ANY)
  const [prioritize, setPrioritize] = useState<string[]>([])

  const stock = inventory.data?.items ?? []
  const useParam = params.get('use')
  useEffect(() => {
    if (!prefs.data) return
    setDiet(prefs.data.diet)
    setServings(prefs.data.servings)
    if (prefs.data.max_cook_minutes) setMaxMinutes(String(prefs.data.max_cook_minutes))
  }, [prefs.data])
  useEffect(() => {
    const fromLink = useParam?.split(',').filter(Boolean)
    if (inventory.data) setPrioritize(fromLink?.length ? fromLink : inventory.data.items.filter((i) => i.priority === 'use_soon').map((i) => i.name))
  }, [inventory.data, useParam])

  async function run() {
    try {
      const res = await generate.mutateAsync({
        count: 4,
        cuisine: cuisine === ANY ? null : cuisine,
        diet: diet === ANY ? null : (diet as Diet),
        max_minutes: maxMinutes === ANY ? null : Number(maxMinutes),
        servings,
        difficulty: difficulty === ANY ? null : (difficulty as Difficulty),
        meal_type: mealType === ANY ? null : (mealType as Slot),
        prioritize,
      })
      if (!res.recipes.length) toast.warning('No recipes passed your filters. Try loosening them.')
      else toast.success(`${res.recipes.length} recipe${res.recipes.length === 1 ? '' : 's'} ready`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const aiReady = health.data?.ai_configured ?? true
  const prefDiet = prefs.data?.diet
  const looserDiet = prefDiet && prefDiet !== 'none' && diet !== prefDiet

  return (
    <div>
      <PageHeader
        title="Discover Recipes"
        description="Personalised matches for your current pantry, ranked by what you already have."
        actions={
          <Tabs value={tab} onValueChange={(v) => setParams(v === 'saved' ? { tab: 'saved' } : {}, { replace: true })}>
            <TabsList className="h-11 rounded-xl border bg-card p-1 shadow-sm">
              <TabsTrigger value="recent" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Best matches
              </TabsTrigger>
              <TabsTrigger value="saved" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Saved recipes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <section aria-label="Recipe filters" className="mb-10 rounded-3xl border bg-card/90 p-6 shadow-(--shadow-card) sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <FilterSelect id="f-cuisine" label="Cuisine" value={cuisine} onChange={setCuisine} options={[{ value: ANY, label: 'Any / my preferences' }, ...CUISINES.map((c) => ({ value: c, label: c }))]} />
          <FilterSelect id="f-diet" label="Diet" value={diet} onChange={setDiet} options={[{ value: ANY, label: 'My settings' }, ...DIETS.map((d) => ({ value: d.value, label: d.label }))]} />
          <FilterSelect
            id="f-time"
            label="Max time"
            value={maxMinutes}
            onChange={setMaxMinutes}
            options={[{ value: ANY, label: 'Any time' }, ...[15, 20, 30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))]}
          />
          <FilterSelect id="f-diff" label="Difficulty" value={difficulty} onChange={setDifficulty} options={[{ value: ANY, label: 'Any' }, ...DIFFICULTIES]} />
          <FilterSelect id="f-meal" label="Meal" value={mealType} onChange={setMealType} options={[{ value: ANY, label: 'Any meal' }, ...SLOTS]} />
          <div className="grid gap-2">
            <span id="f-servings" className={LABEL}>
              Servings
            </span>
            <div role="group" aria-labelledby="f-servings" className="flex h-12 items-center justify-between rounded-xl border bg-background/60 px-1.5">
              <Button variant="ghost" size="icon-sm" onClick={() => setServings(Math.max(1, servings - 1))} disabled={servings <= 1} aria-label="Fewer servings">
                <Minus />
              </Button>
              <span className="font-semibold text-heading" aria-live="polite">
                {servings}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => setServings(Math.min(20, servings + 1))} disabled={servings >= 20} aria-label="More servings">
                <Plus />
              </Button>
            </div>
          </div>
        </div>

        {stock.length > 0 && (
          <fieldset className="mt-7 border-t pt-6">
            <legend className={cn(LABEL, 'float-left mb-3 w-full')}>Prioritise ingredients</legend>
            <div className="clear-both flex flex-wrap gap-2">
              {stock.slice(0, 30).map((i) => {
                const on = prioritize.includes(i.name)
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPrioritize(on ? prioritize.filter((p) => p !== i.name) : [...prioritize, i.name])}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold capitalize transition-colors',
                      on ? 'border-terracotta bg-terracotta text-white shadow-sm' : 'border-transparent bg-sage-soft text-heading hover:border-terracotta/40',
                    )}
                  >
                    {on ? <X className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                    {i.name}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {looserDiet && (
          <p className="mt-4 flex items-center gap-2 text-sm text-warn-foreground">
            <Info className="size-4" aria-hidden /> This search uses a different diet from your settings ({DIETS.find((d) => d.value === prefDiet)?.label}). Allergies and exclusions still apply.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AllergyDisclaimer className="max-w-xl" />
          <Button size="lg" className="h-13 rounded-xl px-8" onClick={run} disabled={generate.isPending || !aiReady}>
            {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {generate.isPending ? 'Cooking up ideas…' : 'Generate recipes'}
          </Button>
        </div>
        {!aiReady && <p className="mt-2 text-right text-sm text-muted-foreground">AI is not configured on the server, so new recipes can't be generated.</p>}
      </section>

      {!inventory.isPending && !stock.length && (
        <Alert className="mb-6">
          <AlertTriangle aria-hidden />
          <AlertTitle>Your inventory is empty</AlertTitle>
          <AlertDescription>
            Recipes will list every ingredient as missing.{' '}
            <Link to="/app/scan" className="font-medium text-primary underline">
              Scan your fridge
            </Link>{' '}
            or{' '}
            <Link to="/app/ingredients" className="font-medium text-primary underline">
              add ingredients
            </Link>{' '}
            for better matches.
          </AlertDescription>
        </Alert>
      )}

      {(generate.isPending || generate.data) && (
        <section aria-label="New recipes" className="mb-10" aria-busy={generate.isPending}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-[1.75rem] font-medium">Fresh suggestions</h2>
            {generate.data?.mock && <MockBadge />}
          </div>
          {generate.isPending ? (
            <CardGridSkeleton count={4} className="xl:grid-cols-2" />
          ) : generate.data && (
            <>
              {generate.data.excluded.length > 0 && (
                <Alert className="mb-4">
                  <Info aria-hidden />
                  <AlertTitle>
                    {generate.data.excluded.length} suggestion{generate.data.excluded.length === 1 ? ' was' : 's were'} hidden
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {generate.data.excluded.map((x) => (
                        <li key={x.title}>
                          <strong>{x.title}</strong>: {x.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {generate.data.recipes.length ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {generate.data.recipes.map((r) => (
                    <RecipeCard key={r.id} recipe={r} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={ChefHat} title="No recipes matched" description="Try a longer time limit, another cuisine, or fewer filters." />
              )}
            </>
          )}
        </section>
      )}

      <section aria-label="Your recipes">
        <div className="mb-4">
          <h2 className="text-[1.75rem] font-medium">{tab === 'saved' ? 'Saved recipes' : 'Your recipes'}</h2>
        </div>
        {list.isPending ? (
          <CardGridSkeleton />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data.items.length ? (
          <EmptyState
            icon={ChefHat}
            title={tab === 'saved' ? 'No saved recipes yet' : 'No recipes yet'}
            description={tab === 'saved' ? 'Tap the bookmark on any recipe to save it here.' : 'Use the filters above and generate your first recipes.'}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Availability is recalculated from your current inventory.{' '}
              <Badge variant="outline">{list.data.total} total</Badge>
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {list.data.items.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
