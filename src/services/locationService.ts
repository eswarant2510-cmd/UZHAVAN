import type { LocationDetails } from "../lib/types"

export const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]

/** Reference agricultural hub coordinates across major districts in India for fallback calculation when API key is unconfigured */
export const KNOWN_AGRI_HUBS: Record<string, { lat: number; lng: number; state: string; district: string }> = {
  nashik: { lat: 19.9975, lng: 73.7898, state: "Maharashtra", district: "Nashik" },
  mumbai: { lat: 19.076, lng: 72.8777, state: "Maharashtra", district: "Mumbai City" },
  pune: { lat: 18.5204, lng: 73.8567, state: "Maharashtra", district: "Pune" },
  nagpur: { lat: 21.1458, lng: 79.0882, state: "Maharashtra", district: "Nagpur" },
  bengaluru: { lat: 12.9716, lng: 77.5946, state: "Karnataka", district: "Bengaluru Urban" },
  kolar: { lat: 13.1367, lng: 78.1292, state: "Karnataka", district: "Kolar" },
  chennai: { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu", district: "Chennai" },
  salem: { lat: 11.6643, lng: 78.146, state: "Tamil Nadu", district: "Salem" },
  hyderabad: { lat: 17.385, lng: 78.4867, state: "Telangana", district: "Hyderabad" },
  guntur: { lat: 16.3067, lng: 80.4365, state: "Andhra Pradesh", district: "Guntur" },
  delhi: { lat: 28.7041, lng: 77.1025, state: "Delhi", district: "New Delhi" },
  jaipur: { lat: 26.9124, lng: 75.7873, state: "Rajasthan", district: "Jaipur" },
  ahmedabad: { lat: 23.0225, lng: 72.5714, state: "Gujarat", district: "Ahmedabad" },
}

export function parseLocationString(rawLocation: string): LocationDetails {
  const parts = rawLocation.split(",").map((p) => p.trim())
  const formattedAddress = rawLocation.trim() || "Unspecified Location"

  let state: string | undefined
  let city: string | undefined
  let district: string | undefined

  for (const part of parts) {
    const matchedState = INDIAN_STATES_AND_UTS.find(
      (s) => s.toLowerCase() === part.toLowerCase(),
    )
    if (matchedState) {
      state = matchedState
      continue
    }
  }

  if (parts.length > 0 && parts[0] !== state) {
    city = parts[0]
  }

  const lowerKey = (city || formattedAddress).toLowerCase()
  const hubMatch = Object.keys(KNOWN_AGRI_HUBS).find((k) => lowerKey.includes(k))

  let lat: number | undefined
  let lng: number | undefined

  if (hubMatch) {
    const hub = KNOWN_AGRI_HUBS[hubMatch]
    lat = hub.lat
    lng = hub.lng
    if (!state) state = hub.state
    if (!district) district = hub.district
  }

  return {
    formattedAddress,
    state: state || "Maharashtra",
    district: district || city || "Nashik",
    city: city || "Nashik",
    lat,
    lng,
    dataSource: hubMatch ? "user_input" : "estimate",
  }
}

export async function getBrowserLocationWithPermission(): Promise<LocationDetails> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        resolve({
          formattedAddress: `GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
          lat,
          lng,
          dataSource: "browser_gps",
        })
      },
      (err) => {
        reject(new Error(err.message || "Location permission denied or unavailable."))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}
