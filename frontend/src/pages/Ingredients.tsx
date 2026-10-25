import { Camera, Check, Hourglass, MoreVertical, Pencil, Plus, Refrigerator, Search, Trash2, Undo2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { IngredientFormDialog } from '@/components/IngredientFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDeleteIngredient, useInventory, useUpdateIngredient, type InventoryParams } from '@/hooks/inventory'
import { errorMessage } from '@/lib/api'
import { CATEGORIES, categoryLabel, daysUntil, formatQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/types/api'

function ExpiryBadge({ date }: { date: string | null }) {
  const d = daysUntil(date)
  if (d === null) return null
  if (d < 0) return <Badge variant="destructive">Past expiry date</Badge>
  if (d <= 3) return <Badge variant="warn">{d === 0 ? 'Expires today' : `Expires in ${d}d`}</Badge>
  return <Badge variant="outline">Expires {new Date(date!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Badge>
}

function ItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: () => void; onDelete: () => void }) {
  const update = useUpdateIngredient()
  const consumed = item.status === 'consumed'

  async function patch(body: Partial<InventoryItem>, msg: string) {
    try {
      await update.mutateAsync({ id: item.id, ...body })
      toast.success(msg)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <li className={cn('flex items-center gap-3 rounded-xl border bg-card p-4 shadow-(--shadow-card)', consumed && 'opacity-70')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-medium capitalize', consumed && 'line-through')}>{item.name}</span>
          <Badge variant="outline" className="font-normal">
            {categoryLabel(item.category)}
          </Badge>
          {item.priority === 'use_soon' && !consumed && (
            <Badge variant="warn">
              <Hourglass aria-hidden /> Use soon
            </Badge>
          )}
          {!consumed && <ExpiryBadge date={item.expiry_date} />}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>{formatQty(item.quantity, item.unit) || 'Quantity unknown'}</span>
          {item.storage_notes && <span className="truncate">· {item.storage_notes}</span>}
        </div>
      </div>
      {!consumed ? (
        <Button variant="outline" size="sm" onClick={() => patch({ status: 'consumed' }, `Marked ${item.name} as used up`)} disabled={update.isPending}>
          <Check /> <span className="hidden sm:inline">Used up</span>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => patch({ status: 'available' }, `${item.name} is back in stock`)} disabled={update.isPending}>
          <Undo2 /> <span className="hidden sm:inline">Restore</span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${item.name}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              patch(
                { priority: item.priority === 'use_soon' ? 'normal' : 'use_soon' },
                item.priority === 'use_soon' ? 'Priority cleared' : `${item.name} will be used first`,
              )
            }
          >
            <Hourglass /> {item.priority === 'use_soon' ? 'Clear “use soon”' : 'Mark “use soon”'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
        description="Everything you've confirmed. Recipes and plans only count these as available."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/app/scan">
                <Camera /> Scan
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <Plus /> Add ingredient
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <TabsList>
            <TabsTrigger value="available">In stock</TabsTrigger>
            <TabsTrigger value="consumed">Used up</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients" className="pl-8" aria-label="Search ingredients" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full lg:w-48" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-full lg:w-44" aria-label="Sort">
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
          <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
            {inventory.data.total} item{inventory.data.total === 1 ? '' : 's'}
          </p>
          <ul className="space-y-2">
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
