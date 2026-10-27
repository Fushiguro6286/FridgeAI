import { formatQty } from '@/lib/format'

export interface OrderItem {
  key: string | number
  name: string
  quantity: number | null
  unit: string | null
  /** You may already have some (stock with unknown or different units): shown but not pre-selected. */
  inStock?: boolean
}

// None of these apps lets another website fill a user's cart, so we open the app's own search for each item.
// Search URL formats are not official APIs and can change; update them here if a link stops working.
export const STORES = [
  { id: 'blinkit', name: 'Blinkit', note: '10–15 min · by Zomato', tint: 'bg-[#f8cb46] text-[#1c1c1c]', brand: 'text-[#b8860b] border-[#f8cb46] bg-[#fffbea] dark:bg-[#f8cb46]/10', search: (q: string) => `https://blinkit.com/s/?q=${q}` },
  { id: 'zepto', name: 'Zepto', note: '10 min delivery', tint: 'bg-[#5a1e96] text-white', brand: 'text-[#7b2cbf] border-[#9d4edd] bg-[#f7f0fd] dark:bg-[#9d4edd]/10 dark:text-[#c39bf0]', search: (q: string) => `https://www.zeptonow.com/search?query=${q}` },
  { id: 'instamart', name: 'Swiggy Instamart', note: 'Quick delivery', tint: 'bg-[#fc8019] text-white', brand: 'text-[#d9600a] border-[#fc8019] bg-[#fff4eb] dark:bg-[#fc8019]/10 dark:text-[#ffa45c]', search: (q: string) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${q}` },
  { id: 'bigbasket', name: 'BigBasket', note: 'Same day or next day', tint: 'bg-[#84c225] text-[#1c1c1c]', brand: 'text-[#4f7d12] border-[#84c225] bg-[#f4fae9] dark:bg-[#84c225]/10 dark:text-[#a9db5c]', search: (q: string) => `https://www.bigbasket.com/ps/?q=${q}` },
  { id: 'jiomart', name: 'JioMart', note: 'Daily essentials', tint: 'bg-[#0c5273] text-white', brand: 'text-[#0c5273] border-[#0c5273] bg-[#eaf3f8] dark:bg-[#4ba3cf]/10 dark:text-[#7cc3e6] dark:border-[#4ba3cf]', search: (q: string) => `https://www.jiomart.com/search/${q}` },
] as const

export type StoreId = (typeof STORES)[number]['id']

export function storeById(id: string | null | undefined) {
  return STORES.find((s) => s.id === id) ?? STORES[0]
}

/** Search link for one item. Only the name is searched: quantities confuse store search. */
export function searchUrl(storeId: string, name: string) {
  return storeById(storeId).search(encodeURIComponent(name.trim()))
}

/** Plain-text list for copying or sending to a local shop on WhatsApp. */
export function orderText(items: OrderItem[]) {
  const lines = items.map((i) => {
    const qty = formatQty(i.quantity, i.unit)
    return `• ${i.name}${qty ? ` – ${qty}` : ''}`
  })
  return ['Grocery list (from FridgeAI):', ...lines].join('\n')
}

export function whatsappUrl(items: OrderItem[]) {
  return `https://wa.me/?text=${encodeURIComponent(orderText(items))}`
}

// Order notepad: a small window that stays open while the user shops in another app or tab.
// Kept in localStorage so it survives closing FridgeAI and needs no login.
export const NOTEPAD_KEY = 'fridgeai.notepad'

export interface Notepad {
  store: string
  items: { name: string; qty: string; done: boolean }[]
  notes: string
}

export function notepadFrom(items: OrderItem[], storeId: string, notes = ''): Notepad {
  return { store: storeById(storeId).id, items: items.map((i) => ({ name: i.name, qty: formatQty(i.quantity, i.unit), done: false })), notes }
}

export function loadNotepad(): Notepad | null {
  try {
    const n = JSON.parse(localStorage.getItem(NOTEPAD_KEY) ?? 'null')
    return n && Array.isArray(n.items) ? { store: storeById(n.store).id, items: n.items, notes: typeof n.notes === 'string' ? n.notes : '' } : null
  } catch {
    return null
  }
}

export function saveNotepad(n: Notepad) {
  try {
    localStorage.setItem(NOTEPAD_KEY, JSON.stringify(n))
  } catch {
    /* storage blocked: the notepad just won't be remembered */
  }
}
