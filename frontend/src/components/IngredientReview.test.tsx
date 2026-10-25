import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IngredientReview, toRows } from '@/components/IngredientReview'
import { checkFile } from '@/pages/Scan'
import { renderWithProviders } from '@/test/utils'

const detected = toRows([
  { name: 'tomato', category: 'vegetables', estimated_quantity: 4, unit: 'pcs', confidence: 'high', notes: null },
  { name: 'mystery jar', category: 'other', estimated_quantity: null, unit: null, confidence: 'low', notes: 'Closed container' },
])

describe('IngredientReview', () => {
  it('shows AI suggestions with confidence and lets the user edit, remove and add before confirming', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProviders(<IngredientReview initial={detected} onConfirm={onConfirm} />)

    expect(screen.getByText('High confidence')).toBeInTheDocument()
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument()

    const names = screen.getAllByLabelText('Name')
    await user.clear(names[0])
    await user.type(names[0], 'cherry tomato')
    await user.click(screen.getByRole('button', { name: 'Remove mystery jar' }))

    await user.click(screen.getByRole('button', { name: /Add missing ingredient/ }))
    const all = screen.getAllByLabelText('Name')
    await user.type(all[all.length - 1], 'paneer')
    await user.type(screen.getAllByLabelText('Quantity')[1], '200')
    await user.type(screen.getAllByLabelText('Unit')[1], 'g')

    await user.click(screen.getByRole('button', { name: /Confirm 2 ingredients/ }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
    expect(onConfirm.mock.calls[0][0]).toEqual([
      { name: 'cherry tomato', category: 'vegetables', quantity: 4, unit: 'pcs', storage_notes: null, source: 'scan' },
      { name: 'paneer', category: 'other', quantity: 200, unit: 'g', storage_notes: null, source: 'manual' },
    ])
  })

  it('blocks confirming rows with empty names or bad quantities', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProviders(<IngredientReview initial={[]} onConfirm={onConfirm} />)
    await user.type(screen.getByLabelText('Quantity'), 'lots')
    await user.click(screen.getByRole('button', { name: /Confirm 1 ingredient/ }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('keeps unknown quantities as null instead of guessing', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProviders(<IngredientReview initial={detected.slice(1)} onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: /Confirm 1 ingredient/ }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0][0]).toMatchObject({ name: 'mystery jar', quantity: null, storage_notes: 'Closed container' })
  })
})

describe('checkFile', () => {
  const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type })

  it('accepts supported images under the limit', () => {
    expect(checkFile(file('f.jpg', 'image/jpeg', 1000), 8)).toBeNull()
    expect(checkFile(file('f.webp', 'image/webp', 1000), 8)).toBeNull()
  })

  it('rejects other types, empty and oversized files', () => {
    expect(checkFile(file('f.gif', 'image/gif', 10), 8)).toMatch(/JPG, PNG or WEBP/)
    expect(checkFile(file('f.png', 'image/png', 0), 8)).toMatch(/empty/)
    expect(checkFile(file('f.png', 'image/png', 2 * 1024 * 1024), 1)).toMatch(/limit is 1 MB/)
  })
})
