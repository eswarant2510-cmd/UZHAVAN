import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { inrCompact } from "../../lib/format"
import { fetchTrustSummaryForRole } from "../../lib/trust"
import type { BuyerOffer } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"

export default function BuyersOffers() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<BuyerOffer[] | null>(null)

  useEffect(() => {
    farmerApi.getOffers().then(setOffers)
  }, [])

  if (!offers)
    return <div className="h-40 rounded-2xl bg-agri-100 animate-pulse" />

  return (
    <div>
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Buyers & Offers
      </h1>
      <div className="grid gap-4">
        {offers.map((o) => (
          <div
            key={o.id}
            className="w-full rounded-2xl bg-white border border-agri-100 p-4 flex items-start gap-4"
          >
            <div className="w-16 h-16 rounded-lg bg-agri-50 flex items-center justify-center text-2xl font-bold">
              {o.buyerName.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-extrabold text-agri-950">
                    {o.buyerName}{" "}
                    {o.verified ? (
                      <span className="text-sm text-agri-600">✓</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-slate-500">
                    Requires {"~"}
                    {/* approximate */}
                    {inrCompact(Math.round(500))} kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-agri-600">
                    {inrCompact(o.offerPricePerKg)}/kg
                  </p>
                  <p className="text-xs text-slate-400">
                    {o.distanceKm} km · Transport {inrCompact(o.transportCost)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="text-xs px-2 py-1 rounded-full bg-agri-50">
                  Reliability:{" "}
                  <span className="font-bold">
                    {o.verified ? "Verified Buyer" : "Unverified"}
                  </span>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-agri-50">
                  Risk: {o.buyerRisk}
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-agri-50">
                  🔐 Payment protection
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() =>
                      navigate(
                        o.lotId ? `/farmer/lots/${o.lotId}` : "/farmer/lots",
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-agri-500 text-white font-bold"
                  >
                    View Offer
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
