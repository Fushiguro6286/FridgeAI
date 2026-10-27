import { ClipboardList, Copy, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { NOTEPAD_KEY, loadNotepad, saveNotepad, searchUrl, storeById, type Notepad as Pad } from '@/lib/order'
import { cn } from '@/lib/utils'

/** Small pop-up checklist that stays open while the user shops in a grocery app. */
export function Notepad() {
  const [pad, setPad] = useState<Pad | null>(loadNotepad)

  useEffect(() => {
    document.title = 'Order notepad · FridgeAI'
    // A new list sent from FridgeAI (another tab) replaces this one.
    const onStorage = (e: StorageEvent) => e.key === NOTEPAD_KEY && setPad(loadNotepad())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function update(next: Pad) {
    setPad(next)
    saveNotepad(next)
  }

  if (!pad) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="space-y-3">
          <ClipboardList className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-medium">No list yet</h1>
          <p className="text-sm text-muted-foreground">In FridgeAI, open “Order missing ingredients” and tap “Open notepad”.</p>
        </div>
      </main>
    )
  }

  const store = storeById(pad.store)
  const done = pad.items.filter((i) => i.done).length

  async function copy() {
    const lines = pad!.items.filter((i) => !i.done).map((i) => `• ${i.name}${i.qty ? ` – ${i.qty}` : ''}`)
    try {
      await navigator.clipboard.writeText([...lines, pad!.notes.trim()].filter(Boolean).join('\n'))
      toast.success('Copied')
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.")
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-5 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <a href={searchUrl(store.id, '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold text-terracotta hover:underline">
          Open {store.name} <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </header>

      <div>
        <h1 className="text-3xl font-medium">Order notepad</h1>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {done} of {pad.items.length} added to cart · tick items as you go
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pad.items.length ? (done / pad.items.length) * 100 : 0}%` }} />
        </div>
      </div>

      <ul className="space-y-2" aria-label="Items to order">
        {pad.items.map((it, idx) => {
          const id = `pad-${idx}`
          return (
            <li key={id} className={cn('flex items-center gap-3 rounded-2xl border bg-card px-4 py-3', it.done && 'bg-muted/40')}>
              <Checkbox
                id={id}
                checked={it.done}
                onCheckedChange={(v) => update({ ...pad, items: pad.items.map((x, j) => (j === idx ? { ...x, done: v === true } : x)) })}
                className="size-5"
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span className={cn('block truncate font-semibold capitalize text-heading', it.done && 'text-muted-foreground line-through')}>{it.name}</span>
                {it.qty && <span className="text-xs text-muted-foreground">{it.qty}</span>}
              </label>
              {!it.done && (
                <a
                  href={searchUrl(store.id, it.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold text-heading hover:border-primary/40"
                  aria-label={`Find ${it.name} on ${store.name} (opens in a new tab)`}
                >
                  Find
                </a>
              )}
            </li>
          )
        })}
      </ul>

      <div className="space-y-2">
        <label htmlFor="pad-notes" className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-heading">
          My notes
        </label>
        <Textarea id="pad-notes" value={pad.notes} onChange={(e) => update({ ...pad, notes: e.target.value })} placeholder="Anything else? e.g. bread, 2 packs of milk…" rows={3} className="rounded-xl" />
      </div>

      <Button variant="outline" className="w-full rounded-xl" onClick={copy}>
        <Copy /> Copy items still to add
      </Button>
      <p className="text-center text-xs text-muted-foreground">Saved on this device. You can close FridgeAI; this window keeps your list.</p>
    </main>
  )
}
