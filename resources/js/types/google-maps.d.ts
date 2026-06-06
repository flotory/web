declare namespace google.maps.places {
  interface PlaceResult {
    formatted_address?: string
    geometry?: {
      location?: {
        lat(): number
        lng(): number
      }
    }
    place_id?: string
  }

  enum PlacesServiceStatus {
    OK = 'OK',
  }

  interface PlaceDetailsRequest {
    placeId: string
    fields?: string[]
  }

  class Autocomplete {
    constructor(input: HTMLInputElement, opts?: { fields?: string[]; types?: string[] })
    addListener(eventName: 'place_changed', handler: () => void): MapsEventListener
    getPlace(): PlaceResult
  }

  class PlacesService {
    constructor(attrContainer: HTMLDivElement | google.maps.Map)
    getDetails(
      request: PlaceDetailsRequest,
      callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void,
    ): void
  }
}

declare namespace google.maps {
  interface MapsEventListener {
    remove(): void
  }
}

declare const google: {
  maps: {
    places: typeof google.maps.places
    MapsEventListener: google.maps.MapsEventListener
  }
}
