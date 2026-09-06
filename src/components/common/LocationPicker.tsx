import React, { useState } from "react"
import type { LocationDetails } from "../../lib/types"
import { parseLocationString, getBrowserLocationWithPermission, INDIAN_STATES_AND_UTS } from "../../services/locationService"

interface LocationPickerProps {
  label?: string
  value: string
  locationDetails?: LocationDetails
  onChange: (address: string, details: LocationDetails) => void
  placeholder?: string
}

export default function LocationPicker({
  label = "Location",
  value,
  locationDetails,
  onChange,
  placeholder = "Search town, city, mandi, or district (e.g. Nashik, Maharashtra)",
}: LocationPickerProps) {
  const [loadingGps, setLoadingGps] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const activeDetails = locationDetails || parseLocationString(value)

  function handleTextChange(text: string) {
    const parsed = parseLocationString(text)
    onChange(text, parsed)
  }

  async function handleUseMyLocation() {
    setLoadingGps(true)
    setGpsError(null)

    const confirmed = window.confirm(
      "UZHAVAN requests permission to use your device GPS location to determine pickup/delivery coordinates for transport routing.",
    )

    if (!confirmed) {
      setLoadingGps(false)
      return
    }

    try {
      const details = await getBrowserLocationWithPermission()
      const formatted = details.formattedAddress
      onChange(formatted, details)
    } catch (err: any) {
      setGpsError(err.message || "Failed to retrieve device location.")
    } finally {
      setLoadingGps(false)
    }
  }

  return (
    <div className="space-y-2 font-sans">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-bold text-agri-600 hover:text-agri-700 cursor-pointer"
        >
          {showAdvanced ? "Simple View" : "📍 Details"}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#edf9f0] border border-[#a7e4b0] px-4 py-3.5 pr-28 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#2e7d3a]/25 transition"
        />

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={loadingGps}
          className="absolute right-2 top-2 bottom-2 px-3 bg-white hover:bg-slate-50 border border-agri-200 text-agri-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs disabled:opacity-50"
        >
          {loadingGps ? (
            <span>Locating...</span>
          ) : (
            <>
              <span>🎯</span>
              <span className="hidden sm:inline">Use GPS</span>
            </>
          )}
        </button>
      </div>

      {gpsError && (
        <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-100">
          ⚠️ {gpsError}
        </p>
      )}

      {/* Location Resolution Badges */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
        <span className="bg-agri-50 text-agri-800 border border-agri-150 px-2.5 py-1 rounded-lg">
          State: <strong className="font-extrabold">{activeDetails.state || "Maharashtra"}</strong>
        </span>
        <span className="bg-agri-50 text-agri-800 border border-agri-150 px-2.5 py-1 rounded-lg">
          District: <strong className="font-extrabold">{activeDetails.district || "Nashik"}</strong>
        </span>
        {activeDetails.lat && activeDetails.lng ? (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <span>✓ GPS Pin:</span>
            <strong>
              {activeDetails.lat.toFixed(4)}, {activeDetails.lng.toFixed(4)}
            </strong>
          </span>
        ) : (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
            Coordinates: Estimate
          </span>
        )}
      </div>

      {/* Advanced location details editor */}
      {showAdvanced && (
        <div className="p-4 bg-white border border-agri-100 rounded-2xl space-y-3 mt-2 text-xs">
          <p className="font-bold text-slate-700">Refine Location Breakdown:</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase">State</label>
              <select
                value={activeDetails.state || "Maharashtra"}
                onChange={(e) =>
                  onChange(value, { ...activeDetails, state: e.target.value })
                }
                className="w-full mt-1 p-2 bg-slate-50 border rounded-xl font-semibold"
              >
                {INDIAN_STATES_AND_UTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase">District / City</label>
              <input
                type="text"
                value={activeDetails.district || ""}
                onChange={(e) =>
                  onChange(value, { ...activeDetails, district: e.target.value, city: e.target.value })
                }
                className="w-full mt-1 p-2 bg-slate-50 border rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
