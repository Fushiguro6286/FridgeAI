import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecipeCard } from '@/components/RecipeCard'
import { renderWithProviders, sampleRecipe } from '@/test/utils'

describe('RecipeCard', () => {
  it('separates available, missing and optional ingredients', () => {
    renderWithProviders(<RecipeCard recipe={sampleRecipe} />)
    expect(screen.getByRole('heading', { name: 'Paneer Bhurji' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'You have' })).getAllByRole('listitem')).toHaveLength(3)
    expect(within(screen.getByRole('list', { name: 'Missing' })).getByText('green chilli')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Optional & pantry staples' })).getByText('salt')).toBeInTheDocument()
    expect(screen.getByText('75% in your kitchen')).toBeInTheDocument() // 3 of 4 required
    expect(screen.getByRole('button', { name: 'Save Paneer Bhurji' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Add Paneer Bhurji to meal plan' })).toBeInTheDocument()
  })
})
