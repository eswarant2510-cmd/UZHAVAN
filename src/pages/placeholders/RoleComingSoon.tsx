import { useNavigate } from "react-router"
import { clearSession } from "../../lib/auth"

export default function RoleComingSoon({
  role,
  accent,
}: {
  role: string
  accent: string
}) {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#f3faf4" }}
    >
      <div className="max-w-md w-full rounded-3xl bg-white border border-agri-100 p-8 text-center">
        <p
          className="text-xs font-bold tracking-widest mb-2"
          style={{ color: accent }}
        >
          {role.toUpperCase()} PORTAL
        </p>
        <h1
          className="text-3xl font-light text-agri-950"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dashboard coming next
        </h1>
        <p className="text-slate-500 mt-3">
          Login is connected. This {role} workspace will follow the Farmer Home
          Dashboard pattern.
        </p>
        <button
          onClick={() => {
            clearSession()
            navigate("/")
          }}
          className="mt-6 min-h-12 px-6 rounded-2xl text-white font-bold"
          style={{ background: accent }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
