import { z } from 'zod'
import type { Category, Diet, Priority } from '@/types/api'

const categories = ['vegetables', 'fruits', 'dairy', 'eggs', 'meat_seafood', 'grains', 'pulses', 'spices', 'sauces', 'frozen', 'other'] as const satisfies readonly Category[]
const diets = ['none', 'vegetarian', 'vegan', 'eggetarian', 'non_vegetarian'] as const satisfies readonly Diet[]
const priorities = ['normal', 'use_soon', 'low'] as const satisfies readonly Priority[]

/** Optional numeric text field: '' means "unknown". Kept as a string so the input stays editable. */
export const optionalNumber = (max = 1_000_000) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max), {
      message: 'Enter a number of 0 or more, or leave empty',
    })

export const toNumberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
export const toTextOrNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    display_name: z.string().trim().min(1, 'Tell us what to call you').max(80),
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
export type RegisterValues = z.infer<typeof registerSchema>

export const ingredientSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    category: z.enum(categories),
    quantity: optionalNumber(),
    unit: z.string().trim().max(20, 'Max 20 characters'),
    purchase_date: z.string(),
    expiry_date: z.string(),
    storage_notes: z.string().max(500, 'Max 500 characters'),
    priority: z.enum(priorities),
  })
  .refine((v) => !v.purchase_date || !v.expiry_date || v.expiry_date >= v.purchase_date, {
    path: ['expiry_date'],
    message: 'Expiry date is before the purchase date',
  })
export type IngredientValues = z.infer<typeof ingredientSchema>

export const reviewSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Name is required').max(120),
        category: z.enum(categories),
        quantity: optionalNumber(),
        unit: z.string().trim().max(20, 'Max 20 characters'),
        confidence: z.enum(['low', 'medium', 'high', 'manual']),
        notes: z.string(),
      }),
    )
    .min(1, 'Add at least one ingredient'),
})
export type ReviewValues = z.infer<typeof reviewSchema>

export const shoppingItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(120),
  quantity: optionalNumber(),
  unit: z.string().trim().max(20),
  estimated_price: optionalNumber(10_000_000),
})
export type ShoppingItemValues = z.infer<typeof shoppingItemSchema>

const intIn = (min: number, max: number, label: string) =>
  z.number({ error: `${label} is required` }).int().min(min, `${label} must be at least ${min}`).max(max, `${label} must be ${max} or less`)

export const settingsSchema = z.object({
  diet: z.enum(diets),
  allergies: z.array(z.string()),
  exclusions: z.array(z.string()),
  cuisines: z.array(z.string()),
  household_size: intIn(1, 20, 'Household size'),
  servings: intIn(1, 20, 'Servings'),
  max_cook_minutes: optionalNumber(600).refine((v) => v === '' || Number(v) >= 5, 'At least 5 minutes, or leave empty'),
  weekly_budget: optionalNumber(10_000_000),
  currency: z.string().trim().length(3, 'Use a 3-letter code like INR'),
  measurement_system: z.enum(['metric', 'us']),
  theme: z.enum(['light', 'dark', 'system']),
})
export type SettingsValues = z.infer<typeof settingsSchema>
