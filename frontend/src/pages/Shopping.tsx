import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Pencil, Plus, RefreshCw, ShoppingBasket, ShoppingCart, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common'
import { OrderDialog } from '@/components/OrderDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMealPlans } from '@/hooks/mealPlans'
import { useAddShoppingItem, useBuildShoppingList, useDeleteShoppingItem, useShoppingList, useUpdateShoppingItem } from '@/hooks/shopping'
import { errorMessage } from '@/lib/api'
import { formatMoney, formatQty } from '@/lib/format'
import { groupShopping } from '@/lib/shopping'
import { cn } from '@/lib/utils'
import { shoppingItemSchema, toNumberOrNull, toTextOrNull, type ShoppingItemValues } from '@/schemas/forms'
import type { ShoppingItem } from '@/types/api'

const blank: ShoppingItemValues = { name: '', quantity: '', unit: '', estimated_price: '' }

function ItemFields({ form, idPrefix }: { form: ReturnType<typeof useForm<ShoppingItemValues>>; idPrefix: string }) {
  const e = form.formState.errors
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Item</Label>
        <Input id={`${idPrefix}-name`} {...form.register('name')} aria-invalid={!!e.name} placeholder="e.g. coriander" />
        {e.name && <p className="text-xs text-destructive">{e.name.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-qty`}>Qty</Label>
        <Input id={`${idPrefix}-qty`} inputMode="decimal" {...form.register('quantity')} aria-invalid={!!e.quantity} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
        <Input id={`${idPrefix}-unit`} {...form.register('unit')} placeholder="kg, pcs" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Est. price</Label>
        <Input id={`${idPrefix}-price`} inputMode="decimal" {...form.register('estimated_price')} aria-invalid={!!e.estimated_price} placeholder="optional" />
      </div>
      {(e.quantity || e.estimated_price) && <p className="col-span-full text-xs text-destructive">{(e.quantity ?? e.estimated_price)?.message}</p>}
    </>
  )
}

function EditDialog({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  const update = useUpdateShoppingItem()
  const form = useForm<ShoppingItemValues>({ resolver: zodResolver(shoppingItemSchema), defaultValues: blank })
  useEffect(() => {
    if (item)
      form.reset({
        name: item.name,
        quantity: item.quantity == null ? '' : String(item.quantity),
        unit: item.unit ?? '',
        estimated_price: item.estimated_price == null ? '' : String(item.estimated_price),
      })
  }, [item, form])

  const submit = form.handleSubmit(async (v) => {
    if (!item) return
    try {
      await update.mutateAsync({
        id: item.id,
        name: v.name.trim(),
        quantity: toNumberOrNull(v.quantity),
        unit: toTextOrNull(v.unit),
        estimated_price: toNumberOrNull(v.estimated_price),
      })
      toast.success('Item updated')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        {item && !item.is_custom && (
          <p className="text-sm text-muted-foreground">This item comes from your meal plan. If the plan changes, its quantity is recalculated.</p>
        )}
        <form id="edit-shop" onSubmit={submit} noValidate className="grid grid-cols-3 gap-3 [&>div:first-child]:col-span-3">
          <ItemFields form={form} idPrefix="edit" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-shop" disabled={update.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ item, currency, onEdit }: { item: ShoppingItem; currency: string; onEdit: () => void }) {
  const update = useUpdateShoppingItem()
  const del = useDeleteShoppingItem()
  const id = `shop-${item.id}`
  return (
    <li className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
      <Checkbox
        id={id}
        className="mt-1 size-5"
        checked={item.checked}
        onCheckedChange={(v) => update.mutate({ id: item.id, checked: v === true }, { onError: (e) => toast.error(errorMessage(e)) })}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={cn('cursor-pointer font-medium capitalize', item.checked && 'text-muted-foreground line-through')}>
          {item.name}
          {item.quantity != null && <span className="ml-2 font-normal normal-case text-muted-foreground">{formatQty(item.quantity, item.unit)}</span>}
        </label>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.is_custom ? <Badge variant="outline">Added by you</Badge> : item.recipes.length > 0 && <span>For {item.recipes.join(', ')}</span>}
          {item.estimated_price != null && <span>· {formatMoney(Number(item.estimated_price), currency)}</span>}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${item.name}`}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${item.name}`}
        disabled={del.isPending}
        onClick={() =>
          del.mutate(item.id, {
            onSuccess: () => toast.success(`Removed ${item.name}`),
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      >
        <Trash2 />
      </Button>
    </li>
  )
}

function Section({ title, hint, items, currency, onEdit }: { title: string; hint?: string; items: ShoppingItem[]; currency: string; onEdit: (i: ShoppingItem) => void }) {
  if (!items.length) return null
  return (
    <section aria-label={title}>
      <h2 className="mb-1 text-lg font-semibold">
        {title} <span className="font-sans text-sm font-normal text-muted-foreground">({items.length})</span>
      </h2>
      {hint && <p className="mb-2 text-sm text-muted-foreground">{hint}</p>}
      <ul className="space-y-2">
        {items.map((i) => (
          <Row key={i.id} item={i} currency={currency} onEdit={() => onEdit(i)} />
        ))}
      </ul>
    </section>
  )
}

export function Shopping() {
  const list = useShoppingList()
  const plans = useMealPlans()
  const build = useBuildShoppingList()
  const add = useAddShoppingItem()
  const update = useUpdateShoppingItem()
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [params] = useSearchParams()
  const [ordering, setOrdering] = useState(() => params.get('order') === '1')
  const form = useForm<ShoppingItemValues>({ resolver: zodResolver(shoppingItemSchema), defaultValues: blank })

  const submit = form.handleSubmit(async (v) => {
    try {
      await add.mutateAsync({ name: v.name.trim(), quantity: toNumberOrNull(v.quantity), unit: toTextOrNull(v.unit), estimated_price: toNumberOrNull(v.estimated_price) })
      toast.success(`Added ${v.name.trim()}`)
      form.reset(blank)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  async function rebuild(planId: number) {
    try {
      await build.mutateAsync(planId)
      toast.success('Shopping list rebuilt from the plan. Your own items were kept.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const data = list.data
  const groups = groupShopping(data?.items ?? [])
  const total = data?.items.length ?? 0
  // One row per ingredient name: the list keeps different units apart, but you order "tomato" once.
  const byName = new Map<string, ShoppingItem[]>()
  for (const i of [...groups.buy, ...groups.check]) {
    const k = i.name.trim().toLowerCase()
    byName.set(k, [...(byName.get(k) ?? []), i])
  }
  const toOrder = [...byName].map(([key, same]) => {
    const [first] = same
    const one = same.length === 1
    return { key, name: first.name, quantity: one ? first.quantity : null, unit: one ? first.unit : null, inStock: same.every((i) => i.status === 'check') }
  })
  const missingCount = toOrder.filter((i) => !i.inStock).length
  const orderButton = toOrder.length > 0 && (
    <Button onClick={() => setOrdering(true)}>
      <ShoppingCart /> {missingCount ? `Order ${missingCount} missing` : 'Order online'}
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Shopping List"
        description={data?.meal_plan_name ? <>Built from <strong>{data.meal_plan_name}</strong>. Quantities are combined across meals.</> : 'Build a list from a meal plan, or add your own items.'}
        actions={
          plans.data?.items.length ? (
            <div className="flex flex-wrap gap-2">
              {orderButton}
              <Select value={data?.meal_plan_id ? String(data.meal_plan_id) : undefined} onValueChange={(v) => rebuild(Number(v))}>
                <SelectTrigger className="w-56" aria-label="Build from meal plan">
                  <SelectValue placeholder="Build from a plan…" />
                </SelectTrigger>
                <SelectContent>
                  {plans.data.items.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data?.meal_plan_id && (
                <Button variant="outline" size="icon" onClick={() => rebuild(data.meal_plan_id!)} disabled={build.isPending} aria-label="Refresh from plan and current inventory">
                  <RefreshCw className={cn(build.isPending && 'animate-spin')} />
                </Button>
              )}
            </div>
          ) : (
            orderButton || null
          )
        }
      />

      <form onSubmit={submit} noValidate className="mb-8 grid grid-cols-3 gap-3 rounded-2xl border bg-card p-4 shadow-(--shadow-card) sm:grid-cols-[minmax(0,2fr)_5rem_6rem_7rem_auto] sm:items-end [&>div:first-child]:col-span-3 sm:[&>div:first-child]:col-span-1">
        <ItemFields form={form} idPrefix="add" />
        <Button type="submit" className="col-span-3 sm:col-span-1" disabled={add.isPending}>
          <Plus /> Add item
        </Button>
      </form>

      {list.isPending ? (
        <ListSkeleton rows={5} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !total ? (
        <EmptyState
          icon={ShoppingBasket}
          title="Your list is empty"
          description={data?.meal_plan_id ? 'Your inventory covers this plan. Nice!' : 'Generate a meal plan and its missing ingredients will appear here.'}
          action={
            !data?.meal_plan_id && (
              <Button asChild>
                <Link to="/app/planner">
                  <CalendarDays /> Plan meals
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            <Section title="To buy" items={groups.buy} currency={data!.currency} onEdit={setEditing} />
            <Section
              title="Check your stock"
              hint="You have these, but we can't tell if there's enough (unknown or different units)."
              items={groups.check}
              currency={data!.currency}
              onEdit={setEditing}
            />
            <Section title="Done" items={groups.done} currency={data!.currency} onEdit={setEditing} />
          </div>
          <aside className="h-fit space-y-3 rounded-xl border bg-card p-5 shadow-(--shadow-card) lg:sticky lg:top-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {groups.done.length}/{total} done
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={groups.done.length} aria-label="Items checked">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(groups.done.length / total) * 100}%` }} />
            </div>
            <div className="border-t pt-3">
              <div className="text-sm text-muted-foreground">Estimated total</div>
              {data!.estimated_total != null ? (
                <>
                  <div className="text-2xl font-semibold">{formatMoney(data!.estimated_total, data!.currency)}</div>
                  <p className="text-xs text-muted-foreground">
                    From prices you entered for {data!.priced_items} of {total} items.
                  </p>
                </>
              ) : (
                <p className="text-sm">No prices yet. Add an estimated price to items to see a total.</p>
              )}
            </div>
            {toOrder.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-sm text-muted-foreground">Get the rest delivered from Blinkit, Zepto, Instamart and more.</p>
                <Button className="w-full" onClick={() => setOrdering(true)}>
                  <ShoppingCart /> Order online
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      <EditDialog item={editing} onClose={() => setEditing(null)} />
      {ordering && toOrder.length > 0 && (
        <OrderDialog
          open={ordering}
          onOpenChange={setOrdering}
          items={toOrder}
          onMarkBought={async (names) => {
            const rows = [...groups.buy, ...groups.check].filter((i) => names.includes(i.name.trim().toLowerCase()))
            await Promise.all(rows.map((i) => update.mutateAsync({ id: i.id, checked: true })))
          }}
        />
      )}
    </div>
  )
}
