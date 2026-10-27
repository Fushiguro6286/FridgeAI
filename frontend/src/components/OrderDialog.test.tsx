import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderDialog } from '@/components/OrderDialog'
import { loadNotepad } from '@/lib/order'
import { renderWithProviders } from '@/test/utils'

const items = [
  { key: 'paneer', name: 'paneer', quantity: 200, unit: 'g' },
  { key: 'tomato', name: 'tomato', quantity: null, unit: null, inStock: true },
]

describe('OrderDialog', () => {
  it('pre-selects only missing items, links to the chosen store and marks the selection bought', async () => {
    const user = userEvent.setup()
    const onMarkBought = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<OrderDialog open onOpenChange={() => {}} items={items} onMarkBought={onMarkBought} />)

    expect(screen.getByRole('checkbox', { name: /paneer/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /tomato/ })).not.toBeChecked()
    expect(screen.getByText(/You may have some/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Zepto/ }))
    expect(screen.getByRole('link', { name: /Find paneer on Zepto/ })).toHaveAttribute('href', 'https://www.zeptonow.com/search?query=paneer')

    await user.click(screen.getByRole('button', { name: /Mark 1 as bought/ }))
    expect(onMarkBought).toHaveBeenCalledWith(['paneer'])
  })
})

it('opens a notepad window with the selected items', async () => {
  const user = userEvent.setup()
  const open = vi.spyOn(window, 'open').mockReturnValue({ focus: () => {} } as Window)
  renderWithProviders(<OrderDialog open onOpenChange={() => {}} items={items} />)

  await user.click(screen.getByRole('button', { name: /Open notepad/ }))
  expect(open).toHaveBeenCalledWith('/notepad', 'fridgeai-notepad', expect.stringContaining('popup'))
  expect(loadNotepad()?.items).toEqual([{ name: 'paneer', qty: '200 g', done: false }])
  open.mockRestore()
})
