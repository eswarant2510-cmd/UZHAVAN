import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import type { PriceAlert } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"

export default function Notifications() {
  const navigate = useNavigate()
  const [alert, setAlert] = useState<PriceAlert | null | undefined>(undefined)

  useEffect(() => {
    farmerApi.getAlert().then(setAlert)
  }, [])

  if (alert === undefined)
    return <div className="h-32 rounded-2xl bg-agri-100 animate-pulse" />
  if (!alert) return <p className="text-slate-500">No notifications.</p>

  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Notifications
      </h1>
      <div
        className="rounded-3xl p-6 border border-amber-200"
        style={{ background: "#fffbeb" }}
      >
        <p className="text-4xl mb-2">🔔</p>
        <p className="text-xl font-extrabold text-amber-900">{alert.title}</p>
        <p className="text-amber-800 mt-1">{alert.message}</p>
        <button
          onClick={() => navigate("/farmer/market")}
          className="mt-5 min-h-12 px-6 rounded-2xl bg-amber-500 text-white font-bold"
        >
          View Details
        </button>
      </div>
    </div>
  )
}
