import { Bookmark, BookmarkCheck, CalendarPlus, ChefHat, Clock, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { AddToPlanDialog } from '@/components/AddToPlanDialog'
import { RecipeArt } from '@/components/RecipeArt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToggleSave } from '@/hooks/recipes'
import { errorMessage } from '@/lib/api'
import { formatMinutes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/types/api'

export function MatchBadge({ recipe }: { recipe: Recipe }) {
  const required = recipe.available.length + recipe.missing.length
  const pct = required ? Math.round((recipe.available.length / required) * 100) : 100
  return (
    <Badge variant={pct >= 80 ? 'ok' : pct >= 50 ? 'sage' : 'warn'} title="Share of required ingredients you already have">
      {pct}% in your kitchen
    </Badge>
  )
}

export function SaveButton({ recipe, size = 'icon' }: { recipe: Recipe; size?: 'icon' | 'default' }) {
  const toggle = useToggleSave()
  const saved = recipe.is_saved
  async function onClick() {
    try {
      await toggle.mutateAsync({ id: recipe.id, save: !saved })
      toast.success(saved ? 'Removed from saved recipes' : 'Recipe saved')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <Button
      variant={saved ? 'secondary' : 'outline'}
      size={size}
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
    >
      <Icon className={cn(saved && 'text-primary')} />
      {size === 'default' && (saved ? 'Saved' : 'Save')}
    </Button>
  )
}

function Chips({ label, items, variant }: { label: string; items: string[]; variant: 'ok' | 'warn' | 'outline' }) {
  if (!items.length) return null
  const shown = items.slice(0, 5)
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {label} ({items.length})
      </div>
      <ul className="flex flex-wrap gap-1" aria-label={label}>
        {shown.map((n) => (
          <li key={n}>
            <Badge variant={variant} className="font-normal">
              {n}
            </Badge>
          </li>
        ))}
        {items.length > shown.length && <li className="text-xs text-muted-foreground">+{items.length - shown.length} more</li>}
      </ul>
    </div>
  )
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [planOpen, setPlanOpen] = useState(false)
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-(--shadow-card) transition-shadow hover:shadow-md">
      <Link to={`/app/recipes/${recipe.id}`} tabIndex={-1} aria-hidden>
        <RecipeArt title={recipe.title} />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <MatchBadge recipe={recipe} />
          {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
          {recipe.source === 'mock' && <Badge variant="warn">Sample</Badge>}
        </div>
        <div>
          <h3 className="text-lg font-semibold leading-snug">
            <Link to={`/app/recipes/${recipe.id}`} className="rounded hover:text-primary">
              {recipe.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            <dt className="sr-only">Total time</dt>
            <dd>{formatMinutes(recipe.total_minutes)}</dd>
          </div>
          <div className="flex items-center gap-1 capitalize">
            <ChefHat className="size-4" aria-hidden />
            <dt className="sr-only">Difficulty</dt>
            <dd>{recipe.difficulty}</dd>
          </div>
          <div className="flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            <dt className="sr-only">Servings</dt>
            <dd>{recipe.servings} servings</dd>
          </div>
        </dl>
        <div className="space-y-2">
          <Chips label="You have" items={recipe.available} variant="ok" />
          <Chips label="Missing" items={recipe.missing} variant="warn" />
          <Chips label="Optional & pantry staples" items={recipe.optional} variant="outline" />
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link to={`/app/recipes/${recipe.id}`}>View recipe</Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPlanOpen(true)} aria-label={`Add ${recipe.title} to meal plan`}>
            <CalendarPlus />
          </Button>
          <SaveButton recipe={recipe} />
        </div>
      </div>
      {planOpen && <AddToPlanDialog recipe={recipe} open={planOpen} onOpenChange={setPlanOpen} />}
    </article>
  )
}
