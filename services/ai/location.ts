export interface LocationResult {
  lat: number
  lng: number
  city: string
}

const cityCache = new Map<string, LocationResult>()

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const cached = cityCache.get(cacheKey)
  if (cached) return cached.city

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`
  const res = await fetch(url, {
    headers: { "User-Agent": "CineMatchOS/1.0" },
  })

  if (!res.ok) throw new Error("Reverse geocoding failed")

  const data = await res.json()
  const address = data?.address ?? {}
  const city =
    address.city ??
    address.town ??
    address.county ??
    address.state_district ??
    address.state ??
    ""

  const trimmed = city.trim()
  if (!trimmed) throw new Error("Could not determine city")

  return trimmed
}

export async function getUserLocation(): Promise<LocationResult | null> {
  if (typeof window === "undefined") return null
  if (!navigator.geolocation) return null

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2 * 60 * 1000,
      })
    })

    const { latitude, longitude } = position.coords
    const city = await reverseGeocode(latitude, longitude)

    const result: LocationResult = { lat: latitude, lng: longitude, city }
    cityCache.set(`${latitude.toFixed(2)},${longitude.toFixed(2)}`, result)
    return result
  } catch {
    return null
  }
}
