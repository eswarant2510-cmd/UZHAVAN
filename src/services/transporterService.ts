import type {
  TransporterProfile,
  TransportOption,
  VehicleCategory,
  TransporterVerificationStatus,
  QuoteType,
  LocationDetails,
} from "../lib/types"
import { parseLocationString } from "./locationService"
import { calculateRouteDetails } from "./googleMapsService"

/** Legitimate sample transporter profiles registered across Indian states */
export const REGISTERED_TRANSPORTERS: TransporterProfile[] = [
  {
    id: "transporter-1",
    companyName: "Vijay Logistics & Agri Freight",
    transporterPhone: "9876500002",
    publicPhone: "+91 98765 00002",
    website: "https://vijaylogistics.in",
    businessAddress: "Plot 42, Market Yard Road, Nashik, Maharashtra",
    state: "Maharashtra",
    district: "Nashik",
    serviceAreas: ["Maharashtra", "Gujarat", "Goa", "Dadra and Nagar Haveli and Daman and Diu"],
    vehicleTypes: ["Mini Truck", "Pickup", "Light Commercial Vehicle"],
    maxCapacityKg: 3500,
    refrigeratedAvailable: true,
    gpsTrackingCapable: true,
    verificationStatus: "UZHAVAN_VERIFIED",
    trustScore: 94,
    completedShipmentsCount: 128,
    onTimeDeliveryRatePct: 98.2,
    cancellationRatePct: 0.8,
    isAvailable: true,
  },
  {
    id: "transporter-2",
    companyName: "Kisan Express Cold Logistics",
    transporterPhone: "9876500005",
    publicPhone: "+91 98765 00005",
    website: "https://kisanexpress.com",
    businessAddress: "NH-48 Logistics Hub, Pune, Maharashtra",
    state: "Maharashtra",
    district: "Pune",
    serviceAreas: ["Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh"],
    vehicleTypes: ["Light Commercial Vehicle", "Medium Goods Vehicle", "Refrigerated Vehicle"],
    maxCapacityKg: 7500,
    refrigeratedAvailable: true,
    gpsTrackingCapable: true,
    verificationStatus: "UZHAVAN_VERIFIED",
    trustScore: 91,
    completedShipmentsCount: 94,
    onTimeDeliveryRatePct: 96.5,
    cancellationRatePct: 1.2,
    isAvailable: true,
  },
  {
    id: "transporter-3",
    companyName: "Deccan Highway Carriers",
    transporterPhone: "9876500009",
    publicPhone: "+91 98765 00009",
    businessAddress: "APMC Yard, Bengaluru, Karnataka",
    state: "Karnataka",
    district: "Bengaluru Urban",
    serviceAreas: ["Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh"],
    vehicleTypes: ["Mini Truck", "Medium Goods Vehicle", "Heavy Goods Vehicle"],
    maxCapacityKg: 15000,
    refrigeratedAvailable: false,
    gpsTrackingCapable: true,
    verificationStatus: "UZHAVAN_VERIFIED",
    trustScore: 88,
    completedShipmentsCount: 76,
    onTimeDeliveryRatePct: 95.0,
    cancellationRatePct: 2.0,
    isAvailable: true,
  },
  {
    id: "transporter-4",
    companyName: "Google Listed Transport Center (Unverified)",
    transporterPhone: "9876599999",
    businessAddress: "Outer Ring Road, Hyderabad, Telangana",
    state: "Telangana",
    district: "Hyderabad",
    serviceAreas: ["Telangana"],
    vehicleTypes: ["Pickup"],
    maxCapacityKg: 1500,
    refrigeratedAvailable: false,
    gpsTrackingCapable: false,
    verificationStatus: "GOOGLE_LISTED",
    trustScore: 60,
    completedShipmentsCount: 0,
    onTimeDeliveryRatePct: 0,
    cancellationRatePct: 0,
    isAvailable: true,
  },
]

export interface FindMatchingOptionsInput {
  pickupLocation: string | LocationDetails
  deliveryLocation: string | LocationDetails
  quantityKg: number
  crop?: string
  perishable?: boolean
  refrigerationRequired?: boolean
}

export interface TransportMatchingResult {
  options: TransportOption[]
  verifiedTransportersFound: boolean
  message: string
}

