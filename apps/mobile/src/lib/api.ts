import { API_BASE_URL } from './config'
import { currentLocale } from '../i18n/runtime'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  token?: string | null
  body?: unknown
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function firstValidationMessage(errors?: Record<string, string[]>): string | undefined {
  if (!errors) {
    return undefined
  }

  for (const messages of Object.values(errors)) {
    const first = messages?.find((item) => typeof item === 'string' && item.length > 0)
    if (first) {
      return first
    }
  }

  return undefined
}

export function messageFromApiPayload(
  payload: { message?: string; errors?: Record<string, string[]> },
  fallback: string,
): string {
  return firstValidationMessage(payload.errors) ?? payload.message ?? fallback
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': currentLocale(),
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    let payload: { message?: string; errors?: Record<string, string[]> } = {}
    try {
      payload = (await response.json()) as { message?: string; errors?: Record<string, string[]> }
    } catch {
      // Ignore JSON parse failures and keep fallback message.
    }

    let fallback = `Request failed (${response.status})`
    if (response.status === 404) {
      fallback = 'This reward is no longer available. Pull to refresh Home and try again.'
    }

    const message = messageFromApiPayload(payload, fallback)
    throw new ApiError(message, response.status, payload.errors ?? {})
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
