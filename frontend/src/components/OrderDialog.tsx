import { Check, ClipboardList, Copy, ExternalLink, Info, MessageCircle, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatQty } from '@/lib/format'
import { STORES, loadNotepad, notepadFrom, orderText, saveNotepad, searchUrl, storeById, whatsappUrl, type OrderItem } from '@/lib/order'
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

  function openNotepad() {
    saveNotepad(notepadFrom(chosen, store.id, loadNotepad()?.notes))
    // A separate small window survives closing FridgeAI; phones open it as a new tab instead.
    const w = window.open('/notepad', 'fridgeai-notepad', 'popup,width=400,height=680')
    if (w) w.focus()
    else toast.error('Your browser blocked the pop-up. Allow pop-ups for this site and try again.')
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

  const brandText = (cls: string) => cls.split(' ').filter((c) => c.startsWith('text-') || c.startsWith('dark:text-')).join(' ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[2rem] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b bg-muted/40 px-6 py-6 text-left sm:px-8">
          <DialogTitle className="font-heading text-3xl font-medium text-heading">Order missing ingredients</DialogTitle>
          <DialogDescription>Select your preferred delivery partner, then open each item in their app.</DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-6 py-7 sm:px-8">
          <div role="radiogroup" aria-label="Grocery app" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STORES.map((s) => {
              const on = s.id === store.id
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickStore(s.id)}
                  className={cn(
                    'rounded-2xl border-2 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5',
                    on ? s.brand : 'border-border bg-card hover:border-primary/25',
                  )}
                >
                  <span className={cn('block truncate text-lg font-extrabold italic', brandText(s.brand))}>{s.name}</span>
                  <span className={cn('block truncate text-[0.68rem] font-bold uppercase tracking-wider', on ? brandText(s.brand) : 'text-muted-foreground')}>{s.note}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Items to order ({chosen.length})</p>
            <ul className="space-y-3">
              {items.map((i) => {
                const id = `order-${i.key}`
                const qty = formatQty(i.quantity, i.unit)
                const done = opened.has(i.key)
                const on = selected.has(i.key)
                return (
                  <li key={i.key} className={cn('flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-colors', on ? 'bg-card' : 'bg-muted/30')}>
                    <Checkbox id={id} checked={on} onCheckedChange={(v) => toggle(i.key, v === true)} className="size-5" />
                    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                      <span className={cn('block font-semibold capitalize', on ? 'text-heading' : 'italic text-muted-foreground')}>{i.name}</span>
                      {qty && <span className="text-[0.7rem] font-semibold uppercase text-muted-foreground">{qty}</span>}
                      {i.inStock && <span className="block text-[0.7rem] font-semibold uppercase italic text-warn-foreground">You may have some. Check first.</span>}
                    </label>
                    <Button asChild size="sm" variant={done ? 'secondary' : 'outline'} className={cn('rounded-lg', !on && 'invisible')}>
                      <a
                        href={searchUrl(store.id, i.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpened((s) => new Set(s).add(i.key))}
                        aria-label={`Find ${i.name} on ${store.name} (opens in a new tab)`}
                      >
                        {done ? <Check /> : null} {done ? 'Opened' : `Find on ${store.name}`} {!done && <ExternalLink />}
                      </a>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="flex gap-3 rounded-2xl border bg-muted/40 px-4 py-3.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />
            <span>
              Grocery apps don't let other websites fill your cart, so tapping “Find” opens the item in their app for you to add and pay. Ordering from a local
              kirana? Send them the list on WhatsApp.
            </span>
          </p>
        </div>

        <DialogFooter className="gap-3 border-t px-6 py-5 sm:justify-between sm:px-8">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="rounded-xl" onClick={copy} disabled={!chosen.length}>
              <Copy /> Copy list
            </Button>
            <Button asChild variant="outline" size="lg" className={cn('rounded-xl text-[#128c4a] dark:text-[#4ade80]', !chosen.length && 'pointer-events-none opacity-50')}>
              <a href={whatsappUrl(chosen)} target="_blank" rel="noopener noreferrer" aria-disabled={!chosen.length}>
                <MessageCircle /> Share on WhatsApp
              </a>
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl" onClick={openNotepad} disabled={!chosen.length}>
              <ClipboardList /> Open notepad
            </Button>
          </div>
          {onMarkBought && (
            <Button size="lg" className="h-12 rounded-xl px-7" onClick={markBought} disabled={!chosen.length || marking}>
              <PackageCheck /> Mark {chosen.length} as bought
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
