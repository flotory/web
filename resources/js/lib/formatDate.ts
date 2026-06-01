export function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatRelativeDays(value: string | null | undefined): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  }

  if (diffDays === -1) {
    return 'Yesterday'
  }

  if (diffDays > -7 && diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`
  }

  return formatShortDate(value)
}

export function activityLabel(status: string | undefined): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'new':
      return 'New'
    case 'cooling':
      return 'At risk'
    default:
      return 'Unknown'
  }
}

export function activityTone(status: string | undefined): 'green' | 'amber' | 'slate' | 'blue' {
  switch (status) {
    case 'active':
      return 'green'
    case 'new':
      return 'blue'
    case 'cooling':
      return 'amber'
    default:
      return 'slate'
  }
}
