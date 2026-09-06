import { useEffect, useState } from "react"

import { useNavigate } from "react-router"

import { farmerApi } from "../../services/farmerApi"

import { inrCompact } from "../../lib/format"

export default function SmartMatch() {
  const navigate = useNavigate()

  const [lots, setLots] = useState<any[] | null>(null)

  useEffect(() => {
    farmerApi.getLots().then(setLots)
  }, [])

  if (!lots)
    return <div className="h-40 rounded-2xl bg-agri-100 animate-pulse" />

  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Recommended Lots
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lots.map((lot, i) => (
          <div
            key={lot.id}
            className={`rounded-2xl bg-white border p-4 flex items-center gap-4 ${
              i === 0 ? "border-agri-300 shadow-sm" : "border-agri-100"
            }`}
          >
            <img
              src={lot.imageUrl}
              alt={lot.crop}
              className="w-28 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-extrabold">{lot.crop}</p>
                  <p className="text-sm text-slate-500">
                    {lot.quantityKg} kg · {lot.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-agri-600">
                    {inrCompact(lot.expectedNetPerKg)}/kg
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-xs px-2 py-1 rounded-full bg-agri-50">
                  Match 96%
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-agri-50">
                  Grade {lot.quality.grade}
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => navigate(`/dashboard/buyer/lots/${lot.id}`)}
                    className="px-4 py-2 rounded-xl bg-agri-500 text-white font-bold"
                  >
                    View Lot
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
