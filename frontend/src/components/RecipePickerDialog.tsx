import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MatchBadge } from '@/components/RecipeCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRecipes } from '@/hooks/recipes'
import { formatMinutes } from '@/lib/format'
import type { Recipe, Slot } from '@/types/api'

/** Choose one of the user's existing recipes (ranked by ingredient match). */
export function RecipePickerDialog({
  open,
  onOpenChange,
  onPick,
  slot,
  title = 'Choose a recipe',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (r: Recipe) => void
  slot?: Slot
  title?: string
}) {
  const [q, setQ] = useState('')
  const recipes = useRecipes({ sort: 'best_match', limit: 100 })
  const all = recipes.data?.items ?? []
  const filtered = all
    .filter((r) => r.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!slot && b.meal_types.includes(slot)) - Number(!!slot && a.meal_types.includes(slot)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Ranked by how many ingredients you already have.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your recipes" className="pl-8" aria-label="Search recipes" />
        </div>
        <div className="-mx-1 max-h-[50dvh] space-y-1.5 overflow-y-auto px-1">
          {recipes.isPending && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          {!recipes.isPending && !filtered.length && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <p>No recipes yet. Generate some from your ingredients first.</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/app/recipes">Discover recipes</Link>
              </Button>
            </div>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {formatMinutes(r.total_minutes)} · {r.meal_types.join(', ')}
                </span>
              </span>
              <MatchBadge recipe={r} />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
