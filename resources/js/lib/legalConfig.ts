/** Public legal contact details — keep in sync with App Store Connect legal entity. */
export const legalConfig = {
  entityName: 'Narek Divdaryan',
  registeredAddress: 'Wietrzna, 53-024 Wrocław, Poland',
  websiteUrl: 'https://flotory.com',
  effectiveDate: '14 June 2026',
  /** Public contact — App Store, privacy policy, support. Gmail is fine for Apple review. */
  privacyEmail: 'flotoryapp@gmail.com',
  supportEmail: 'flotoryapp@gmail.com',
  legalEmail: 'flotoryapp@gmail.com',
  dpoEmail: 'flotoryapp@gmail.com',
} as const

export function applyLegalPlaceholders(source: string): string {
  return source
    .replaceAll('[LEGAL_ENTITY_NAME]', legalConfig.entityName)
    .replaceAll('[REGISTERED_ADDRESS]', legalConfig.registeredAddress)
    .replaceAll('[WEBSITE_URL]', legalConfig.websiteUrl)
    .replaceAll('[EFFECTIVE_DATE]', legalConfig.effectiveDate)
    .replaceAll('[PRIVACY_EMAIL]', legalConfig.privacyEmail)
    .replaceAll('[SUPPORT_EMAIL]', legalConfig.supportEmail)
    .replaceAll('[LEGAL_EMAIL]', legalConfig.legalEmail)
    .replaceAll('[DPO_EMAIL]', legalConfig.dpoEmail)
}
