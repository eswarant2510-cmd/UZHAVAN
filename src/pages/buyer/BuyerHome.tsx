import { useEffect, useState } from "react"

import { useNavigate } from "react-router"

import { getAuthProfile } from "../../lib/auth"
import { greetingFor, inrCompact } from "../../lib/format"

import { farmerApi } from "../../services/farmerApi"

export default function BuyerHome() {
  const navigate = useNavigate()
  const [lots, setLots] = useState<any[]>([])
  const [kpis, setKpis] = useState({
    lots: 0,
    orders: 0,
    purchases: 0,
    transit: 0,
  })

  useEffect(() => {
    async function loadBuyerStats() {
      const [availableLots, orders, profile] = await Promise.all([
        farmerApi.getLots(),
        farmerApi.getOrders(),
        getAuthProfile(),
      ])

      setLots(availableLots.slice(0, 3))

      const buyerPhone = profile?.phone || ""
      const buyerOrders = orders.filter((order) => order.buyerPhone === buyerPhone)
      const activeOrderCount = buyerOrders.filter(
        (order) =>
          order.status !== "COMPLETED" &&
          order.status !== "DELIVERED" &&
          order.status !== "CANCELLED",
      ).length

      const totalPurchases = buyerOrders.reduce((sum, order) => {
        const amount = Number(order.amount || 0)
        return order.buyerPhone === buyerPhone ? sum + amount : sum
      }, 0)

      const transitCount = buyerOrders.filter((order) =>
        ["IN_TRANSIT", "PICKUP_CONFIRMED", "TRANSPORT_ACCEPTED"].includes(
          order.status,
        ),
      ).length

      setKpis({
        lots: availableLots.length,
        orders: activeOrderCount,
        purchases: totalPurchases,
        transit: transitCount,
      })
    }

    void loadBuyerStats()
  }, [])

  const hasLots = lots.length > 0

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-agri-500 mb-1">
            BUYER PORTAL
          </p>
          <h1
            className="text-3xl sm:text-4xl font-light text-agri-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greetingFor()}! 👋
          </h1>
          <p className="text-slate-500">Welcome back</p>
        </div>
        <div className="flex gap-3">
          <button className="min-h-12 px-5 rounded-2xl bg-agri-500 text-white font-bold">
            Find Produce
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon="📦" label="Available Lots" value={String(kpis.lots)} />
        <Kpi icon="🌾" label="Active Orders" value={String(kpis.orders)} />
        <Kpi
          icon="💰"
          label="Total Purchases"
          value={inrCompact(kpis.purchases)}
        />
        <Kpi icon="🚚" label="In Transit" value={String(kpis.transit)} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-agri-900 mb-3">
          Recommended for you
        </h2>

        {!hasLots ? (
          <div className="rounded-3xl border border-dashed border-agri-200 bg-white p-8 text-center">
            <div className="text-4xl mb-3">🌾</div>
            <p className="text-xl font-extrabold text-agri-950 mb-1">
              No lots available
            </p>
            <p className="text-slate-500">
              Farmer-listed produce will appear here once new lots are uploaded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lots.map((lot) => (
              <div
                key={lot.id}
                className="rounded-2xl bg-white border border-agri-100 overflow-hidden"
              >
                <img
                  src={lot.imageUrl}
                  alt={lot.crop}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-lg font-extrabold">{lot.crop}</p>
                  <p className="text-sm text-slate-500">
                    {lot.quantityKg} {lot.unit || "kg"} · {lot.location}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        {lot.quality?.label || "Fresh produce"}
                      </p>
                      <p className="text-xl font-extrabold text-agri-600 mt-1">
                        ₹{Number(lot.expectedNetPerKg || 0).toLocaleString("en-IN")}/kg
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/dashboard/buyer/lots/${lot.id}`)}
                      className="min-h-10 px-4 rounded-2xl bg-agri-500 text-white font-bold"
                    >
                      View Lot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-agri-100 p-4 text-left shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl sm:text-3xl font-extrabold text-agri-950 leading-tight">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-slate-500 mt-1">{label}</div>
    </div>
  )
}
