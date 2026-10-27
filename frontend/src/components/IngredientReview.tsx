import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCheck, Minus, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES, categoryEmoji } from '@/lib/format'
import { cn } from '@/lib/utils'
import { reviewSchema, toNumberOrNull, toTextOrNull, type ReviewValues } from '@/schemas/forms'
import type { DetectedIngredient, InventoryInput } from '@/types/api'

type Row = ReviewValues['items'][number]

const CONFIDENCE: Record<Row['confidence'], { label: string; variant: 'ok' | 'sage' | 'warn' | 'outline' }> = {
  high: { label: 'High confidence', variant: 'ok' },
  medium: { label: 'Medium confidence', variant: 'sage' },
  low: { label: 'Low confidence — please check', variant: 'warn' },
  manual: { label: 'Added by you', variant: 'outline' },
}

/** Next value for the − / + buttons: bigger steps for bigger amounts (200 g moves by 50, 4 pcs by 1). */
export function stepQty(raw: string, dir: 1 | -1): string {
  const v = Number(raw)
  const cur = raw.trim() === '' || Number.isNaN(v) ? 0 : v
  const step = cur >= 100 ? 50 : cur >= 20 ? 5 : 1
  return String(Math.max(0, cur + dir * step))
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

  const cols = '@3xl:grid-cols-[minmax(0,2fr)_minmax(9.5rem,1.3fr)_12.5rem_8.5rem_2.5rem]'
  const bump = (index: number, dir: 1 | -1) =>
    form.setValue(`items.${index}.quantity`, stepQty(form.getValues(`items.${index}.quantity`) ?? '', dir), { shouldValidate: true })

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="@container overflow-hidden rounded-3xl border bg-card shadow-(--shadow-card)">
        <div className={cn('hidden gap-3 border-b bg-muted/40 px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground @3xl:grid', cols)} aria-hidden>
          <span>Ingredient</span>
          <span>Category</span>
          <span>Quantity</span>
          <span>Confidence</span>
          <span className="text-right">Action</span>
        </div>
        <ul className="divide-y" aria-label="Ingredients to confirm">
          {fields.map((field, index) => {
            const err = errors?.[index]
            const conf = CONFIDENCE[form.watch(`items.${index}.confidence`)]
            const id = `rev-${field.id}`
            const note = form.watch(`items.${index}.notes`)
            return (
              <li key={field.id} className={cn('grid items-center gap-3 px-5 py-5 @3xl:gap-3 @3xl:px-6', cols)}>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-name`} className="@3xl:sr-only">
                    Name
                  </Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {categoryEmoji(form.watch(`items.${index}.category`))}
                    </span>
                    <Input id={`${id}-name`} {...form.register(`items.${index}.name`)} aria-invalid={!!err?.name} placeholder="e.g. tomato" className="font-semibold" />
                  </div>
                  {err?.name && <p className="text-xs text-destructive">{err.name.message}</p>}
                  {note && <p className="text-xs text-muted-foreground">Note: {note}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-cat`} className="@3xl:sr-only">
                    Category
                  </Label>
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
                  <div className="flex gap-2 @3xl:sr-only">
                    <Label htmlFor={`${id}-qty`} className="flex-1">
                      Quantity
                    </Label>
                    <Label htmlFor={`${id}-unit`} className="w-20">
                      Unit
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="secondary" size="icon-sm" onClick={() => bump(index, -1)} aria-label="Decrease quantity">
                      <Minus />
                    </Button>
                    <Input id={`${id}-qty`} inputMode="decimal" placeholder="?" className="w-12 text-center font-semibold" {...form.register(`items.${index}.quantity`)} aria-invalid={!!err?.quantity} />
                    <Button type="button" variant="secondary" size="icon-sm" onClick={() => bump(index, 1)} aria-label="Increase quantity">
                      <Plus />
                    </Button>
                    <Input id={`${id}-unit`} placeholder="pcs, g…" className="w-16 min-w-0" {...form.register(`items.${index}.unit`)} />
                  </div>
                  {err?.quantity && <p className="text-xs text-destructive">{err.quantity.message}</p>}
                </div>
                <div>
                  <Badge variant={conf.variant} className="h-auto whitespace-normal rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide">
                    {conf.label}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${form.getValues(`items.${index}.name`) || 'ingredient'}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      {errors?.root?.message || errors?.message ? (
        <p className="text-sm text-destructive">{errors?.root?.message ?? errors?.message}</p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" size="lg" onClick={() => append(blank())}>
          <Plus /> Add missing ingredient
        </Button>
        <Button type="submit" size="lg" className="h-14 rounded-2xl px-8 text-base" disabled={submitting || fields.length === 0}>
          <CheckCheck /> {submitting ? 'Saving…' : `Confirm ${fields.length} ingredient${fields.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </form>
  )
}
