import { useEffect, useState } from "react"

import { useNavigate } from "react-router"

import { getAuthProfile, supabaseSignOut } from "../../lib/auth"

import type { SessionUser } from "../../lib/types"

export default function FarmerHomePlaceholder() {
  const navigate = useNavigate()

  const [user, setUser] = useState<SessionUser | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    getAuthProfile()
      .then((profile) => {
        if (!alive) return

        if (profile && profile.role === "farmer") {
          setUser(profile)

          setLoading(false)
        } else {
          navigate("/login/farmer")
        }
      })
      .catch(() => {
        if (alive) navigate("/login/farmer")
      })

    return () => {
      alive = false
    }
  }, [navigate])

  async function handleLogout() {
    await supabaseSignOut()

    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0faf2]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2e7d3a]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3faf4] flex flex-col font-sans">
      <header className="bg-[#0f2a14] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="text-xl font-extrabold tracking-widest">
          UZHAVAN
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-80">
            {user?.name} ({user?.phone})
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-[#a7e4b0] shadow-xl max-w-md w-full">
          <div className="text-5xl mb-4">🌾</div>
          <h1 className="text-3xl font-extrabold text-[#122b16] mb-2">
            Welcome, Farmer
          </h1>
          <p className="text-sm text-slate-500 mb-6 font-semibold">
            You are securely logged into your UZHAVAN Farmer Board.
          </p>
          <div className="bg-[#edf9f0] p-4 rounded-2xl text-left border border-[#a7e4b0] mb-6">
            <h2 className="text-xs font-semibold text-[#276632] uppercase mb-1">
              Farmer Profile
            </h2>
            <p className="text-sm font-medium text-slate-800">
              Name: {user?.name || "Ramesh Patel"}
            </p>
            <p className="text-sm font-medium text-slate-800">
              Location: {user?.location || "Nashik, Maharashtra"}
            </p>
            <p className="text-sm font-medium text-slate-800">
              Phone: {user?.phone}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            UZHAVAN Authentication Foundation • Secure Session Established
          </p>
        </div>
      </main>
    </div>
  )
}
