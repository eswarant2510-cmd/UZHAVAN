import { useEffect, useState } from "react"

import { useNavigate, useParams } from "react-router"

import { farmerApi } from "../../services/farmerApi"

import { inr } from "../../lib/format"

export default function LotDetail() {
  const { lotId } = useParams()

  const navigate = useNavigate()

  const [lot, setLot] = useState<any | null>(null)

  useEffect(() => {
    if (!lotId) return

    farmerApi.getLot(lotId).then(setLot)
  }, [lotId])

  if (!lot)
    return <div className="h-64 rounded-3xl bg-agri-100 animate-pulse" />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="rounded-3xl overflow-hidden bg-white border border-agri-100">
        <img
          src={lot.imageUrl}
          alt={lot.crop}
          className="w-full h-64 object-cover"
        />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-agri-950">
                {lot.crop}
              </h1>
              <p className="text-slate-500 mt-1">
                {lot.quantityKg} kg · {lot.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Price</p>
              <p className="text-2xl font-extrabold text-agri-600">
                {inr(lot.expectedNetPerKg, 2)}/kg
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-agri-50 p-4 mt-4">
            <p className="text-sm font-bold text-agri-700">
              AI Visual Assessment
            </p>
            <p className="text-lg font-extrabold text-agri-900 mt-1">
              {lot.quality.label}
            </p>
            <p className="text-sm text-agri-700">
              Confidence: {lot.quality.confidencePct}%
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              {lot.quality.disclaimer}
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate(`/dashboard/buyer/lots/${lot.id}/offer`)}
              className="px-5 py-3 rounded-2xl bg-agri-500 text-white font-bold"
            >
              Make Offer
            </button>
            <button
              onClick={() =>
                navigate(`/dashboard/buyer/payments?lot=${lot.id}`)
              }
              className="px-5 py-3 rounded-2xl border-2 border-agri-200 font-bold"
            >
              Buy Lot
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
