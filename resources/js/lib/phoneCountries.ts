import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

export interface PhoneCountryOption {
  code: CountryCode
  name: string
  dialCode: string
  flag: string
}

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

export function countryFlag(code: CountryCode): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function countryName(code: CountryCode): string {
  return regionNames?.of(code) ?? code
}

export function countryDialCode(code: CountryCode): string {
  return `+${getCountryCallingCode(code)}`
}

function buildOption(code: CountryCode): PhoneCountryOption {
  return {
    code,
    name: countryName(code),
    dialCode: countryDialCode(code),
    flag: countryFlag(code),
  }
}

export function listPhoneCountries(): PhoneCountryOption[] {
  return getCountries()
    .map(buildOption)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function detectDefaultPhoneCountry(): CountryCode {
  if (typeof navigator === 'undefined') {
    return 'US'
  }

  const localeRegion = navigator.language?.split('-')[1]?.toUpperCase()
  if (localeRegion && getCountries().includes(localeRegion as CountryCode)) {
    return localeRegion as CountryCode
  }

  return 'US'
}
