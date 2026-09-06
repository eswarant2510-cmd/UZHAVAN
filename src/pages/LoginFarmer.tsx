import { useState } from "react"
import { useNavigate } from "react-router"
import { supabaseSignInWithMockOtp, saveSession, ALLOWED_FARMER_LOGINS, isAllowedFarmerLogin } from "../lib/auth"

export default function LoginFarmer() {
  const navigate = useNavigate()
  const [loginNum, setLoginNum] = useState<string>("588")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanLogin = loginNum.trim()

    if (!isAllowedFarmerLogin(cleanLogin)) {
      setError("Access Denied: Only authorized farmer login numbers (588, 553, 590, 137) are allowed.")
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabaseSignInWithMockOtp(cleanLogin, "farmer")
      if (authError) {
        setError(authError.message || "Failed to authenticate with Supabase Auth.")
        setLoading(false)
        return
      }
      setLoading(false)
      navigate("/farmer")
    } catch (err: any) {
      setError(err?.message || "Authentication error.")
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "var(--font-body)", background: "#f0faf2" }}
    >
      {/* Left panel — illustration */}
      <div
        className="hidden lg:flex lg:w-[46%] relative flex-col overflow-hidden"
        style={{ background: "#0b1f0e" }}
      >
        <img
          src="https://images.unsplash.com/photo-1627475320102-d73fcb4eb427?w=900&h=1200&fit=crop&auto=format"
          alt="Indian farmer standing in a lush green agricultural field"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, rgba(11,31,14,0.55) 0%, rgba(11,31,14,0.82) 60%, rgba(11,31,14,0.96) 100%)`,
          }}
        />

        {/* Back + logo */}
        <div className="relative z-10 p-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 5l-5 5 5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to Home
          </button>
          <div className="text-white font-extrabold tracking-widest text-base">
            UZHAVAN
          </div>
        </div>

        {/* Info quote */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
          <blockquote
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              className="text-sm italic mb-2 rgb(255,255,255)"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-display)",
              }}
            >
              "Strict ownership ensures that only authorized farmers manage their respective farm lots."
            </p>
            <cite
              className="text-xs not-italic"
              style={{ color: "rgba(107,201,122,0.8)" }}
            >
              — UZHAVAN Security Policy
            </cite>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div
          className="lg:hidden flex items-center justify-between px-5 py-4"
          style={{
            background: "#0b1f0e",
            borderBottom: "1px solid rgba(107,201,122,0.15)",
          }}
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm cursor-pointer"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 5l-5 5 5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
          <div className="text-white font-extrabold tracking-widest text-base">
            UZHAVAN
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {/* Form card */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: "white",
                border: "1px solid #a7e4b0",
                boxShadow:
                  "0 8px 40px -8px rgba(0,0,0,0.10), 0 0 0 1px rgba(167,228,176,0.25)",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold bg-[#edf9f0] text-[#2e7d3a]">
                  🌾
                </div>
                <div>
                  <h1
                    className="text-lg font-bold"
                    style={{ color: "#122b16" }}
                  >
                    Farmer Login
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Strict Ownership & Access Control Active
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide text-slate-700">
                    Farmer Login Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter login number (588, 553, 590, 137)"
                    value={loginNum}
                    onChange={(e) => setLoginNum(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all font-mono font-bold"
                    style={{
                      border: "1.5px solid #a7e4b0",
                      background: "#edf9f0",
                      color: "#111827",
                    }}
                  />
                </div>

                {/* Quick Select Buttons */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Authorized Farmer Identities:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALLOWED_FARMER_LOGINS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLoginNum(id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                          loginNum.trim() === id
                            ? "bg-[#2e7d3a] text-white border-[#2e7d3a] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-green-50"
                        }`}
                      >
                        <span>Farmer #{id}</span>
                        <span className="text-[10px] opacity-80">
                          {id === "588" ? "Patel" : id === "558" ? "Kumar" : id === "590" ? "Singh" : "Rao"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-xl select-none">
                  🔒 Authenticated as Farmer #{loginNum.trim() || "588"}. You can only edit, cancel, or delete lots created by your login identity.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-1 cursor-pointer"
                  style={{
                    background: loading ? "#9ca3af" : "#2e7d3a",
                    boxShadow: loading
                      ? "none"
                      : "0 4px 16px -4px rgba(46,125,58,0.44)",
                  }}
                >
                  {loading ? "Logging in..." : `Login as Farmer #${loginNum.trim() || "588"}`}
                </button>
              </form>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
              {["🔒 Secured", "✅ Verified Platform", "🇮🇳 Made in India"].map(
                (b) => (
                  <span
                    key={b}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: "#edf9f0", color: "#276632" }}
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
