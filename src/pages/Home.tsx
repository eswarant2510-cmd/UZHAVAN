import { useState } from "react"
import { useNavigate } from "react-router"
import { saveSession, supabaseSignInWithMockOtp } from "../lib/auth"

const ROLES = [
  {
    id: "farmer",
    title: "FARMER",
    accentHex: "#2e7d3a",
    accentLight: "#edf9f0",
    accentBorder: "#a7e4b0",
    description:
      "Create produce lots, check AI market insights, compare buyers and discover the best selling option.",
    image:
      "https://images.unsplash.com/photo-1627475320102-d73fcb4eb427?w=600&h=360&fit=crop&auto=format",
    imageAlt: "Indian farmer standing in a lush green agricultural field",
    path: "/farmer",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M12 2C6.5 2 3 6 3 10c0 3.5 2.5 6.5 6 7.5V21h6v-3.5c3.5-1 6-4 6-7.5C21 6 17.5 2 12 2z"
          strokeLinejoin="round"
        />
        <path d="M9 14c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeLinecap="round" />
        <path d="M12 11V7M8 9l2 1.5M16 9l-2 1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "buyer",
    title: "BUYER",
    accentHex: "#2563eb",
    accentLight: "#eff6ff",
    accentBorder: "#bfdbfe",
    description:
      "Discover verified produce lots, compare offers, place orders and make secure transactions.",
    image:
      "https://images.unsplash.com/photo-1606237906294-ae86d103d715?w=600&h=360&fit=crop&auto=format",
    imageAlt: "Fresh vegetables and produce at an agricultural market",
    path: "/dashboard/buyer",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"
          strokeLinejoin="round"
        />
        <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "transport",
    title: "TRANSPORT",
    accentHex: "#ea580c",
    accentLight: "#fff7ed",
    accentBorder: "#fed7aa",
    description:
      "View delivery requests, manage trips, optimize routes and update delivery status.",
    image:
      "https://images.unsplash.com/photo-1774013603273-03507c48a0e8?w=600&h=360&fit=crop&auto=format",
    imageAlt:
      "Truck driving on a winding road through green agricultural fields",
    path: "/dashboard/transport",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect
          x="1"
          y="3"
          width="15"
          height="13"
          rx="1"
          strokeLinejoin="round"
        />
        <path d="M16 8h4l3 3v5h-7V8z" strokeLinejoin="round" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "admin",
    title: "ADMIN",
    accentHex: "#8b5cf6",
    accentLight: "#f5f3ff",
    accentBorder: "#ddd6fe",
    description:
      "Monitor the ecosystem, verify users, manage transactions and resolve disputes.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=360&fit=crop&auto=format",
    imageAlt: "Analytics dashboard displayed on a laptop screen",
    path: "/dashboard/admin",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const BENEFITS = [
  {
    icon: "🌾",
    label: "Smart Lot Intelligence",
    desc: "AI-powered lot analysis and market readiness scoring",
  },
  {
    icon: "₹",
    label: "AI Price Discovery",
    desc: "Real-time price benchmarking across mandis and buyers",
  },
  {
    icon: "🚚",
    label: "Logistics Optimization",
    desc: "Cost-aware route planning and transport matching",
  },
  {
    icon: "🔐",
    label: "Secure Transactions",
    desc: "Verified parties, escrow-backed payment workflows",
  },
]

function RoleCard({ role }: { role: typeof ROLES[0] }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  const handleRoleSelection = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    let phone = "9876543210"
    if (role.id === "buyer") phone = "9876500001"
    else if (role.id === "transport") phone = "9876500002"
    else if (role.id === "admin") phone = "9876500003"

    // Save session locally immediately
    saveSession(role.id as any, phone)

    // Trigger Supabase sign in in background
    supabaseSignInWithMockOtp(phone, role.id as any).catch(() => {})

    // Navigate directly
    navigate(role.path)
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={handleRoleSelection}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${
          hovered ? role.accentBorder : "rgba(255,255,255,0.7)"
        }`,
        boxShadow: hovered
          ? `0 20px 60px -8px rgba(0,0,0,0.18), 0 0 0 2px ${role.accentBorder}`
          : "0 4px 24px -4px rgba(0,0,0,0.10)",
        transform: hovered
          ? "translateY(-6px) scale(1.015)"
          : "translateY(0) scale(1)",
        transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-44 overflow-hidden bg-green-100 shrink-0">
        <img
          src={role.image}
          alt={role.imageAlt}
          className="w-full h-full object-cover"
          style={{
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.5s ease",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.32) 100%)",
          }}
        />
        <span
          className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.88)",
            color: role.accentHex,
            backdropFilter: "blur(8px)",
          }}
        >
          {role.title}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: role.accentLight, color: role.accentHex }}
          >
            {role.icon}
          </div>
          <h3
            className="text-base font-bold tracking-widest"
            style={{ color: role.accentHex }}
          >
            {role.title}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-500 flex-1">
          {role.description}
        </p>
        <button
          className="w-full mt-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
          style={{
            background: role.accentHex,
            boxShadow: hovered ? `0 6px 20px -4px ${role.accentHex}80` : "none",
            transform: hovered ? "scale(1.02)" : "scale(1)",
          }}
          onClick={handleRoleSelection}
        >
          Login as {role.title.charAt(0) + role.title.slice(1).toLowerCase()}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0f1f12" }}
    >
      <div className="relative flex flex-col min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1647879826700-cfc5fd9d9a31?w=1800&h=1000&fit=crop&auto=format')",
            backgroundSize: "cover",
            backgroundPosition: "center 60%",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,31,14,0.72) 0%, rgba(11,31,14,0.52) 38%, rgba(11,31,14,0.78) 75%, rgba(11,31,14,0.97) 100%)",
          }}
        />

        {/* Header */}
        <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2e7d3a 0%, #3da64e 100%)",
              }}
            >
              <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
                <path
                  d="M14 5c0 0 3 3 3 7s-3 7-3 7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14 5c0 0-3 3-3 7s3 7 3 7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M7 12h14"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14 19v3M12 22h4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M9 17l2-2 2 1 2-3 2-2"
                  stroke="#6bc97a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-white text-xl font-extrabold tracking-widest leading-none">
                UZHAVAN
              </div>
              <div
                className="text-[10px] tracking-wider leading-none mt-0.5"
                style={{ color: "rgba(107,201,122,0.7)" }}
              >
                Smart Decisions. Better Markets.
              </div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {["About", "How It Works", "Contact"].map((item) => (
              <a
                key={item}
                href="#"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                style={{ color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={(e) => {
                  ;(e.target as HTMLElement).style.color = "white"
                  ;(e.target as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)"
                }}
                onMouseLeave={(e) => {
                  ;(e.target as HTMLElement).style.color =
                    "rgba(255,255,255,0.7)"
                  ;(e.target as HTMLElement).style.background = "transparent"
                }}
              >
                {item}
              </a>
            ))}
            <button
              className="ml-2 px-4 py-2 text-sm font-semibold rounded-lg text-green-900 hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(135deg, #6bc97a 0%, #3da64e 100%)",
              }}
            >
              Get Started
            </button>
          </nav>
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: "rgba(255,255,255,0.8)" }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </header>

        {menuOpen && (
          <div
            className="relative z-10 mx-4 mb-2 p-4 rounded-xl md:hidden"
            style={{
              background: "rgba(11,31,14,0.92)",
              border: "1px solid rgba(107,201,122,0.2)",
            }}
          >
            {["About", "How It Works", "Contact"].map((item) => (
              <a
                key={item}
                href="#"
                className="block py-2.5 px-3 text-sm rounded-lg"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {item}
              </a>
            ))}
          </div>
        )}

        {/* Hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wider"
            style={{
              background: "rgba(107,201,122,0.15)",
              border: "1px solid rgba(107,201,122,0.35)",
              color: "#6bc97a",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            AI-Powered Agricultural Intelligence Platform
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome to{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #6bc97a 0%, #a7e4b0 50%, #3da64e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              UZHAVAN
            </span>
          </h1>

          <p
            className="text-lg md:text-xl mb-3 leading-relaxed font-light"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            AI-powered market intelligence for smarter selling, better market
            access and higher realisation for every farm lot.
          </p>
          <p
            className="text-sm font-medium mb-12 tracking-wider"
            style={{ color: "rgba(107,201,122,0.8)" }}
          >
            Smart Decisions &nbsp;·&nbsp; Better Markets &nbsp;·&nbsp; Higher
            Realisation
          </p>

          <div className="w-full">
            <div className="flex items-center gap-3 justify-center mb-2">
              <div
                className="h-px flex-1 max-w-24"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.25))",
                }}
              />
              <span className="text-white text-xl font-semibold">
                Choose your role
              </span>
              <div
                className="h-px flex-1 max-w-24"
                style={{
                  background:
                    "linear-gradient(to left, transparent, rgba(255,255,255,0.25))",
                }}
              />
            </div>
            <p
              className="text-sm mb-8"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Select your role to enter the UZHAVAN ecosystem.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ROLES.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-center pb-6">
          <div
            className="flex flex-col items-center gap-1"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span className="text-xs tracking-widest">SCROLL</span>
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 animate-bounce"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M6 9l6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <section className="py-20 px-6" style={{ background: "#f0faf2" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-light mb-3"
              style={{ fontFamily: "var(--font-display)", color: "#122b16" }}
            >
              One Platform. Smarter Farm-to-Market Decisions.
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Built for transparent, efficient and farmer-centric agricultural
              markets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b) => (
              <div
                key={b.label}
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "white",
                  border: "1px solid #d4f2d9",
                  boxShadow: "0 2px 12px -2px rgba(46,125,58,0.08)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "#edf9f0" }}
                >
                  {b.icon}
                </div>
                <div>
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#1a4221" }}
                  >
                    {b.label}
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-12 rounded-2xl px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
            style={{
              background: "linear-gradient(135deg, #1a4221 0%, #276632 100%)",
            }}
          >
            {[
              { value: "₹2.4Cr+", label: "Realisation Unlocked" },
              { value: "18,000+", label: "Farm Lots Processed" },
              { value: "94%", label: "Price Accuracy" },
              { value: "6 States", label: "Market Coverage" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ color: "#a7e4b0" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-xs tracking-wide"
                  style={{ color: "rgba(167,228,176,0.7)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative" style={{ background: "#0b1f0e" }}>
        <div
          className="absolute top-0 left-0 right-0 overflow-hidden leading-none"
          style={{ transform: "translateY(-99%)" }}
        >
          <svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: 80 }}
          >
            <path
              d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
              fill="#0b1f0e"
            />
          </svg>
        </div>
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2e7d3a 0%, #3da64e 100%)",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path
                      d="M12 4v16M6 10h12"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className="text-white font-extrabold tracking-widest text-lg">
                  UZHAVAN
                </span>
              </div>
              <p
                className="text-xs tracking-wide max-w-xs"
                style={{ color: "rgba(107,201,122,0.6)" }}
              >
                Smart Decisions. Better Markets. Higher Realisation.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["About", "How It Works", "Contact", "Privacy"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "rgba(107,201,122,0.6)" }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div
            className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(26,66,33,0.6)" }}
          >
            <p
              className="text-xs text-center md:text-left"
              style={{ color: "rgba(107,201,122,0.4)" }}
            >
              Designed for{" "}
              <span
                style={{ color: "rgba(107,201,122,0.7)" }}
                className="font-medium"
              >
                SIH26132
              </span>{" "}
              — Strengthening Market Linkages
            </p>
            <p className="text-xs" style={{ color: "rgba(107,201,122,0.3)" }}>
              © 2026 UZHAVAN · All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
