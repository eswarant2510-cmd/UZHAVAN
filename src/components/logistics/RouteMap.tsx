import React from "react"
import type { LocationDetails } from "../../lib/types"
import { getGoogleMapsNavigationUrl } from "../../services/googleMapsService"

interface RouteMapProps {
  origin: LocationDetails | string
  destination: LocationDetails | string
  distanceKm?: number
  etaFormatted?: string
  transporterGps?: { lat: number; lng: number; lastUpdated?: string }
  dataSource?: string
  lastCalculatedTime?: string
  height?: string
}

export default function RouteMap({
  origin,
  destination,
  distanceKm = 42,
  etaFormatted = "4 hrs",
  transporterGps,
  dataSource = "Estimate",
  lastCalculatedTime,
  height = "260px",
}: RouteMapProps) {
  const originStr = typeof origin === "string" ? origin : origin.formattedAddress
  const destStr = typeof destination === "string" ? destination : destination.formattedAddress
  const navUrl = getGoogleMapsNavigationUrl(origin, destination)

  return (
    <div className="rounded-3xl border border-agri-200 overflow-hidden bg-white shadow-sm font-sans">
      {/* Map Header Status Banner */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold tracking-wide">
            {transporterGps ? "LIVE SHIPMENT TRACKING ACTIVE" : "ROUTE OVERVIEW"}
          </span>
        </div>
        <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-3">
          <span>Source: <strong className="text-white">{dataSource}</strong></span>
          {lastCalculatedTime && <span>Updated: {lastCalculatedTime}</span>}
        </div>
      </div>

      {/* Visual Route Canvas Representation */}
      <div
        className="relative bg-slate-950 p-6 flex flex-col justify-between overflow-hidden"
        style={{ height }}
      >
        {/* Subtle SVG Grid & Route Line */}
        <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Animated Route Path */}
          <path
            d="M 60 180 Q 200 40 450 140"
            fill="none"
            stroke="#22c55e"
            strokeWidth="4"
            strokeDasharray="8 6"
            className="animate-pulse"
          />
        </svg>

        {/* Top Info Overlay */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 shadow-lg text-slate-900">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Road Distance</p>
            <p className="text-lg font-black text-agri-700">{distanceKm} km</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 shadow-lg text-slate-900 text-right">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Estimated Transit ETA</p>
            <p className="text-lg font-black text-emerald-700">{etaFormatted}</p>
          </div>
        </div>

        {/* Transporter Live GPS Pin Overlay if active */}
        {transporterGps && (
          <div className="relative z-10 self-center bg-emerald-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1.5 animate-bounce">
            <span>🚚</span>
            <span>Carrier GPS: {transporterGps.lat.toFixed(3)}, {transporterGps.lng.toFixed(3)}</span>
          </div>
        )}

        {/* Bottom Origin and Destination Badges */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-white">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-extrabold uppercase">
              <span>📍 Pickup (Farmer)</span>
            </div>
            <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{originStr}</p>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-white">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-extrabold uppercase">
              <span>🏁 Destination (Buyer)</span>
            </div>
            <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{destStr}</p>
          </div>
        </div>
      </div>

      {/* Navigation External Action Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <span className="text-xs text-slate-500 font-medium">
          Route optimized for agricultural freight transit
        </span>
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-agri-600 hover:bg-agri-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-xs"
        >
          <span>🗺️ Open in Google Maps</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  )
}
