import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import LocationPicker from "../../components/common/LocationPicker"
import RouteMap from "../../components/logistics/RouteMap"
import { findMatchingTransporters } from "../../services/transporterService"
import { calculateRouteDetails, type RouteCalculationResult } from "../../services/googleMapsService"
import { findBackhaulOpportunities, determineCropLogisticsUrgency } from "../../services/loadPoolingService"
import type { TransportOption, LocationDetails } from "../../lib/types"

export default function Logistics() {
  const navigate = useNavigate()

  const [pickupAddress, setPickupAddress] = useState("Nashik Farm, Maharashtra")
  const [pickupDetails, setPickupDetails] = useState<LocationDetails>()
  const [destAddress, setDestAddress] = useState("Mumbai APMC Yard, Maharashtra")
  const [destDetails, setDestDetails] = useState<LocationDetails>()

  const [crop, setCrop] = useState("Tomato")
  const [quantityKg, setQuantityKg] = useState(500)

  const [loading, setLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteCalculationResult | null>(null)
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([])
  const [selectedOptionId, setSelectedOptionId] = useState<string>("")
  const [verifiedMessage, setVerifiedMessage] = useState<string>("")

  const urgency = determineCropLogisticsUrgency(crop)
  const backhaul = findBackhaulOpportunities(pickupAddress, destAddress)

  useEffect(() => {
    runSearch()
  }, [pickupAddress, destAddress, quantityKg])

  async function runSearch() {
    setLoading(true)
    try {
      const route = await calculateRouteDetails(
        pickupDetails || pickupAddress,
        destDetails || destAddress,
      )
      setRouteInfo(route)

      const result = await findMatchingTransporters({
        pickupLocation: pickupDetails || pickupAddress,
        deliveryLocation: destDetails || destAddress,
        quantityKg,
        crop,
        perishable: urgency.category === "perishable",
      })

      setTransportOptions(result.options)
      setVerifiedMessage(result.message)
      if (result.options.length > 0) {
        setSelectedOptionId(result.options[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = transportOptions.find((o) => o.id === selectedOptionId) || transportOptions[0]

  return (
    <div className="space-y-6 font-sans">
      <div>
        <p className="text-xs font-bold text-agri-600 mb-1 tracking-wider uppercase">
          LIVE AGRI-LOGISTICS & TRANSPORT MATCHING
        </p>
        <h1
          className="text-3xl font-light text-agri-950"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Smart Freight Logistics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Location-aware carrier discovery and road route optimization across India
        </p>
      </div>

      {/* Perishability Urgency Banner */}
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-3xl flex flex-wrap justify-between items-center text-xs">
        <div>
          <span className="font-extrabold text-orange-900 uppercase">
            📦 Crop Characteristics: {crop} ({urgency.category.replace("_", " ")})
          </span>
          <p className="text-orange-700 text-[11px] mt-0.5">{urgency.perishabilityNotice}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase mt-2 sm:mt-0 ${
            urgency.urgencyLevel === "HIGH"
              ? "bg-red-600 text-white"
              : "bg-orange-500 text-white"
          }`}
        >
          Urgency: {urgency.urgencyLevel}
        </span>
      </div>

      {/* Location Resolution Controls */}
      <div className="bg-white border border-agri-150 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationPicker
            label="Farmer Pickup Location"
            value={pickupAddress}
            locationDetails={pickupDetails}
            onChange={(addr, details) => {
              setPickupAddress(addr)
              setPickupDetails(details)
            }}
          />

          <LocationPicker
            label="Buyer / Mandi Destination Location"
            value={destAddress}
            locationDetails={destDetails}
            onChange={(addr, details) => {
              setDestAddress(addr)
              setDestDetails(details)
            }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase">Crop Commodity</label>
            <input
              type="text"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase">Quantity (kg)</label>
            <input
              type="number"
              value={quantityKg}
              onChange={(e) => setQuantityKg(Number(e.target.value))}
              className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase">Road Distance</label>
            <p className="mt-2 text-sm font-extrabold text-slate-800">
              {routeInfo ? `${routeInfo.distanceKm} km` : "Calculating..."}
            </p>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase">Data Source</label>
            <p className="mt-2 text-xs font-bold text-agri-700">
              {routeInfo ? routeInfo.dataSource : "Estimate"}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Route Map */}
      <RouteMap
        origin={pickupDetails || pickupAddress}
        destination={destDetails || destAddress}
        distanceKm={routeInfo?.distanceKm || 42}
        etaFormatted={routeInfo?.etaFormatted || "4 hrs"}
        dataSource={routeInfo?.dataSource}
        lastCalculatedTime={routeInfo?.lastCalculatedTime}
      />

      {/* Backhaul Notification Banner if available */}
      {backhaul.length > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase">
            <span>🔄 SMART BACKHAUL OPPORTUNITY DETECTED</span>
          </div>
          <p className="text-xs text-emerald-800 font-medium">
            {backhaul[0].description} (Save up to {backhaul[0].discountPct}% on transport freight).
          </p>
        </div>
      )}

      {/* Transporter Discovery & Options List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-agri-950">Matched Transporter Options</h2>
          <span className="text-xs font-bold text-slate-500">{verifiedMessage}</span>
        </div>

        {transportOptions.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">
              No verified transporter currently available for this route.
            </p>
            <p className="text-xs text-slate-400">
              All 36 Indian States and UTs are supported. Try adjusting vehicle size or location.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {transportOptions.map((opt) => {
              const isSelected = opt.id === selectedOptionId
              const isVerified = opt.verificationStatus === "UZHAVAN_VERIFIED"
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`p-5 rounded-3xl bg-white border-2 transition cursor-pointer ${
                    isSelected ? "border-agri-600 shadow-md" : "border-slate-100 hover:border-agri-200"
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{opt.vehicleType}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {opt.verificationStatus || "UNVERIFIED"}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black">
                          {opt.quoteType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 font-semibold">
                        Capacity: {opt.capacityKg.toLocaleString()} kg · Travel ETA: {opt.estimatedTravelTimeHours || 4} hrs · Speed: {opt.averageSpeedKmh} km/h
                      </p>

                      {opt.scoreExplanation && (
                        <p className="text-xs text-agri-700 font-bold mt-2 bg-agri-50 p-2 rounded-xl border border-agri-100">
                          💡 {opt.scoreExplanation}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black text-agri-700">
                        ₹{opt.estimatedCost?.toLocaleString("en-IN")}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOptionId(opt.id)
                          navigate("/farmer/decision")
                        }}
                        className={`mt-2 px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          isSelected
                            ? "bg-agri-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ Applied to Decision" : "Select Option"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
