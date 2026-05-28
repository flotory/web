import { staffInviteLoginQuery } from '@/lib/authForm'
import type { Venue } from '@/types'

export type TeamMember = {
  id: number
  venue_id: number
  user_id: number
  role: 'owner' | 'staff'
  user: { id: number; name: string; email: string }
}

export type CredentialsReveal = {
  member: TeamMember
  temporaryPassword: string
  loginUrl: string
}

export function teamInviteLoginUrl(member: TeamMember): string {
  const params = new URLSearchParams(staffInviteLoginQuery(member.user.email, '/account'))

  return `${window.location.origin}/login?${params.toString()}`
}

export function teamInviteMessage(member: TeamMember, venue: Pick<Venue, 'name'> | null, temporaryPassword: string): string {
  const venueName = venue?.name ?? 'your venue'

  return [
    `You are invited as staff at ${venueName} on Flotory.`,
    `Log in (do not create a new account): ${teamInviteLoginUrl(member)}`,
    `Email: ${member.user.email}`,
    `Temporary password: ${temporaryPassword}`,
  ].join('\n')
}
