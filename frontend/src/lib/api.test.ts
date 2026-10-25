import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, tokenStore, UNAUTHORIZED_EVENT } from '@/lib/api'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body === null ? null : JSON.stringify(body), { status }))
}

afterEach(() => {
  vi.restoreAllMocks()
  tokenStore.set(null)
})

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStore.set('abc')
    const spy = mockFetch(200, { ok: true })
    await api('/api/inventory', { method: 'POST', body: { name: 'tomato' } })
    const [, init] = spy.mock.calls[0]
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer abc')
    expect(init!.body).toBe('{"name":"tomato"}')
  })

  it('turns the error envelope into an ApiError', async () => {
    mockFetch(503, { error: { code: 'ai_not_configured', message: 'AI features are not configured.' } })
    const err = (await api('/api/ingredients/detect').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(503)
    expect(err.code).toBe('ai_not_configured')
    expect(err.message).toBe('AI features are not configured.')
  })

  it('clears the session on 401 outside auth routes', async () => {
    tokenStore.set('expired')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)
    mockFetch(401, { error: { code: 'unauthorized', message: 'Not authenticated' } })
    await expect(api('/api/inventory')).rejects.toBeInstanceOf(ApiError)
    expect(tokenStore.get()).toBeNull()
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('does not log out on a failed login attempt', async () => {
    tokenStore.set('keep')
    mockFetch(401, { error: { code: 'invalid_credentials', message: 'Incorrect email or password.' } })
    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toThrow('Incorrect email or password.')
    expect(tokenStore.get()).toBe('keep')
  })

  it('reports an unreachable server clearly', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api('/api/health')).rejects.toMatchObject({ code: 'network' })
  })

  it('returns undefined for 204', async () => {
    mockFetch(204, null)
    await expect(api('/api/inventory/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
