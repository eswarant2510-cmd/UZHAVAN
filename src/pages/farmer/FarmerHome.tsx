import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { greetingFor } from "../../lib/format"
import type { SmartLot } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"
import { getAuthProfile } from "../../lib/auth"

export default function FarmerHome() {
  const navigate = useNavigate()
  const [lots, setLots] = useState<SmartLot[]>([])
  const [farmerName, setFarmerName] = useState("Farmer")
  const [farmerLocation, setFarmerLocation] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function loadData() {
      try {
        const profile = await getAuthProfile()
        if (profile && alive) {
          setFarmerName(profile.name)
          setFarmerLocation(profile.location)
        }

        const dashboard = await farmerApi.getDashboard()
        if (alive) {
          setLots(dashboard.lots || [])
          setLoading(false)
        }
      } catch (err: any) {
        if (alive) {
          setError("Failed to load dashboard. Please retry.")
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 w-64 rounded-xl bg-green-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl bg-green-100" />
          <div className="h-28 rounded-2xl bg-green-100" />
        </div>
        <div className="h-64 rounded-3xl bg-green-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white border border-red-100 p-8 text-center max-w-md mx-auto my-10 shadow-lg">
        <p className="text-red-650 font-bold mb-4 text-lg">{error}</p>
        <button
          className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-750 text-white font-bold transition cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Retry Load
        </button>
      </div>
    )
  }

  const activeLotsList = lots.filter((l) => l.status === "active")
  const activeCount = activeLotsList.length
  const totalWeight = activeLotsList.reduce((acc, l) => acc + l.quantityKg, 0)

  async function handleDeleteLot(lotId: string) {
    const lotToDelete = lots.find((lot) => lot.id === lotId)
    if (!lotToDelete) return

    const confirmed = window.confirm(
      `Remove ${lotToDelete.crop} lot #${lotToDelete.id} from your dashboard?`,
    )
    if (!confirmed) return

    try {
      await farmerApi.deleteLot(lotId)
      setLots((prev) => prev.filter((lot) => lot.id !== lotId))
    } catch (err: any) {
      setError(err.message || "Unable to remove lot from dashboard.")
    }
  }

  // Sort by date or id descending to show recent first (e.g. standard descending id match)
  const recentLots = [...lots]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 3)

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-r from-[#0f2a14] to-[#1a4422] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-bold tracking-widest text-[#6bc97a] uppercase">
            Farmer Dashboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {greetingFor()}, {farmerName}! 👋
          </h1>
          <p className="text-[#a7e4b0] text-sm font-medium">
            📍 {farmerLocation || "Nashik, Maharashtra"}
          </p>
        </div>
        <button
          onClick={() => navigate("/farmer/lots/new")}
          className="relative z-10 self-start sm:self-center px-6 py-3.5 rounded-2xl text-[#0f2a14] font-extrabold text-base transition-all duration-200 hover:scale-[1.02] shadow-lg cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #6bc97a 0%, #3da64e 100%)",
          }}
        >
          ➕ Create Smart Lot
        </button>
      </header>

      {/* KPI summaries */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-[#a7e4b0] rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-[#edf9f0] flex items-center justify-center text-3xl">
            🌾
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#122b16]">
              {activeCount}
            </div>
            <div className="text-sm text-slate-500 font-medium">
              Active Lots
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#a7e4b0] rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-[#edf9f0] flex items-center justify-center text-3xl">
            ⚖️
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#122b16]">
              {totalWeight.toLocaleString()}{" "}
              <span className="text-lg font-bold">kg</span>
            </div>
            <div className="text-sm text-slate-500 font-medium">
              Total Active Quantity
            </div>
          </div>
        </div>
      </section>

      {/* Recent lots table/cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#122b16]">
            Recent Smart Lots
          </h2>
          {lots.length > 3 && (
            <button
              onClick={() => navigate("/farmer/lots")}
              className="text-[#2e7d3a] hover:text-[#1e5426] text-sm font-bold flex items-center gap-1.5 transition"
            >
              View All Lots ({lots.length}) →
            </button>
          )}
        </div>

        {recentLots.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#a7e4b0]/70 p-12 text-center shadow-inner">
            <span className="text-5xl block mb-4">🚜</span>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              No lots entered yet
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              Create your first verified Smart Lot to post your produce details
              to buyers.
            </p>
            <button
              onClick={() => navigate("/farmer/lots/new")}
              className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition cursor-pointer"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentLots.map((lot) => {
              const statusColors = {
                active: { bg: "#edf9f0", text: "#2e7d3a", label: "Active" },
                sold: { bg: "#eff6ff", text: "#1d4ed8", label: "Sold" },
                in_transit: {
                  bg: "#fff7ed",
                  text: "#c2410c",
                  label: "In Transit",
                },
                cancelled: {
                  bg: "#f3f4f6",
                  text: "#6b7280",
                  label: "Cancelled",
                },
              }[lot.status || "active"]

              return (
                <div
                  key={lot.id}
                  onClick={() => navigate(`/farmer/lots/${lot.id}`)}
                  className="bg-white border border-[#a7e4b0]/60 rounded-3xl overflow-hidden hover:shadow-lg transition duration-200 cursor-pointer flex flex-col group"
                >
                  <div className="h-44 overflow-hidden relative bg-slate-100">
                    <img
                      src={
                        lot.imageUrl ||
                        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&h=350&fit=crop&auto=format"
                      }
                      alt={lot.crop}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className="text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm"
                        style={{
                          background: statusColors.bg,
                          color: statusColors.text,
                        }}
                      >
                        {statusColors.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-[#122b16] text-lg">
                          {lot.crop}{" "}
                          {lot.variety && (
                            <span className="text-sm font-semibold text-slate-500">
                              ({lot.variety})
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-bold uppercase shrink-0">
                          #{lot.id}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-semibold">
                        <p className="flex items-center gap-1.5">
                          <span>⚖️</span> {lot.quantityKg.toLocaleString()}{" "}
                          {lot.unit || "kg"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span>📍</span> {lot.location}
                        </p>
                        {lot.expectedSellingDate && (
                          <p className="flex items-center gap-1.5">
                            <span>📅</span> Sale:{" "}
                            {new Date(
                              lot.expectedSellingDate,
                            ).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/farmer/lots/${lot.id}`)
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-green-200 text-[#2e7d3a] font-bold text-xs transition duration-200 group-hover:bg-[#edf9f0] cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteLot(lot.id)
                        }}
                        className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs transition duration-200 hover:bg-red-50 cursor-pointer"
                        aria-label={`Delete ${lot.crop} lot`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
