import type {
  SmartLot,
  BuyerOffer,
  MarketIntelligence,
  TransportOption,
} from "../lib/types"

import { calculateNetRealisation } from "../lib/netRealisation"

export interface DecisionOption {
  type: "BUYER" | "MARKET"

  id: string

  name: string

  pricePerKg: number

  grossValue: number

  transportOptionId: string

  vehicleType: string

  transportCost: number

  netRealisation: number

  netPricePerKg: number

  risk: "LOW" | "MEDIUM" | "HIGH"

  verified: boolean

  distanceKm: number

  etaHours: number

  isValid: boolean

  validationError?: string
}

export interface DecisionRecommendation {
  decision: "SELL_NOW" | "WAIT" | "CHOOSE_BUYER" | "CHOOSE_MARKET" | "INSUFFICIENT_DATA"

  bestOption: DecisionOption | null

  alternatives: DecisionOption[]

  reasons: string[]

  explanation: string

  confidence: "HIGH" | "MEDIUM" | "LOW"
}

// SCORING CONFIGURATION CONSTANTS

const NET_PRICE_WEIGHT = 2.0 // Score component per rupee of net price per kg

const RISK_BONUSES = {
  LOW: 15,

  MEDIUM: 5,

  HIGH: -15,
}

const VERIFICATION_BONUS = 8

const WINDOW_BONUSES = {
  FAVOURABLE: 12,

  NEUTRAL: 0,

  UNFAVOURABLE: -12,
}

/**
 * Deterministic selling decision engine for UZHAVAN.
 * Reconciles Government Market Intelligence + Buyer Offers + Transport Options + Risks.
 */

