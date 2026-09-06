import { useState } from "react"

import { useNavigate, useParams } from "react-router"

import { inr } from "../../lib/format"

export default function MakeOffer() {
  const { lotId } = useParams()

  const navigate = useNavigate()

  const [price, setPrice] = useState<number | "">("")

  const [qty, setQty] = useState<number | "">("")

  const [status, setStatus] =
    useState<"idle" | "pending" | "accepted" | "rejected">("idle")

  function sendOffer() {
    setStatus("pending")

    setTimeout(() => setStatus("pending"), 800)

    setTimeout(() => setStatus("idle"), 2200)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold text-agri-900">
        Make Offer — Lot {lotId}
      </h1>
      <div className="rounded-2xl bg-white border border-agri-100 p-4">
        <p className="text-sm text-slate-500">
          Farmer asking price: <span className="font-bold">{inr(31)}/kg</span>
        </p>
        <label className="block mt-3">
          <span className="text-sm font-bold text-agri-800">
            Your offer (₹/kg)
          </span>
          <input
            type="number"
            value={price as any}
            onChange={(e) =>
              setPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full min-h-12 rounded-2xl border border-agri-200 px-4 bg-agri-50"
          />
        </label>
        <label className="block mt-3">
          <span className="text-sm font-bold text-agri-800">
            Required quantity (kg)
          </span>
          <input
            type="number"
            value={qty as any}
            onChange={(e) =>
              setQty(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full min-h-12 rounded-2xl border border-agri-200 px-4 bg-agri-50"
          />
        </label>

        <div className="mt-4 flex gap-3">
          <button
            onClick={sendOffer}
            className="px-5 py-3 rounded-2xl bg-agri-500 text-white font-bold"
          >
            Send Offer
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-2xl border-2 border-agri-200 font-bold"
          >
            Cancel
          </button>
        </div>

        {status === "pending" && (
          <p className="text-sm text-slate-500 mt-3">Offer status: Pending</p>
        )}
        {status === "accepted" && (
          <p className="text-sm text-green-600 mt-3">Offer accepted</p>
        )}
        {status === "rejected" && (
          <p className="text-sm text-red-600 mt-3">Offer rejected</p>
        )}
      </div>
    </div>
  )
}
