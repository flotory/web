/** Shared form control styles — white surface so fields don't look disabled. */
const formControlBase =
  'rounded-2xl border border-border bg-surface text-sm font-medium text-ink placeholder:text-ink-soft outline-none transition focus:border-ink-soft'

/** Auth pages sit on dark layouts; inputs must set their own text color. */
export const authFieldClass = `mt-2 h-12 w-full ${formControlBase} px-4 focus:ring-2 focus:ring-border`

/** Standard workspace text input (h-12). */
export const formFieldClass = `mt-2 h-12 w-full ${formControlBase} px-4`

/** Select with a custom chevron — avoids the browser arrow sitting too far right. */
export const formSelectClass = `mt-2 h-12 w-full appearance-none ${formControlBase} px-4 pr-11`

/** Compact filter/search inputs (h-11). */
export const formFieldClassSm = `h-11 w-full ${formControlBase} px-4`

/** Multi-line fields. */
export const formTextareaClass = `mt-2 w-full ${formControlBase} px-4 py-3`
