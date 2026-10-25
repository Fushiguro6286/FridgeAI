import { Cookie, CookingPot, Croissant, Egg, Fish, Salad, Sandwich, Soup, UtensilsCrossed, Wheat, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Decorative artwork instead of invented photo URLs. Picks an icon and palette from the title.
const RULES: [RegExp, LucideIcon][] = [
  [/omelette|egg|bhurji/i, Egg],
  [/sandwich|toast|wrap|roll/i, Sandwich],
  [/soup|rasam|shorba|stew/i, Soup],
  [/salad|chaat|raita|slaw/i, Salad],
  [/fish|prawn|seafood|machli/i, Fish],
  [/pasta|noodle|pulao|biryani|rice|khichdi|upma|poha/i, Wheat],
  [/paratha|dosa|idli|pancake|chilla|bread/i, Croissant],
  [/cookie|ladoo|halwa|kheer|dessert|sweet/i, Cookie],
  [/curry|dal|sabzi|masala|korma|paneer|rajma|chole/i, CookingPot],
]

const PALETTES = [
  'from-[oklch(0.9_0.05_145)] to-[oklch(0.83_0.07_155)] text-[oklch(0.38_0.07_160)]',
  'from-[oklch(0.93_0.05_80)] to-[oklch(0.86_0.08_65)] text-[oklch(0.45_0.09_55)]',
  'from-[oklch(0.92_0.04_40)] to-[oklch(0.84_0.07_40)] text-[oklch(0.45_0.1_35)]',
  'from-[oklch(0.92_0.03_110)] to-[oklch(0.85_0.06_120)] text-[oklch(0.4_0.07_130)]',
]

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function RecipeArt({ title, className, size = 'md' }: { title: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = RULES.find(([re]) => re.test(title))?.[1] ?? UtensilsCrossed
  const palette = PALETTES[hash(title) % PALETTES.length]
  return (
    <div
      aria-hidden
      className={cn(
        'relative grid place-items-center overflow-hidden bg-linear-to-br dark:opacity-85',
        palette,
        size === 'sm' ? 'h-20' : size === 'lg' ? 'h-48 sm:h-60' : 'h-32',
        className,
      )}
    >
      <span className="absolute -right-6 -top-6 size-24 rounded-full bg-white/25" />
      <span className="absolute -bottom-8 -left-4 size-28 rounded-full bg-white/20" />
      <Icon className={cn('relative drop-shadow-sm', size === 'sm' ? 'size-8' : size === 'lg' ? 'size-20' : 'size-12')} strokeWidth={1.5} />
    </div>
  )
}
