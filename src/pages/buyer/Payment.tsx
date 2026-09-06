import { useState } from "react"

import { useNavigate, useSearchParams } from "react-router"

export default function Payment() {
  const [method, setMethod] = useState("UPI")

  const [paid, setPaid] = useState(false)

  const [search] = useSearchParams()

  const navigate = useNavigate()

  const lot = search.get("lot") ?? "LW001"

  const total = 16200

  function pay() {
    setPaid(true)

    setTimeout(() => navigate(`/dashboard/buyer/orders`), 1200)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold">Payment — {lot}</h1>
      <div className="rounded-2xl bg-white border border-agri-100 p-4">
        <p className="text-sm text-slate-500">Order: Tomato — 500 kg</p>
        <div className="mt-2 flex justify-between items-center">
          <div>
            <p className="text-sm">Price</p>
            <p className="text-lg font-extrabold">₹31/kg</p>
          </div>
          <div>
            <p className="text-sm">Transport</p>
            <p className="text-lg font-extrabold">₹700</p>
          </div>
          <div>
            <p className="text-sm">Total</p>
            <p className="text-lg font-extrabold">₹{total}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-bold mb-2">Payment method</p>
          <div className="flex gap-2">
            {["UPI", "Card", "Net Banking"].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-2 rounded-xl ${
                  method === m ? "bg-agri-500 text-white" : "bg-agri-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {!paid ? (
            <button
              onClick={pay}
              className="w-full px-4 py-3 rounded-2xl bg-agri-500 text-white font-bold"
            >
              Pay Securely
            </button>
          ) : (
            <div className="text-center text-green-700 font-bold">
              ✓ Payment Successful — Funds held in Escrow
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          DEMO ESCROW — NO REAL MONEY. Payment will be released after delivery
          verification.
        </p>
      </div>
    </div>
  )
}
