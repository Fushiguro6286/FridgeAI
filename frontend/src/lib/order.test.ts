import { describe, expect, it } from 'vitest'
import { NOTEPAD_KEY, loadNotepad, notepadFrom, orderText, saveNotepad, searchUrl, storeById, whatsappUrl } from '@/lib/order'

describe('order links', () => {
  it('builds an encoded store search for the item name only', () => {
    expect(searchUrl('blinkit', ' green chilli ')).toBe('https://blinkit.com/s/?q=green%20chilli')
    expect(searchUrl('zepto', 'dahi & curd')).toBe('https://www.zeptonow.com/search?query=dahi%20%26%20curd')
  })

  it('falls back to the first store for unknown ids', () => {
    expect(storeById('nope').id).toBe('blinkit')
  })

  it('formats a readable list and a WhatsApp link', () => {
    const items = [
      { key: 1, name: 'eggs', quantity: 2, unit: null },
      { key: 2, name: 'milk', quantity: 0.5, unit: 'l' },
      { key: 3, name: 'salt', quantity: null, unit: null },
    ]
    expect(orderText(items)).toBe('Grocery list (from FridgeAI):\n• eggs – 2\n• milk – 0.5 l\n• salt')
    expect(whatsappUrl(items)).toMatch(/^https:\/\/wa\.me\/\?text=Grocery%20list/)
  })
})

describe('order notepad', () => {
  it('saves and reloads the list with quantities and notes', () => {
    saveNotepad(notepadFrom([{ key: 1, name: 'paneer', quantity: 200, unit: 'g' }], 'zepto', 'bread'))
    expect(loadNotepad()).toEqual({ store: 'zepto', items: [{ name: 'paneer', qty: '200 g', done: false }], notes: 'bread' })
  })

  it('returns null for missing or broken data', () => {
    localStorage.removeItem(NOTEPAD_KEY)
    expect(loadNotepad()).toBeNull()
    localStorage.setItem(NOTEPAD_KEY, '{oops')
    expect(loadNotepad()).toBeNull()
  })
})
