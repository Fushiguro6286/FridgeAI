import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCheck, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/lib/format'
import { reviewSchema, toNumberOrNull, toTextOrNull, type ReviewValues } from '@/schemas/forms'
import type { DetectedIngredient, InventoryInput } from '@/types/api'

type Row = ReviewValues['items'][number]

const CONFIDENCE: Record<Row['confidence'], { label: string; variant: 'ok' | 'sage' | 'warn' | 'outline' }> = {
  high: { label: 'High confidence', variant: 'ok' },
  medium: { label: 'Medium confidence', variant: 'sage' },
  low: { label: 'Low confidence — please check', variant: 'warn' },
  manual: { label: 'Added by you', variant: 'outline' },
}

const blank = (): Row => ({ name: '', category: 'other', quantity: '', unit: '', confidence: 'manual', notes: '' })

export function toRows(detected: DetectedIngredient[]): Row[] {
  return detected.map((d) => ({
    name: d.name,
    category: d.category,
    quantity: d.estimated_quantity == null ? '' : String(d.estimated_quantity),
    unit: d.unit ?? '',
    confidence: d.confidence,
    notes: d.notes ?? '',
  }))
}

/** Editable list of provisional ingredients. Nothing is saved until the user confirms. */
export function IngredientReview({
  initial,
  onConfirm,
  submitting,
}: {
  initial: Row[]
  onConfirm: (items: InventoryInput[]) => void | Promise<void>
  submitting?: boolean
}) {
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { items: initial.length ? initial : [blank()] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const errors = form.formState.errors.items

  const submit = form.handleSubmit((v) =>
    onConfirm(
      v.items.map((i) => ({
        name: i.name.trim(),
        category: i.category,
        quantity: toNumberOrNull(i.quantity),
        unit: toTextOrNull(i.unit),
        storage_notes: toTextOrNull(i.notes),
        source: i.confidence === 'manual' ? 'manual' : 'scan',
      })),
    ),
  )

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <ul className="space-y-3" aria-label="Ingredients to confirm">
        {fields.map((field, index) => {
          const err = errors?.[index]
          const conf = CONFIDENCE[form.watch(`items.${index}.confidence`)]
          const id = `rev-${field.id}`
          return (
            <li key={field.id} className="rounded-xl border bg-card p-4 shadow-(--shadow-card)">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Badge variant={conf.variant}>{conf.label}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${form.getValues(`items.${index}.name`) || 'ingredient'}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_5.5rem_6rem]">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-name`}>Name</Label>
                  <Input id={`${id}-name`} {...form.register(`items.${index}.name`)} aria-invalid={!!err?.name} placeholder="e.g. tomato" />
                  {err?.name && <p className="text-xs text-destructive">{err.name.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-cat`}>Category</Label>
                  <Controller
                    control={form.control}
                    name={`items.${index}.category`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger id={`${id}-cat`} className="w-full">
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
                  <Label htmlFor={`${id}-qty`}>Quantity</Label>
                  <Input id={`${id}-qty`} inputMode="decimal" placeholder="?" {...form.register(`items.${index}.quantity`)} aria-invalid={!!err?.quantity} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-unit`}>Unit</Label>
                  <Input id={`${id}-unit`} placeholder="pcs, g…" {...form.register(`items.${index}.unit`)} />
                </div>
              </div>
              {err?.quantity && <p className="mt-1 text-xs text-destructive">{err.quantity.message}</p>}
              {form.watch(`items.${index}.notes`) && (
                <p className="mt-2 text-xs text-muted-foreground">Note: {form.watch(`items.${index}.notes`)}</p>
              )}
            </li>
          )
        })}
      </ul>
      {errors?.root?.message || errors?.message ? (
        <p className="text-sm text-destructive">{errors?.root?.message ?? errors?.message}</p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={() => append(blank())}>
          <Plus /> Add missing ingredient
        </Button>
        <Button type="submit" size="lg" disabled={submitting || fields.length === 0}>
          <CheckCheck /> {submitting ? 'Saving…' : `Confirm ${fields.length} ingredient${fields.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </form>
  )
}
