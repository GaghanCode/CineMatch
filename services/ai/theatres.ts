export interface Theatre {
  id: string
  name: string
  distance: number
  rating: number
  formats: string[]
  startingPrice: number
  showtimesCount: number
  address: string
  showtimes?: string[]
  languages?: string[]
  seatAvailability?: string
  specialLabels?: string[]
  priceLabel?: string
  lat?: number
  lng?: number
}

export interface TheatreRecommendation {
  theatres: Theatre[]
  recommended: Theatre
}

export interface AgentTheatreResult {
  name: string
  distance: string
  rating: string
  formats: string[]
  showtimes: string[]
  priceStartsFrom: string
  languages: string[]
  seatAvailability: string
  recommended: boolean
  specialLabels: string[]
}

export interface AgentResult {
  movie: string
  city: string
  theatres: AgentTheatreResult[]
  reasoning: string
  booking?: {
    theatre: string
    showtime: string
    seats: string[]
    ticketCount: number
    date?: string
  }
}

const MOCK_THEATRES: Record<string, Theatre[]> = {
  Bangalore: [
    { id: "blr-1", name: "PVR Orion Mall", distance: 2.3, rating: 4.5, formats: ["IMAX", "3D", "Dolby Cinema"], startingPrice: 350, showtimesCount: 14, address: "Orion Mall, Rajajinagar", lat: 12.9916, lng: 77.5567 },
    { id: "blr-2", name: "Cinepolis Forum Mall", distance: 3.8, rating: 4.4, formats: ["3D", "4DX", "Dolby Cinema"], startingPrice: 320, showtimesCount: 11, address: "Forum Mall, Koramangala", lat: 12.9352, lng: 77.6245 },
    { id: "blr-3", name: "INOX Leisure Park", distance: 5.1, rating: 4.2, formats: ["IMAX", "3D", "Standard"], startingPrice: 280, showtimesCount: 9, address: "Leisure Park, MG Road", lat: 12.9756, lng: 77.6066 },
    { id: "blr-4", name: "PVR Gold", distance: 6.4, rating: 4.7, formats: ["3D", "Dolby Cinema"], startingPrice: 650, showtimesCount: 7, address: "UB City, Vittal Mallya Road", lat: 12.9719, lng: 77.5946 },
    { id: "blr-5", name: "Mall of India", distance: 7.2, rating: 4.0, formats: ["IMAX", "3D", "4DX"], startingPrice: 300, showtimesCount: 10, address: "Mall of India, Yeshwanthpur", lat: 13.0219, lng: 77.5679 },
    { id: "blr-6", name: "INOX Shantiniketan", distance: 1.8, rating: 4.3, formats: ["3D", "Standard"], startingPrice: 250, showtimesCount: 8, address: "Shantiniketan, Whitefield", lat: 12.9698, lng: 77.7500 },
    { id: "blr-7", name: "Cinepolis Royal", distance: 4.5, rating: 4.6, formats: ["IMAX", "3D", "4DX", "Dolby Cinema"], startingPrice: 400, showtimesCount: 16, address: "Royal Meenakshi Mall, Bannerghatta", lat: 12.8985, lng: 77.5860 },
    { id: "blr-8", name: "PVR Arena", distance: 9.3, rating: 4.1, formats: ["3D", "Standard"], startingPrice: 220, showtimesCount: 6, address: "Arena Layout, Electronic City", lat: 12.8450, lng: 77.6600 },
  ],
  Mumbai: [
    { id: "mum-1", name: "PVR Icon", distance: 1.5, rating: 4.6, formats: ["IMAX", "3D", "Dolby Cinema", "4DX"], startingPrice: 450, showtimesCount: 18, address: "Phoenix Marketcity, Kurla" },
    { id: "mum-2", name: "INOX Multiplex", distance: 3.2, rating: 4.3, formats: ["3D", "Standard"], startingPrice: 280, showtimesCount: 10, address: "R City Mall, Ghatkopar" },
    { id: "mum-3", name: "Cinepolis Seawoods", distance: 12.4, rating: 4.5, formats: ["IMAX", "3D", "4DX"], startingPrice: 380, showtimesCount: 13, address: "Seawoods Grand Central, Navi Mumbai" },
    { id: "mum-4", name: "PVR Juhu", distance: 5.8, rating: 4.2, formats: ["3D", "Dolby Cinema"], startingPrice: 350, showtimesCount: 9, address: "Juhu, Vile Parle" },
    { id: "mum-5", name: "Maratha Mandir", distance: 7.3, rating: 3.8, formats: ["Standard"], startingPrice: 120, showtimesCount: 4, address: "Maratha Mandir, Mumbai Central" },
  ],
  Delhi: [
    { id: "del-1", name: "PVR Select Citywalk", distance: 2.1, rating: 4.6, formats: ["IMAX", "3D", "4DX", "Dolby Cinema"], startingPrice: 420, showtimesCount: 16, address: "Select Citywalk, Saket" },
    { id: "del-2", name: "INOX Janak Place", distance: 4.7, rating: 4.2, formats: ["3D", "Standard"], startingPrice: 260, showtimesCount: 8, address: "Janak Place, Janakpuri" },
    { id: "del-3", name: "Cinepolis Ambience Mall", distance: 8.3, rating: 4.4, formats: ["IMAX", "3D", "Dolby Cinema"], startingPrice: 350, showtimesCount: 12, address: "Ambience Mall, Gurgaon" },
    { id: "del-4", name: "PVR Naraina", distance: 5.5, rating: 4.0, formats: ["3D", "Standard"], startingPrice: 220, showtimesCount: 7, address: "Naraina Industrial Area" },
    { id: "del-5", name: "Wave Cinemas", distance: 3.9, rating: 4.1, formats: ["3D", "Standard"], startingPrice: 200, showtimesCount: 6, address: "Wave Mall, Rohini" },
  ],
  Hyderabad: [
    { id: "hyd-1", name: "PVR Next Galleria", distance: 2.8, rating: 4.4, formats: ["IMAX", "3D", "Dolby Cinema"], startingPrice: 330, showtimesCount: 12, address: "Next Galleria Mall, Panjagutta" },
    { id: "hyd-2", name: "INOX GVK One", distance: 1.9, rating: 4.5, formats: ["3D", "4DX", "Dolby Cinema"], startingPrice: 360, showtimesCount: 10, address: "GVK One, Banjara Hills" },
    { id: "hyd-3", name: "Cinepolis Mantra Mall", distance: 6.3, rating: 4.1, formats: ["3D", "Standard"], startingPrice: 240, showtimesCount: 7, address: "Mantra Mall, Kukatpally" },
    { id: "hyd-4", name: "Asian Multiplex", distance: 4.5, rating: 4.0, formats: ["3D", "Standard"], startingPrice: 200, showtimesCount: 5, address: "Asian Mall, Gachibowli" },
  ],
  Chennai: [
    { id: "che-1", name: "PVR Grand Galada", distance: 3.4, rating: 4.3, formats: ["IMAX", "3D", "Dolby Cinema"], startingPrice: 310, showtimesCount: 11, address: "Grand Galada, Pallavaram" },
    { id: "che-2", name: "INOX Marina Mall", distance: 2.5, rating: 4.4, formats: ["3D", "4DX"], startingPrice: 340, showtimesCount: 9, address: "Marina Mall, Thiruvanmiyur" },
    { id: "che-3", name: "Cinepolis Luxe", distance: 5.1, rating: 4.6, formats: ["IMAX", "3D", "Dolby Cinema", "4DX"], startingPrice: 480, showtimesCount: 14, address: "Phoenix Marketcity, Velachery" },
    { id: "che-4", name: "AGS Cinemas", distance: 1.2, rating: 4.2, formats: ["3D", "Standard"], startingPrice: 230, showtimesCount: 8, address: "AGS Cinemas, T Nagar" },
  ],
  Pune: [
    { id: "pun-1", name: "PVR Icon Pavillion", distance: 2.2, rating: 4.5, formats: ["IMAX", "3D", "4DX", "Dolby Cinema"], startingPrice: 380, showtimesCount: 15, address: "Pavillion Mall, SB Road" },
    { id: "pun-2", name: "INOX Bund Garden", distance: 3.6, rating: 4.3, formats: ["3D", "Dolby Cinema"], startingPrice: 300, showtimesCount: 9, address: "Bund Garden Road" },
    { id: "pun-3", name: "Cinepolis Seasons Mall", distance: 8.5, rating: 4.1, formats: ["3D", "Standard"], startingPrice: 260, showtimesCount: 7, address: "Seasons Mall, Hadapsar" },
    { id: "pun-4", name: "City Pride", distance: 1.5, rating: 3.9, formats: ["Standard"], startingPrice: 180, showtimesCount: 5, address: "City Pride, Kothrud" },
  ],
  Kolkata: [
    { id: "kol-1", name: "PVR Avani Riverside", distance: 2.7, rating: 4.4, formats: ["IMAX", "3D", "Dolby Cinema"], startingPrice: 340, showtimesCount: 12, address: "Avani Riverside Mall, Howrah" },
    { id: "kol-2", name: "INOX Fort Knox", distance: 4.1, rating: 4.2, formats: ["3D", "Standard"], startingPrice: 250, showtimesCount: 8, address: "Fort Knox, Park Circus" },
    { id: "kol-3", name: "Cinepolis Acropolis", distance: 5.8, rating: 4.3, formats: ["3D", "4DX"], startingPrice: 310, showtimesCount: 10, address: "Acropolis Mall, Kasba" },
    { id: "kol-4", name: "Nandan Cinema", distance: 3.3, rating: 4.0, formats: ["Standard"], startingPrice: 150, showtimesCount: 4, address: "Nandan, Lake Terrace" },
  ],
}

function scoreTheatre(t: Theatre): number {
  return (
    t.rating * 25 +
    Math.max(0, 10 - t.distance) * 3 +
    t.formats.length * 8 +
    Math.max(0, 500 - t.startingPrice) * 0.05 +
    t.showtimesCount * 2
  )
}

export function getTheatresForCity(city: string): Theatre[] {
  const normalized = Object.keys(MOCK_THEATRES).find(
    (k) => k.toLowerCase() === city.toLowerCase(),
  )
  return normalized ? MOCK_THEATRES[normalized] : []
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function getTheatresNearLocation(
  lat: number,
  lng: number,
  city: string,
  radiusKm = 20,
): Theatre[] {
  const base = getTheatresForCity(city)
  const nearby = base
    .map((t) => {
      if (t.lat == null || t.lng == null) return { ...t, distance: t.distance }
      return { ...t, distance: Math.round(haversineKm(lat, lng, t.lat, t.lng) * 10) / 10 }
    })
    .filter((t) => t.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
  return nearby.length > 0 ? nearby : base
}

export function getBestTheatre(theatres: Theatre[]): Theatre | null {
  if (theatres.length === 0) return null
  return [...theatres].sort((a, b) => scoreTheatre(b) - scoreTheatre(a))[0]
}
