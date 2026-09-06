import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { inrCompact } from "../../lib/format"
import type { NetRealisationResult } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"

export default function CompareOptions() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<NetRealisationResult[] | null>(null)

  useEffect(() => {
    farmerApi.getRankedOffers(500).then(setRows)
  }, [])

  if (!rows)
    return <div className="h-40 rounded-2xl bg-agri-100 animate-pulse" />

  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Compare Options
      </h1>
      <p className="text-slate-500 mb-6">
        Ranked by Net Realisation Engine for 500 kg Tomato.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.offerId}
            className={`rounded-2xl p-5 bg-white border ${
              row.recommended
                ? "border-agri-400 ring-2 ring-agri-200"
                : "border-agri-100"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xl font-extrabold text-agri-950">
                {row.buyerName} {row.verified ? "✓" : ""}
              </p>
              {row.recommended && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-agri-100 text-agri-800">
                  BEST
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              <span>Offer {inrCompact(row.offerPricePerKg)}/kg</span>
              <span>Transport -{inrCompact(row.transportCost)}</span>
              <span>Risk {row.buyerRisk}</span>
              <span className="font-extrabold text-agri-700">
                Net {inrCompact(row.net)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/farmer/orders")}
        className="mt-6 min-h-12 px-6 rounded-2xl bg-agri-500 text-white font-bold"
      >
        Continue to Order
      </button>
    </div>
  )
}
