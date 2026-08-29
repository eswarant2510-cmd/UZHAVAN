import { supabase } from "../lib/supabase"
import { DEMO_FARMER, readSession, getAuthProfile } from "../lib/auth"
import { bestOffer, rankOffers } from "../lib/netRealisation"
import type {
  BuyerOffer,
  FarmerDashboardData,
  MarketIntelligence,
  PriceAlert,
  SmartLot,
  TransportOption,
  Order,
  VerificationRecord,
  DisputeRecord,
  DisputeReason,
  AuditEvent,
  LogisticsDocket,
  DocketStatus,
  DocketEvidence,
} from "../lib/types"

const QUALITY_DISCLAIMER =
  "Indicative quality signal from one photo. Not a certificate for the full batch."

const TOMATO_IMG =
  "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=900&h=700&fit=crop&auto=format"
const ONION_IMG =
  "https://images.unsplash.com/photo-1508747703725-49941c880c82?w=900&h=700&fit=crop&auto=format"
const GRAPE_IMG =
  "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=900&h=700&fit=crop&auto=format"
const SUGARCANE_IMG =
  "https://images.unsplash.com/photo-1464226184884-fa52ac9c7d08?w=900&h=700&fit=crop&auto=format"
const MANDI_IMG =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&h=600&fit=crop&auto=format"

export function getCropImageFor(crop: string): string {
  const normalized = (crop || "").trim()

  switch (normalized) {
    case "Tomato":
      return TOMATO_IMG
    case "Onion":
      return ONION_IMG
    case "Potato":
      return "https://images.unsplash.com/photo-1544785349-c4a5301826fd?w=900&h=700&fit=crop&auto=format"
    case "Sugarcane":
      return SUGARCANE_IMG
    case "Paddy":
      return "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=900&h=700&fit=crop&auto=format"
    case "Cotton":
      return "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format"
    case "Maize":
      return "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=900&h=700&fit=crop&auto=format"
    case "Chili":
      return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=900&h=700&fit=crop&auto=format"
    default:
      return TOMATO_IMG
  }
}

const MOCK_LOTS: SmartLot[] = [
  {
    id: "LW001",
    crop: "Tomato",
    quantityKg: 500,
    imageUrl: TOMATO_IMG,
    location: "Nashik, Maharashtra",
    quality: {
      grade: "A",
      confidencePct: 88,
      label: "Grade A — Indicative",
      disclaimer: QUALITY_DISCLAIMER,
    },
    expectedNetPerKg: 29.4,
    status: "active",
  },
  {
    id: "LW002",
    crop: "Onion",
    quantityKg: 800,
    imageUrl: ONION_IMG,
    location: "Lasalgaon, Maharashtra",
    quality: {
      grade: "A",
      confidencePct: 82,
      label: "Grade A — Indicative",
      disclaimer: QUALITY_DISCLAIMER,
    },
    expectedNetPerKg: 18.1,
    status: "active",
  },
  {
    id: "LW003",
    crop: "Grapes",
    quantityKg: 250,
    imageUrl: GRAPE_IMG,
    location: "Nashik, Maharashtra",
    quality: {
      grade: "B",
      confidencePct: 76,
      label: "Grade B — Indicative",
      disclaimer: QUALITY_DISCLAIMER,
    },
    expectedNetPerKg: 42.0,
    status: "active",
  },
]

const MOCK_OFFERS: BuyerOffer[] = [
  {
    id: "off-abc",
    buyerName: "ABC Traders",
    verified: true,
    offerPricePerKg: 31,
    transportCost: 700,
    buyerRisk: "LOW",
    distanceKm: 42,
    lotId: "LW001",
    quantityKg: 500,
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "off-nashi",
    buyerName: "Nashik Mandi Co-op",
    verified: true,
    offerPricePerKg: 29.5,
    transportCost: 320,
    buyerRisk: "LOW",
    distanceKm: 18,
    lotId: "LW001",
    quantityKg: 800,
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "off-pune",
    buyerName: "Pune Fresh Mart",
    verified: false,
    offerPricePerKg: 32,
    transportCost: 2100,
    buyerRisk: "MEDIUM",
    distanceKm: 165,
    lotId: "LW001",
    quantityKg: 1000,
    status: "active",
    createdAt: new Date().toISOString(),
  },
]

const MOCK_MARKETS: Record<string, MarketIntelligence> = {
  Tomato: {
    crop: "Tomato",
    currentLow: 28,
    currentHigh: 31,
    demand: "HIGH",
    sellingWindow: "2–3 Days",
    trend: [24, 25, 26, 25.5, 27, 28, 29, 28.5, 30, 31],
    imageUrl: TOMATO_IMG,
  },
  Onion: {
    crop: "Onion",
    currentLow: 16,
    currentHigh: 22,
    demand: "MEDIUM",
    sellingWindow: "4–7 Days",
    trend: [15, 16, 17, 16.5, 18, 19, 21, 20.5, 22, 21.5],
    imageUrl: ONION_IMG,
  },
  Potato: {
    crop: "Potato",
    currentLow: 22,
    currentHigh: 28,
    demand: "HIGH",
    sellingWindow: "1–3 Days",
    trend: [20, 21, 21.5, 23, 24, 25, 27, 26.5, 28, 27.5],
    imageUrl:
      "https://images.unsplash.com/photo-1544785349-c4a5301826fd?w=900&h=700&fit=crop&auto=format",
  },
  Sugarcane: {
    crop: "Sugarcane",
    currentLow: 30,
    currentHigh: 38,
    demand: "MEDIUM",
    sellingWindow: "4–6 Days",
    trend: [28, 29, 31, 32, 34, 33, 35, 36, 37, 38],
    imageUrl: SUGARCANE_IMG,
  },
  Paddy: {
    crop: "Paddy",
    currentLow: 24,
    currentHigh: 31,
    demand: "HIGH",
    sellingWindow: "2–4 Days",
    trend: [22, 23, 24, 25, 27, 28, 29, 30, 31, 30.5],
    imageUrl:
      "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=900&h=700&fit=crop&auto=format",
  },
  Cotton: {
    crop: "Cotton",
    currentLow: 42,
    currentHigh: 52,
    demand: "HIGH",
    sellingWindow: "3–5 Days",
    trend: [38, 40, 42, 44, 45, 47, 49, 50, 51, 52],
    imageUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format",
  },
  Maize: {
    crop: "Maize",
    currentLow: 19,
    currentHigh: 25,
    demand: "MEDIUM",
    sellingWindow: "3–7 Days",
    trend: [17, 18, 20, 21, 22, 23, 24, 25, 24.5, 25],
    imageUrl:
      "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=900&h=700&fit=crop&auto=format",
  },
  Chili: {
    crop: "Chili",
    currentLow: 46,
    currentHigh: 62,
    demand: "HIGH",
    sellingWindow: "1–3 Days",
    trend: [40, 43, 45, 47, 50, 52, 54, 56, 59, 62],
    imageUrl:
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=900&h=700&fit=crop&auto=format",
  },
  Other: {
    crop: "Other",
    currentLow: 35,
    currentHigh: 45,
    demand: "LOW",
    sellingWindow: "8–12 Days",
    trend: [38, 39, 41, 40, 42, 43, 44, 43.5, 45, 44.5],
    imageUrl: GRAPE_IMG,
  },
}

const MOCK_ALERT: PriceAlert = {
  id: "alert-tomato",
  title: "Price Alert",
  message: "Tomato price increased.",
  crop: "Tomato",
}

const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (globalThis as any).__UZHAVAN_ENV__ ||
  {}

function isSupabaseConfigured() {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  return (
    url &&
    key &&
    !url.includes("placeholder-url") &&
    !key.includes("placeholder-anon-key")
  )
}

export function isProductionMode() {
  return env.VITE_APP_MODE === "production"
}

export function handleTransactionFailure(op: string, err: any) {
  if (isProductionMode()) {
    throw new Error(
      `Unable to connect to UZHAVAN services. Your transaction has NOT been changed.`,
    )
  }
}

export function handleReadFailure(screen: string, err: any) {
  if (isProductionMode()) {
    throw new Error(`Latest information could not be loaded.`)
  }
}

