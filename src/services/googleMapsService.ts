import type { LocationDetails } from "../lib/types"
import { parseLocationString } from "./locationService"

export interface RouteCalculationResult {
  origin: LocationDetails
  destination: LocationDetails
  distanceKm: number
  durationHours: number
  etaFormatted: string
  routePolyline?: string
  lastCalculatedTime: string
  dataSource: "Google Routes API" | "Estimation Model" | "Data unavailable"
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""

export function hasGoogleMapsKey(): boolean {
  return Boolean(API_KEY && API_KEY.trim() !== "")
}

/** Calculate road distance and travel time between origin and destination */
export async function calculateRouteDetails(
  originInput: string | LocationDetails,
  destInput: string | LocationDetails,
  averageSpeedKmh: number = 45,
): Promise<RouteCalculationResult> {
  const origin = typeof originInput === "string" ? parseLocationString(originInput) : originInput
  const destination = typeof destInput === "string" ? parseLocationString(destInput) : destInput
  const nowStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  // If real Google API Key is present, attempt live Routes API fetch
  if (hasGoogleMapsKey() && origin.lat && origin.lng && destination.lat && destination.lng) {
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10
          const seconds = parseInt(route.duration?.replace("s", "") || "0", 10)
          const durationHours = Math.round((seconds / 3600) * 10) / 10
          const etaHours = Math.ceil(durationHours)

          return {
            origin,
            destination,
            distanceKm,
            durationHours,
            etaFormatted: `${etaHours} hrs`,
            routePolyline: route.polyline?.encodedPolyline,
            lastCalculatedTime: nowStr,
            dataSource: "Google Routes API",
          }
        }
      }
    } catch (err) {
      console.warn("Google Routes API failed, switching to estimation model fallback", err)
    }
  }

  // Robust fallback estimation model when coordinates or API keys are not directly active
  let distanceKm = 42
  if (origin.lat && origin.lng && destination.lat && destination.lng) {
    distanceKm = calculateHaversineRoadDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng)
  } else {
    // Deterministic distance calculation based on location strings
    const strCombined = `${origin.formattedAddress}-${destination.formattedAddress}`.toLowerCase()
    if (strCombined.includes("nashik") && strCombined.includes("mumbai")) distanceKm = 165
    else if (strCombined.includes("pune") && strCombined.includes("mumbai")) distanceKm = 148
    else if (strCombined.includes("bengaluru") && strCombined.includes("kolar")) distanceKm = 68
    else if (strCombined.includes("chennai") && strCombined.includes("salem")) distanceKm = 340
    else distanceKm = 50
  }

  const durationHours = Math.round((distanceKm / averageSpeedKmh) * 10) / 10
  const etaHours = Math.max(1, Math.ceil(durationHours))

  return {
    origin,
    destination,
    distanceKm,
    durationHours,
    etaFormatted: `${etaHours} hrs (Estimate)`,
    lastCalculatedTime: nowStr,
    dataSource: "Estimation Model",
  }
}

/** Calculate approximate road distance using Haversine distance * 1.28 road winding multiplier */
function calculateHaversineRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightKm = R * c
  const roadFactor = 1.28 // Average Indian highway road factor multiplier over straight line
  return Math.round(straightKm * roadFactor * 10) / 10
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Format external Google Maps navigation direction link */
export function getGoogleMapsNavigationUrl(origin: LocationDetails | string, destination: LocationDetails | string): string {
  const origStr = typeof origin === "string" ? origin : origin.formattedAddress
  const destStr = typeof destination === "string" ? destination : destination.formattedAddress
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`
}
