import { useState } from "react"

export default function Delivery() {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold">Delivery Verification</h1>
      <div className="rounded-2xl bg-white border border-agri-100 p-4">
        <p className="text-sm text-slate-500">
          Ordered: 500 kg · Delivered: 500 kg
        </p>
        <p className="mt-3 text-sm font-bold">
          AI quality signal: Grade A — Indicative
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setAccepted(true)}
            className="px-5 py-3 rounded-2xl bg-agri-500 text-white font-bold"
          >
            Accept Delivery
          </button>
          <button className="px-5 py-3 rounded-2xl border-2 border-agri-200 font-bold">
            Raise Dispute
          </button>
        </div>
        {accepted && (
          <p className="text-green-700 font-bold mt-3">
            ✓ Delivery Verified — Payment will be released
          </p>
        )}
      </div>
    </div>
  )
}
