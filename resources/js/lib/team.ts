export type TeamMember = {
  id: number
  venue_id: number
  user_id: number
  role: 'owner' | 'staff'
  created_at?: string
  user: { id: number; name: string; email: string }
}

export type StaffInvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export type StaffInvitation = {
  id: number
  venue_id: number
  email: string
  role: 'staff'
  status: StaffInvitationStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
  inviter?: { id: number; name: string; email: string }
  accepted_by?: { id: number; name: string; email: string } | null
}

export function invitationStatusLabel(status: StaffInvitationStatus): string {
  const labels: Record<StaffInvitationStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }

  return labels[status]
}

export function invitationStatusTone(status: StaffInvitationStatus): 'amber' | 'green' | 'slate' | 'blue' {
  if (status === 'pending') return 'amber'
  if (status === 'accepted') return 'green'
  if (status === 'cancelled') return 'slate'

  return 'slate'
}

export function formatInvitationWhen(iso: string | null | undefined): string {
  if (!iso) return '—'

  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const absMinutes = Math.round(Math.abs(diffMs) / 60_000)

  if (absMinutes < 1) {
    return diffMs < 0 ? 'Just now' : 'In a moment'
  }

  if (absMinutes < 60) {
    return diffMs < 0 ? `${absMinutes} minute${absMinutes === 1 ? '' : 's'} ago` : `In ${absMinutes} minutes`
  }

  const absHours = Math.round(absMinutes / 60)

  if (absHours < 48) {
    return diffMs < 0 ? `${absHours} hour${absHours === 1 ? '' : 's'} ago` : `In ${absHours} hours`
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
