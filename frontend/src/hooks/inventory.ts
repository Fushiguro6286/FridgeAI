import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InventoryInput, InventoryItem, Page } from '@/types/api'

export type InventoryParams = {
  q?: string
  category?: string
  status?: 'available' | 'consumed' | 'all'
  sort?: 'name' | 'newest' | 'expiry' | 'priority'
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v))
  const str = s.toString()
  return str ? `?${str}` : ''
}
export { qs }

export function useInventory(params: InventoryParams = {}) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => api<Page<InventoryItem>>(`/api/inventory${qs({ ...params, limit: 200 })}`),
  })
}

// Inventory drives recipe availability and plan requirements, so refresh those too.
export function invalidateKitchen(qc: QueryClient) {
  for (const key of ['inventory', 'recipes', 'recipe', 'plan']) qc.invalidateQueries({ queryKey: [key] })
}

export function useAddIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InventoryInput) => api<InventoryItem>('/api/inventory', { method: 'POST', body }),
    onSuccess: () => invalidateKitchen(qc),
  })
}

export function useAddIngredientsBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: InventoryInput[]) => api<InventoryItem[]>('/api/inventory/bulk', { method: 'POST', body: { items } }),
    onSuccess: () => invalidateKitchen(qc),
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<InventoryItem> & { id: number }) =>
      api<InventoryItem>(`/api/inventory/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidateKitchen(qc),
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/inventory/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateKitchen(qc),
  })
}
