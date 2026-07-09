export const ADDITIONAL_VENUE_CREATE_PATH = '/my-venues/create'

export const ADDITIONAL_VENUE_CREATE_STEPS = ['details', 'files', 'reward', 'review'] as const

export type AdditionalVenueCreateStep = (typeof ADDITIONAL_VENUE_CREATE_STEPS)[number]

export function isAdditionalVenueCreateStep(value: string | undefined): value is AdditionalVenueCreateStep {
  return ADDITIONAL_VENUE_CREATE_STEPS.includes(value as AdditionalVenueCreateStep)
}

export function additionalVenueCreateStepPath(step: AdditionalVenueCreateStep): string {
  return `${ADDITIONAL_VENUE_CREATE_PATH}/${step}`
}

export function additionalVenueCreateFreshPath(): string {
  return `${ADDITIONAL_VENUE_CREATE_PATH}/details?fresh=1`
}
