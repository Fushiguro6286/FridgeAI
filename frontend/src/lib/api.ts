export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

const TOKEN_KEY = 'fridgeai.token'

// shortcut: bearer token in localStorage is readable by any XSS on this origin; move to an
// httpOnly SameSite cookie if frontend and API are served from the same site.
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
}

export class ApiError extends Error {
  status: number
  code: string
  details?: { field: string; message: string }[]

  constructor(status: number, code: string, message: string, details?: ApiError['details']) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const UNAUTHORIZED_EVENT = 'fridgeai:unauthorized'

function toError(status: number, body: unknown): ApiError {
  const err = (body as { error?: { code?: string; message?: string; details?: ApiError['details'] } })?.error
  if (err?.message) return new ApiError(status, err.code ?? 'error', err.message, err.details)
  return new ApiError(status, 'error', `Request failed (${status}).`)
}

function handle401(status: number, path: string) {
  if (status === 401 && !path.startsWith('/api/auth/')) {
    tokenStore.set(null)
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal }

export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'network', 'Cannot reach the FridgeAI server. Check that the backend is running.')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    handle401(res.status, path)
    throw toError(res.status, data)
  }
  return data as T
}

/** Multipart upload with progress (fetch cannot report upload progress). */
export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', API_URL + path)
    const token = tokenStore.get()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.upload.onload = () => onProgress(1)
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON body */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else {
        handle401(xhr.status, path)
        reject(toError(xhr.status, data))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, 'network', 'Upload failed. Check your connection and that the backend is running.'))
    xhr.ontimeout = () => reject(new ApiError(0, 'timeout', 'The upload timed out. Please try again.'))
    xhr.timeout = 120_000
    signal?.addEventListener('abort', () => {
      xhr.abort()
      reject(new DOMException('Aborted', 'AbortError'))
    })
    xhr.send(form)
  })
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong.'
}
