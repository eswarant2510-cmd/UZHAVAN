import { useState } from "react"
import TrustScoreCard from "../../components/TrustScoreCard"

export default function BuyerProfile() {
  const [name, setName] = useState("Acme Foods")

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold">Profile</h1>
      <div className="rounded-2xl bg-white border p-4 mt-4">
        <label className="block">
          <span className="text-sm">Business name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full min-h-12 rounded-2xl border border-agri-200 px-4 bg-agri-50"
          />
        </label>
        <p className="text-sm text-slate-500 mt-3">Buyer verified ✓</p>
        <p className="text-sm text-slate-500 mt-1">
          Location: Pune, Maharashtra
        </p>
      </div>

      <TrustScoreCard
        role="buyer"
        phone="9876500001"
        title="BUYER TRUST"
        helperText="Derived from verified purchases, successful payment history, and dispute outcomes."
      />
    </div>
  )
}
