import { apiRequest } from './api'

export async function updatePassword(
  token: string,
  input: {
    current_password: string
    password: string
    password_confirmation: string
  },
): Promise<void> {
  await apiRequest<{ message: string }>('/auth/password', {
    method: 'PUT',
    token,
    body: input,
  })
}
