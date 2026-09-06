import type { SmartLot } from "../lib/types"
import { parseLocationString } from "./locationService"

export interface LoadPoolSuggestion {
  id: string
  primaryLotId: string
  compatibleLotId: string
  combinedWeightKg: number
  originDistrict: string
  destinationDistrict: string
  estimatedSavingsPct: number
  description: string
}

export interface BackhaulOpportunity {
  id: string
  transporterPhone: string
  transporterName: string
  outboundRoute: string
  returnRoute: string
  availableCapacityKg: number
  discountPct: number
  description: string
}

export type CropPerishabilityCategory =
  | "perishable"
  | "non_perishable"
  | "fragile"
  | "temperature_sensitive"

export interface CropLogisticsUrgency {
  category: CropPerishabilityCategory
  urgencyLevel: "HIGH" | "MEDIUM" | "LOW"
  recommendedVehicleType: string
  perishabilityNotice: string
}

const CROP_PERISHABILITY_MAP: Record<
  string,
  { category: CropPerishabilityCategory; recommendedVehicle: string; notice: string }
> = {
  tomato: {
    category: "perishable",
    recommendedVehicle: "Refrigerated Vehicle or Covered LCV",
    notice: "High perishability crop. Short shelf-life requires swift transport.",
  },
  onion: {
    category: "non_perishable",
    recommendedVehicle: "Open / Tarpaulin MGV Truck",
    notice: "Stable ambient crop. Well ventilated transport recommended.",
  },
  potato: {
    category: "non_perishable",
    recommendedVehicle: "Covered LCV or MGV",
    notice: "Stable crop. Protect from excessive moisture during transit.",
  },
  grapes: {
    category: "temperature_sensitive",
    recommendedVehicle: "Refrigerated Vehicle",
    notice: "Temperature sensitive produce. Cold chain logistics strongly recommended.",
  },
  banana: {
    category: "perishable",
    recommendedVehicle: "Covered LCV",
    notice: "Perishable produce. Ensure minimal shock and prompt delivery.",
  },
  chili: {
    category: "fragile",
    recommendedVehicle: "Covered Pickup / LCV",
    notice: "Fragile dry commodity. Dry ventilated transport recommended.",
  },
}

/** Identify multi-farmer load pooling opportunities between nearby active lots */
export function findLoadPoolingOpportunities(
  currentLot: SmartLot,
  allActiveLots: SmartLot[],
): LoadPoolSuggestion[] {
  const currentLoc = parseLocationString(currentLot.location)
  const results: LoadPoolSuggestion[] = []

  allActiveLots.forEach((lot) => {
    if (lot.id === currentLot.id) return
    const otherLoc = parseLocationString(lot.location)

    // Check if origin district matches
    if (currentLoc.district && otherLoc.district && currentLoc.district.toLowerCase() === otherLoc.district.toLowerCase()) {
      const combinedWeightKg = currentLot.quantityKg + lot.quantityKg
      if (combinedWeightKg <= 3500) {
        results.push({
          id: `pool-${currentLot.id}-${lot.id}`,
          primaryLotId: currentLot.id,
          compatibleLotId: lot.id,
          combinedWeightKg,
          originDistrict: currentLoc.district,
          destinationDistrict: "Mumbai / Regional APMC",
          estimatedSavingsPct: 22,
          description: `Potential shared transport opportunity with nearby Lot #${lot.id} (${lot.crop}, ${lot.quantityKg} kg). Combined load: ${combinedWeightKg} kg. Each farmer's order and settlement remain strictly separate.`,
        })
      }
    }
  })

  return results
}

/** Identify backhaul opportunities for return carrier loads */
export function findBackhaulOpportunities(
  pickupLocation: string,
  deliveryLocation: string,
): BackhaulOpportunity[] {
  const origin = parseLocationString(pickupLocation)
  const dest = parseLocationString(deliveryLocation)

  const opportunities: BackhaulOpportunity[] = []

  if (origin.city?.toLowerCase().includes("nashik") && dest.city?.toLowerCase().includes("mumbai")) {
    opportunities.push({
      id: "backhaul-nashik-mumbai",
      transporterPhone: "9876500002",
      transporterName: "Vijay Logistics",
      outboundRoute: "Mumbai → Nashik",
      returnRoute: "Nashik → Mumbai",
      availableCapacityKg: 2500,
      discountPct: 15,
      description: "Potential backhaul opportunity: Carrier returning from Mumbai has 2.5T empty return capacity. Transporter confirmation required.",
    })
  }

  return opportunities
}

/** Determine crop-aware logistics urgency based on crop type and harvest dates */
export function determineCropLogisticsUrgency(
  cropName: string,
  harvestDate?: string,
  expectedSellingDate?: string,
): CropLogisticsUrgency {
  const normalized = (cropName || "").toLowerCase().trim()
  const meta = CROP_PERISHABILITY_MAP[normalized]

  if (!meta) {
    return {
      category: "non_perishable",
      urgencyLevel: "MEDIUM",
      recommendedVehicleType: "Standard LCV / MGV",
      perishabilityNotice: "Perishability information unavailable.",
    }
  }

  let urgencyLevel: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"

  if (meta.category === "perishable" || meta.category === "temperature_sensitive") {
    urgencyLevel = "HIGH"
  }

  if (harvestDate && expectedSellingDate) {
    const harvestTime = new Date(harvestDate).getTime()
    const sellTime = new Date(expectedSellingDate).getTime()
    const diffDays = Math.ceil((sellTime - harvestTime) / (1000 * 3600 * 24))
    if (diffDays <= 2) {
      urgencyLevel = "HIGH"
    } else if (diffDays > 7) {
      urgencyLevel = "LOW"
    }
  }

  return {
    category: meta.category,
    urgencyLevel,
    recommendedVehicleType: meta.recommendedVehicle,
    perishabilityNotice: meta.notice,
  }
}
