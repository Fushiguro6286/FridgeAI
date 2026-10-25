import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAddIngredient, useUpdateIngredient } from '@/hooks/inventory'
import { errorMessage } from '@/lib/api'
import { CATEGORIES } from '@/lib/format'
import { ingredientSchema, toNumberOrNull, toTextOrNull, type IngredientValues } from '@/schemas/forms'
import type { InventoryItem } from '@/types/api'

const empty: IngredientValues = {
  name: '',
  category: 'vegetables',
  quantity: '',
  unit: '',
  purchase_date: '',
  expiry_date: '',
  storage_notes: '',
  priority: 'normal',
}

function fromItem(i: InventoryItem): IngredientValues {
  return {
    name: i.name,
    category: i.category,
    quantity: i.quantity == null ? '' : String(i.quantity),
    unit: i.unit ?? '',
    purchase_date: i.purchase_date ?? '',
    expiry_date: i.expiry_date ?? '',
    storage_notes: i.storage_notes ?? '',
    priority: i.priority,
  }
}

export function IngredientFormDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item?: InventoryItem }) {
  const form = useForm<IngredientValues>({ resolver: zodResolver(ingredientSchema), defaultValues: empty })
  const add = useAddIngredient()
  const update = useUpdateIngredient()
  const errors = form.formState.errors

  useEffect(() => {
    if (open) form.reset(item ? fromItem(item) : empty)
  }, [open, item, form])

  const submit = form.handleSubmit(async (v) => {
    const body = {
      name: v.name.trim(),
      category: v.category,
      quantity: toNumberOrNull(v.quantity),
      unit: toTextOrNull(v.unit),
      purchase_date: v.purchase_date || null,
      expiry_date: v.expiry_date || null,
      storage_notes: toTextOrNull(v.storage_notes),
      priority: v.priority,
    }
    try {
      if (item) await update.mutateAsync({ id: item.id, ...body })
      else await add.mutateAsync(body)
      toast.success(item ? `Updated ${body.name}` : `Added ${body.name}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit ingredient' : 'Add ingredient'}</DialogTitle>
          <DialogDescription>Leave quantity empty if you're not sure. Plans will remind you to check.</DialogDescription>
        </DialogHeader>
        <form id="ingredient-form" onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ing-name">Name</Label>
            <Input id="ing-name" autoFocus {...form.register('name')} aria-invalid={!!errors.name} placeholder="e.g. paneer" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ing-cat">Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ing-cat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ing-priority">Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ing-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="use_soon">Use soon</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ing-qty">Quantity</Label>
              <Input id="ing-qty" inputMode="decimal" {...form.register('quantity')} aria-invalid={!!errors.quantity} placeholder="Unknown" />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ing-unit">Unit</Label>
              <Input id="ing-unit" {...form.register('unit')} placeholder="pcs, g, kg, ml…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ing-bought">Purchased</Label>
              <Input id="ing-bought" type="date" {...form.register('purchase_date')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ing-expiry">Expires</Label>
              <Input id="ing-expiry" type="date" {...form.register('expiry_date')} aria-invalid={!!errors.expiry_date} />
              {errors.expiry_date && <p className="text-xs text-destructive">{errors.expiry_date.message}</p>}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ing-notes">Storage notes</Label>
            <Textarea id="ing-notes" rows={2} {...form.register('storage_notes')} placeholder="e.g. top shelf, in airtight box" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="ingredient-form" disabled={add.isPending || update.isPending}>
            {item ? 'Save changes' : 'Add ingredient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