export function runDecisionEngine(
  lot: SmartLot | null | undefined,

  market: MarketIntelligence | null | undefined,

  offers: BuyerOffer[],

  vehicles: TransportOption[],
): DecisionRecommendation {
  // Hard Constraint 1: Check for critical missing data

  if (!lot) {
    return {
      decision: "INSUFFICIENT_DATA",

      bestOption: null,

      alternatives: [],

      reasons: ["Lot details are missing."],

      explanation:
        "Unable to run decision engine because no Smart Lot context is provided.",

      confidence: "LOW",
    }
  }

  const modalPrice = market
    ? (Number(market.currentLow) + Number(market.currentHigh)) / 2
    : 0

  // Hard Constraint 2: Stale/Missing Market Data Warning

  if (!market || modalPrice <= 0) {
    return {
      decision: "INSUFFICIENT_DATA",

      bestOption: null,

      alternatives: [],

      reasons: ["Government market data is unavailable."],

      explanation:
        "Unable to determine best selling action because official market price data for the commodity is missing from government databases.",

      confidence: "LOW",
    }
  }

  // Generate transport combinations

  const allOptions: DecisionOption[] = []

  // Helper validation

  const lotQuantity = lot.quantityKg || 0

  const minPrice = lot.minPricePerKg || lot.expectedNetPerKg || 0

  // 1. Generate options for BUYER offers + transport combinations

  offers.forEach((o) => {
    vehicles.forEach((v) => {
      let isValid = true

      let validationError = ""

      // Capacity check constraint

      if (v.capacityKg < lotQuantity) {
        isValid = false

        validationError = `Transport capacity (${v.capacityKg} kg) is insufficient for lot weight (${lotQuantity} kg).`
      }
      // Partial offer check constraint (if specified)
      else if (o.quantityKg && o.quantityKg < lotQuantity) {
        isValid = false

        validationError = `Buyer request volume (${o.quantityKg} kg) is less than required lot volume (${lotQuantity} kg).`
      }

      // Price floor constraint

      const computedCost = v.baseCost + o.distanceKm * v.costPerKm

      const breakdown = calculateNetRealisation(
        lotQuantity,
        o.offerPricePerKg,
        computedCost,
      )

      if (breakdown.netPricePerKg < minPrice) {
        isValid = false

        validationError = `Net price (₹${breakdown.netPricePerKg.toFixed(2)}/kg) is below your minimum acceptable price (₹${minPrice}/kg).`
      }

      const loadHours = v.id === "tr-mini" ? 3 : v.id === "tr-large" ? 4 : 5

      const eta = Math.round(loadHours + o.distanceKm / v.averageSpeedKmh)

      allOptions.push({
        type: "BUYER",

        id: o.id,

        name: o.buyerName,

        pricePerKg: o.offerPricePerKg,

        grossValue: breakdown.grossSaleValue,

        transportOptionId: v.id,

        vehicleType: v.vehicleType,

        transportCost: computedCost,

        netRealisation: breakdown.netRealisation,

        netPricePerKg: breakdown.netPricePerKg,

        risk: o.buyerRisk || "MEDIUM",

        verified: o.verified || false,

        distanceKm: o.distanceKm,

        etaHours: eta,

        isValid,

        validationError: validationError || undefined,
      })
    })
  })

  // 2. Generate options for local Mandi Market + transport combinations

  // Distances to mandi range from 15km to 30km. We assign a deterministic 20km distance.

  const marketDistance = 20

  vehicles.forEach((v) => {
    let isValid = true

    let validationError = ""

    if (v.capacityKg < lotQuantity) {
      isValid = false

      validationError = `Transport capacity (${v.capacityKg} kg) is insufficient for lot weight (${lotQuantity} kg).`
    }

    const computedCost = v.baseCost + marketDistance * v.costPerKm

    const breakdown = calculateNetRealisation(
      lotQuantity,
      modalPrice,
      computedCost,
    )

    if (breakdown.netPricePerKg < minPrice) {
      isValid = false

      validationError = `Net price (₹${breakdown.netPricePerKg.toFixed(2)}/kg) is below your minimum acceptable price (₹${minPrice}/kg).`
    }

    const loadHours = v.id === "tr-mini" ? 3 : v.id === "tr-large" ? 4 : 5

    const eta = Math.round(loadHours + marketDistance / v.averageSpeedKmh)

    allOptions.push({
      type: "MARKET",

      id: `mandi-mkt`,

      name: `${market.crop} Local Mandi`,

      pricePerKg: modalPrice,

      grossValue: breakdown.grossSaleValue,

      transportOptionId: v.id,

      vehicleType: v.vehicleType,

      transportCost: computedCost,

      netRealisation: breakdown.netRealisation,

      netPricePerKg: breakdown.netPricePerKg,

      risk: "LOW", // Government-backed markets carry low settlement risk

      verified: true,

      distanceKm: marketDistance,

      etaHours: eta,

      isValid,

      validationError: validationError || undefined,
    })
  })

  // Filter only valid combinations for recommendation matching

  const validOptions = allOptions.filter((o) => o.isValid)

  if (validOptions.length === 0) {
    return {
      decision: "WAIT",

      bestOption: null,

      alternatives: allOptions.filter((o) => !o.isValid),

      reasons: [
        "No selling options meet your minimum pricing constraint or logistics threshold.",
      ],

      explanation: `No buyer offers or market pricing currently satisfy your minimum price floor of ₹${minPrice}/kg net of transport costs. It is advised to wait.`,

      confidence: "MEDIUM",
    }
  }

  // Calculate scores deterministically for each valid combination

  const scoredOptions = validOptions.map((opt) => {
    // 1) Net price contribution

    let score = opt.netPricePerKg * NET_PRICE_WEIGHT

    // 2) Risk considerations

    score += RISK_BONUSES[opt.risk]

    // 3) Verification status

    if (opt.verified) score += VERIFICATION_BONUS

    // 4) Market trend selling window contribution

    const signal = (market.sellingWindow ||
      "NEUTRAL") as keyof typeof WINDOW_BONUSES

    score += WINDOW_BONUSES[signal] || 0

    // 5) Transit burden penalty (prefer nearby trades)

    score -= opt.distanceKm * 0.05

    return {
      option: opt,

      score,
    }
  })

  // Sort by score descending

  scoredOptions.sort((a, b) => b.score - a.score)

  const topScored = scoredOptions[0].option

  const alternatives = scoredOptions.slice(1).map((s) => s.option)

  // Reasons list

  const reasons: string[] = []

  // Deterministic checks to construct logical explanation reasons

  const bestIsBuyer = topScored.type === "BUYER"

  if (bestIsBuyer) {
    reasons.push("Highest expected net realisation among valid options")
  } else {
    reasons.push("Government Mandi represents the most secure settlement value")
  }

  if (topScored.transportCost < 1000) {
    reasons.push("Low transport cost")
  }

  if (topScored.risk === "LOW") {
    reasons.push("Low buyer transaction risk")
  }

  if (topScored.verified) {
    reasons.push("Verified transaction counterparty")
  }

  if (market.sellingWindow === "FAVOURABLE") {
    reasons.push("Current crop selling window is favorable")
  }

  // Decision state matching Sell Now vs Wait

  let decisionStatus: DecisionRecommendation["decision"] = "CHOOSE_BUYER"

  if (topScored.type === "MARKET") {
    decisionStatus = "CHOOSE_MARKET"
  }

  // If market trend has highly positive forecasts, compare Sell Now vs Wait

  const currentAvgPrice = modalPrice

  const averageBuyerPrice =
    offers.length > 0
      ? offers.reduce(
          (acc, currentVal) => acc + currentVal.offerPricePerKg,
          0,
        ) / offers.length
      : currentAvgPrice

  const potentialUpside = market.currentHigh - currentAvgPrice

  if (market.sellingWindow === "UNFAVOURABLE" && potentialUpside > 3) {
    // If future pricing outlook is highly favourable but current price is depressed

    decisionStatus = "WAIT"

    reasons.push(
      `Market price volatility indicates potential upside of +₹${potentialUpside}/kg later`,
    )
  }

  // AI Explanation Fallback abstraction (as requested by rule 9)

  const explanation = `${topScored.name} (${topScored.vehicleType}) is selected as top selling option because it yields a net price of ₹${topScored.netPricePerKg.toFixed(2)}/kg (Expected net: ₹${topScored.netRealisation.toFixed(0)}) supporting a ${topScored.risk.toLowerCase()} settlement risk profile.`

  return {
    decision: decisionStatus,

    bestOption: topScored,

    alternatives,

    reasons,

    explanation,

    confidence: "HIGH",
  }
}
