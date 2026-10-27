import type { Category, Diet, Difficulty, Slot } from '@/types/api'

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'meat_seafood', label: 'Meat & seafood' },
  { value: 'grains', label: 'Grains & cereals' },
  { value: 'pulses', label: 'Pulses & legumes' },
  { value: 'spices', label: 'Spices' },
  { value: 'sauces', label: 'Sauces & condiments' },
  { value: 'frozen', label: 'Frozen foods' },
  { value: 'other', label: 'Other' },
]
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? 'Other'

const CATEGORY_EMOJI: Record<Category, string> = {
  vegetables: '🥬', fruits: '🍎', dairy: '🧀', eggs: '🥚', meat_seafood: '🍗', grains: '🌾',
  pulses: '🫘', spices: '🌶️', sauces: '🥫', frozen: '🧊', other: '🍽️',
}
export const categoryEmoji = (c: string) => CATEGORY_EMOJI[c as Category] ?? '🍽️'

/** Short expiry label: "Expires today", "Expires in 2 days", "Past expiry date", or null when there's no date. */
export function expiryLabel(expiry: string | null): string | null {
  const d = daysUntil(expiry)
  if (d === null) return null
  return d < 0 ? 'Past expiry date' : d === 0 ? 'Expires today' : d === 1 ? 'Expires tomorrow' : `Expires in ${d} days`
}

export const DIETS: { value: Diet; label: string; hint: string }[] = [
  { value: 'none', label: 'No preference', hint: 'Anything goes' },
  { value: 'vegetarian', label: 'Vegetarian', hint: 'No meat, fish or eggs' },
  { value: 'eggetarian', label: 'Eggetarian', hint: 'Vegetarian plus eggs' },
  { value: 'vegan', label: 'Vegan', hint: 'No animal products' },
  { value: 'non_vegetarian', label: 'Non-vegetarian', hint: 'Includes meat and fish' },
]
export const dietLabel = (d: string) => DIETS.find((x) => x.value === d)?.label ?? d

export const CUISINES = [
  'Indian', 'North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Italian',
  'Chinese-inspired', 'Mediterranean', 'Mexican', 'Thai', 'Continental',
]

export const SLOTS: { value: Slot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]
export const slotLabel = (s: string) => SLOTS.find((x) => x.value === s)?.label ?? s

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function formatQty(quantity: number | null | undefined, unit: string | null | undefined): string {
  if (quantity == null) return unit ? unit : ''
  const n = Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 100) / 100)
  return unit ? `${n} ${unit}` : n
}

/** Scale a recipe quantity to a new serving count, rounded sensibly for the kitchen. */
export function scaleQty(quantity: number | null, from: number, to: number): number | null {
  if (quantity == null || from <= 0) return quantity
  const v = (quantity * to) / from
  if (v >= 10) return Math.round(v)
  if (v >= 1) return Math.round(v * 4) / 4
  return Math.round(v * 100) / 100
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

/** Local date as YYYY-MM-DD (not UTC, so "today" is the user's today). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseIsoDate(s)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function daysUntil(s: string | null): number | null {
  if (!s) return null
  const today = parseIsoDate(isoDate())
  return Math.round((parseIsoDate(s).getTime() - today.getTime()) / 86_400_000)
}

export function shortDay(s: string): string {
  return parseIsoDate(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
