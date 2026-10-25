import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Health } from '@/types/api'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api<Health>('/api/health'), staleTime: 60_000, retry: 1 })
}
