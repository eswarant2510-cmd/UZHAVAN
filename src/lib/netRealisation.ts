import type { BuyerOffer, BuyerRisk, NetRealisationResult } from "./types"

/** Platform fee used by the Net Realisation Engine (INR). */
export const PLATFORM_FEE_INR = 100

const RISK_HOLD_PCT: Record<BuyerRisk, number> = {
  LOW: 0,
  MEDIUM: 0.02,
  HIGH: 0.05,
}

export function computeNetRealisation(input: {
  offerId: string
  buyerName: string
  verified: boolean
  offerPricePerKg: number
  quantityKg: number
  transportCost: number
  buyerRisk: BuyerRisk
  platformFee?: number
}): Omit<NetRealisationResult, "recommended"> {
  const platformFee = input.platformFee ?? PLATFORM_FEE_INR
  const gross = round2(input.offerPricePerKg * input.quantityKg)
  const afterCosts = gross - input.transportCost - platformFee
  const riskHold = Math.round(afterCosts * RISK_HOLD_PCT[input.buyerRisk])
  const net = afterCosts - riskHold
  const netPerKg = input.quantityKg > 0 ? round2(net / input.quantityKg) : 0

  return {
    offerId: input.offerId,
    buyerName: input.buyerName,
    verified: input.verified,
    offerPricePerKg: input.offerPricePerKg,
    quantityKg: input.quantityKg,
    gross,
    transportCost: input.transportCost,
    platformFee,
    riskHold,
    net,
    netPerKg,
    buyerRisk: input.buyerRisk,
  }
}

export function rankOffers(
  offers: BuyerOffer[],
  quantityKg: number,
): NetRealisationResult[] {
  const ranked = offers
    .map((offer) =>
      computeNetRealisation({
        offerId: offer.id,
        buyerName: offer.buyerName,
        verified: offer.verified,
        offerPricePerKg: offer.offerPricePerKg,
        quantityKg,
        transportCost: offer.transportCost,
        buyerRisk: offer.buyerRisk,
      }),
    )
    .sort((a, b) => b.net - a.net)

  return ranked.map((row, index) => ({ ...row, recommended: index === 0 }))
}

export function bestOffer(
  offers: BuyerOffer[],
  quantityKg: number,
): NetRealisationResult | null {
  return rankOffers(offers, quantityKg)[0] ?? null
}

export interface NetRealisationBreakdown {
  grossSaleValue: number
  transportCost: number
  netRealisation: number
  netPricePerKg: number
}

export function calculateNetRealisation(
  quantityKg: number,
  buyerPricePerKg: number,
  transportCost: number,
): NetRealisationBreakdown {
  // Gross Sale Value = offer_price_per_kg * quantity
  const grossSaleValue = Math.round(buyerPricePerKg * quantityKg * 100) / 100
  // Expected Net Realisation = Gross Sale Value - Transport Cost
  const netRealisation =
    Math.round((grossSaleValue - transportCost) * 100) / 100
  // Net Price / kg = Expected Net Realisation / quantity
  const netPricePerKg =
    quantityKg > 0 ? Math.round((netRealisation / quantityKg) * 100) / 100 : 0

  return {
    grossSaleValue,
    transportCost,
    netRealisation,
    netPricePerKg,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
