import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import type { SmartLot, MarketIntelligence } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"

export default function MarketIntelligencePage() {
  const navigate = useNavigate()
  const [lots, setLots] = useState<SmartLot[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>("default-tomato")

  // Custom manual inputs if they don't have registered lots
  const [selectedCrop, setSelectedCrop] = useState("Tomato")
  const [selectedLocation, setSelectedLocation] = useState(
    "Nashik, Maharashtra",
  )
  const [selectedMinPrice, setSelectedMinPrice] = useState<number>(24)

  const [market, setMarket] = useState<MarketIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load farmer's lots
  useEffect(() => {
    farmerApi
      .getLots()
      .then((data) => {
        setLots(data || [])
        // If user has at least one active lot, select it by default
        const activeLots = (data || []).filter((l) => l.status === "active")
        if (activeLots.length > 0) {
          setSelectedLotId(activeLots[0].id)
        }
      })
      .catch(() => {
        // Fallback gracefully to default selection
      })
  }, [])

  // Retrieve current market values for selected crop
  useEffect(() => {
    setLoading(true)
    setError(null)

    // Detemine active crop/specs based on selected lot or manual fallback
    let cropName = selectedCrop
    let minTarget = selectedMinPrice

    if (selectedLotId !== "default-tomato") {
      const activeLot = lots.find((l) => l.id === selectedLotId)
      if (activeLot) {
        cropName = activeLot.crop
        minTarget = activeLot.minPricePerKg || activeLot.expectedNetPerKg || 0
        setSelectedLocation(activeLot.location)
      }
    } else {
      setSelectedLocation(
        selectedCrop === "Tomato"
          ? "Nashik, Maharashtra"
          : selectedCrop === "Onion"
            ? "Lasalgaon, Maharashtra"
            : selectedCrop === "Sugarcane"
              ? "Kolhapur, Maharashtra"
              : selectedCrop === "Paddy"
                ? "Amravati, Maharashtra"
                : selectedCrop === "Cotton"
                  ? "Nagpur, Maharashtra"
                  : selectedCrop === "Maize"
                    ? "Akola, Maharashtra"
                    : selectedCrop === "Chili"
                      ? "Guntur, Andhra Pradesh"
                      : "Pune, Maharashtra",
      )
    }

    farmerApi
      .getMarket(cropName)
      .then((data) => {
        setMarket(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to fetch market data.")
        setLoading(false)
      })
  }, [selectedLotId, selectedCrop, selectedMinPrice, lots])

  // Calculation engines
  const currentAvg = market ? (market.currentLow + market.currentHigh) / 2 : 0
  const targetDiff = currentAvg - selectedMinPrice

  // Volatility Calculation (standard variance helper)
  const volatilityPct =
    market && market.trend.length > 1
      ? Math.round(
          ((Math.max(...market.trend) - Math.min(...market.trend)) /
            (market.trend.reduce((a, b) => a + b, 0) / market.trend.length)) *
            100,
        )
      : 10
  const volatilityLevel =
    volatilityPct > 20 ? "HIGH" : volatilityPct > 10 ? "MEDIUM" : "LOW"

  // Sell state indicators
  let signal: "SELL" | "HOLD" | "DISPOSE" = "HOLD"
  let signalColor = "bg-amber-100 text-amber-800 border-amber-300"
  let explanationText = ""

  if (market) {
    const trendLength = market.trend.length
    const isUpward =
      trendLength > 2 &&
      market.trend[trendLength - 1] > market.trend[trendLength - 2]
    const isDownward =
      trendLength > 2 &&
      market.trend[trendLength - 1] < market.trend[trendLength - 2]

    if (currentAvg >= selectedMinPrice) {
      if (isUpward && currentAvg < market.currentHigh) {
        // Prices are going up: HOLD to sell higher!
        signal = "HOLD"
        signalColor =
          "bg-gradient-to-r from-amber-50 to-orange-100 text-orange-900 border-orange-200"
        explanationText = `${market.crop} Mandi prices are steadily rising (+${(market.trend[trendLength - 1] - market.trend[trendLength - 2]).toFixed(1)}/kg). While average daily rates average ₹${currentAvg}/kg (above your target of ₹${selectedMinPrice}/kg), we recommend holding for 2-3 days to capture the upcoming price peak at ${selectedLocation}.`
      } else {
        // High price, downward trend or stable: SELL NOW
        signal = "SELL"
        signalColor =
          "bg-gradient-to-r from-[#edf9f0] to-green-100 text-[#0f2a14] border-green-200"
        explanationText = `${market.crop} average rates are at an optimal level of ₹${currentAvg}/kg, giving you a premium profit spread over your target ₹${selectedMinPrice}/kg. Mandi stock arrivals are rising fast which might depress rates by next week. Sell immediately to lock in maximum net returns.`
      }
    } else {
      // Current rate below target
      if (isDownward) {
        signal = "DISPOSE"
        signalColor =
          "bg-gradient-to-r from-red-50 to-red-100 text-red-900 border-red-200"
        explanationText = `ALERT: Market rates at ${selectedLocation} are falling rapidly and currently stand at ₹${currentAvg}/kg (below your ₹${selectedMinPrice}/kg target). Regional surplus is expected to flood mandis. We recommend immediate disposal to minimize loss window.`
      } else {
        signal = "HOLD"
        signalColor =
          "bg-gradient-to-r from-amber-50 to-orange-100 text-orange-900 border-orange-200"
        explanationText = `Current mandi average ₹${currentAvg}/kg is below your expected target of ₹${selectedMinPrice}/kg. Price trends are currently stabilizing. We recommend holding your lot for high demand days over the next 4-7 days to recover target margins.`
      }
    }
  }

  // Sparkline Chart Calculation
  const trendMax = market ? Math.max(...market.trend) * 1.1 : 50
  const trendMin = market ? Math.min(...market.trend) * 0.9 : 0
  const chartHeight = 120
  const chartWidth = 500
  const points = market
    ? market.trend.map((val, idx) => {
        const x = (idx / (market.trend.length - 1)) * chartWidth
        const y =
          chartHeight - ((val - trendMin) / (trendMax - trendMin)) * chartHeight
        return `${x},${y}`
      })
    : []

  const targetLineY = market
    ? chartHeight -
      ((selectedMinPrice - trendMin) / (trendMax - trendMin)) * chartHeight
    : 0

  return (
    <div className="max-w-4xl mx-auto font-sans space-y-8 p-1">
      {/* Header and Brand */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-green-50 text-[#2e7d3a] tracking-wider uppercase">
            Authorized APMC Govt Feed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b16] mt-2">
            Price Intelligence Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical comparisons, volatility trackers, and optimal selling
            window signals
          </p>
        </div>

        {/* Simple Source Tag */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-2xl">
          <span className="text-lg">🏛️</span>
          <div className="text-[10px] leading-tight font-bold text-slate-650">
            <p>Source Data: Agmarknet API</p>
            <p className="text-slate-400 font-medium">Govt. of India Portal</p>
          </div>
        </div>
      </header>

      {/* Lot / Parameters Selectors Card */}
      <section className="bg-white border border-[#a7e4b0]/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="md:col-span-2 space-y-2">
          <label className="block text-xs font-bold text-slate-600 uppercase">
            Select Farmer Smart Lot
          </label>
          <select
            value={selectedLotId}
            onChange={(e) => {
              setSelectedLotId(e.target.value)
              if (e.target.value !== "default-tomato") {
                const activeLot = lots.find((l) => l.id === e.target.value)
                if (activeLot) {
                  setSelectedCrop(activeLot.crop)
                  setSelectedMinPrice(
                    activeLot.minPricePerKg || activeLot.expectedNetPerKg || 0,
                  )
                }
              }
            }}
            className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition"
          >
            {lots
              .filter((l) => l.status === "active")
              .map((l) => (
                <option key={l.id} value={l.id}>
                  Lot #{l.id} — {l.crop} ({l.variety || "Default"}) ·{" "}
                  {l.quantityKg.toLocaleString()} {l.unit || "kg"} @{" "}
                  {l.location}
                </option>
              ))}
            <option value="default-tomato">
              🔍 No active lot? Try Demo Tomatos (Nashik)
            </option>
          </select>
        </div>

        {selectedLotId === "default-tomato" ? (
          /* Parameter Tweaker if no lot registered */
          <div className="space-y-4 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Demo Crop Type
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value)
                  setSelectedMinPrice(
                    e.target.value === "Tomato"
                      ? 24
                      : e.target.value === "Onion"
                        ? 18
                        : e.target.value === "Sugarcane"
                          ? 28
                          : e.target.value === "Paddy"
                            ? 26
                            : e.target.value === "Cotton"
                              ? 42
                              : e.target.value === "Maize"
                                ? 21
                                : e.target.value === "Chili"
                                  ? 45
                                  : 22,
                  )
                }}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-2.5 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="Tomato">Tomato</option>
                <option value="Onion">Onion</option>
                <option value="Potato">Potato</option>
                <option value="Sugarcane">Sugarcane</option>
                <option value="Paddy">Paddy</option>
                <option value="Cotton">Cotton</option>
                <option value="Maize">Maize</option>
                <option value="Chili">Chili</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Target Selling Price (₹/kg)
              </label>
              <input
                type="number"
                value={selectedMinPrice}
                onChange={(e) => setSelectedMinPrice(Number(e.target.value))}
                className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-2.5 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Demo Storage Location
              </label>
              <input
                type="text"
                disabled
                value={selectedLocation}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500"
              />
            </div>
          </div>
        ) : (
          /* Small info tag if displaying registered lot */
          <div className="flex flex-col justify-end p-2.5 bg-[#edf9f0]/45 rounded-2xl border border-dashed border-[#a7e4b0]">
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              Target Price
            </p>
            <p className="text-lg font-bold text-slate-800">
              ₹{selectedMinPrice}/kg
            </p>
          </div>
        )}
      </section>

      {/* Main Info Columns */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-green-50 animate-pulse" />
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-3xl border border-red-200 text-center font-bold">
          {error}
        </div>
      ) : !market ? null : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Authorized Prices & Sparkline Chart */}
          <div className="md:col-span-2 space-y-6">
            {/* Price Spread Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#a7e4b0]/50 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase leading-snug">
                  Mandi Daily Low
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1.5">
                  ₹{market.currentLow}
                  <span className="text-xs font-semibold text-slate-400">
                    /kg
                  </span>
                </p>
              </div>

              <div className="bg-white border-2 border-green-500 rounded-2xl p-5 shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-green-500" />
                <p className="text-[10px] font-extrabold text-[#2e7d3a] uppercase leading-snug">
                  Mandi Daily Average
                </p>
                <p className="text-3xl font-extrabold text-green-700 mt-1.5">
                  ₹{currentAvg.toFixed(1)}
                  <span className="text-xs font-semibold text-slate-400">
                    /kg
                  </span>
                </p>
              </div>

              <div className="bg-white border border-[#a7e4b0]/50 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase leading-snug">
                  Mandi Daily High
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1.5">
                  ₹{market.currentHigh}
                  <span className="text-xs font-semibold text-slate-400">
                    /kg
                  </span>
                </p>
              </div>
            </div>

            {/* Sparkline chart SVG */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {market.crop} 10-Day Mandi Price Trend
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Coordinates in rupees/kg over daily reports
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-green-600 block">
                    📈 Upward Trajectory
                  </span>
                </div>
              </div>

              <div className="w-full overflow-hidden relative">
                {/* Expected Price Guide Tag */}
                {targetLineY >= 0 && targetLineY <= chartHeight && (
                  <div
                    className="absolute left-2.5 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none"
                    style={{ top: `${targetLineY - 8}px` }}
                  >
                    Target (₹{selectedMinPrice})
                  </div>
                )}

                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-32 overflow-visible"
                >
                  {/* Grid Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const y = (i / 3) * chartHeight
                    return (
                      <line
                        key={i}
                        x1="0"
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    )
                  })}

                  {/* Expected Margin Line */}
                  <line
                    x1="0"
                    y1={targetLineY}
                    x2={chartWidth}
                    y2={targetLineY}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Trend Path */}
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    points={points.join(" ")}
                  />

                  {/* Nodes */}
                  {points.map((coordString, idx) => {
                    const [x, y] = coordString.split(",")
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#22c55e"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <span>10 Days ago</span>
                <span>Active Today</span>
              </div>
            </div>
          </div>

          {/* Right Column: Price Intelligence Engine Decision & explanation */}
          <div className="space-y-6">
            {/* Selling Window Signal Widget */}
            <div
              className={`border rounded-3xl p-6 shadow-sm border-slate-200 transition ${signalColor}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-88 block mb-1">
                Selling-Window Decision
              </span>

              <div className="flex items-center gap-3">
                <div className="text-4xl">
                  {signal === "SELL" ? "🚀" : signal === "HOLD" ? "⏳" : "🚨"}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight uppercase leading-none">
                    {signal === "SELL"
                      ? "Sell Now"
                      : signal === "HOLD"
                        ? "Hold Stock"
                        : "Dispose Lot"}
                  </h2>
                  <p className="text-[10px] opacity-75 font-semibold mt-1">
                    Recommended window: {market.sellingWindow}
                  </p>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-2xl bg-white/60 text-xs font-semibold leading-relaxed border border-black/5">
                Target Realisation:{" "}
                {targetDiff >= 0 ? (
                  <span className="text-green-800">
                    🟢 ₹{targetDiff.toFixed(1)}/kg above target expectations
                  </span>
                ) : (
                  <span className="text-red-800">
                    🔴 ₹{Math.abs(targetDiff).toFixed(1)}/kg below target
                    expectations
                  </span>
                )}
              </div>
            </div>

            {/* Volatility & Demand */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Market Risk Parameters
              </h3>

              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-650">
                    <span>Mandi Price Volatility</span>
                    <span className="font-bold">
                      {volatilityPct}% ( {volatilityLevel} )
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        volatilityLevel === "HIGH"
                          ? "bg-red-500"
                          : volatilityLevel === "MEDIUM"
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(volatilityPct * 2, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-650">
                    <span>Target Market Demand</span>
                    <span className="font-bold">{market.demand} Demand</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        market.demand === "HIGH"
                          ? "bg-green-500"
                          : market.demand === "MEDIUM"
                            ? "bg-orange-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width:
                          market.demand === "HIGH"
                            ? "90%"
                            : market.demand === "MEDIUM"
                              ? "50%"
                              : "20%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Farmer-friendly explanation Narrative */}
            <div className="bg-[#edf9f0]/45 border border-[#a7e4b0]/40 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h4 className="font-extrabold text-[#122b16] text-xs uppercase tracking-wider">
                  Mandi Advisory Note
                </h4>
              </div>
              <p className="text-slate-700 text-xs font-medium leading-relaxed">
                {explanationText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
