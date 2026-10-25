import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import type { Recipe } from '@/types/api'

export function renderWithProviders(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

export const sampleRecipe: Recipe = {
  id: 7,
  title: 'Paneer Bhurji',
  description: 'Scrambled paneer with onion and tomato.',
  cuisine: 'North Indian',
  meal_types: ['lunch', 'dinner'],
  diet_tags: ['vegetarian'],
  prep_minutes: 10,
  cook_minutes: 15,
  total_minutes: 25,
  servings: 2,
  difficulty: 'easy',
  ingredients: [
    { name: 'paneer', quantity: 200, unit: 'g', optional: false, status: 'available' },
    { name: 'onion', quantity: 1, unit: 'pcs', optional: false, status: 'available' },
    { name: 'tomato', quantity: 2, unit: 'pcs', optional: false, status: 'available' },
    { name: 'green chilli', quantity: 1, unit: 'pcs', optional: false, status: 'missing' },
    { name: 'salt', quantity: null, unit: null, optional: true, status: 'optional' },
  ],
  available: ['paneer', 'onion', 'tomato'],
  missing: ['green chilli'],
  optional: ['salt'],
  steps: ['Crumble paneer.', 'Cook everything.'],
  substitutions: [],
  warnings: ['Contains dairy'],
  nutrition_note: null,
  source: 'ai',
  is_saved: false,
  rank: null,
  created_at: '2026-01-01T00:00:00Z',
}
