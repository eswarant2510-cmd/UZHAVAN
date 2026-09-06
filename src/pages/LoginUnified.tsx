import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  ALLOWED_FARMER_LOGINS,
  ALLOWED_BUYER_LOGINS,
  isAllowedFarmerLogin,
  isAllowedBuyerLogin,
  supabaseSignInWithMockOtp,
  getAuthProfile,
  readSession,
} from "../lib/auth"
import type { UserRole } from "../lib/types"

export default function LoginUnified() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRole = (searchParams.get("role") || "farmer").toLowerCase() as "farmer" | "buyer"
  
  const [selectedRole, setSelectedRole] = useState<"farmer" | "buyer">(
    initialRole === "buyer" ? "buyer" : "farmer"
  )
  const [idInput, setIdInput] = useState<string>("588")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = (role: "farmer" | "buyer") => {
    setSelectedRole(role)
    setError(null)
    if (role === "farmer") {
      setIdInput("588")
    } else {
      setIdInput("136")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanId = idInput.trim()

    if (!cleanId) {
      setError("Please enter a valid UZHAVAN login ID.")
      return
    }

    // Role validation check against expected demo IDs
    const isFarmerId = isAllowedFarmerLogin(cleanId)
    const isBuyerId = isAllowedBuyerLogin(cleanId)

    if (!isFarmerId && !isBuyerId) {
      setError("Invalid UZHAVAN login ID. Please enter a valid demo ID.")
      return
    }

    if (selectedRole === "farmer" && isBuyerId && !isFarmerId) {
      setError("This account is registered as a Buyer. Please select Buyer.")
      return
    }

    if (selectedRole === "buyer" && isFarmerId && !isBuyerId) {
      setError("This account is registered as a Farmer. Please select Farmer.")
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabaseSignInWithMockOtp(cleanId, selectedRole)
      if (authError) {
        setError("Unable to authenticate this account. Please try again.")
        setLoading(false)
        return
      }

      // Check authoritative profile or session
      const profile = await getAuthProfile()
      const effectiveRole = profile?.role || readSession()?.role || selectedRole

      setLoading(false)
      if (effectiveRole === "farmer") {
        navigate("/farmer")
      } else if (effectiveRole === "buyer") {
        navigate("/dashboard/buyer")
      } else {
        navigate(`/dashboard/${effectiveRole}`)
      }
    } catch {
      setError("Unable to authenticate this account. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 select-none"
      style={{
        fontFamily: "var(--font-body)",
        background: "linear-gradient(135deg, #0b1f0e 0%, #173d1c 50%, #0b1f0e 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Branding Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2e7d3a] to-[#3da64e] shadow-xl mb-4 text-3xl">
            🌱
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">
            UZHAVAN
          </h1>
          <p className="text-xs font-semibold text-emerald-400 tracking-wider mt-1">
            Digital Agricultural Marketplace
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-3xl p-8 backdrop-blur-xl border border-white/20 shadow-2xl"
          style={{ background: "rgba(255, 255, 255, 0.95)" }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Select your role and enter your Demo / User ID
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection Toggle */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Select Portal Role
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleRoleChange("farmer")}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === "farmer"
                      ? "bg-[#2e7d3a] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>👨‍🌾</span>
                  <span>Farmer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange("buyer")}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === "buyer"
                      ? "bg-[#2563eb] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🛒</span>
                  <span>Buyer</span>
                </button>
              </div>
            </div>

            {/* Demo / User ID Input */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Demo / User ID
              </label>
              <input
                type="text"
                placeholder={selectedRole === "farmer" ? "e.g. 588" : "e.g. 136"}
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none font-mono font-bold transition-all border-2"
                style={{
                  borderColor: selectedRole === "farmer" ? "#a7e4b0" : "#bfdbfe",
                  background: selectedRole === "farmer" ? "#edf9f0" : "#eff6ff",
                  color: "#0f172a",
                }}
              />
            </div>

            {/* Quick Demo ID Selector Buttons */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Demo {selectedRole === "farmer" ? "Farmers" : "Buyers"} Quick Select:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(selectedRole === "farmer"
                  ? ALLOWED_FARMER_LOGINS
                  : ALLOWED_BUYER_LOGINS
                ).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setIdInput(id)}
                    className={`py-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                      idInput.trim() === id
                        ? selectedRole === "farmer"
                          ? "bg-[#2e7d3a] text-white border-[#2e7d3a]"
                          : "bg-[#2563eb] text-white border-[#2563eb]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    #{id}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white transition-all shadow-lg cursor-pointer"
              style={{
                background: loading
                  ? "#9ca3af"
                  : selectedRole === "farmer"
                  ? "#2e7d3a"
                  : "#2563eb",
              }}
            >
              {loading ? "Authenticating..." : "LOGIN"}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
              <span>🔒</span>
              <span>Secure login powered by Supabase Auth</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
