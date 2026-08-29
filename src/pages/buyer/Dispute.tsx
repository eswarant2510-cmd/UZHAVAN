import { useState } from "react"

export default function Dispute() {
  const [reason, setReason] = useState("")

  const [desc, setDesc] = useState("")

  const [raised, setRaised] = useState(false)

  function submit() {
    setRaised(true)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold">Raise Dispute</h1>
      <div className="rounded-2xl bg-white border border-agri-100 p-4">
        <label className="block">
          <span className="text-sm font-bold">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full min-h-12 rounded-2xl border border-agri-200 px-4 bg-agri-50"
          >
            <option value="">Select</option>
            <option>Quantity mismatch</option>
            <option>Quality issue</option>
            <option>Damaged produce</option>
            <option>Late delivery</option>
            <option>Other</option>
          </select>
        </label>
        <label className="block mt-3">
          <span className="text-sm font-bold">Description</span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="mt-1 w-full min-h-20 rounded-2xl border border-agri-200 px-4 bg-agri-50"
          />
        </label>
        <div className="mt-3">
          <button
            onClick={submit}
            className="px-4 py-2 rounded-2xl bg-agri-500 text-white font-bold"
          >
            Raise Dispute
          </button>
        </div>
        {raised && (
          <p className="text-slate-600 mt-3">
            🔐 Payment remains protected while dispute is reviewed.
          </p>
        )}
      </div>
    </div>
  )
}