/** Multi-factor Transport Matching Engine */
export async function findMatchingTransporters(
  input: FindMatchingOptionsInput,
): Promise<TransportMatchingResult> {
  const origin = typeof input.pickupLocation === "string" ? parseLocationString(input.pickupLocation) : input.pickupLocation
  const destination = typeof input.deliveryLocation === "string" ? parseLocationString(input.deliveryLocation) : input.deliveryLocation
  const route = await calculateRouteDetails(origin, destination)

  const quantityKg = input.quantityKg || 500

  // 1. Filter matching registered carriers based on service area coverage
  const eligibleTransporters = REGISTERED_TRANSPORTERS.filter((t) => {
    if (!t.isAvailable) return false
    const stateMatch =
      t.serviceAreas.includes(origin.state || "Maharashtra") ||
      t.serviceAreas.includes(destination.state || "Maharashtra")
    return stateMatch
  })

  const hasVerified = eligibleTransporters.some((t) => t.verificationStatus === "UZHAVAN_VERIFIED")

  // Standard vehicle options template
  const defaultVehicleSpecs: Array<{
    id: string
    name: string
    category: VehicleCategory
    cap: number
    baseCost: number
    perKm: number
    speed: number
    refrigerated: boolean
  }> = [
    { id: "tr-mini", name: "Mini Truck", category: "Mini Truck", cap: 1000, baseCost: 400, perKm: 18, speed: 45, refrigerated: false },
    { id: "tr-pickup", name: "Pickup Van", category: "Pickup", cap: 1500, baseCost: 600, perKm: 22, speed: 50, refrigerated: false },
    { id: "tr-lcv", name: "Light Commercial Vehicle (LCV)", category: "Light Commercial Vehicle", cap: 3500, baseCost: 1000, perKm: 30, speed: 40, refrigerated: false },
    { id: "tr-ref", name: "Refrigerated Van", category: "Refrigerated Vehicle", cap: 3000, baseCost: 1500, perKm: 42, speed: 45, refrigerated: true },
    { id: "tr-mgv", name: "Medium Goods Vehicle", category: "Medium Goods Vehicle", cap: 7500, baseCost: 1800, perKm: 48, speed: 38, refrigerated: false },
    { id: "tr-hgv", name: "Heavy Goods Truck", category: "Heavy Goods Vehicle", cap: 15000, baseCost: 3200, perKm: 65, speed: 35, refrigerated: false },
  ]

  const options: TransportOption[] = []

  // Generate options combining matching transporters or baseline model options
  if (eligibleTransporters.length > 0) {
    for (const t of eligibleTransporters) {
      for (const spec of defaultVehicleSpecs) {
        // Vehicle capacity constraint check
        if (spec.cap < quantityKg) continue
        // Refrigeration requirement constraint check
        if (input.refrigerationRequired && !t.refrigeratedAvailable && spec.refrigerated) continue

        const cost = Math.round(spec.baseCost + route.distanceKm * spec.perKm)
        const travelHours = Math.round((route.distanceKm / spec.speed + 1) * 10) / 10

        const isActualQuote = t.verificationStatus === "UZHAVAN_VERIFIED"
        const quoteType: QuoteType = isActualQuote ? "ACTUAL QUOTE" : "ESTIMATED QUOTE"

        // Compute transparent recommendation score
        let score = 100
        const reasons: string[] = []

        if (t.verificationStatus === "UZHAVAN_VERIFIED") {
          score += 25
          reasons.push("UZHAVAN Verified Transporter")
        } else if (t.verificationStatus === "GOOGLE_LISTED") {
          score -= 20
          reasons.push("Unverified Google Business Listing")
        }

        if (spec.cap >= quantityKg && spec.cap <= quantityKg * 2.5) {
          score += 15
          reasons.push("Optimal capacity fit")
        }

        if (input.perishable && (spec.refrigerated || t.refrigeratedAvailable)) {
          score += 20
          reasons.push("Refrigeration handling for perishable crop")
        }

        score -= cost * 0.01 // Prefer lower cost

        const scoreExplanation = `Recommended because: ${reasons.join(", ")}. Expected transport cost: ₹${cost.toLocaleString("en-IN")}.`

        options.push({
          id: `${t.id}-${spec.id}`,
          transporterId: t.id,
          transporterName: t.companyName,
          transporterPhone: t.transporterPhone,
          vehicleType: `${spec.name} (${t.companyName})`,
          vehicleCategory: spec.category,
          capacityKg: spec.cap,
          baseCost: spec.baseCost,
          costPerKm: spec.perKm,
          averageSpeedKmh: spec.speed,
          availabilityStatus: "available",
          refrigerated: spec.refrigerated || t.refrigeratedAvailable,
          verificationStatus: t.verificationStatus,
          trustScore: t.trustScore,
          quoteType,
          estimatedCost: cost,
          estimatedTravelTimeHours: travelHours,
          origin: origin.formattedAddress,
          destination: destination.formattedAddress,
          distanceKm: route.distanceKm,
          scoreExplanation,
          recommendationScore: Math.round(score),
        })
      }
    }
  }

  // Sort by highest recommendation score
  options.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))

  let message = "Found verified transportation options for your route."
  if (!hasVerified) {
    message = "No verified transporter currently available for this route."
  }

  return {
    options,
    verifiedTransportersFound: hasVerified,
    message,
  }
}
