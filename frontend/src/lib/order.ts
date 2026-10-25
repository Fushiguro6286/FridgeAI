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
  { id: 'blinkit', name: 'Blinkit', note: '10–15 min · by Zomato', tint: 'bg-[#f8cb46] text-[#1c1c1c]', search: (q: string) => `https://blinkit.com/s/?q=${q}` },
  { id: 'zepto', name: 'Zepto', note: '10 min delivery', tint: 'bg-[#5a1e96] text-white', search: (q: string) => `https://www.zeptonow.com/search?query=${q}` },
  { id: 'instamart', name: 'Swiggy Instamart', note: 'Quick delivery', tint: 'bg-[#fc8019] text-white', search: (q: string) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${q}` },
  { id: 'bigbasket', name: 'BigBasket', note: 'Same day or next day', tint: 'bg-[#84c225] text-[#1c1c1c]', search: (q: string) => `https://www.bigbasket.com/ps/?q=${q}` },
  { id: 'jiomart', name: 'JioMart', note: 'Daily essentials', tint: 'bg-[#0c5273] text-white', search: (q: string) => `https://www.jiomart.com/search/${q}` },
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
