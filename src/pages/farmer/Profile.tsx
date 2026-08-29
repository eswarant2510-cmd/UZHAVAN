import { requireRole } from "../../lib/auth"
import TrustScoreCard from "../../components/TrustScoreCard"

export default function Profile() {
  const user = requireRole("farmer")
  return (
    <div className="max-w-lg space-y-6">
      <h1
        className="text-3xl font-light text-agri-950 mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Profile
      </h1>
      <div className="rounded-3xl bg-white border border-agri-100 p-6">
        <div className="w-16 h-16 rounded-2xl bg-agri-100 flex items-center justify-center text-3xl mb-4">
          👨‍🌾
        </div>
        <p className="text-2xl font-extrabold text-agri-950">{user.name}</p>
        <p className="text-slate-500">{user.location}</p>
        <p className="text-slate-500 mt-1">{user.phone}</p>
        <p className="text-xs font-bold text-agri-500 mt-4">
          Demo farmer profile
        </p>
      </div>

      <TrustScoreCard
        role="farmer"
        phone={user.phone}
        title="FARMER TRUST"
        helperText="Derived from verified orders, mutual verification, dispute outcomes, and delivery history."
      />
    </div>
  )
}
