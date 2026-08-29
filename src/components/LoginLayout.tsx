import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import {
  DEMO_TRANSPORT_COMPANIES,
  saveSession,
  supabaseSignInWithMockOtp,
} from "../lib/auth"
import type { UserRole } from "../lib/types"

interface LoginLayoutProps {
  role: string
  subtitle: string
  accentHex: string
  accentLight: string
  accentBorder: string
  bgImage: string
  bgImageAlt: string
  icon: ReactNode
  features: { icon: string text: string }[]
  quote: string
  quoteAuthor: string
  formTitle?: string
  otpLabel?: string
  showCreateAccount?: boolean
}

export default function LoginLayout({
  role,
  subtitle,
  accentHex,
  accentLight,
  accentBorder,
  bgImage,
  bgImageAlt,
  icon,
  features,
  quote,
  quoteAuthor,
  formTitle,
  showCreateAccount = false,
}: LoginLayoutProps) {
  const navigate = useNavigate()
  const userRole = role.toLowerCase() as UserRole

  // Prepopulate default phone based on role
  let defaultPhone = "9876500001" // Buyer
  if (userRole === "transport") {
    const firstTransport = DEMO_TRANSPORT_COMPANIES[0]
    defaultPhone = firstTransport.phone
  } else if (userRole === "admin") defaultPhone = "9876500003"

  const [phone, setPhone] = useState(defaultPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transportCompanies =
    userRole === "transport" ? DEMO_TRANSPORT_COMPANIES : []

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanPhone = phone.replace(/\s/g, "") || defaultPhone

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit phone number")
      return
    }

    setLoading(true)

    // Save locally immediately
    saveSession(userRole, cleanPhone)

    // Sync Supabase in background
    supabaseSignInWithMockOtp(cleanPhone, userRole).catch(() => {})

    // Navigate directly without waiting or loading screens
    setLoading(false)
    navigate(`/dashboard/${userRole}`)
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
          src={bgImage}
          alt={bgImageAlt}
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

        {/* Role badge + features */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: accentLight, color: accentHex }}
            >
              {icon}
            </div>
            <div>
              <div
                className="text-xs font-semibold tracking-widest mb-0.5"
                style={{ color: accentHex }}
              >
                {role.toUpperCase()} PORTAL
              </div>
              <div
                className="text-white text-xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {subtitle}
              </div>
            </div>
          </div>

          <ul className="space-y-3 mb-10">
            {features.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{f.icon}</span>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  {f.text}
                </span>
              </li>
            ))}
          </ul>

          <blockquote
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              className="text-sm italic mb-2"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-display)",
              }}
            >
              "{quote}"
            </p>
            <cite
              className="text-xs not-italic"
              style={{ color: "rgba(107,201,122,0.8)" }}
            >
              — {quoteAuthor}
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
                border: `1px solid ${accentBorder}`,
                boxShadow: `0 8px 40px -8px rgba(0,0,0,0.10), 0 0 0 1px ${accentBorder}40`,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-7">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: accentLight, color: accentHex }}
                >
                  {icon}
                </div>
                <div>
                  <h1
                    className="text-lg font-bold"
                    style={{ color: "#122b16" }}
                  >
                    {formTitle ?? `${role} Demo Login`}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    SIH Demo Access: Skip credentials validation
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 tracking-wide text-slate-700">
                    Phone / ID
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="w-4 h-4"
                        stroke="#9ca3af"
                        strokeWidth="1.7"
                      >
                        <path
                          d="M2 3.5A1.5 1.5 0 013.5 2h.878a1.5 1.5 0 011.414 1l.763 2.29a1.5 1.5 0 01-.34 1.547l-.757.758A9.062 9.062 0 009.75 13.5l.758-.757a1.5 1.5 0 011.547-.34l2.29.762A1.5 1.5 0 0115.5 14.5v.878A1.5 1.5 0 0114 17C7.373 17 2 11.627 2 5v-1.5z"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876500001"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all font-sans font-medium"
                      style={{
                        border: `1.5px solid ${accentBorder}`,
                        background: accentLight,
                        color: "#111827",
                      }}
                    />
                  </div>
                </div>

                {userRole === "transport" && transportCompanies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Demo transport partners
                    </p>
                    <div className="grid gap-2">
                      {transportCompanies.map((company) => {
                        const isSelected = phone === company.phone

                        return (
                          <button
                            key={company.phone}
                            type="button"
                            onClick={() => {
                              setPhone(company.phone)
                              setError(null)
                            }}
                            className="w-full rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer"
                            style={{
                              borderColor: isSelected ? accentHex : accentBorder,
                              background: isSelected ? accentLight : "#fff",
                              boxShadow: isSelected
                                ? `0 0 0 1px ${accentHex}40`
                                : "none",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-slate-800">
                                  {company.name}
                                </div>
                                <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                                  {company.location}
                                </div>
                              </div>
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{
                                  color: accentHex,
                                  background: accentLight,
                                }}
                              >
                                {company.phone}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500 leading-relaxed font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-xl select-none">
                  💡 Clicking the button below will instantly log you in to the
                  SIH {role} portal.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-1 cursor-pointer"
                  style={{
                    background: loading ? "#9ca3af" : accentHex,
                    boxShadow: loading
                      ? "none"
                      : `0 4px 16px -4px ${accentHex}70`,
                  }}
                >
                  {loading ? "Logging in..." : `Access ${role} Dashboard`}
                </button>
              </form>

              {showCreateAccount ? (
                <p className="text-center text-xs text-slate-400 mt-5 select-none">
                  New {role}?{" "}
                  <button
                    className="font-semibold"
                    style={{ color: accentHex }}
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-slate-400 mt-5 select-none">
                  New to UZHAVAN?{" "}
                  <button
                    className="font-semibold"
                    style={{ color: accentHex }}
                  >
                    Register here
                  </button>
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap select-none">
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
