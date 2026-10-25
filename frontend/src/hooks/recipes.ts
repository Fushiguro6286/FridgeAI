import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { qs } from '@/hooks/inventory'
import type { Page, Recipe, RecipeGenerateInput, RecipeGenerateResult } from '@/types/api'

export function useRecipes(params: { saved?: boolean; sort?: 'newest' | 'best_match'; limit?: number } = {}) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => api<Page<Recipe>>(`/api/recipes${qs({ limit: 20, ...params })}`),
  })
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api<Recipe>(`/api/recipes/${id}`),
    enabled: !!id,
  })
}

export function useGenerateRecipes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RecipeGenerateInput) => api<RecipeGenerateResult>('/api/recipes/generate', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useToggleSave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, save }: { id: number; save: boolean }) =>
      api<Recipe | void>(`/api/recipes/${id}/save`, { method: save ? 'POST' : 'DELETE' }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['recipe', id] })
      qc.invalidateQueries({ queryKey: ['plan'] })
    },
  })
}
