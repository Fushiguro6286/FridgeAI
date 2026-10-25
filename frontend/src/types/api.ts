// Mirrors backend/app/schemas.py

export type Category =
  | 'vegetables' | 'fruits' | 'dairy' | 'eggs' | 'meat_seafood' | 'grains'
  | 'pulses' | 'spices' | 'sauces' | 'frozen' | 'other'
export type Confidence = 'low' | 'medium' | 'high'
export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Diet = 'none' | 'vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Priority = 'normal' | 'use_soon' | 'low'

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface User {
  id: number
  email: string
  display_name: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Health {
  status: string
  ai_configured: boolean
  ai_mock_mode: boolean
  max_upload_mb: number
}

export interface Preferences {
  diet: Diet
  allergies: string[]
  exclusions: string[]
  cuisines: string[]
  household_size: number
  servings: number
  max_cook_minutes: number | null
  weekly_budget: number | null
  currency: string
  measurement_system: 'metric' | 'us'
  theme: 'light' | 'dark' | 'system'
}

export interface DetectedIngredient {
  name: string
  category: Category
  estimated_quantity: number | null
  unit: string | null
  confidence: Confidence
  notes: string | null
}

export interface Detection {
  image_quality: 'clear' | 'unclear' | 'no_food'
  ingredients: DetectedIngredient[]
  message: string | null
  mock: boolean
  model: string | null
}

export interface InventoryItem {
  id: number
  name: string
  category: Category
  quantity: number | null
  unit: string | null
  purchase_date: string | null
  expiry_date: string | null
  storage_notes: string | null
  priority: Priority
  status: 'available' | 'consumed'
  source: 'manual' | 'scan'
  created_at: string
  updated_at: string
}

export interface InventoryInput {
  name: string
  category: Category
  quantity?: number | null
  unit?: string | null
  purchase_date?: string | null
  expiry_date?: string | null
  storage_notes?: string | null
  priority?: Priority
  source?: 'manual' | 'scan'
}

export interface RecipeIngredient {
  name: string
  quantity: number | null
  unit: string | null
  optional: boolean
  status: 'available' | 'missing' | 'optional'
}

export interface Recipe {
  id: number
  title: string
  description: string
  cuisine: string
  meal_types: Slot[]
  diet_tags: string[]
  prep_minutes: number
  cook_minutes: number
  total_minutes: number
  servings: number
  difficulty: Difficulty
  ingredients: RecipeIngredient[]
  available: string[]
  missing: string[]
  optional: string[]
  steps: string[]
  substitutions: { ingredient: string; substitute: string }[]
  warnings: string[]
  nutrition_note: string | null
  source: 'ai' | 'mock'
  is_saved: boolean
  rank: { score: number; coverage: number; breakdown: Record<string, number> } | null
  created_at: string
}

export interface RecipeGenerateInput {
  count?: number
  cuisine?: string | null
  diet?: Diet | null
  max_minutes?: number | null
  servings?: number | null
  difficulty?: Difficulty | null
  meal_type?: Slot | null
  prioritize?: string[]
}

export interface RecipeGenerateResult {
  recipes: Recipe[]
  excluded: { title: string; reason: string }[]
  mock: boolean
}

export interface MealPlanSummary {
  id: number
  name: string
  start_date: string
  days: number
  include_snacks: boolean
  created_at: string
}

export interface PlanEntry {
  id: number
  day_date: string
  slot: Slot
  servings: number
  recipe: Recipe
}

export interface MissingIngredient {
  name: string
  quantity: number | null
  unit: string | null
  recipes: string[]
  status: 'buy' | 'check'
}

export interface MealPlan extends MealPlanSummary {
  notes: string[]
  entries: PlanEntry[]
  missing: MissingIngredient[]
  mock: boolean
}

export interface MealPlanGenerateInput {
  start_date: string
  days: number
  include_snacks: boolean
  servings?: number | null
}

export interface ShoppingItem {
  id: number
  name: string
  quantity: number | null
  unit: string | null
  recipes: string[]
  checked: boolean
  is_custom: boolean
  status: 'buy' | 'check'
  estimated_price: number | null
}

export interface ShoppingList {
  id: number
  meal_plan_id: number | null
  meal_plan_name: string | null
  items: ShoppingItem[]
  estimated_total: number | null
  priced_items: number
  currency: string
}
