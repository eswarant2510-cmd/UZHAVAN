import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import type { SmartLot } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"

export default function SmartLots() {
  const navigate = useNavigate()
  const [lots, setLots] = useState<SmartLot[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    farmerApi
      .getLots()
      .then(setLots)
      .catch(() => setError("Could not load lots."))
  }, [])

  if (error) {
    return (
      <div className="rounded-3xl bg-white border border-red-100 p-8 text-center max-w-md mx-auto my-10 shadow-lg">
        <p className="text-red-650 font-bold mb-4">{error}</p>
        <button
          className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Retry load
        </button>
      </div>
    )
  }

  if (!lots) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded bg-green-100 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-green-50 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!lots.length) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-[#a7e4b0]/70 p-8 max-w-md mx-auto">
        <span className="text-5xl block mb-4">🚜</span>
        <h2 className="text-xl font-extrabold text-[#122b16] mb-2">
          No Smart Lots created yet
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Add your current stock of Tomato, Onion, Potato, or other crops to get
          matched with buyers.
        </p>
        <button
          onClick={() => navigate("/farmer/lots/new")}
          className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition shadow-md cursor-pointer"
        >
          ➕ Create Smart Lot
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b16]">
            My Smart Lots
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Displaying your registered harvest stock lots ({lots.length})
          </p>
        </div>
        <button
          onClick={() => navigate("/farmer/lots/new")}
          className="px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition shadow-md cursor-pointer"
        >
          ➕ New Lot
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lots.map((lot) => {
          const statusColors = {
            active: { bg: "#edf9f0", text: "#2e7d3a", label: "Active" },
            sold: { bg: "#eff6ff", text: "#1d4ed8", label: "Sold" },
            in_transit: { bg: "#fff7ed", text: "#c2410c", label: "In Transit" },
            cancelled: { bg: "#f3f4f6", text: "#6b7280", label: "Cancelled" },
          }[lot.status || "active"]

          const availableDateText = lot.expectedSellingDate
            ? new Date(lot.expectedSellingDate).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "N/A"

          return (
            <div
              key={lot.id}
              onClick={() => navigate(`/farmer/lots/${lot.id}`)}
              className="bg-white border border-[#a7e4b0]/40 rounded-3xl overflow-hidden hover:shadow-lg transition duration-200 cursor-pointer flex flex-col group"
            >
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img
                  src={
                    lot.imageUrl ||
                    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&h=350&fit=crop&auto=format"
                  }
                  alt={lot.crop}
                  className="w-full h-full object-cover group-hover:scale-104 transition duration-250"
                />
                <span
                  className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm"
                  style={{
                    background: statusColors.bg,
                    color: statusColors.text,
                  }}
                >
                  {statusColors.label}
                </span>
                <span className="absolute bottom-3 right-3 text-[10px] font-extrabold px-2 py-1 rounded bg-black/60 text-white uppercase tracking-wider backdrop-blur-sm">
                  #{lot.id}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-[#122b16] text-lg">
                    {lot.crop}{" "}
                    {lot.variety && (
                      <span className="text-sm font-semibold text-slate-500">
                        ({lot.variety})
                      </span>
                    )}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-600 font-semibold font-mono">
                    <p className="flex items-center gap-1.5">
                      <span>⚖️</span> {lot.quantityKg.toLocaleString()}{" "}
                      {lot.unit || "kg"}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <span>📍</span> {lot.location}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>📅</span> Available: {availableDateText}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 text-[#2e7d3a] font-bold text-xs">
                  <span>View details & actions</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
