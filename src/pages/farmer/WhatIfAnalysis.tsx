import { useEffect, useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router"
import type {
  SmartLot,
  BuyerOffer,
  TransportOption,
  MarketIntelligence,
} from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"
import { calculateNetRealisation } from "../../lib/netRealisation"
import {
  runDecisionEngine,
  DecisionRecommendation,
} from "../../services/decisionEngine"

export default function WhatIfAnalysis() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryLotId = searchParams.get("lotId")

  // State elements
  const [lots, setLots] = useState<SmartLot[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>("")
  const [selectedLot, setSelectedLot] = useState<SmartLot | null>(null)

  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [vehicles, setVehicles] = useState<TransportOption[]>([])
  const [market, setMarket] = useState<MarketIntelligence | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Base state values for chosen Lot/Offer combination
  const [selectedOfferId, setSelectedOfferId] = useState<string>("")
  const [basePrice, setBasePrice] = useState<number>(0)
  const [baseTransport, setBaseTransport] = useState<number>(0)
  const [baseQty, setBaseQty] = useState<number>(0)

  // Simulated state values
  const [simPrice, setSimPrice] = useState<number>(0)
  const [simTransport, setSimTransport] = useState<number>(0)
  const [simQty, setSimQty] = useState<number>(0)
  const [waitDays, setWaitDays] = useState<number>(0)

  // Re-evaluation result
  const [reevaluatedRec, setReevaluatedRec] =
    useState<DecisionRecommendation | null>(null)

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

  // 2. Fetch data dependencies on Lot change
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
          setReevaluatedRec(null) // reset re-eval on lot switch
        }
      } catch (err) {
        setError("Failed to load parameters.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedLotId, lots])

  // 3. Reset scenario inputs on Lot or Offer selection change
  useEffect(() => {
    if (offers.length > 0) {
      setSelectedOfferId(offers[0].id)
    } else {
      setSelectedOfferId("mkt-mandi")
    }
  }, [offers])

  useEffect(() => {
    if (!selectedLot) return
    const activeOffer = offers.find((o) => o.id === selectedOfferId)
    const isMandi = selectedOfferId === "mkt-mandi"

    let initialPrice = 0
    let distance = 20
    if (isMandi) {
      initialPrice = market ? (market.currentLow + market.currentHigh) / 2 : 30
      distance = 20
    } else if (activeOffer) {
      initialPrice = Number(activeOffer.offerPricePerKg)
      distance = Number(activeOffer.distanceKm)
    }

    const defaultVehicle =
      vehicles.find((v) => v.capacityKg >= selectedLot.quantityKg) ||
      vehicles[0]
    const defaultCost = defaultVehicle
      ? defaultVehicle.baseCost + distance * defaultVehicle.costPerKm
      : 700

    setBasePrice(initialPrice)
    setSimPrice(initialPrice)

    setBaseTransport(defaultCost)
    setSimTransport(defaultCost)

    setBaseQty(selectedLot.quantityKg)
    setSimQty(selectedLot.quantityKg)

    setWaitDays(0)
    setReevaluatedRec(null)
  }, [selectedOfferId, selectedLot, offers, vehicles, market])

  // Calculate average daily change for wait forecasts
  const avgDiff = useMemo(() => {
    if (market && market.trend && market.trend.length > 1) {
      const diffs = market.trend
        .slice(1)
        .map((val, idx) => Number(val) - Number(market.trend[idx]))
      return diffs.reduce((a, b) => a + b, 0) / diffs.length
    }
    return 0
  }, [market])

  // Calculate simulated price taking wait forecast into account
  const simulatedPriceWithWait = useMemo(() => {
    if (waitDays > 0) {
      if (market && market.trend && market.trend.length > 1) {
        return Math.max(0, simPrice + avgDiff * waitDays)
      }
    }
    return simPrice
  }, [simPrice, waitDays, avgDiff, market])

  // Recalculations
  const baseResult = useMemo(() => {
    if (!selectedLot) return null
    return calculateNetRealisation(baseQty, basePrice, baseTransport)
  }, [selectedLot, baseQty, basePrice, baseTransport])

  const simulatedResult = useMemo(() => {
    if (!selectedLot) return null
    return calculateNetRealisation(simQty, simulatedPriceWithWait, simTransport)
  }, [selectedLot, simQty, simulatedPriceWithWait, simTransport])

  // Differences
  const difference = useMemo(() => {
    if (!baseResult || !simulatedResult) return 0
    return simulatedResult.netRealisation - baseResult.netRealisation
  }, [baseResult, simulatedResult])

  const percentChange = useMemo(() => {
    if (!baseResult || baseResult.netRealisation === 0) return "0.0"
    return ((difference / baseResult.netRealisation) * 100).toFixed(1)
  }, [baseResult, difference])

  // Sensitivity Metric Calculations
  const sensitivityItems = useMemo(() => {
    if (!baseResult || !selectedLot) return []

    // 1) Price impact at +10% shift
    const pricePlus10 = simPrice * 1.1
    const netAtPricePlus10 = calculateNetRealisation(
      simQty,
      pricePlus10,
      simTransport,
    ).netRealisation
    const impactPrice = Math.abs(
      netAtPricePlus10 - simulatedResult!.netRealisation,
    )

    // 2) Transport impact at +10% shift
    const transPlus10 = simTransport * 1.1
    const netAtTransPlus10 = calculateNetRealisation(
      simQty,
      simulatedPriceWithWait,
      transPlus10,
    ).netRealisation
    const impactTrans = Math.abs(
      netAtTransPlus10 - simulatedResult!.netRealisation,
    )

    // 3) Quantity impact at +10% shift
    const qtyPlus10 = simQty * 1.1
    const netAtQtyPlus10 = calculateNetRealisation(
      qtyPlus10,
      simulatedPriceWithWait,
      simTransport,
    ).netRealisation
    const impactQty = Math.abs(netAtQtyPlus10 - simulatedResult!.netRealisation)

    // 4) Wait impact (1 day price change)
    let impactWait = 0
    if (market && market.trend && market.trend.length > 1) {
      const waitPrice = simPrice + avgDiff * 1
      const netAtWait1 = calculateNetRealisation(
        simQty,
        waitPrice,
        simTransport,
      ).netRealisation
      impactWait = Math.abs(netAtWait1 - simulatedResult!.netRealisation)
    }

    const items = [
      {
        key: "price",
        name: "Crop Price per kg",
        impact: impactPrice,
        color: "bg-emerald-500",
      },
      {
        key: "transport",
        name: "Logistics Costs",
        impact: impactTrans,
        color: "bg-red-500",
      },
      {
        key: "quantity",
        name: "Harvest Quantity",
        impact: impactQty,
        color: "bg-blue-500",
      },
    ]

    if (market && market.trend && market.trend.length > 1) {
      items.push({
        key: "wait",
        name: "Selling Windows (Wait)",
        impact: impactWait,
        color: "bg-amber-500",
      })
    }

    return items.sort((a, b) => b.impact - a.impact)
  }, [
    baseResult,
    selectedLot,
    simPrice,
    simTransport,
    simQty,
    simulatedResult,
    waitDays,
    avgDiff,
    market,
  ])

  // Re-evaluation Handler
  function handleReevaluate() {
    if (!selectedLot) return

    // Clone lot with simulated quantity
    const simLot: SmartLot = {
      ...selectedLot,
      quantityKg: simQty,
    }

    // Adjust offer parameters in matching list
    const simOffers = offers.map((o) => {
      if (o.id === selectedOfferId) {
        return {
          ...o,
          offerPricePerKg: simulatedPriceWithWait,
          transportCost: simTransport,
        }
      }
      return o
    })

    // Modify base vehicle stats temporarily to output simulated transport cost
    const activeOffer = offers.find((o) => o.id === selectedOfferId)
    const distanceVal = activeOffer ? activeOffer.distanceKm : 20
    const simVehicles = vehicles.map((v) => ({
      ...v,
      baseCost: simTransport,
      costPerKm: 0,
    }))

    const decisionObj = runDecisionEngine(
      simLot,
      market,
      simOffers,
      simVehicles,
    )
    setReevaluatedRec(decisionObj)
  }

  // Pre-calculated preset helpers
  function applyPricePreset(percent: number) {
    setSimPrice(Math.round(basePrice * (1 + percent) * 100) / 100)
  }

  if (loading && lots.length === 0) {
    return (
      <div className="h-64 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
    )
  }

  if (lots.length === 0) {
    return (
      <div className="bg-white border border-slate-205 rounded-3xl p-6 sm:p-8 text-center space-y-4">
        <span className="text-4xl text-slate-400 block">🌾</span>
        <h2 className="text-lg font-bold text-slate-800">
          No Smart Lots Available
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Create an active smart lot to test what-if scenarios.
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

  const selectedOfferName =
    selectedOfferId === "mkt-mandi"
      ? `${selectedLot?.crop} Local Mandi`
      : offers.find((o) => o.id === selectedOfferId)?.buyerName ||
        "Selected Buyer"

  return (
    <div className="space-y-6">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#122b16]">
            Smart Lot What-If Simulator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate critical market changes and calculate expected net yields
            instantly
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-550">Lot:</span>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold bg-white text-slate-800 outline-none"
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.crop} ({l.quantityKg} kg) - {l.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-550">Offer:</span>
            <select
              value={selectedOfferId}
              onChange={(e) => setSelectedOfferId(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold bg-white text-slate-800 outline-none"
            >
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  Bid: {o.buyerName} (₹{o.offerPricePerKg}/kg)
                </option>
              ))}
              <option value="mkt-mandi">🏛️ Government Local Mandi</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-750 text-xs px-4 py-2.5 rounded-2xl font-semibold">
          ⚠️ {error}
        </div>
      )}

      {selectedLot && baseResult && simulatedResult && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Simulation Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Scenarios Controls */}
            <div className="bg-white border border-[#a7e4b0]/40 rounded-3xl p-6 sm:p-8 space-y-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex justify-between items-center">
                <span>SIMULATION TARGET CONTROLS</span>
                <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  SIMULATED
                </span>
              </h2>

              {/* price scenario */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-700">
                    Buyer Offer Rate per kg
                  </label>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#122b16]">
                      ₹{simPrice.toFixed(2)}/kg
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Base Rate: ₹{basePrice.toFixed(2)}/kg
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyPricePreset(-0.1)}
                    className="flex-1 py-1.5 border border-slate-205 rounded-lg text-[10px] font-black text-slate-650 hover:bg-slate-50 transition"
                  >
                    −10%
                  </button>
                  <button
                    onClick={() => applyPricePreset(-0.05)}
                    className="flex-1 py-1.5 border border-slate-205 rounded-lg text-[10px] font-black text-slate-650 hover:bg-slate-50 transition"
                  >
                    −5%
                  </button>
                  <button
                    onClick={() => setSimPrice(basePrice)}
                    className="flex-1 py-1.5 border border-[#a7e4b0] bg-[#edf9f0] rounded-lg text-[10px] font-black text-[#2e7d3a] hover:opacity-90 transition"
                  >
                    Current
                  </button>
                  <button
                    onClick={() => applyPricePreset(0.05)}
                    className="flex-1 py-1.5 border border-slate-205 rounded-lg text-[10px] font-black text-slate-650 hover:bg-slate-50 transition"
                  >
                    +5%
                  </button>
                  <button
                    onClick={() => applyPricePreset(0.1)}
                    className="flex-1 py-1.5 border border-slate-205 rounded-lg text-[10px] font-black text-slate-650 hover:bg-slate-50 transition"
                  >
                    +10%
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={Math.max(1, Math.round(basePrice * 0.5))}
                    max={Math.round(basePrice * 1.5)}
                    step={0.1}
                    value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value))}
                    className="flex-1 accent-green-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <input
                    type="number"
                    min={0.1}
                    value={simPrice || ""}
                    onChange={(e) =>
                      setSimPrice(
                        e.target.value === ""
                          ? 0
                          : Math.max(0.1, Number(e.target.value)),
                      )
                    }
                    className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* transport scenario */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-700">
                    Total Transport Logistics cost
                  </label>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-800">
                      ₹{simTransport.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Base Log Cost: ₹{baseTransport.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(3000, Math.round(baseTransport * 2.5))}
                    step={25}
                    value={simTransport}
                    onChange={(e) => setSimTransport(Number(e.target.value))}
                    className="flex-1 accent-green-700 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <input
                    type="number"
                    min={0}
                    value={simTransport}
                    onChange={(e) =>
                      setSimTransport(Math.max(0, Number(e.target.value)))
                    }
                    className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* quantity scenario */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-700">
                    Total Harvest Weight (Quantity)
                  </label>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-850">
                      {simQty.toLocaleString()} kg
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Base Qty: {baseQty.toLocaleString()} kg
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min={Math.max(10, Math.round(baseQty * 0.2))}
                    max={Math.round(baseQty * 2)}
                    step={10}
                    value={simQty}
                    onChange={(e) => setSimQty(Number(e.target.value))}
                    className="flex-1 accent-green-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <input
                    type="number"
                    min={1}
                    value={simQty || ""}
                    onChange={(e) =>
                      setSimQty(
                        e.target.value === ""
                          ? 0
                          : Math.max(1, Number(e.target.value)),
                      )
                    }
                    className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold outline-none"
                  />
                </div>

                {(() => {
                  const selectVehicle = vehicles.find(
                    (v) => v.capacityKg >= simQty,
                  )
                  if (!selectVehicle) {
                    return (
                      <p className="text-[10px] text-red-650 bg-red-50 px-3 py-1.5 rounded-lg font-semibold">
                        ⚠️ Warning: Simulated quantity exceeds the physical
                        payload capacity bounds of standard delivery fleet size!
                      </p>
                    )
                  }
                  return (
                    <p className="text-[9.5px] text-slate-400 italic font-medium">
                      * Transport rates assume standard{" "}
                      {selectVehicle.vehicleType} payload. Simulated logistics
                      cost will remain fixed.
                    </p>
                  )
                })()}
              </div>

              {/* wait forecast scenario */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-700">
                    Selling Window Delay
                  </label>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#2e7d3a] tracking-wider uppercase">
                      {waitDays === 0
                        ? "SELL NOW (TODAY)"
                        : `WAIT ${waitDays} DAY${waitDays > 1 ? "S" : ""}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((day) => {
                    const hasForecast =
                      market && market.trend && market.trend.length > 1
                    const isDisabled = day > 0 && !hasForecast
                    return (
                      <button
                        key={day}
                        disabled={isDisabled}
                        onClick={() => setWaitDays(day)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          isDisabled
                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            : waitDays === day
                              ? "bg-[#2e7d3a] border-[#2e7d3a] text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-55"
                        }`}
                      >
                        {day === 0
                          ? "Sell Now"
                          : `+${day} Day${day > 1 ? "s" : ""}`}
                      </button>
                    )
                  })}
                </div>

                {market && market.trend && market.trend.length > 1 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-xs text-slate-655 font-medium">
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      Deterministic Trend Forecast
                    </p>
                    <p>
                      Estimated daily price movement:{" "}
                      <span className="font-extrabold text-[#2e7d3a]">
                        {avgDiff >= 0 ? "+" : ""}₹{avgDiff.toFixed(2)}/kg
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      ⚠️ Trend forecasts reflect historical observations and
                      carry risk. Volatility range is{" "}
                      <span className="font-bold">
                        ±₹{(0.5 * waitDays).toFixed(2)}/kg
                      </span>
                      .
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg font-bold">
                    ⚠️ Future price scenario unavailable: Insufficient historical
                    market trend data points.
                  </p>
                )}
              </div>
            </div>

            {/* Re-evaluation Results */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Matching Engine Re-evaluation
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Re-run simulated assumptions through the existing UZHAVAN
                    Decision Engine
                  </p>
                </div>
                <button
                  onClick={handleReevaluate}
                  className="px-6 py-3 bg-[#122b16] text-[#a7e4b0] hover:scale-[1.01] rounded-2xl text-xs font-black shadow-md transition cursor-pointer text-center"
                >
                  ⚡ Re-evaluate Match Case
                </button>
              </div>

              {reevaluatedRec && (
                <div className="border border-green-200/60 bg-green-50/10 rounded-2xl p-4 sm:p-5 mt-3 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] font-black text-green-700 uppercase tracking-wider block">
                        Re-evaluated Engine Match
                      </span>
                      <h4 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
                        {reevaluatedRec.decision === "SELL_NOW" &&
                          "⚡ SELL NOW"}
                        {reevaluatedRec.decision === "WAIT" && "⏳ HOLD & WAIT"}
                        {reevaluatedRec.decision === "CHOOSE_BUYER" &&
                          "🤝 SELL TO BUYER"}
                        {reevaluatedRec.decision === "CHOOSE_MARKET" &&
                          "🏛️ SELL AT MANDI"}
                      </h4>
                    </div>
                    <span className="bg-[#122b16] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      Confidence: {reevaluatedRec.confidence}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-750 leading-relaxed border-t border-slate-100 pt-2.5">
                    {reevaluatedRec.explanation}
                  </p>

                  <div className="pt-2">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                      Key Recommendations:
                    </p>
                    <ul className="grid sm:grid-cols-2 gap-1.5 mt-1 text-[11px] text-slate-650 font-bold">
                      {reevaluatedRec.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="text-[#2e7d3a]">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Comparative Metrics, Sensitivity Analysis, Provenance */}
          <div className="space-y-6">
            {/* Comparison Details */}
            <div className="bg-gradient-to-br from-[#122b16] to-[#1d3e23] text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
              <span className="bg-green-700 text-[#a7e4b0] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                COMPARE CASES
              </span>

              <div className="space-y-3.5 border-b border-white/10 pb-4">
                <div>
                  <span className="block text-[8px] text-green-300 font-bold uppercase tracking-wider">
                    CURRENT Expected Net
                  </span>
                  <span className="text-2xl font-black">
                    ₹{baseResult.netRealisation.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-green-200/80 block mt-0.5">
                    Rate: ₹{basePrice.toFixed(2)}/kg · Qty: {baseQty} kg
                  </span>
                </div>

                <div>
                  <span className="block text-[8px] text-orange-300 font-bold uppercase tracking-wider">
                    SIMULATED Expected Net
                  </span>
                  <span className="text-2xl font-black text-orange-100">
                    ₹{simulatedResult.netRealisation.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-orange-200/80 block mt-0.5">
                    Sim Rate: ₹{simulatedPriceWithWait.toFixed(2)}/kg · Sim Qty:{" "}
                    {simQty} kg
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[8px] text-green-300 font-bold uppercase tracking-wider">
                  NET REALISATION DIFFERENCE
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-3xl font-black ${
                      difference >= 0 ? "text-green-300" : "text-amber-400"
                    }`}
                  >
                    {difference >= 0 ? "+" : ""}₹
                    {difference.toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      difference >= 0 ? "text-green-300" : "text-amber-400"
                    }`}
                  >
                    ({difference >= 0 ? "+" : ""}
                    {percentChange}%)
                  </span>
                </div>

                <p className="text-[10.5px] text-green-100/90 mt-3 font-semibold">
                  {difference === 0
                    ? "No change detected. Scenario variables match current values."
                    : difference > 0
                      ? `Simulated conditions yields an extra ₹${difference.toLocaleString("en-IN")} net relative payload.`
                      : `Simulated conditions reduce crop value yields by ₹${Math.abs(difference).toLocaleString("en-IN")}.`}
                </p>
              </div>
            </div>

            {/* Sensitivity analysis visualization */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Yield Sensitivity Analysis
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Measures absolute Net Realisation impact from a simulated +10%
                shift in each factor
              </p>

              <div className="space-y-3 pt-2">
                {sensitivityItems.map((item) => {
                  const maxImpact =
                    Math.max(...sensitivityItems.map((s) => s.impact)) || 1
                  const isSimPercent = (item.impact / maxImpact) * 100
                  return (
                    <div key={item.key} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{item.name}</span>
                        <span>
                          ₹{Math.round(item.impact).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${isSimPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Data Provenance Card */}
            <div className="bg-slate-50 border border-slate-205 rounded-3xl p-6 sm:p-8 space-y-4 text-xs">
              <h3 className="text-[10px] font-black text-slate-650 uppercase tracking-widest pb-2 border-b border-slate-200/50">
                Simulation Provenance details
              </h3>

              <div className="space-y-3.5 font-semibold text-slate-700">
                <div>
                  <p className="text-[9px] text-[#2e7d3a] uppercase font-black tracking-wider">
                    Base Case Inputs (Observed)
                  </p>
                  <p className="text-slate-600 mt-0.5 font-medium">
                    Crop lot rate sourced from verified {selectedOfferName}{" "}
                    offers.
                  </p>
                  <span className="bg-[#edf9f0] text-[#2e7d3a] tracking-wider text-[8px] font-black px-2 py-0.5 rounded uppercase mt-1 inline-block">
                    ✓ OBSERVED
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200/50">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">
                    Simulated Rates (Simulated)
                  </p>
                  <p className="text-slate-650 mt-0.5 font-medium">
                    Variables modified in this what-if workspace environment are
                    simulated values only.
                  </p>
                  <span className="bg-orange-50 text-orange-700 tracking-wider text-[8.5px] font-black px-2 py-0.5 rounded uppercase mt-1 inline-block">
                    SIMULATED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
