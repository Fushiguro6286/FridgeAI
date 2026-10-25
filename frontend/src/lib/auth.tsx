import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { api, tokenStore, UNAUTHORIZED_EVENT } from '@/lib/api'
import type { TokenResponse, User } from '@/types/api'

type Ctx = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}
const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const hasToken = !!tokenStore.get()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/api/auth/me'),
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  })

  // Keep the ['me'] query: qc.clear() would detach the useQuery above, so login/logout wouldn't re-render until reload.
  const resetUserData = useCallback(
    (user: User | null) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      qc.setQueryData(['me'], user)
    },
    [qc],
  )

  const logout = useCallback(() => {
    tokenStore.set(null)
    resetUserData(null)
  }, [resetUserData])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const finish = useCallback(
    (r: TokenResponse) => {
      tokenStore.set(r.access_token)
      resetUserData(r.user)
    },
    [resetUserData],
  )

  const value = useMemo<Ctx>(
    () => ({
      user: tokenStore.get() ? (me.data ?? null) : null,
      loading: hasToken && me.isPending,
      login: async (email, password) => finish(await api<TokenResponse>('/api/auth/login', { method: 'POST', body: { email, password } })),
      register: async (email, password, display_name) =>
        finish(await api<TokenResponse>('/api/auth/register', { method: 'POST', body: { email, password, display_name } })),
      logout,
    }),
    [me.data, me.isPending, hasToken, finish, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted-foreground" role="status">
        Loading your kitchen…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}
