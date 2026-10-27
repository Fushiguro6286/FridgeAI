import { Bookmark, BookmarkCheck, CalendarPlus, CircleCheck, CircleAlert, Star, Users } from 'lucide-react'
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

export function matchPct(recipe: Recipe) {
  const required = recipe.available.length + recipe.missing.length
  return required ? Math.round((recipe.available.length / required) * 100) : 100
}

/** "Match: 85%" pill laid over a recipe photo. */
export function MatchPill({ recipe, className }: { recipe: Recipe; className?: string }) {
  const pct = matchPct(recipe)
  const Icon = pct >= 80 ? CircleCheck : CircleAlert
  return (
    <span
      title="Share of required ingredients you already have"
      className={cn('inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#1a3c2f] shadow-sm backdrop-blur', className)}
    >
      <Icon className={cn('size-3.5', pct >= 80 ? 'text-green-600' : 'text-amber-500')} aria-hidden />
      Match: {pct}%
    </span>
  )
}

export function MatchBadge({ recipe }: { recipe: Recipe }) {
  const pct = matchPct(recipe)
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
      className={cn(size === 'icon' && 'rounded-full')}
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
  if (variant === 'warn') {
    return (
      <div className="rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-wider text-warn-foreground">
        <span>Missing: </span>
        <ul aria-label={label} className="inline">
          {shown.map((n, i) => (
            <li key={n} className="inline">
              {n}
              {i < shown.length - 1 && ', '}
            </li>
          ))}
          {items.length > shown.length && <li className="inline"> +{items.length - shown.length} more</li>}
        </ul>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} ({items.length})
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {shown.map((n) => (
          <li key={n}>
            <Badge variant={variant === 'ok' ? 'sage' : variant} className="rounded-md font-semibold capitalize">
              {n}
            </Badge>
          </li>
        ))}
        {items.length > shown.length && <li className="self-center text-xs text-muted-foreground">+{items.length - shown.length} more</li>}
      </ul>
    </div>
  )
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [planOpen, setPlanOpen] = useState(false)
  const diet = recipe.diet_tags[0]
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-(--shadow-card) transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
      <Link to={`/app/recipes/${recipe.id}`} tabIndex={-1} aria-hidden className="relative block">
        <RecipeArt title={recipe.title} className="h-52 sm:h-56" />
        <MatchPill recipe={recipe} className="absolute right-4 top-4" />
        {diet && (
          <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white backdrop-blur">
            {diet.replace(/_/g, ' ')}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.cuisine && <span aria-hidden>•</span>}
          <span>{formatMinutes(recipe.total_minutes)}</span>
          {recipe.source === 'mock' && <Badge variant="warn">Sample</Badge>}
        </div>
        <div>
          <h3 className="text-2xl font-medium leading-snug">
            <Link to={`/app/recipes/${recipe.id}`} className="rounded hover:text-terracotta">
              {recipe.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        </div>
        <div className="space-y-2.5">
          <Chips label="Missing" items={recipe.missing} variant="warn" />
          <Chips label="You have" items={recipe.available} variant="ok" />
          <Chips label="Optional & pantry staples" items={recipe.optional} variant="outline" />
        </div>
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs font-semibold">
          <span className={cn('flex items-center gap-1 capitalize', recipe.difficulty === 'easy' ? 'text-ok' : 'text-warn-foreground')}>
            <Star className="size-3.5 fill-current" aria-hidden />
            <span className="sr-only">Difficulty:</span> {recipe.difficulty}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="size-3.5" aria-hidden /> {recipe.servings} servings
          </span>
          <span className="ml-auto flex gap-2">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => setPlanOpen(true)} aria-label={`Add ${recipe.title} to meal plan`}>
              <CalendarPlus />
            </Button>
            <SaveButton recipe={recipe} />
          </span>
        </div>
      </div>
      {planOpen && <AddToPlanDialog recipe={recipe} open={planOpen} onOpenChange={setPlanOpen} />}
    </article>
  )
}
