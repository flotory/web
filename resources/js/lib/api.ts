import { useAuthStore } from '@/stores/auth'

export type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message)
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  let body = options.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  if (auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    body,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(payload.message ?? `API request failed with status ${response.status}`, response.status, payload.errors)
  }

  return payload as T
}
