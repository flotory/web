import { useAuthStore } from '@/stores/auth'

const REQUEST_ID_HEADER = 'X-Request-Id'

let lastRequestId: string | null = null

export function getLastRequestId(): string | null {
  return lastRequestId
}

export type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
  includeAuth?: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
    public requestId?: string,
  ) {
    super(message)
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
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

  if (options.includeAuth !== false && auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  if (!headers.has(REQUEST_ID_HEADER)) {
    headers.set(REQUEST_ID_HEADER, crypto.randomUUID())
  }

  // PHP does not populate uploaded files on PUT/PATCH — use POST + method spoofing.
  let method = options.method ?? 'GET'
  if (body instanceof FormData && method && ['PUT', 'PATCH'].includes(method.toUpperCase())) {
    body.append('_method', method.toUpperCase())
    method = 'POST'
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    body,
  })

  const responseRequestId = response.headers.get(REQUEST_ID_HEADER)
  if (responseRequestId) {
    lastRequestId = responseRequestId
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const fieldErrors = payload.errors as Record<string, string[]> | undefined
    const firstFieldMessage = fieldErrors
      ? Object.values(fieldErrors).flat().find((message) => typeof message === 'string' && message.length > 0)
      : undefined

    const message = firstFieldMessage ?? payload.message ?? `API request failed with status ${response.status}`

    throw new ApiError(message, response.status, fieldErrors ?? {}, responseRequestId ?? undefined)
  }

  return payload as T
}
