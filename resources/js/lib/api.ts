import { useAuthStore } from '@/stores/auth'
import { getActiveLocale } from '@/i18n'

const REQUEST_ID_HEADER = 'X-Request-Id'

let lastRequestId: string | null = null
let sessionAbort = new AbortController()

export function abortActiveApiRequests(): void {
  sessionAbort.abort()
  sessionAbort = new AbortController()
}

export function getLastRequestId(): string | null {
  return lastRequestId
}

export type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
  includeAuth?: boolean
  /** Use when the auth store was cleared but a token is still needed (e.g. logout revoke). */
  authToken?: string | null
  /** When false, request is not cancelled by abortActiveApiRequests(). */
  bindToSession?: boolean
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

const VENUE_ACCESS_DENIED_MESSAGE = 'This venue is not in your workspace.'

function normalizeApiMessage(message: string, status: number): string {
  if (/No query results for model \[App\\Models\\Venue\]/i.test(message)) {
    return VENUE_ACCESS_DENIED_MESSAGE
  }

  if (status === 403 && message === 'Forbidden') {
    return 'You do not have permission to manage this venue.'
  }

  return message
}

export function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function isAbortedRequest(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 499) {
    return true
  }

  return error instanceof DOMException && error.name === 'AbortError'
}

export function isVenueAccessDenied(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }

  return error.status === 404
    || error.message === VENUE_ACCESS_DENIED_MESSAGE
    || /No query results for model \[App\\Models\\Venue\]/i.test(error.message)
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback
  }

  return normalizeApiMessage(error.message, error.status)
}

function requestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')
  headers.set('Accept-Language', getActiveLocale())

  let body = options.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const authToken = options.authToken !== undefined ? options.authToken : auth.token
  if (options.includeAuth !== false && authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  if (!headers.has(REQUEST_ID_HEADER)) {
    headers.set(REQUEST_ID_HEADER, requestId())
  }

  // PHP does not populate uploaded files on PUT/PATCH — use POST + method spoofing.
  let method = options.method ?? 'GET'
  if (body instanceof FormData && method && ['PUT', 'PATCH'].includes(method.toUpperCase())) {
    body.append('_method', method.toUpperCase())
    method = 'POST'
  }

  let response: Response
  const signal = options.bindToSession === false
    ? options.signal
    : (options.signal ?? sessionAbort.signal)

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      headers,
      body,
      signal,
    })
  } catch (error) {
    if (isAbortedRequest(error)) {
      throw new ApiError('Request aborted', 499)
    }

    throw new ApiError(
      'Could not reach the Flotory server. If you are developing locally, open http://localhost:8000 and run `docker compose up`.',
      0,
    )
  }

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

    const rawMessage = firstFieldMessage ?? payload.message ?? `API request failed with status ${response.status}`
    const message = normalizeApiMessage(String(rawMessage), response.status)

    throw new ApiError(message, response.status, fieldErrors ?? {}, responseRequestId ?? undefined)
  }

  return payload as T
}
