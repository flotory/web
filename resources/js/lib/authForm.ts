/** Auth pages sit on dark layouts; inputs must set their own text color. */
export const authFieldClass =
  'mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

export function isStaffInviteRoute(query: Record<string, unknown>): boolean {
  if (query.staff === '1' || query.staff === 'true') {
    return true
  }

  const redirect = typeof query.redirect === 'string' ? query.redirect : ''

  return redirect.includes('/scanner')
}

export function staffInviteLoginQuery(email: string, redirect: string): Record<string, string> {
  return {
    staff: '1',
    email,
    redirect,
  }
}
