import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ShoppingItem, ShoppingList } from '@/types/api'

export function useShoppingList() {
  return useQuery({ queryKey: ['shopping'], queryFn: () => api<ShoppingList>('/api/shopping-list') })
}

function useShoppingMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }) })
}

export const useBuildShoppingList = () =>
  useShoppingMutation((meal_plan_id: number) =>
    api<ShoppingList>('/api/shopping-list/generate', { method: 'POST', body: { meal_plan_id } }),
  )

export const useAddShoppingItem = () =>
  useShoppingMutation((body: { name: string; quantity?: number | null; unit?: string | null; estimated_price?: number | null }) =>
    api<ShoppingItem>('/api/shopping-list/items', { method: 'POST', body }),
  )

export function useUpdateShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ShoppingItem> & { id: number }) =>
      api<ShoppingItem>(`/api/shopping-list/items/${id}`, { method: 'PATCH', body }),
    // Optimistic tick so the checkbox feels instant; rolled back on error.
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ['shopping'] })
      const prev = qc.getQueryData<ShoppingList>(['shopping'])
      if (prev) {
        qc.setQueryData<ShoppingList>(['shopping'], {
          ...prev,
          items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })
}

export const useDeleteShoppingItem = () =>
  useShoppingMutation((id: number) => api<void>(`/api/shopping-list/items/${id}`, { method: 'DELETE' }))
