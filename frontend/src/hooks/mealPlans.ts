import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MealPlan, MealPlanGenerateInput, MealPlanSummary, Page, Slot } from '@/types/api'

export function useMealPlans() {
  return useQuery({ queryKey: ['plans'], queryFn: () => api<Page<MealPlanSummary>>('/api/meal-plans?limit=50') })
}

export function useMealPlan(id: number | null | undefined) {
  return useQuery({ queryKey: ['plan', id], queryFn: () => api<MealPlan>(`/api/meal-plans/${id}`), enabled: !!id })
}

function usePlanMutation<V>(fn: (v: V) => Promise<MealPlan>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (plan) => {
      qc.setQueryData(['plan', plan.id], plan)
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['shopping'] })
    },
  })
}

export const useGeneratePlan = () =>
  usePlanMutation((body: MealPlanGenerateInput) => api<MealPlan>('/api/meal-plans/generate', { method: 'POST', body }))

export const useRenamePlan = () =>
  usePlanMutation(({ id, name }: { id: number; name: string }) => api<MealPlan>(`/api/meal-plans/${id}`, { method: 'PATCH', body: { name } }))

export const useSetEntry = () =>
  usePlanMutation(({ planId, ...body }: { planId: number; day_date: string; slot: Slot; recipe_id: number; servings: number }) =>
    api<MealPlan>(`/api/meal-plans/${planId}/entries`, { method: 'POST', body }),
  )

export const useUpdateEntry = () =>
  usePlanMutation(({ planId, entryId, ...body }: { planId: number; entryId: number; servings?: number; recipe_id?: number }) =>
    api<MealPlan>(`/api/meal-plans/${planId}/entries/${entryId}`, { method: 'PATCH', body }),
  )

export const useRemoveEntry = () =>
  usePlanMutation(({ planId, entryId }: { planId: number; entryId: number }) =>
    api<MealPlan>(`/api/meal-plans/${planId}/entries/${entryId}`, { method: 'DELETE' }),
  )

export const useRegenerateEntry = () =>
  usePlanMutation(({ planId, entryId }: { planId: number; entryId: number }) =>
    api<MealPlan>(`/api/meal-plans/${planId}/entries/${entryId}/regenerate`, { method: 'POST' }),
  )

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/meal-plans/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ['plan', id] })
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['shopping'] })
    },
  })
}
