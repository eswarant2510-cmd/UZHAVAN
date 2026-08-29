import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import type {
  SmartLot,
  BuyerOffer,
  TransportOption,
  MarketIntelligence,
} from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"
import { runDecisionEngine } from "../../services/decisionEngine"

export default function BestSellingDecision() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryLotId = searchParams.get("lotId")

  const [lots, setLots] = useState<SmartLot[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>("")
  const [selectedLot, setSelectedLot] = useState<SmartLot | null>(null)

  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [vehicles, setVehicles] = useState<TransportOption[]>([])
  const [market, setMarket] = useState<MarketIntelligence | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Fetch available lots
  useEffect(() => {
    async function fetchLots() {
      try {
        const data = await farmerApi.getLots()
        setLots(data || [])
        if (data && data.length > 0) {
          const initialId =
            queryLotId && data.some((l) => l.id === queryLotId)
              ? queryLotId
              : data[0].id
          setSelectedLotId(initialId)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError("Failed to fetch smart lots.")
        setLoading(false)
      }
    }
    fetchLots()
  }, [queryLotId])

  // 2. Fetch dependencies whenever selectedLotId changes
  useEffect(() => {
    if (!selectedLotId) return

    async function loadData() {
      setLoading(true)
      try {
        const activeLot = lots.find((l) => l.id === selectedLotId)
        setSelectedLot(activeLot || null)

        if (activeLot) {
          const [offerData, vehicleData, marketData] = await Promise.all([
            farmerApi.getOffersForLot(selectedLotId),
            farmerApi.getTransportOptions(),
            farmerApi.getMarket(activeLot.crop || "Tomato"),
          ])

          setOffers(offerData || [])
          setVehicles(vehicleData || [])
          setMarket(marketData || null)
        }
      } catch (err) {
        setError("Failed to load lot parameters.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedLotId, lots])

  if (loading && lots.length === 0) {
    return <div className="h-64 rounded-3xl bg-slate-50 animate-pulse" />
  }

  if (lots.length === 0) {
    return (
      <div className="bg-white border border-slate-205 rounded-3xl p-6 sm:p-8 text-center space-y-4">
        <span className="text-4xl text-slate-400 block">🌾</span>
        <h2 className="text-lg font-bold text-slate-800">
          No Smart Lots Found
        </h2>
        <p className="text-xs text-slate-550 max-w-sm mx-auto">
          Create a Smart Lot first to enable the AI Selling Decision Engine.
        </p>
        <button
          onClick={() => navigate("/farmer/lots/new")}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition"
        >
          + Create First Smart Lot
        </button>
      </div>
    )
  }

  const rec = selectedLot
    ? runDecisionEngine(selectedLot, market, offers, vehicles)
    : null

  return (
    <div className="space-y-6">
      {/* Header & Lot Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#122b16]">
            Best Selling Decision Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluating government mandis and private buyer offers with
            real-world logistics costs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-650 shrink-0">
            Active Smart Lot:
          </label>
          <select
            value={selectedLotId}
            onChange={(e) => setSelectedLotId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
          >
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.crop} ({l.quantityKg} kg) - {l.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
      ) : !rec || !selectedLot ? (
        <div className="p-8 bg-slate-50 rounded-3xl text-center text-xs text-slate-500 font-semibold">
          Error calculating selling recommendation.
        </div>
      ) : rec.decision === "INSUFFICIENT_DATA" ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">
              Insufficient Data Available
            </h3>
          </div>
          <p className="text-slate-650 text-xs leading-relaxed font-semibold">
            {rec.explanation}
          </p>
          <div className="bg-white/60 rounded-2xl p-4 border border-amber-200/50 space-y-2 text-xs font-semibold text-slate-700">
            <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider text-amber-700">
              What is missing:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              {rec.reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Recommendation and Calculations */}
          <div className="md:col-span-2 space-y-6">
            {/* Deciding Banner */}
            <div className="bg-gradient-to-br from-[#122b16] to-[#1b3d20] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-green-500/10 rounded-full blur-2xl" />

              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="bg-green-700 text-[#a7e4b0] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                    UZHAVAN Recommendation
                  </span>
                  <h2 className="text-3xl font-black mt-2 tracking-tight">
                    {rec.decision === "SELL_NOW" && "⚡ SELL NOW"}
                    {rec.decision === "WAIT" && "⏳ HOLD & WAIT"}
                    {rec.decision === "CHOOSE_BUYER" && "🤝 SELL TO BUYER"}
                    {rec.decision === "CHOOSE_MARKET" && "🏛️ SELL AT MANDI"}
                  </h2>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center px-4">
                  <span className="block text-[8px] text-green-300 font-bold uppercase tracking-wider">
                    Confidence
                  </span>
                  <span className="text-xs font-extrabold uppercase">
                    {rec.confidence}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-green-100/90 leading-relaxed font-semibold">
                {rec.explanation}
              </p>

              {/* Reasons list */}
              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                <p className="text-[10px] text-green-300 font-black uppercase tracking-wider">
                  Key Deciding Factors:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-xs font-semibold">
                  {rec.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-green-400">✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations Card */}
            {rec.bestOption && (
              <div className="bg-white border border-[#a7e4b0]/40 rounded-3xl p-6 sm:p-8 space-y-5">
                <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest">
                  Net Realisation breakdown
                </h3>

                <div className="grid grid-cols-3 gap-3 text-center border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <div>
                    <span className="block text-[9px] text-slate-400 font-black uppercase">
                      Gross Offer
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">
                      ₹{rec.bestOption.grossValue.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-red-500 font-black uppercase">
                      Logistics Cost
                    </span>
                    <span className="text-sm font-extrabold text-red-650">
                      − ₹{rec.bestOption.transportCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-green-700 font-black uppercase">
                      expected Net
                    </span>
                    <span className="text-sm font-black text-green-700">
                      ₹{rec.bestOption.netRealisation.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="bg-green-50/20 border border-green-200/50 rounded-2xl p-4 text-xs font-semibold text-slate-700 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-green-700 font-black uppercase">
                      Net realized Price per kg
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      ₹{rec.bestOption.netPricePerKg.toFixed(2)}/kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase">
                      Gross rate per kg
                    </p>
                    <p className="text-lg font-extrabold text-slate-700 mt-1">
                      ₹{rec.bestOption.pricePerKg.toFixed(2)}/kg
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-medium italic">
                  * Calculations derived deterministically from:{" "}
                  {selectedLot.quantityKg} kg lot × ₹{rec.bestOption.pricePerKg}
                  /kg offer rate − ₹{rec.bestOption.transportCost} logistics
                  fee.
                </p>
              </div>
            )}

            {/* Alternatives List */}
            {rec.alternatives.length > 0 && (
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
                <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest">
                  Evaluating Alternatives
                </h3>
                <div className="divide-y divide-slate-100">
                  {rec.alternatives.map((alt, idx) => {
                    const isBetterNet = rec.bestOption
                      ? alt.netRealisation > rec.bestOption.netRealisation
                      : false
                    const netDiff = rec.bestOption
                      ? Math.abs(
                          alt.netRealisation - rec.bestOption.netRealisation,
                        )
                      : 0
                    return (
                      <div key={idx} className="py-3.5 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-800">
                                {alt.name}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-655 px-1.5 py-0.5 rounded uppercase font-bold">
                                {alt.vehicleType}
                              </span>
                              {!alt.isValid && (
                                <span className="text-[8px] bg-red-100 text-red-800 px-1 py-0.5 rounded uppercase font-extrabold">
                                  Invalid
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Offer rate: ₹{alt.pricePerKg}/kg · Distance:{" "}
                              {alt.distanceKm} km
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-extrabold text-slate-800">
                              Net realized: ₹
                              {alt.netRealisation.toLocaleString("en-IN")}
                            </p>
                            <p
                              className={`text-[9px] font-black ${
                                isBetterNet ? "text-green-600" : "text-red-500"
                              }`}
                            >
                              {alt.isValid
                                ? `${
                                    isBetterNet ? "+" : "−"
                                  } ₹${netDiff.toLocaleString("en-IN")}`
                                : alt.validationError || "Unmet criteria"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Conditions, Volatility and Provenance */}
          <div className="space-y-6">
            {/* Market Context Indicator */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Market Context
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block">
                    National Price Target
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="min-w-fit text-lg font-black text-slate-800">
                      ₹{market?.currentLow} – ₹{market?.currentHigh}
                    </span>
                    <span className="text-xs text-slate-500">/kg</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block">
                    Local Demand
                  </span>
                  <span className="text-sm font-black text-green-700 mt-1 block">
                    {market?.demand} Demand
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">
                    Active Selling Window
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                    {market?.sellingWindow || "NEUTRAL"}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Provenance Card */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4 text-xs">
              <h3 className="text-[10px] font-black text-slate-655 uppercase tracking-widest">
                Data Provenance & Traceability
              </h3>

              <div className="space-y-3 font-semibold text-slate-700 font-medium">
                <div>
                  <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider font-bold">
                    Official Mandi Prices
                  </p>
                  <p className="mt-0.5 text-slate-600 font-medium">
                    Source: Agmarknet Govt Portal
                  </p>
                  <p className="text-[9px] text-[#2e7d3a] font-black uppercase mt-0.5 font-bold">
                    ✓ Government Verified
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100">
                  <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                    Logistics Costs
                  </p>
                  <p className="mt-0.5 text-slate-600 font-medium">
                    Source: Estimated System Logistics Rates
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 font-bold">
                    Estimated Rate
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100">
                  <p className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                    Buyer Verification
                  </p>
                  <p className="mt-0.5 text-slate-600 font-medium">
                    Source: Verified Profiles
                  </p>
                  <p className="text-[9px] text-[#2e7d3a] font-black uppercase mt-0.5 font-bold">
                    ✓ Secure Settlement
                  </p>
                </div>
              </div>
            </div>

            {/* Direct navigation action */}
            <button
              onClick={() => navigate(`/farmer/lots/${selectedLotId}`)}
              className="w-full py-4 bg-[#122b16] text-[#a7e4b0] hover:bg-[#122b16]/90 rounded-2xl text-xs font-black transition text-center"
            >
              🌾 Manage Smart Lot Deals
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
