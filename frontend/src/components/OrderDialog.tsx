import { Check, Copy, ExternalLink, MessageCircle, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatQty } from '@/lib/format'
import { STORES, orderText, searchUrl, storeById, whatsappUrl, type OrderItem } from '@/lib/order'
import { cn } from '@/lib/utils'

const STORE_KEY = 'fridgeai.store'

function rememberedStore() {
  try {
    return storeById(localStorage.getItem(STORE_KEY)).id
  } catch {
    return STORES[0].id
  }
}

export function OrderDialog({
  open,
  onOpenChange,
  items,
  onMarkBought,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  items: OrderItem[]
  /** When given, shows "Mark as bought" for the selected items. */
  onMarkBought?: (keys: OrderItem['key'][]) => Promise<void>
}) {
  const [storeId, setStoreId] = useState<string>(rememberedStore)
  const [selected, setSelected] = useState(() => new Set(items.filter((i) => !i.inStock).map((i) => i.key)))
  const [opened, setOpened] = useState(() => new Set<OrderItem['key']>())
  const [marking, setMarking] = useState(false)
  const store = storeById(storeId)
  const chosen = items.filter((i) => selected.has(i.key))

  function pickStore(id: string) {
    setStoreId(id)
    setOpened(new Set())
    try {
      localStorage.setItem(STORE_KEY, id)
    } catch {
      /* storage blocked: just don't remember */
    }
  }

  function toggle(key: OrderItem['key'], on: boolean) {
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(key)
      else n.delete(key)
      return n
    })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(orderText(chosen))
      toast.success('List copied. Paste it into any grocery app or chat.')
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.")
    }
  }

  async function markBought() {
    if (!onMarkBought) return
    setMarking(true)
    try {
      await onMarkBought(chosen.map((i) => i.key))
      toast.success(`Marked ${chosen.length} item${chosen.length === 1 ? '' : 's'} as bought`)
      onOpenChange(false)
    } catch {
      toast.error("Couldn't update every item. Please try again.")
    } finally {
      setMarking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Order missing ingredients</DialogTitle>
          <DialogDescription>
            Pick an app, then tap each item to open it there. Add it to your cart, and pay in the app once everything is in.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Grocery app" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STORES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === store.id}
              onClick={() => pickStore(s.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors hover:border-primary/40',
                s.id === store.id && 'border-primary ring-2 ring-primary/20',
              )}
            >
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold', s.tint)} aria-hidden>
                {s.name[0]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.note}</span>
              </span>
            </button>
          ))}
        </div>

        <ul className="divide-y rounded-xl border bg-card">
          {items.map((i) => {
            const id = `order-${i.key}`
            const qty = formatQty(i.quantity, i.unit)
            const done = opened.has(i.key)
            return (
              <li key={i.key} className="flex items-center gap-3 px-3 py-2.5">
                <Checkbox id={id} checked={selected.has(i.key)} onCheckedChange={(v) => toggle(i.key, v === true)} />
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                  <span className="font-medium capitalize">{i.name}</span>
                  {qty && <span className="ml-2 text-sm text-muted-foreground">{qty}</span>}
                  {i.inStock && <span className="block text-xs text-warn-foreground">You may have some. Check first.</span>}
                </label>
                <Button asChild size="sm" variant={done ? 'secondary' : 'outline'} className={cn(!selected.has(i.key) && 'invisible')}>
                  <a
                    href={searchUrl(store.id, i.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpened((s) => new Set(s).add(i.key))}
                    aria-label={`Find ${i.name} on ${store.name} (opens in a new tab)`}
                  >
                    {done ? <Check /> : <ExternalLink />} {done ? 'Opened' : `Find on ${store.name}`}
                  </a>
                </Button>
              </li>
            )
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          Grocery apps don't let other websites fill your cart, so you add each item yourself. Ordering from a local kirana?
          Send them the list on WhatsApp.
        </p>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy} disabled={!chosen.length}>
              <Copy /> Copy list
            </Button>
            <Button asChild variant="outline" className={cn(!chosen.length && 'pointer-events-none opacity-50')}>
              <a href={whatsappUrl(chosen)} target="_blank" rel="noopener noreferrer" aria-disabled={!chosen.length}>
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          </div>
          {onMarkBought && (
            <Button onClick={markBought} disabled={!chosen.length || marking}>
              <PackageCheck /> Mark {chosen.length} as bought
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
