import { Camera, Check, Hourglass, Pencil, Plus, Refrigerator, Search, Trash2, Undo2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { IngredientFormDialog } from '@/components/IngredientFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDeleteIngredient, useInventory, useUpdateIngredient, type InventoryParams } from '@/hooks/inventory'
import { errorMessage } from '@/lib/api'
import { CATEGORIES, categoryEmoji, categoryLabel, daysUntil, formatQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/types/api'

const COLS = 'md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_7rem_9.5rem]'

function Expiry({ date }: { date: string | null }) {
  const d = daysUntil(date)
  if (d === null) return <span className="text-muted-foreground">No date</span>
  const label = new Date(date!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (d < 0) return <span className="font-semibold text-destructive">Past expiry ({label})</span>
  if (d === 0) return <span className="font-semibold text-terracotta">Today</span>
  if (d === 1) return <span className="font-semibold text-warn-foreground">Tomorrow</span>
  if (d <= 3) return <span className="font-semibold text-warn-foreground">In {d} days</span>
  return <span>{label}</span>
}

const PRIORITY = {
  use_soon: { label: 'Use soon', className: 'bg-terracotta text-white' },
  normal: { label: 'Normal', className: 'bg-sage-soft text-heading' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
}

function ItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: () => void; onDelete: () => void }) {
  const update = useUpdateIngredient()
  const consumed = item.status === 'consumed'
  const soon = item.priority === 'use_soon' && !consumed
  const p = PRIORITY[item.priority]

  async function patch(body: Partial<InventoryItem>, msg: string) {
    try {
      await update.mutateAsync({ id: item.id, ...body })
      toast.success(msg)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <li className={cn('grid items-center gap-x-4 gap-y-2 px-5 py-5 md:px-8', COLS, soon && 'bg-warn-soft/45', consumed && 'opacity-70')}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-xl" aria-hidden>
          {categoryEmoji(item.category)}
        </span>
        <div className="min-w-0">
          <div className={cn('truncate font-semibold capitalize text-heading', consumed && 'line-through')}>{item.name}</div>
          {item.storage_notes && <div className="truncate text-xs text-muted-foreground">{item.storage_notes}</div>}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="md:hidden">Category: </span>
        {categoryLabel(item.category)}
      </div>
      <div className="text-sm font-semibold text-heading">{formatQty(item.quantity, item.unit) || <span className="font-normal text-muted-foreground">Unknown</span>}</div>
      <div className="text-sm">
        <span className="text-muted-foreground md:hidden">Expires: </span>
        {consumed ? <span className="text-muted-foreground">Used up</span> : <Expiry date={item.expiry_date} />}
      </div>
      <div>
        <span className={cn('rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider', p.className)}>{p.label}</span>
      </div>
      <div className="flex justify-start gap-0.5 md:justify-end">
        {!consumed ? (
          <Button variant="ghost" size="icon-sm" onClick={() => patch({ status: 'consumed' }, `Marked ${item.name} as used up`)} disabled={update.isPending} aria-label={`Mark ${item.name} as used up`} title="Used up">
            <Check />
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={() => patch({ status: 'available' }, `${item.name} is back in stock`)} disabled={update.isPending} aria-label={`Restore ${item.name}`} title="Restore">
            <Undo2 />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={item.priority === 'use_soon'}
          aria-label={item.priority === 'use_soon' ? `Clear use soon for ${item.name}` : `Mark ${item.name} use soon`}
          title={item.priority === 'use_soon' ? 'Clear “use soon”' : 'Mark “use soon”'}
          className={cn(item.priority === 'use_soon' && 'text-terracotta')}
          onClick={() =>
            patch(
              { priority: item.priority === 'use_soon' ? 'normal' : 'use_soon' },
              item.priority === 'use_soon' ? 'Priority cleared' : `${item.name} will be used first`,
            )
          }
        >
          <Hourglass />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${item.name}`} title="Edit">
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={onDelete} aria-label={`Delete ${item.name}`} title="Delete">
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

export function Ingredients() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<NonNullable<InventoryParams['sort']>>('priority')
  const [status, setStatus] = useState<'available' | 'consumed'>('available')
  const [editing, setEditing] = useState<InventoryItem | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<InventoryItem | null>(null)
  const search = useDeferredValue(q.trim())
  const inventory = useInventory({ q: search || undefined, category: category === 'all' ? undefined : category, sort, status })
  const del = useDeleteIngredient()
  const filtered = !!search || category !== 'all'

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success(`Deleted ${deleting.name}`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
    setDeleting(null)
  }

  return (
    <div>
      <PageHeader
        title="My Ingredients"
        description="Track and manage your kitchen stock. Recipes and plans only count these as available."
        actions={
          <>
            <Button variant="outline" size="lg" asChild>
              <Link to="/app/scan">
                <Camera /> Scan
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <Plus /> Add manual item
            </Button>
          </>
        }
      />

      <div className="mb-8 space-y-4 rounded-3xl border bg-card/90 p-5 shadow-(--shadow-card) sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your pantry…" className="h-12 rounded-xl bg-background/60 pl-11" aria-label="Search ingredients" />
          </div>
          <div className="flex gap-3">
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList className="h-12">
                <TabsTrigger value="available">In stock</TabsTrigger>
                <TabsTrigger value="consumed">Used up</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-12! w-full lg:w-44" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Use first</SelectItem>
                <SelectItem value="expiry">Expiry date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Recently added</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div role="radiogroup" aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                category === c.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-heading',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {inventory.isPending ? (
        <ListSkeleton rows={5} />
      ) : inventory.isError ? (
        <ErrorState error={inventory.error} onRetry={() => inventory.refetch()} />
      ) : !inventory.data.items.length ? (
        filtered ? (
          <EmptyState icon={Search} title="No matches" description="Try a different search or category." />
        ) : status === 'consumed' ? (
          <EmptyState icon={Check} title="Nothing used up yet" description="Ingredients you mark as used up appear here." />
        ) : (
          <EmptyState
            icon={Refrigerator}
            title="Your inventory is empty"
            description="Scan your fridge or add ingredients by hand to start getting recipes."
            action={
              <>
                <Button asChild>
                  <Link to="/app/scan">
                    <Camera /> Scan fridge
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  <Plus /> Add manually
                </Button>
              </>
            }
          />
        )
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {inventory.data.total} item{inventory.data.total === 1 ? '' : 's'}
          </p>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-(--shadow-card)">
          <div className={cn('hidden gap-4 border-b bg-muted/40 px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid', COLS)} aria-hidden>
            <span>Item</span>
            <span>Category</span>
            <span>Quantity</span>
            <span>Expiry date</span>
            <span>Priority</span>
            <span className="text-right">Action</span>
          </div>
          <ul className="divide-y" aria-label="Ingredients">
            {inventory.data.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditing(item)
                  setFormOpen(true)
                }}
                onDelete={() => setDeleting(item)}
              />
            ))}
          </ul>
          </div>
        </>
      )}

      <IngredientFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'ingredient'}?`}
        description="This removes it from your inventory. To keep a record instead, mark it as used up."
        onConfirm={confirmDelete}
        pending={del.isPending}
      />
    </div>
  )
}
