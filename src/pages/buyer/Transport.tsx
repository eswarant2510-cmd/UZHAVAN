import { useState, useEffect } from "react"
import LocationPicker from "../../components/common/LocationPicker"
import RouteMap from "../../components/logistics/RouteMap"
import { findMatchingTransporters } from "../../services/transporterService"
import { calculateRouteDetails, type RouteCalculationResult } from "../../services/googleMapsService"
import type { TransportOption, LocationDetails } from "../../lib/types"

export default function BuyerTransport() {
  const [pickupAddress, setPickupAddress] = useState("Nashik Farm, Maharashtra")
  const [pickupDetails, setPickupDetails] = useState<LocationDetails>()
  const [deliveryAddress, setDeliveryAddress] = useState("Mumbai Wholesale Market, Maharashtra")
  const [deliveryDetails, setDeliveryDetails] = useState<LocationDetails>()

  const [quantityKg, setQuantityKg] = useState(1500)
  const [routeInfo, setRouteInfo] = useState<RouteCalculationResult | null>(null)
  const [options, setOptions] = useState<TransportOption[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    loadOptions()
  }, [pickupAddress, deliveryAddress, quantityKg])

  async function loadOptions() {
    const route = await calculateRouteDetails(
      pickupDetails || pickupAddress,
      deliveryDetails || deliveryAddress,
    )
    setRouteInfo(route)

    const result = await findMatchingTransporters({
      pickupLocation: pickupDetails || pickupAddress,
      deliveryLocation: deliveryDetails || deliveryAddress,
      quantityKg,
    })

    setOptions(result.options)
    setMessage(result.message)
    if (result.options.length > 0) {
      setSelectedId(result.options[0].id)
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <p className="text-xs font-bold text-[#ea580c] uppercase tracking-wider">BUYER SHIPMENT LOGISTICS</p>
        <h1 className="text-3xl font-light text-slate-950">Transport & Carrier Options</h1>
        <p className="text-xs text-slate-500 mt-1">
          Vehicle capacity matching and route distance optimization for delivery shipments
        </p>
      </div>

      {/* Location Resolution */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationPicker
            label="Farmer Origin Pickup Location"
            value={pickupAddress}
            locationDetails={pickupDetails}
            onChange={(addr, det) => {
              setPickupAddress(addr)
              setPickupDetails(det)
            }}
          />

          <LocationPicker
            label="Buyer Destination Delivery Address"
            value={deliveryAddress}
            locationDetails={deliveryDetails}
            onChange={(addr, det) => {
              setDeliveryAddress(addr)
              setDeliveryDetails(det)
            }}
          />
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <label className="font-bold text-slate-700">Shipment Load (kg):</label>
          <input
            type="number"
            value={quantityKg}
            onChange={(e) => setQuantityKg(Number(e.target.value))}
            className="w-32 px-3 py-1.5 border rounded-xl bg-slate-50 font-bold"
          />
        </div>
      </div>

      {/* Route Map Visualizer */}
      <RouteMap
        origin={pickupDetails || pickupAddress}
        destination={deliveryDetails || deliveryAddress}
        distanceKm={routeInfo?.distanceKm || 165}
        etaFormatted={routeInfo?.etaFormatted || "4 hrs"}
        dataSource={routeInfo?.dataSource}
        lastCalculatedTime={routeInfo?.lastCalculatedTime}
      />

      {/* Options List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Available Vehicle Options</h2>
          <span className="text-xs font-bold text-slate-500">{message}</span>
        </div>

        {options.length === 0 ? (
          <div className="bg-white border p-8 rounded-3xl text-center text-xs font-bold text-slate-500">
            No verified transporter currently available for this route.
          </div>
        ) : (
          <div className="grid gap-4">
            {options.map((o) => {
              const isSelected = o.id === selectedId
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`rounded-3xl bg-white border-2 p-5 flex flex-wrap items-center justify-between gap-4 transition cursor-pointer ${
                    isSelected ? "border-[#ea580c] shadow-md" : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-extrabold text-slate-900">{o.vehicleType}</p>
                      <span className="text-[9px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-black uppercase">
                        {o.verificationStatus || "UNVERIFIED"}
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black">
                        {o.quoteType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Capacity: {o.capacityKg.toLocaleString()} kg · Travel Time: {o.estimatedTravelTimeHours || 4} hrs
                    </p>

                    {o.scoreExplanation && (
                      <p className="text-xs text-orange-900 bg-orange-50 p-2 rounded-xl border border-orange-100 mt-2 font-bold">
                        💡 {o.scoreExplanation}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-[#ea580c]">
                      ₹{o.estimatedCost?.toLocaleString("en-IN")}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(o.id)
                      }}
                      className={`mt-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition ${
                        isSelected
                          ? "bg-[#ea580c] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "✓ Selected" : "Select Vehicle"}
                    </button>
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
