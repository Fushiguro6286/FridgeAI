import { describe, expect, it } from 'vitest'
import { addDays, expiryLabel, formatMinutes, formatQty, isoDate, scaleQty } from '@/lib/format'
import { groupShopping } from '@/lib/shopping'
import type { ShoppingItem } from '@/types/api'

describe('formatting', () => {
  it('formats quantities and unknowns', () => {
    expect(formatQty(2, 'pcs')).toBe('2 pcs')
    expect(formatQty(0.333, 'kg')).toBe('0.33 kg')
    expect(formatQty(null, null)).toBe('')
  })

  it('scales recipe quantities for servings', () => {
    expect(scaleQty(200, 2, 4)).toBe(400)
    expect(scaleQty(1, 2, 3)).toBe(1.5)
    expect(scaleQty(0.25, 2, 1)).toBe(0.13)
    expect(scaleQty(null, 2, 4)).toBeNull()
  })

  it('handles dates across month ends', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })

  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(90)).toBe('1 h 30 min')
  })
})

describe('groupShopping', () => {
  const item = (o: Partial<ShoppingItem>): ShoppingItem => ({
    id: 1,
    name: 'x',
    quantity: null,
    unit: null,
    recipes: [],
    checked: false,
    is_custom: false,
    status: 'buy',
    estimated_price: null,
    ...o,
  })

  it('splits to-buy, check-stock and done, sorted by name', () => {
    const g = groupShopping([
      item({ id: 1, name: 'tomato' }),
      item({ id: 2, name: 'atta' }),
      item({ id: 3, name: 'paneer', status: 'check' }),
      item({ id: 4, name: 'milk', checked: true, status: 'check' }),
    ])
    expect(g.buy.map((i) => i.name)).toEqual(['atta', 'tomato'])
    expect(g.check.map((i) => i.name)).toEqual(['paneer'])
    expect(g.done.map((i) => i.name)).toEqual(['milk'])
  })
})

describe('expiryLabel', () => {
  it('describes days left in plain words', () => {
    expect(expiryLabel(null)).toBeNull()
    expect(expiryLabel(isoDate())).toBe('Expires today')
    expect(expiryLabel(addDays(isoDate(), 1))).toBe('Expires tomorrow')
    expect(expiryLabel(addDays(isoDate(), 3))).toBe('Expires in 3 days')
    expect(expiryLabel(addDays(isoDate(), -1))).toBe('Past expiry date')
  })
})
