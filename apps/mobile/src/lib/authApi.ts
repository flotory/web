import { apiRequest } from './api'

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  })

  return response.message
}
