import type { ShoppingItem } from '@/types/api'

/** Split the list into the sections the page shows. Checked items always go to "done". */
export function groupShopping(items: ShoppingItem[]) {
  const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name)
  return {
    buy: items.filter((i) => !i.checked && i.status === 'buy').sort(byName),
    check: items.filter((i) => !i.checked && i.status === 'check').sort(byName),
    done: items.filter((i) => i.checked).sort(byName),
  }
}
