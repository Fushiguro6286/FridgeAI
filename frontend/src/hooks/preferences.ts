import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Preferences } from '@/types/api'

export function usePreferences() {
  return useQuery({ queryKey: ['preferences'], queryFn: () => api<Preferences>('/api/preferences') })
}

export function useUpdatePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Preferences>) => api<Preferences>('/api/preferences', { method: 'PATCH', body }),
    onSuccess: (data) => {
      qc.setQueryData(['preferences'], data)
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