export const farmerApi = {
  source:
    isSupabaseConfigured() || isProductionMode()
      ? "live" as const
      : "demo" as const,

  async getDashboard(): Promise<FarmerDashboardData> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const phone = user.phone

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured or is using placeholders.")
      }

      // 1. Fetch lots
      const { data: lotsData, error: lotsError } = await supabase
        .from("smart_lots")
        .select("*")
        .eq("farmer_phone", phone)

      if (lotsError) throw lotsError

      const lots: SmartLot[] = (lotsData || []).map((row: any) => {
        let photos = row.photos || []
        if (photos.length === 0 && row.image_url) {
          if (row.image_url.includes(",")) {
            photos = row.image_url.split(",")
          } else {
            photos = [row.image_url]
          }
        }

        let crop = row.crop
        let variety = row.variety || ""
        if (!variety && crop.includes("(") && crop.endsWith(")")) {
          const match = crop.match(/^(.*)\s\((.*)\)$/)
          if (match) {
            crop = match[1]
            variety = match[2]
          }
        }

        return {
          id: row.id,
          crop,
          variety,
          quantityKg: Number(row.quantity_kg),
          unit: row.unit || "kg",
          imageUrl: photos[0] || row.image_url || TOMATO_IMG,
          photos: photos,
          location: row.location,
          quality: {
            grade: row.quality_grade,
            confidencePct: row.quality_confidence,
            label: row.quality_label,
            disclaimer: row.quality_disclaimer,
          },
          expectedNetPerKg: Number(row.expected_net_per_kg),
          minPricePerKg: Number(
            row.min_price_per_kg || row.expected_net_per_kg,
          ),
          status: row.status as "active" | "sold" | "in_transit" | "cancelled",
          harvestDate: row.harvest_date,
          expectedSellingDate: row.expected_selling_date,
        }
      })

      // 2. Fetch offers for the featured lot (lots[0])
      const featured = lots[0] || null
      let offers: BuyerOffer[] = []
      if (featured) {
        const { data: offersData, error: offersError } = await supabase
          .from("buyer_offers")
          .select("*")
          .eq("lot_id", featured.id)
        if (!offersError && offersData) {
          offers = offersData.map((row) => ({
            id: row.id,
            buyerName: row.buyer_name,
            verified: row.verified,
            offerPricePerKg: Number(row.offer_price_per_kg),
            transportCost: Number(row.transport_cost),
            buyerRisk: row.buyer_risk as "LOW" | "MEDIUM" | "HIGH",
            distanceKm: Number(row.distance_km),
          }))
        }
      }

      if (offers.length === 0) {
        const { data: generalOffers, error: generalError } = await supabase
          .from("buyer_offers")
          .select("*")
          .limit(5)
        if (!generalError && generalOffers) {
          offers = generalOffers.map((row) => ({
            id: row.id,
            buyerName: row.buyer_name,
            verified: row.verified,
            offerPricePerKg: Number(row.offer_price_per_kg),
            transportCost: Number(row.transport_cost),
            buyerRisk: row.buyer_risk as "LOW" | "MEDIUM" | "HIGH",
            distanceKm: Number(row.distance_km),
          }))
        }
      }

      // 3. Fetch market intelligence
      const cropQuery = featured ? featured.crop : "Tomato"
      const { data: marketData, error: marketError } = await supabase
        .from("market_intelligence")
        .select("*")
        .eq("crop", cropQuery)
        .maybeSingle()

      let market: MarketIntelligence =
        MOCK_MARKETS[cropQuery] || MOCK_MARKETS.Tomato
      if (!marketError && marketData) {
        market = {
          crop: marketData.crop,
          currentLow: Number(marketData.current_low),
          currentHigh: Number(marketData.current_high),
          demand: marketData.demand as "LOW" | "MEDIUM" | "HIGH",
          sellingWindow: marketData.selling_window,
          trend: marketData.trend.map(Number),
          imageUrl: marketData.image_url || MANDI_IMG,
        }
      }

      // 4. Fetch alert
      const { data: alertData, error: alertError } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("crop", cropQuery)
        .limit(1)

      let alert: PriceAlert | null = null
      if (!alertError && alertData && alertData.length > 0) {
        alert = {
          id: alertData[0].id,
          title: alertData[0].title,
          message: alertData[0].message,
          crop: alertData[0].crop,
        }
      }

      const rec =
        featured && offers.length > 0
          ? bestOffer(offers, featured.quantityKg)
          : null
      if (rec && featured) {
        featured.expectedNetPerKg = rec.netPerKg
      }

      return {
        farmer: user,
        weather: { tempC: 28, label: "Partly cloudy" },
        kpis: {
          activeLots: lots.filter((l) => l.status === "active").length,
          bestOpportunityPerKg: rec?.offerPricePerKg ?? 0,
          inEscrow: 16300,
          earnings: 84500,
        },
        featuredLot: featured,
        lots,
        recommendation: rec,
        market,
        alert,
        source: "live" as const,
      }
    } catch (err) {
      handleReadFailure("Dashboard", err)
      console.warn("Executing getDashboard fallback due to error:", err)
      const featured = MOCK_LOTS[0]
      const rec = featured ? bestOffer(MOCK_OFFERS, featured.quantityKg) : null
      return {
        farmer: user,
        weather: { tempC: 28, label: "Partly cloudy" },
        kpis: {
          activeLots: MOCK_LOTS.length,
          bestOpportunityPerKg: rec?.offerPricePerKg ?? 0,
          inEscrow: 16300,
          earnings: 84500,
        },
        featuredLot: featured || null,
        lots: MOCK_LOTS,
        recommendation: rec,
        market: MOCK_MARKETS.Tomato,
        alert: MOCK_ALERT,
        source: "demo" as const,
      }
    }
  },

  async getLots(): Promise<SmartLot[]> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        return []
      }

      let query = supabase.from("smart_lots").select("*")

      if (user.role === "farmer") {
        query = query.eq("farmer_phone", user.phone)
      } else {
        query = query.eq("status", "active")
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((row: any) => {
        let photos = row.photos || []
        if (photos.length === 0 && row.image_url) {
          if (row.image_url.includes(",")) {
            photos = row.image_url.split(",")
          } else {
            photos = [row.image_url]
          }
        }

        let crop = row.crop
        let variety = row.variety || ""
        if (!variety && crop.includes("(") && crop.endsWith(")")) {
          const match = crop.match(/^(.*)\s\((.*)\)$/)
          if (match) {
            crop = match[1]
            variety = match[2]
          }
        }

        return {
          id: row.id,
          crop,
          variety,
          quantityKg: Number(row.quantity_kg),
          unit: row.unit || "kg",
          imageUrl: photos[0] || row.image_url || TOMATO_IMG,
          photos: photos,
          location: row.location,
          quality: {
            grade: row.quality_grade,
            confidencePct: row.quality_confidence,
            label: row.quality_label,
            disclaimer: row.quality_disclaimer,
          },
          expectedNetPerKg: Number(row.expected_net_per_kg),
          minPricePerKg: Number(
            row.min_price_per_kg || row.expected_net_per_kg,
          ),
          status: row.status as "active" | "sold" | "in_transit" | "cancelled",
          harvestDate: row.harvest_date,
          expectedSellingDate: row.expected_selling_date,
          farmerPhone: row.farmer_phone,
        }
      })
    } catch (err) {
      handleReadFailure("Lots", err)
      console.warn("Executing getLots fallback due to error:", err)
      return []
    }
  },

  async getLot(id: string): Promise<SmartLot | null> {
    try {
      if (!isSupabaseConfigured()) {
        return null
      }

      const { data, error } = await supabase
        .from("smart_lots")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      let photos = data.photos || []
      if (photos.length === 0 && data.image_url) {
        if (data.image_url.includes(",")) {
          photos = data.image_url.split(",")
        } else {
          photos = [data.image_url]
        }
      }

      let crop = data.crop
      let variety = data.variety || ""
      if (!variety && crop.includes("(") && crop.endsWith(")")) {
        const match = crop.match(/^(.*)\s\((.*)\)$/)
        if (match) {
          crop = match[1]
          variety = match[2]
        }
      }

      return {
        id: data.id,
        crop,
        variety,
        quantityKg: Number(data.quantity_kg),
        unit: data.unit || "kg",
        imageUrl: photos[0] || data.image_url || TOMATO_IMG,
        photos: photos,
        location: data.location,
        quality: {
          grade: data.quality_grade,
          confidencePct: data.quality_confidence,
          label: data.quality_label,
          disclaimer: data.quality_disclaimer,
        },
        expectedNetPerKg: Number(data.expected_net_per_kg),
        minPricePerKg: Number(
          data.min_price_per_kg || data.expected_net_per_kg,
        ),
        status: data.status as "active" | "sold" | "in_transit" | "cancelled",
        harvestDate: data.harvest_date,
        expectedSellingDate: data.expected_selling_date,
        farmerPhone: data.farmer_phone,
      }
    } catch (err) {
      handleReadFailure("Lot Detail", err)
      console.warn("Executing getLot fallback due to error:", err)
      return null
    }
  },

  async createLot(
    lot: Omit<SmartLot, "quality"> & {
      harvestDate?: string
      expectedSellingDate?: string
    },
  ): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const fullPayload: any = {
        id: lot.id,
        farmer_phone: user.phone,
        crop: lot.crop,
        quantity_kg: lot.quantityKg,
        image_url: lot.imageUrl || (lot.photos && lot.photos[0]) || "",
        location: lot.location,
        status: lot.status || "active",
        quality_grade: "A",
        quality_confidence: 88,
        quality_label: "Grade A — Indicative",
        quality_disclaimer: QUALITY_DISCLAIMER,
        expected_net_per_kg: lot.expectedNetPerKg || lot.minPricePerKg || 0,
        harvest_date: lot.harvestDate,
        expected_selling_date: lot.expectedSellingDate,
        variety: lot.variety || "",
        unit: lot.unit || "kg",
        min_price_per_kg: lot.minPricePerKg || 0,
        photos: lot.photos || [],
      }

      const { error } = await supabase.from("smart_lots").insert(fullPayload)
      if (error) {
        if (error.code === "42703" || error.message?.includes("column")) {
          console.warn(
            "Database columns missing during insert, falling back to compatibility insert...",
          )
          const fallbackPayload = {
            id: lot.id,
            farmer_phone: user.phone,
            crop: lot.variety ? `${lot.crop} (${lot.variety})` : lot.crop,
            quantity_kg: lot.quantityKg,
            image_url:
              lot.imageUrl || (lot.photos && lot.photos.join(",")) || "",
            location: lot.location,
            status: lot.status || "active",
            quality_grade: "A",
            quality_confidence: 88,
            quality_label: "Grade A — Indicative",
            quality_disclaimer: QUALITY_DISCLAIMER,
            expected_net_per_kg: lot.expectedNetPerKg || lot.minPricePerKg || 0,
            harvest_date: lot.harvestDate,
            expected_selling_date: lot.expectedSellingDate,
          }
          const { error: fallbackError } = await supabase
            .from("smart_lots")
            .insert(fallbackPayload)
          if (fallbackError) throw fallbackError
        } else {
          throw error
        }
      }
    } catch (err) {
      handleTransactionFailure("Create Lot", err)
      console.warn("Could not insert lot to DB, using local mock only:", err)
      const mockPhotos = lot.photos || []
      const localLot: SmartLot = {
        id: lot.id,
        crop: lot.crop,
        variety: lot.variety || "",
        quantityKg: lot.quantityKg,
        unit: lot.unit || "kg",
        imageUrl: mockPhotos[0] || lot.imageUrl || TOMATO_IMG,
        photos: mockPhotos,
        location: lot.location,
        status: lot.status as any || "active",
        quality: {
          grade: "A",
          confidencePct: 88,
          label: "Grade A — Indicative",
          disclaimer: QUALITY_DISCLAIMER,
        },
        expectedNetPerKg: lot.expectedNetPerKg || lot.minPricePerKg || 0,
        minPricePerKg: lot.minPricePerKg || lot.expectedNetPerKg || 0,
        harvestDate: lot.harvestDate,
        expectedSellingDate: lot.expectedSellingDate,
      }
      const existingIdx = MOCK_LOTS.findIndex((l) => l.id === lot.id)
      if (existingIdx !== -1) {
        MOCK_LOTS[existingIdx] = localLot
      } else {
        MOCK_LOTS.push(localLot)
      }
    }
  },

  async updateLot(
    id: string,
    lot: Partial<SmartLot> & {
      harvestDate?: string
      expectedSellingDate?: string
    },
  ): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const fullPayload: any = {
        crop: lot.crop,
        quantity_kg: lot.quantityKg,
        image_url: lot.imageUrl || (lot.photos && lot.photos[0]) || "",
        location: lot.location,
        status: lot.status,
        expected_net_per_kg: lot.expectedNetPerKg || lot.minPricePerKg || 0,
        harvest_date: lot.harvestDate,
        expected_selling_date: lot.expectedSellingDate,
        variety: lot.variety || "",
        unit: lot.unit || "kg",
        min_price_per_kg: lot.minPricePerKg || 0,
        photos: lot.photos || [],
      }

      const { error } = await supabase
        .from("smart_lots")
        .update(fullPayload)
        .eq("id", id)
        .eq("farmer_phone", user.phone)

      if (error) {
        if (error.code === "42703" || error.message?.includes("column")) {
          console.warn(
            "Database columns missing during update, falling back to compatibility update...",
          )
          const fallbackPayload = {
            crop: lot.variety ? `${lot.crop} (${lot.variety})` : lot.crop,
            quantity_kg: lot.quantityKg,
            image_url:
              lot.imageUrl || (lot.photos && lot.photos.join(",")) || "",
            location: lot.location,
            status: lot.status,
            expected_net_per_kg: lot.expectedNetPerKg || lot.minPricePerKg || 0,
            harvest_date: lot.harvestDate,
            expected_selling_date: lot.expectedSellingDate,
          }
          const { error: fallbackError } = await supabase
            .from("smart_lots")
            .update(fallbackPayload)
            .eq("id", id)
            .eq("farmer_phone", user.phone)
          if (fallbackError) throw fallbackError
        } else {
          throw error
        }
      }
    } catch (err) {
      handleTransactionFailure("Update Lot", err)
      console.warn("Could not update lot in DB, using local mock only:", err)
      const existingIdx = MOCK_LOTS.findIndex((l) => l.id === id)
      if (existingIdx !== -1) {
        MOCK_LOTS[existingIdx] = ({
          ...MOCK_LOTS[existingIdx],
          ...lot,
          photos: lot.photos || MOCK_LOTS[existingIdx].photos,
        } as SmartLot)
      }
    }
  },

  async cancelLot(id: string): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { error } = await supabase
        .from("smart_lots")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("farmer_phone", user.phone)

      if (error) {
        if (error.code === "23514" || error.message?.includes("constraint")) {
          console.warn(
            "Constraint blocks 'cancelled', deleting the lot as withdraw fallback...",
          )
          const { error: deleteError } = await supabase
            .from("smart_lots")
            .delete()
            .eq("id", id)
            .eq("farmer_phone", user.phone)

          if (deleteError) throw deleteError
        } else {
          throw error
        }
      }
    } catch (err) {
      handleTransactionFailure("Cancel Lot", err)
      console.warn(
        "Could not cancel/delete lot in DB, setting local status:",
        err,
      )
      const existingIdx = MOCK_LOTS.findIndex((l) => l.id === id)
      if (existingIdx !== -1) {
        // Since local array doesn't enforce schema constraint, we can set status to cancelled
        MOCK_LOTS[existingIdx].status = "cancelled"
      }
    }
  },

  async deleteLot(id: string): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { error } = await supabase
        .from("smart_lots")
        .delete()
        .eq("id", id)
        .eq("farmer_phone", user.phone)

      if (error) throw error
    } catch (err) {
      handleTransactionFailure("Delete Lot", err)
      console.warn("Could not delete lot in DB, removing local mock entry:", err)
      const existingIdx = MOCK_LOTS.findIndex((l) => l.id === id)
      if (existingIdx !== -1) {
        MOCK_LOTS.splice(existingIdx, 1)
      }
    }
  },

  async getOffers(): Promise<BuyerOffer[]> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data, error } = await supabase.from("buyer_offers").select("*")

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        buyerName: row.buyer_name,
        verified: row.verified,
        offerPricePerKg: Number(row.offer_price_per_kg),
        transportCost: Number(row.transport_cost),
        buyerRisk: row.buyer_risk as "LOW" | "MEDIUM" | "HIGH",
        distanceKm: Number(row.distance_km),
        lotId: row.lot_id,
        quantityKg: Number(row.quantity_kg || 500),
        status: (localStorage.getItem(`offer_status_${row.id}`) ||
          row.status ||
          "active") as any,
        createdAt: row.created_at,
      }))
    } catch (err) {
      handleReadFailure("Offers", err)
      console.warn("Executing getOffers fallback due to error:", err)
      return MOCK_OFFERS.map((o) => ({
        ...o,
        status: (localStorage.getItem(`offer_status_${o.id}`) ||
          o.status ||
          "active") as any,
      }))
    }
  },

  async getOffersForLot(lotId: string): Promise<BuyerOffer[]> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const lot = await this.getLot(lotId)
    if (!lot) {
      throw new Error("Access denied or Smart Lot not found.")
    }

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data: lotOwnerData, error: lotOwnerError } = await supabase
        .from("smart_lots")
        .select("farmer_phone")
        .eq("id", lotId)
        .maybeSingle()

      if (
        lotOwnerError ||
        !lotOwnerData ||
        lotOwnerData.farmer_phone !== user.phone
      ) {
        throw new Error("Access denied: You do not own this Smart Lot.")
      }

      const { data, error } = await supabase
        .from("buyer_offers")
        .select("*")
        .eq("lot_id", lotId)

      if (error) throw error

      if (data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          buyerName: row.buyer_name,
          verified: row.verified,
          offerPricePerKg: Number(row.offer_price_per_kg),
          transportCost: Number(row.transport_cost),
          buyerRisk: row.buyer_risk as "LOW" | "MEDIUM" | "HIGH",
          distanceKm: Number(row.distance_km),
          lotId: row.lot_id,
          quantityKg: Number(row.quantity_kg || lot.quantityKg),
          status: (localStorage.getItem(`offer_status_${row.id}`) ||
            row.status ||
            "active") as any,
          createdAt: row.created_at,
        }))
      }

      return []
    } catch (err) {
      handleReadFailure("Offers For Lot", err)
      console.warn(
        "Using template generator fallback for offers on lot",
        lotId,
        ":",
        err,
      )
      const basePrice = lot.minPricePerKg || lot.expectedNetPerKg || 25
      return [
        {
          id: `${lotId}-off-1`,
          buyerName: "ABC Agri-Traders (DEMO)",
          verified: true,
          offerPricePerKg: Math.round(basePrice * 1.08),
          transportCost: 450,
          buyerRisk: "LOW",
          distanceKm: 28,
          lotId: lotId,
          quantityKg: Math.round(lot.quantityKg * 0.9),
          status: (localStorage.getItem(`offer_status_${lotId}-off-1`) ||
            "active") as any,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: `${lotId}-off-2`,
          buyerName: "Reliance Fresh Mandi (DEMO)",
          verified: true,
          offerPricePerKg: Math.round(basePrice * 1.15),
          transportCost: 980,
          buyerRisk: "LOW",
          distanceKm: 65,
          lotId: lotId,
          quantityKg: lot.quantityKg,
          status: (localStorage.getItem(`offer_status_${lotId}-off-2`) ||
            "active") as any,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: `${lotId}-off-3`,
          buyerName: "Karan Brothers (DEMO)",
          verified: false,
          offerPricePerKg: Math.round(basePrice * 1.25),
          transportCost: 1800,
          buyerRisk: "MEDIUM",
          distanceKm: 120,
          lotId: lotId,
          quantityKg: Math.round(lot.quantityKg * 1.2),
          status: (localStorage.getItem(`offer_status_${lotId}-off-3`) ||
            "active") as any,
          createdAt: new Date(Date.now() - 14400000).toISOString(),
        },
      ]
    }
  },

  async updateOfferStatus(
    offerId: string,
    status: "accepted" | "rejected",
  ): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data: offerData, error: offerErr } = await supabase
        .from("buyer_offers")
        .select("lot_id")
        .eq("id", offerId)
        .maybeSingle()

      if (offerErr || !offerData) {
        throw new Error("Offer not found.")
      }

      const { data: lotData, error: lotErr } = await supabase
        .from("smart_lots")
        .select("farmer_phone")
        .eq("id", offerData.lot_id)
        .maybeSingle()

      if (lotErr || !lotData || lotData.farmer_phone !== user.phone) {
        throw new Error(
          "Access denied: You do not own the lot associated with this offer.",
        )
      }

      const { error } = await supabase
        .from("buyer_offers")
        .update({ status })
        .eq("id", offerId)

      if (error) throw error
      localStorage.setItem(`offer_status_${offerId}`, status)
      if (status === "accepted") {
        await this.createOrder(offerData.lot_id, offerId)
      }
    } catch (err) {
      handleTransactionFailure("Accept/Reject Offer", err)
      console.warn(
        "Using localStorage fallback to update offer status for id",
        offerId,
        ":",
        err,
      )
      localStorage.setItem(`offer_status_${offerId}`, status)
      if (status === "accepted") {
        const orderId = `ORD-${Date.now().toString().slice(-6)}`
        const lotId = offerId === "off-abc" ? "LW001" : "LW002"
        await this.createOrder(lotId, offerId)
      }
    }
  },

  async getRankedOffers(quantityKg: number): Promise<any[]> {
    const offers = await this.getOffers()
    return rankOffers(offers, quantityKg)
  },

  async getMarket(crop: string = "Tomato"): Promise<MarketIntelligence> {
    const normalisedCrop =
      crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase()
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data, error } = await supabase
        .from("market_intelligence")
        .select("*")
        .eq("crop", normalisedCrop)
        .single()

      if (error) throw error

      return {
        crop: data.crop,
        currentLow: Number(data.current_low),
        currentHigh: Number(data.current_high),
        demand: data.demand as "LOW" | "MEDIUM" | "HIGH",
        sellingWindow: data.selling_window,
        trend: data.trend.map(Number),
        imageUrl:
          data.image_url || MOCK_MARKETS[normalisedCrop]?.imageUrl || GRAPE_IMG,
      }
    } catch (err) {
      console.warn("Executing getMarket fallback due to error:", err)
      return MOCK_MARKETS[normalisedCrop] || MOCK_MARKETS.Other
    }
  },

  async getAlert(): Promise<PriceAlert | null> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .limit(1)

      if (error || !data || data.length === 0) {
        throw error || new Error("Empty alerts response")
      }

      return {
        id: data[0].id,
        title: data[0].title,
        message: data[0].message,
        crop: data[0].crop,
      }
    } catch (err) {
      console.warn("Executing getAlert fallback due to error:", err)
      return MOCK_ALERT
    }
  },

  async getTransportOptions(): Promise<TransportOption[]> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.")
      }

      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("*")

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        vehicleType: row.vehicle_type,
        capacityKg: Number(row.capacity_kg),
        baseCost: Number(row.base_cost),
        costPerKm: Number(row.cost_per_km),
        averageSpeedKmh: Number(row.average_speed_kmh),
        availabilityStatus: row.availability_status as any,
      }))
    } catch (err) {
      console.warn("Using transport_vehicles fallback query:", err)
      return [
        {
          id: "tr-mini",
          vehicleType: "Mini Truck",
          capacityKg: 1000,
          baseCost: 280,
          costPerKm: 10,
          averageSpeedKmh: 40,
          availabilityStatus: "available",
        },
        {
          id: "tr-large",
          vehicleType: "Large Truck",
          capacityKg: 5000,
          baseCost: 770,
          costPerKm: 15,
          averageSpeedKmh: 50,
          availabilityStatus: "available",
        },
        {
          id: "tr-heavy",
          vehicleType: "Heavy Duty Multi-Axle",
          capacityKg: 15000,
          baseCost: 1500,
          costPerKm: 22,
          averageSpeedKmh: 45,
          availabilityStatus: "available",
        },
      ]
    }
  },

  async getTransportOptionsForOffer(
    lotId: string,
    offerId: string,
  ): Promise<TransportOption[]> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const lot = await this.getLot(lotId)
    if (!lot) throw new Error("Lot not found or access denied")

    if (isSupabaseConfigured()) {
      const { data: lotOwnerData } = await supabase
        .from("smart_lots")
        .select("farmer_phone")
        .eq("id", lotId)
        .maybeSingle()

      if (!lotOwnerData || lotOwnerData.farmer_phone !== user.phone) {
        throw new Error("Access denied: You do not own this Smart Lot.")
      }
    }

    const offers = await this.getOffersForLot(lotId)
    const offer = offers.find((o) => o.id === offerId)
    if (!offer) throw new Error("Offer not found")

    const vehicles = await this.getTransportOptions()

    return vehicles.map((v) => {
      const loadUnloadHours =
        v.id === "tr-mini" ? 3 : v.id === "tr-large" ? 4 : 5
      const estimatedTravelTimeHours = Math.round(
        loadUnloadHours + offer.distanceKm / v.averageSpeedKmh,
      )
      const estimatedCost =
        Number(v.baseCost) + offer.distanceKm * Number(v.costPerKm)

      return {
        ...v,
        estimatedCost,
        estimatedTravelTimeHours,
        origin: lot.location,
        destination: offer.buyerName,
        distanceKm: offer.distanceKm,
      }
    })
  },

  async getOrders(): Promise<any[]> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    try {
      if (!isSupabaseConfigured())
        throw new Error("Supabase is not configured.")
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          lot_id,
          offer_id,
          buyer_phone,
          farmer_phone,
          amount,
          status,
          payment_status,
          settlement_status,
          created_at,
          updated_at,
          smart_lots (crop)
        `)
        .or(`buyer_phone.eq.${user.phone},farmer_phone.eq.${user.phone}`)

      if (error) throw error
      return (data || []).map((row: any) => ({
        id: row.id,
        lotId: row.lot_id,
        offerId: row.offer_id,
        buyerPhone: row.buyer_phone,
        farmerPhone: row.farmer_phone,
        amount: Number(row.amount),
        status: row.status as any,
        paymentStatus: (row.payment_status || "PENDING") as any,
        settlementStatus: (row.settlement_status || "NOT_CREATED") as any,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        crop: row.smart_lots?.crop || "Tomato",
      }))
    } catch (err) {
      handleReadFailure("Orders", err)
      console.warn("No live order data available; returning empty order list.")
      const raw = localStorage.getItem("uzhavan_orders")
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        } catch {
          // Ignore malformed persisted data and return empty array.
        }
      }
      return []
    }
  },

  async getOrder(orderId: string): Promise<any | null> {
    const orders = await this.getOrders()
    return orders.find((o) => o.id === orderId) || null
  },

  async createOrder(lotId: string, offerId: string): Promise<any> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const lot = await this.getLot(lotId)
    if (!lot) throw new Error("Lot not found")

    let offerPrice = 30
    let buyerPhone = "9876500001"

    if (isSupabaseConfigured()) {
      try {
        const { data: offerData } = await supabase
          .from("buyer_offers")
          .select("*")
          .eq("id", offerId)
          .maybeSingle()
        if (offerData) {
          offerPrice = Number(offerData.offer_price_per_kg)
        }
      } catch (e) {
        console.warn("Error getting offer price:", e)
      }
    } else {
      const storedOffers = await this.getOffersForLot(lotId)
      const matched = storedOffers.find((o) => o.id === offerId)
      if (matched) {
        offerPrice = matched.offerPricePerKg
      }
    }

    const orderAmt = lot.quantityKg * offerPrice
    const orderId = `ORD-${Date.now().toString().slice(-6)}`

    const newOrder = {
      id: orderId,
      lotId,
      offerId,
      buyerPhone,
      farmerPhone: lot.farmerPhone || user.phone,
      amount: orderAmt,
      status: "PENDING_PAYMENT" as const,
      paymentStatus: "PENDING" as const,
      settlementStatus: "NOT_CREATED" as const,
      crop: lot.crop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("orders").insert({
          id: orderId,
          lot_id: lotId,
          offer_id: offerId,
          buyer_phone: buyerPhone,
          farmer_phone: lot.farmerPhone || user.phone,
          amount: orderAmt,
          status: "PENDING_PAYMENT",
          payment_status: "PENDING",
          settlement_status: "NOT_CREATED",
        })
        if (error) throw error
      }

      await this.addAuditEvent(orderId, "ORDER_CREATED", user.phone)

      const currentOrders = await this.getOrders()
      currentOrders.push(newOrder)
      localStorage.setItem("uzhavan_orders", JSON.stringify(currentOrders))
      await this.updateLot(lotId, { status: "sold" })
      return newOrder
    } catch (err) {
      handleTransactionFailure("Create Order", err)
      console.warn("Using localStorage fallback to create order:", err)
      await this.addAuditEvent(orderId, "ORDER_CREATED", user.phone)
      const currentOrders = await this.getOrders()
      currentOrders.push(newOrder)
      localStorage.setItem("uzhavan_orders", JSON.stringify(currentOrders))
      await this.updateLot(lotId, { status: "sold" })
      return newOrder
    }
  },

  async updateOrderStatus(orderId: string, status: any): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    let payment_status: any = undefined
    let settlement_status: any = undefined

    if (status === "PAID") {
      payment_status = "VERIFIED"
      settlement_status = "ON_HOLD"
    } else if (status === "PAYMENT_FAILED") {
      payment_status = "FAILED"
    } else if (status === "DISPUTED") {
      settlement_status = "DISPUTED"
    } else if (status === "COMPLETED") {
      settlement_status = "SETTLED"
    } else if (status === "RELEASE_ELIGIBLE") {
      settlement_status = "RELEASE_ELIGIBLE"
    }

    try {
      if (isSupabaseConfigured()) {
        const updatePayload: any = {
          status,
          updated_at: new Date().toISOString(),
        }
        if (payment_status) updatePayload.payment_status = payment_status
        if (settlement_status)
          updatePayload.settlement_status = settlement_status
        const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId)
        if (error) throw error
      }

      if (status === "PAID") {
        await this.addAuditEvent(orderId, "PAYMENT_VERIFIED", user.phone)
        await this.addAuditEvent(orderId, "SETTLEMENT_PROTECTED", user.phone)
      } else if (status === "PAYMENT_FAILED") {
        await this.addAuditEvent(orderId, "PAYMENT_FAILED", user.phone)
      } else if (status === "TRANSPORT_PENDING") {
        await this.addAuditEvent(orderId, "PICKUP_CONFIRMED", user.phone)
      } else if (status === "IN_TRANSIT") {
        await this.addAuditEvent(orderId, "IN_TRANSIT", user.phone)
      } else if (status === "DELIVERED") {
        await this.addAuditEvent(orderId, "DELIVERED", user.phone)
      } else if (status === "DISPUTED") {
        await this.addAuditEvent(orderId, "DISPUTE_OPENED", user.phone)
      } else if (status === "COMPLETED") {
        await this.addAuditEvent(orderId, "SETTLEMENT_COMPLETED", user.phone)
      }

      const orders = await this.getOrders()
      const matchIdx = orders.findIndex((o) => o.id === orderId)
      if (matchIdx !== -1) {
        orders[matchIdx].status = status
        if (payment_status) orders[matchIdx].paymentStatus = payment_status
        if (settlement_status)
          orders[matchIdx].settlementStatus = settlement_status
        orders[matchIdx].updatedAt = new Date().toISOString()
        localStorage.setItem("uzhavan_orders", JSON.stringify(orders))
      }
    } catch (err) {
      handleTransactionFailure("Update Order Status", err)
      console.warn("Using localstorage update fallback for order status:", err)
      if (status === "PAID") {
        await this.addAuditEvent(orderId, "PAYMENT_VERIFIED", user.phone)
        await this.addAuditEvent(orderId, "SETTLEMENT_PROTECTED", user.phone)
      } else if (status === "PAYMENT_FAILED") {
        await this.addAuditEvent(orderId, "PAYMENT_FAILED", user.phone)
      } else if (status === "TRANSPORT_PENDING") {
        await this.addAuditEvent(orderId, "PICKUP_CONFIRMED", user.phone)
      } else if (status === "IN_TRANSIT") {
        await this.addAuditEvent(orderId, "IN_TRANSIT", user.phone)
      } else if (status === "DELIVERED") {
        await this.addAuditEvent(orderId, "DELIVERED", user.phone)
      } else if (status === "DISPUTED") {
        await this.addAuditEvent(orderId, "DISPUTE_OPENED", user.phone)
      } else if (status === "COMPLETED") {
        await this.addAuditEvent(orderId, "SETTLEMENT_COMPLETED", user.phone)
      }

      const orders = await this.getOrders()
      const matchIdx = orders.findIndex((o) => o.id === orderId)
      if (matchIdx !== -1) {
        orders[matchIdx].status = status
        if (payment_status) orders[matchIdx].paymentStatus = payment_status
        if (settlement_status)
          orders[matchIdx].settlementStatus = settlement_status
        orders[matchIdx].updatedAt = new Date().toISOString()
        localStorage.setItem("uzhavan_orders", JSON.stringify(orders))
      }
    }
  },

  async getPaymentTransaction(orderId: string): Promise<any | null> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          return {
            id: data.id,
            orderId: data.order_id,
            provider: data.provider,
            providerOrderId: data.provider_order_id,
            providerPaymentId: data.provider_payment_id,
            amount: Number(data.amount),
            currency: data.currency,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }
        }
      }
      const raw = localStorage.getItem(`txn_${orderId}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      const raw = localStorage.getItem(`txn_${orderId}`)
      return raw ? JSON.parse(raw) : null
    }
  },

  async savePaymentTransaction(txn: any): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        const { data: existing } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("provider_order_id", txn.providerOrderId)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from("payment_transactions")
            .update({
              provider_payment_id: txn.providerPaymentId,
              status: txn.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from("payment_transactions").insert({
            order_id: txn.orderId,
            provider: txn.provider,
            provider_order_id: txn.providerOrderId,
            provider_payment_id: txn.providerPaymentId,
            amount: txn.amount,
            currency: txn.currency,
            status: txn.status,
          })
          if (error) throw error
        }
      }
      localStorage.setItem(`txn_${txn.orderId}`, JSON.stringify(txn))
    } catch {
      localStorage.setItem(`txn_${txn.orderId}`, JSON.stringify(txn))
    }
  },

  async getVerificationRecords(orderId: string): Promise<VerificationRecord[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("verification_records")
          .select("*")
          .eq("order_id", orderId)
        if (error) throw error
        return (data || []).map((v: any) => ({
          id: v.id,
          orderId: v.order_id,
          actorPhone: v.actor_phone,
          role: v.role,
          verificationResult: v.verification_result,
          createdAt: v.created_at,
          note: v.note,
        }))
      }
      const raw = localStorage.getItem(`verifications_${orderId}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      const raw = localStorage.getItem(`verifications_${orderId}`)
      return raw ? JSON.parse(raw) : []
    }
  },

  async submitVerification(
    orderId: string,
    role: "farmer" | "buyer",
    result: "CONFIRMED" | "DISPUTED",
    note?: string,
  ): Promise<VerificationRecord> {
    const user = (await getAuthProfile()) || DEMO_FARMER

    // Core security rule check
    if (role === "farmer" && user.phone !== "9876543210") {
      throw new Error(
        "Unauthorized: Only the assigned Farmer can confirm this release.",
      )
    }
    if (role === "buyer" && user.phone !== "9876500001") {
      throw new Error(
        "Unauthorized: Only the assigned Buyer can confirm this release.",
      )
    }

    const newRecord: VerificationRecord = {
      orderId,
      actorPhone: user.phone,
      role,
      verificationResult: result,
      createdAt: new Date().toISOString(),
      note,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("verification_records").upsert(
          {
            order_id: orderId,
            actor_phone: user.phone,
            role,
            verification_result: result,
            note,
          },
          {
            onConflict: "order_id,role",
          },
        )
        if (error) throw error
      }

      const verifications = await this.getVerificationRecords(orderId)
      const existingIdx = verifications.findIndex((v) => v.role === role)
      if (existingIdx !== -1) {
        verifications[existingIdx] = newRecord
      } else {
        verifications.push(newRecord)
      }
      localStorage.setItem(
        `verifications_${orderId}`,
        JSON.stringify(verifications),
      )

      const auditEvType =
        role === "farmer" ? "FARMER_VERIFIED" : "BUYER_VERIFIED"
      await this.addAuditEvent(orderId, auditEvType, user.phone)

      const hasFarmer = verifications.some(
        (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
      )
      const hasBuyer = verifications.some(
        (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
      )
      if (hasFarmer && hasBuyer) {
        await this.updateOrderStatus(orderId, "RELEASE_ELIGIBLE")
        await this.addAuditEvent(
          orderId,
          "MUTUAL_VERIFICATION_COMPLETE",
          "system",
        )
      }

      return newRecord
    } catch (err: any) {
      handleTransactionFailure("Submit Verification", err)
      console.warn("localStorage fallback for submitVerification:", err)
      const verifications = await this.getVerificationRecords(orderId)
      const existingIdx = verifications.findIndex((v) => v.role === role)
      if (existingIdx !== -1) {
        verifications[existingIdx] = newRecord
      } else {
        verifications.push(newRecord)
      }
      localStorage.setItem(
        `verifications_${orderId}`,
        JSON.stringify(verifications),
      )

      const auditEvType =
        role === "farmer" ? "FARMER_VERIFIED" : "BUYER_VERIFIED"
      await this.addAuditEvent(orderId, auditEvType, user.phone)

      const hasFarmer = verifications.some(
        (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
      )
      const hasBuyer = verifications.some(
        (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
      )
      if (hasFarmer && hasBuyer) {
        await this.updateOrderStatus(orderId, "RELEASE_ELIGIBLE")
        await this.addAuditEvent(
          orderId,
          "MUTUAL_VERIFICATION_COMPLETE",
          "system",
        )
      }

      return newRecord
    }
  },

  async getDisputes(orderId: string): Promise<DisputeRecord[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("disputes")
          .select("*")
          .eq("order_id", orderId)
        if (error) throw error
        return (data || []).map((d: any) => ({
          id: d.id,
          orderId: d.order_id,
          raisedBy: d.raised_by,
          disputeReason: d.dispute_reason,
          disputeStatus: d.dispute_status,
          createdAt: d.created_at,
          note: d.note,
        }))
      }
      const raw = localStorage.getItem(`disputes_${orderId}`)
      return raw ? JSON.parse(raw) : []
    } catch (err) {
      handleReadFailure("Disputes", err)
      const raw = localStorage.getItem(`disputes_${orderId}`)
      return raw ? JSON.parse(raw) : []
    }
  },

  async raiseDispute(
    orderId: string,
    reason: DisputeReason,
    note?: string,
  ): Promise<DisputeRecord> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const newDispute: DisputeRecord = {
      orderId,
      raisedBy: user.phone,
      disputeReason: reason,
      disputeStatus: "OPEN",
      createdAt: new Date().toISOString(),
      note,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("disputes").insert({
          order_id: orderId,
          raised_by: user.phone,
          dispute_reason: reason,
          dispute_status: "OPEN",
          note,
        })
        if (error) throw error
      }

      const disputes = await this.getDisputes(orderId)
      disputes.push(newDispute)
      localStorage.setItem(`disputes_${orderId}`, JSON.stringify(disputes))

      await this.updateOrderStatus(orderId, "DISPUTED")
      return newDispute
    } catch (err: any) {
      handleTransactionFailure("Raise Dispute", err)
      console.warn("localStorage fallback for raiseDispute:", err)
      const disputes = await this.getDisputes(orderId)
      disputes.push(newDispute)
      localStorage.setItem(`disputes_${orderId}`, JSON.stringify(disputes))
      await this.updateOrderStatus(orderId, "DISPUTED")
      return newDispute
    }
  },

  async getAllDisputes(): Promise<DisputeRecord[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("disputes")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) throw error
        return (data || []).map((d: any) => ({
          id: d.id,
          orderId: d.order_id,
          raisedBy: d.raised_by,
          disputeReason: d.dispute_reason,
          disputeStatus: d.dispute_status,
          createdAt: d.created_at,
          note: d.note,
        }))
      }

      const orders = await this.getOrders()
      const list: DisputeRecord[] = []
      for (const o of orders) {
        const raw = localStorage.getItem(`disputes_${o.id}`)
        if (raw) {
          const arr = JSON.parse(raw) as DisputeRecord[]
          list.push(...arr)
        }
      }
      return list
    } catch (err) {
      handleReadFailure("All Disputes", err)
      console.warn("localStorage fallback for getAllDisputes:", err)
      const orders = await this.getOrders()
      const list: DisputeRecord[] = []
      for (const o of orders) {
        const raw = localStorage.getItem(`disputes_${o.id}`)
        if (raw) {
          const arr = JSON.parse(raw) as DisputeRecord[]
          list.push(...arr)
        }
      }
      return list
    }
  },

  async updateDisputeStatus(
    disputeId: string,
    status: DisputeRecord["disputeStatus"],
    actor: string,
    orderId: string,
  ): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("disputes")
          .update({ dispute_status: status })
          .eq("id", disputeId)
        if (error) throw error
      }

      const raw = localStorage.getItem(`disputes_${orderId}`)
      if (raw) {
        const arr = JSON.parse(raw) as DisputeRecord[]
        const updated = arr.map((d) =>
          d.id === disputeId || (!d.id && d.orderId === orderId)
            ? { ...d, disputeStatus: status }
            : d,
        )
        localStorage.setItem(`disputes_${orderId}`, JSON.stringify(updated))
      }

      let auditType: any = "DISPUTE_VIEWED"
      if (status === "UNDER_REVIEW") auditType = "DISPUTE_ASSIGNED"
      if (status === "CLOSED") auditType = "DISPUTE_CLOSED"

      await this.addAuditEvent(orderId, auditType, actor)
    } catch (err) {
      handleTransactionFailure("Update Dispute Status", err)
      console.warn("localStorage fallback for updateDisputeStatus:", err)
      const raw = localStorage.getItem(`disputes_${orderId}`)
      if (raw) {
        const arr = JSON.parse(raw) as DisputeRecord[]
        const updated = arr.map((d) =>
          d.id === disputeId || (!d.id && d.orderId === orderId)
            ? { ...d, disputeStatus: status }
            : d,
        )
        localStorage.setItem(`disputes_${orderId}`, JSON.stringify(updated))
      }
      let auditType: any = "DISPUTE_VIEWED"
      if (status === "UNDER_REVIEW") auditType = "DISPUTE_ASSIGNED"
      if (status === "CLOSED") auditType = "DISPUTE_CLOSED"
      await this.addAuditEvent(orderId, auditType, actor)
    }
  },

  async resolveDispute(
    disputeId: string,
    orderId: string,
    adminId: string,
    resolutionType: "RELEASE_SETTLEMENT" | "REFUND_BUYER" | "PARTIAL_RESOLUTION" | "KEEP_FUNDS_PROTECTED",
    reason: string,
    amount?: number,
  ): Promise<void> {
    const resolution = {
      id: "res-" + Math.random().toString(36).substr(2, 9),
      disputeId,
      orderId,
      adminId,
      resolutionType,
      reason,
      amount,
      createdAt: new Date().toISOString(),
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("dispute_resolutions").insert({
          dispute_id: disputeId,
          order_id: orderId,
          admin_id: adminId,
          resolution_type: resolutionType,
          reason,
          amount,
        })
        if (error) throw error
      }

      localStorage.setItem(
        `resolution_${disputeId}`,
        JSON.stringify(resolution),
      )
    } catch (err) {
      handleTransactionFailure("Resolve Dispute", err)
      console.warn("localStorage fallback for dispute resolution:", err)
      localStorage.setItem(
        `resolution_${disputeId}`,
        JSON.stringify(resolution),
      )
    }

    if (resolutionType === "RELEASE_SETTLEMENT") {
      await this.updateOrderStatus(orderId, "COMPLETED")

      try {
        if (isSupabaseConfigured()) {
          await supabase
            .from("orders")
            .update({ settlement_status: "SETTLED" })
            .eq("id", orderId)
        }
      } catch { }

      const ordersRaw = localStorage.getItem("orders")
      if (ordersRaw) {
        const list = JSON.parse(ordersRaw)
        const updated = list.map((o: any) =>
          o.id === orderId
            ? { ...o, status: "COMPLETED", settlementStatus: "SETTLED" }
            : o,
        )
        localStorage.setItem("orders", JSON.stringify(updated))
      }

      await this.addAuditEvent(orderId, "RESOLUTION_CREATED", adminId)
      await this.addAuditEvent(orderId, "SETTLEMENT_COMPLETED", adminId)
      await this.updateDisputeStatus(disputeId, "RESOLVED", adminId, orderId)
    } else if (resolutionType === "REFUND_BUYER") {
      await this.updateOrderStatus(orderId, "COMPLETED")

      try {
        if (isSupabaseConfigured()) {
          await supabase
            .from("orders")
            .update({ settlement_status: "REFUNDED" })
            .eq("id", orderId)
        }
      } catch { }

      const ordersRaw = localStorage.getItem("orders")
      if (ordersRaw) {
        const list = JSON.parse(ordersRaw)
        const updated = list.map((o: any) =>
          o.id === orderId
            ? { ...o, status: "COMPLETED", settlementStatus: "REFUNDED" }
            : o,
        )
        localStorage.setItem("orders", JSON.stringify(updated))
      }

      await this.addAuditEvent(orderId, "RESOLUTION_CREATED", adminId)
      await this.addAuditEvent(orderId, "REFUND_COMPLETED", adminId)
      await this.updateDisputeStatus(disputeId, "RESOLVED", adminId, orderId)
    } else if (resolutionType === "PARTIAL_RESOLUTION") {
      await this.updateOrderStatus(orderId, "COMPLETED")

      try {
        if (isSupabaseConfigured()) {
          await supabase
            .from("orders")
            .update({ settlement_status: "SETTLED" })
            .eq("id", orderId)
        }
      } catch { }

      const ordersRaw = localStorage.getItem("orders")
      if (ordersRaw) {
        const list = JSON.parse(ordersRaw)
        const updated = list.map((o: any) =>
          o.id === orderId
            ? { ...o, status: "COMPLETED", settlementStatus: "SETTLED" }
            : o,
        )
        localStorage.setItem("orders", JSON.stringify(updated))
      }

      await this.addAuditEvent(orderId, "PARTIAL_RESOLUTION_CREATED", adminId)
      await this.addAuditEvent(orderId, "SETTLEMENT_COMPLETED", adminId)
      await this.updateDisputeStatus(disputeId, "RESOLVED", adminId, orderId)
    } else if (resolutionType === "KEEP_FUNDS_PROTECTED") {
      await this.updateOrderStatus(orderId, "DISPUTED")

      try {
        if (isSupabaseConfigured()) {
          await supabase
            .from("orders")
            .update({ settlement_status: "DISPUTED" })
            .eq("id", orderId)
        }
      } catch { }

      const ordersRaw = localStorage.getItem("orders")
      if (ordersRaw) {
        const list = JSON.parse(ordersRaw)
        const updated = list.map((o: any) =>
          o.id === orderId
            ? { ...o, status: "DISPUTED", settlementStatus: "DISPUTED" }
            : o,
        )
        localStorage.setItem("orders", JSON.stringify(updated))
      }

      await this.addAuditEvent(orderId, "RESOLUTION_CREATED", adminId)
      await this.updateDisputeStatus(
        disputeId,
        "UNDER_REVIEW",
        adminId,
        orderId,
      )
    }
  },

  async getResolutionForDispute(disputeId: string): Promise<any | null> {
    const raw = localStorage.getItem(`resolution_${disputeId}`)
    return raw ? JSON.parse(raw) : null
  },

  async getAuditEvents(orderId: string): Promise<AuditEvent[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("audit_events")
          .select("*")
          .eq("order_id", orderId)
          .order("timestamp", { ascending: true })
        if (error) throw error
        return (data || []).map((e: any) => ({
          id: e.id,
          orderId: e.order_id,
          eventType: e.event_type,
          actor: e.actor,
          timestamp: e.timestamp,
        }))
      }
      const raw = localStorage.getItem(`audit_events_${orderId}`)
      return raw ? JSON.parse(raw) : []
    } catch (err) {
      handleReadFailure("Audit Events", err)
      const raw = localStorage.getItem(`audit_events_${orderId}`)
      return raw ? JSON.parse(raw) : []
    }
  },

  async addAuditEvent(
    orderId: string,
    eventType: AuditEvent["eventType"],
    actor: string,
  ): Promise<void> {
    const newEvent: AuditEvent = {
      orderId,
      eventType,
      actor,
      timestamp: new Date().toISOString(),
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("audit_events").insert({
          order_id: orderId,
          event_type: eventType,
          actor,
        })
        if (error) throw error
      }
      const events = await this.getAuditEvents(orderId)
      events.push(newEvent)
      localStorage.setItem(`audit_events_${orderId}`, JSON.stringify(events))
    } catch (err) {
      handleTransactionFailure("Add Audit Event", err)
      const events = await this.getAuditEvents(orderId)
      events.push(newEvent)
      localStorage.setItem(`audit_events_${orderId}`, JSON.stringify(events))
    }
  },

  canReleaseSettlement(
    order: Order,
    verifications: VerificationRecord[],
    disputesCount: number,
  ): boolean {
    const hasFarmerConfirm = verifications.some(
      (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
    )
    const hasBuyerConfirm = verifications.some(
      (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
    )
    return (
      order.paymentStatus === "VERIFIED" &&
      [
        "DELIVERED",
        "MUTUALLY_VERIFIED",
        "RELEASE_ELIGIBLE",
        "COMPLETED",
      ].includes(order.status) &&
      hasFarmerConfirm &&
      hasBuyerConfirm &&
      disputesCount === 0 &&
      order.settlementStatus !== "SETTLED"
    )
  },

  async settleOrderFunds(orderId: string): Promise<void> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const order = await this.getOrder(orderId)
    if (!order) throw new Error("Order not found")

    const verifications = await this.getVerificationRecords(orderId)
    const disputes = await this.getDisputes(orderId)
    const activeDisputes = disputes.filter((d) => d.disputeStatus === "OPEN")

    if (
      !this.canReleaseSettlement(order, verifications, activeDisputes.length)
    ) {
      throw new Error("Conditions not met for escrow settlement release.")
    }

    try {
      const res = await fetch("/api/settle-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          data.error || "Release transaction rejected by provider",
        )
      }
      await this.updateOrderStatus(orderId, "COMPLETED")
    } catch (err: any) {
      handleTransactionFailure("Release Settlement", err)
      console.warn("Live release failed or using simulation mode:", err)
      await this.updateOrderStatus(orderId, "COMPLETED")
    }
  },

  async getDocketForOrder(orderId: string): Promise<LogisticsDocket | null> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("logistics_dockets")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          return {
            id: data.id,
            docketHumanId: data.docket_human_id,
            orderId: data.order_id,
            lotId: data.lot_id,
            farmerPhone: data.farmer_phone,
            buyerPhone: data.buyer_phone,
            transporterPhone: data.transporter_phone,
            crop: data.crop,
            variety: data.variety,
            agreedQuantity: Number(data.agreed_quantity),
            pickupLocation: data.pickup_location,
            deliveryLocation: data.delivery_location,
            vehicleIdentifier: data.vehicle_identifier,
            transportOption: data.transport_option,
            expectedPickupTime: data.expected_pickup_time,
            expectedDeliveryTime: data.expected_delivery_time,
            actualPickupTime: data.actual_pickup_time,
            actualDeliveryTime: data.actual_delivery_time,
            deliveredQuantity: data.delivered_quantity
              ? Number(data.delivered_quantity)
              : undefined,
            reportedDeliveryLocation: data.reported_delivery_location,
            reportedReceivingParty: data.reported_receiving_party,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }
        }
      }
      const raw = localStorage.getItem(`docket_${orderId}`)
      return raw ? JSON.parse(raw) : null
    } catch (err) {
      handleReadFailure("Docket Info", err)
      const raw = localStorage.getItem(`docket_${orderId}`)
      return raw ? JSON.parse(raw) : null
    }
  },

  async createLogisticsDocket(
    orderId: string,
    transporterPhone: string,
    vehicleIdentifier: string,
    transportOption: string,
  ): Promise<LogisticsDocket> {
    const user = (await getAuthProfile()) || DEMO_FARMER
    const order = await this.getOrder(orderId)
    if (!order) throw new Error("Order not found")

    const existing = await this.getDocketForOrder(orderId)
    if (existing) return existing

    const lot = await this.getLot(order.lotId)
    if (!lot) throw new Error("Lot not found")

    const randomSuffix = Math.floor(100000 + Math.random() * 900000)
    const humanId = `LWD-2026-${randomSuffix}`

    const newDocket: LogisticsDocket = {
      orderId,
      lotId: order.lotId,
      farmerPhone: order.farmerPhone,
      buyerPhone: order.buyerPhone,
      transporterPhone,
      crop: lot.crop,
      agreedQuantity: lot.quantityKg,
      pickupLocation: "Nashik Farm, Maharashtra",
      deliveryLocation: "Mumbai Wholesale Market, Maharashtra",
      vehicleIdentifier,
      transportOption,
      expectedPickupTime: new Date(Date.now() + 86400000).toISOString(),
      expectedDeliveryTime: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: "TRANSPORT_ASSIGNED",
    }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("logistics_dockets")
          .insert({
            order_id: orderId,
            lot_id: order.lotId,
            farmer_phone: order.farmerPhone,
            buyer_phone: order.buyerPhone,
            transporter_phone: transporterPhone,
            crop: lot.crop,
            agreed_quantity: lot.quantityKg,
            pickup_location: "Nashik Farm, Maharashtra",
            delivery_location: "Mumbai Wholesale Market, Maharashtra",
            vehicle_identifier: vehicleIdentifier,
            transport_option: transportOption,
            expected_pickup_time: newDocket.expectedPickupTime,
            expected_delivery_time: newDocket.expectedDeliveryTime,
            status: "TRANSPORT_ASSIGNED",
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          newDocket.id = data.id
          newDocket.docketHumanId = data.docket_human_id
        }
      } else {
        newDocket.id = crypto.randomUUID()
        newDocket.docketHumanId = humanId
      }

      localStorage.setItem(`docket_${orderId}`, JSON.stringify(newDocket))
      await this.updateOrderStatus(orderId, "TRANSPORT_PENDING")
      await this.addAuditEvent(orderId, "DOCKET_CREATED", user.phone)
      await this.addAuditEvent(orderId, "TRANSPORT_ASSIGNED", user.phone)

      return newDocket
    } catch (err: any) {
      handleTransactionFailure("Create Logistics Docket", err)
      console.warn("localStorage fallback for createLogisticsDocket:", err)
      newDocket.id = crypto.randomUUID()
      newDocket.docketHumanId = humanId
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(newDocket))

      await this.updateOrderStatus(orderId, "TRANSPORT_PENDING")
      await this.addAuditEvent(orderId, "DOCKET_CREATED", user.phone)
      await this.addAuditEvent(orderId, "TRANSPORT_ASSIGNED", user.phone)
      return newDocket
    }
  },

  async acceptTransportJob(
    orderId: string,
    transporterPhone: string,
  ): Promise<LogisticsDocket> {
    const docket = await this.getDocketForOrder(orderId)
    if (!docket) throw new Error("Docket not found")

    if (docket.transporterPhone !== transporterPhone) {
      throw new Error(
        "Unauthorized: Only the assigned Transporter can accept this job.",
      )
    }

    const updated: LogisticsDocket = {
      ...docket,
      status: "TRANSPORT_ACCEPTED" as const,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("logistics_dockets")
          .update({ status: "TRANSPORT_ACCEPTED" })
          .eq("order_id", orderId)
        if (error) throw error
      }
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "TRANSPORT_ACCEPTED")
      await this.addAuditEvent(orderId, "TRANSPORT_ACCEPTED", transporterPhone)
      return updated
    } catch (err) {
      handleTransactionFailure("Accept Transport Job", err)
      console.warn("localStorage fallback for acceptTransportJob:", err)
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "TRANSPORT_ACCEPTED")
      await this.addAuditEvent(orderId, "TRANSPORT_ACCEPTED", transporterPhone)
      return updated
    }
  },

  async confirmPickup(
    orderId: string,
    transporterPhone: string,
    lotId: string,
    pickupLocation: string,
    quantity: number,
    vehicleIdentifier: string,
  ): Promise<LogisticsDocket> {
    const docket = await this.getDocketForOrder(orderId)
    if (!docket) throw new Error("Docket not found")

    if (docket.transporterPhone !== transporterPhone) {
      throw new Error(
        "Unauthorized: Only the assigned Transporter can verify pickup.",
      )
    }

    if (docket.lotId !== lotId) {
      throw new Error("Invalid Lot ID mapping")
    }

    const updated: LogisticsDocket = {
      ...docket,
      actualPickupTime: new Date().toISOString(),
      status: "PICKUP_CONFIRMED" as const,
      pickupLocation,
      agreedQuantity: quantity,
      vehicleIdentifier,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("logistics_dockets")
          .update({
            status: "PICKUP_CONFIRMED",
            actual_pickup_time: updated.actualPickupTime,
            pickup_location: pickupLocation,
            agreed_quantity: quantity,
            vehicle_identifier: vehicleIdentifier,
          })
          .eq("order_id", orderId)
        if (error) throw error
      }
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "PICKUP_CONFIRMED")
      await this.addAuditEvent(orderId, "PICKUP_CONFIRMED", transporterPhone)
      return updated
    } catch (err) {
      handleTransactionFailure("Confirm Pickup", err)
      console.warn("localStorage fallback for confirmPickup:", err)
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "PICKUP_CONFIRMED")
      await this.addAuditEvent(orderId, "PICKUP_CONFIRMED", transporterPhone)
      return updated
    }
  },

  async startTransit(
    orderId: string,
    transporterPhone: string,
  ): Promise<LogisticsDocket> {
    const docket = await this.getDocketForOrder(orderId)
    if (!docket) throw new Error("Docket not found")

    if (docket.transporterPhone !== transporterPhone) {
      throw new Error(
        "Unauthorized: Only the assigned Transporter can start transit.",
      )
    }

    const updated: LogisticsDocket = {
      ...docket,
      status: "IN_TRANSIT" as const,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("logistics_dockets")
          .update({ status: "IN_TRANSIT" })
          .eq("order_id", orderId)
        if (error) throw error
      }
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "IN_TRANSIT")
      await this.addAuditEvent(orderId, "IN_TRANSIT", transporterPhone)
      return updated
    } catch (err) {
      handleTransactionFailure("Start Transit", err)
      console.warn("localStorage fallback for startTransit:", err)
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updated))
      await this.updateOrderStatus(orderId, "IN_TRANSIT")
      await this.addAuditEvent(orderId, "IN_TRANSIT", transporterPhone)
      return updated
    }
  },

  matchDocketToOrder(docket: LogisticsDocket, order: Order): {
    result: "MATCHED" | "MISMATCH"
    reasons: string[]
    checks: {
      orderMatched: boolean
      lotMatched: boolean
      cropMatched: boolean
      quantityMatched: boolean
      destinationMatched: boolean
      transportMatched: boolean
    }
  } {
    const checks = {
      orderMatched: docket.orderId === order.id,
      lotMatched: docket.lotId === order.lotId,
      cropMatched:
        docket.crop.toLowerCase() === (order.crop || "").toLowerCase(),
      quantityMatched: true,
      destinationMatched:
        docket.deliveryLocation === "Mumbai Wholesale Market, Maharashtra",
      transportMatched: !!docket.transporterPhone,
    }

    const reasons: string[] = []

    if (!checks.orderMatched) reasons.push("ORDER_MISMATCH")
    if (!checks.lotMatched) reasons.push("LOT_MISMATCH")
    if (!checks.cropMatched) reasons.push("CROP_MISMATCH")

    const delivered = docket.deliveredQuantity || 0
    const agreed = docket.agreedQuantity
    const difference = Math.abs(delivered - agreed)
    const allowance = agreed * 0.1 // 10% weight tolerance for dehydration/shrinkage
    if (difference > allowance) {
      checks.quantityMatched = false
      reasons.push("QUANTITY_MISMATCH")
    }

    if (
      docket.reportedDeliveryLocation &&
      docket.reportedDeliveryLocation !== docket.deliveryLocation
    ) {
      checks.destinationMatched = false
      reasons.push("DESTINATION_MISMATCH")
    }

    const isMatched = Object.values(checks).every((v) => v === true)

    return {
      result: isMatched ? "MATCHED" : "MISMATCH",
      reasons,
      checks,
    }
  },

  async reportDelivery(
    orderId: string,
    actorPhone: string,
    deliveredQuantity: number,
    reportedDeliveryLocation: string,
    receivingParty: string,
    evidenceReference?: string,
  ): Promise<{ docket: LogisticsDocket; matchResult: any }> {
    const docket = await this.getDocketForOrder(orderId)
    if (!docket) throw new Error("Docket not found")

    if (
      docket.transporterPhone !== actorPhone &&
      docket.buyerPhone !== actorPhone
    ) {
      throw new Error("Unauthorized role to report delivery")
    }

    const order = await this.getOrder(orderId)
    if (!order) throw new Error("Order not found")

    const updatedDocket: LogisticsDocket = {
      ...docket,
      actualDeliveryTime: new Date().toISOString(),
      deliveredQuantity,
      reportedDeliveryLocation,
      reportedReceivingParty: receivingParty,
      status: "DELIVERY_REPORTED",
    }

    const match = this.matchDocketToOrder(updatedDocket, order)
    if (match.result === "MATCHED") {
      updatedDocket.status = "MATCHED"
    } else {
      updatedDocket.status = "MISMATCH"
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("logistics_dockets")
          .update({
            actual_delivery_time: updatedDocket.actualDeliveryTime,
            delivered_quantity: deliveredQuantity,
            reported_delivery_location: reportedDeliveryLocation,
            reported_receiving_party: receivingParty,
            status: updatedDocket.status,
          })
          .eq("order_id", orderId)
        if (error) throw error

        if (evidenceReference) {
          const { error: evError } = await supabase
            .from("docket_evidence")
            .insert({
              docket_id: docket.id,
              uploaded_by: actorPhone,
              file_reference: evidenceReference,
            })
          if (evError) throw evError
        }
      }

      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updatedDocket))
      if (evidenceReference) {
        localStorage.setItem(`evidence_${orderId}`, evidenceReference)
      }

      await this.addAuditEvent(orderId, "DELIVERY_REPORTED", actorPhone)

      if (match.result === "MATCHED") {
        await this.addAuditEvent(orderId, "DOCKET_MATCHED", "system")
        await this.updateOrderStatus(orderId, "DELIVERED")
      } else {
        await this.addAuditEvent(orderId, "DOCKET_MISMATCHED", "system")
        const primaryReason = match.reasons[0] || "DELIVERY_DATA_MISMATCH"
        let disputeCategory: DisputeReason = "Other"
        if (primaryReason === "QUANTITY_MISMATCH")
          disputeCategory = "Quantity mismatch"
        if (primaryReason === "CROP_MISMATCH") disputeCategory = "Wrong produce"

        await this.raiseDispute(
          orderId,
          disputeCategory,
          `Logistics auto-dispute: ${match.reasons.join(", ")}`,
        )
      }

      return { docket: updatedDocket, matchResult: match }
    } catch (err: any) {
      handleTransactionFailure("Report Delivery", err)
      console.warn("localStorage fallback for reportDelivery:", err)
      localStorage.setItem(`docket_${orderId}`, JSON.stringify(updatedDocket))
      if (evidenceReference) {
        localStorage.setItem(`evidence_${orderId}`, evidenceReference)
      }

      await this.addAuditEvent(orderId, "DELIVERY_REPORTED", actorPhone)

      if (match.result === "MATCHED") {
        await this.addAuditEvent(orderId, "DOCKET_MATCHED", "system")
        await this.updateOrderStatus(orderId, "DELIVERED")
      } else {
        await this.addAuditEvent(orderId, "DOCKET_MISMATCHED", "system")
        const primaryReason = match.reasons[0] || "DELIVERY_DATA_MISMATCH"
        let disputeCategory: DisputeReason = "Other"
        if (primaryReason === "QUANTITY_MISMATCH")
          disputeCategory = "Quantity mismatch"
        if (primaryReason === "CROP_MISMATCH") disputeCategory = "Wrong produce"

        await this.raiseDispute(
          orderId,
          disputeCategory,
          `Logistics auto-dispute: ${match.reasons.join(", ")}`,
        )
      }
      return { docket: updatedDocket, matchResult: match }
    }
  },

  qualityDisclaimer: QUALITY_DISCLAIMER,
}
