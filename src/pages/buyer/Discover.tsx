import { useEffect, useState } from "react"

import { useNavigate } from "react-router"

import { farmerApi } from "../../services/farmerApi"

import { inrCompact } from "../../lib/format"

export default function Discover() {
  const navigate = useNavigate()

  const [lots, setLots] = useState<any[] | null>(null)

  useEffect(() => {
    farmerApi.getLots().then(setLots)
  }, [])

  if (!lots)
    return <div className="h-40 rounded-2xl bg-agri-100 animate-pulse" />

  if (lots.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-agri-200 bg-white p-10 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-2xl font-extrabold text-agri-950 mb-2">
          No lots available
        </h2>
        <p className="text-slate-500 max-w-md mx-auto">
          There are no farmer-uploaded lots right now. New produce listings will
          appear here as soon as they are posted.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Discover Produce
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lots.map((lot) => (
          <div
            key={lot.id}
            className="rounded-3xl overflow-hidden bg-white border border-agri-100"
          >
            <img
              src={lot.imageUrl}
              alt={lot.crop}
              className="h-48 w-full object-cover"
            />
            <div className="p-4">
              <h3 className="text-2xl font-extrabold text-agri-950">
                {lot.crop}
              </h3>
              <p className="text-slate-500">
                {lot.quantityKg} kg · {lot.location}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{lot.quality.label}</p>
                  <p className="text-xl font-extrabold text-agri-600 mt-1">
                    {inrCompact(lot.expectedNetPerKg)}/kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">✓ Verified Farmer</p>
                  <button
                    onClick={() => navigate(`/dashboard/buyer/lots/${lot.id}`)}
                    className="mt-3 px-4 py-2 rounded-xl bg-agri-500 text-white font-bold"
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
