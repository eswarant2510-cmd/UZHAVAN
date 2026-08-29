import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { useEffect, useState } from "react"
import {
  clearSession,
  requireRole,
  getAuthProfile,
  supabaseSignOut,
} from "../../lib/auth"
import type { SessionUser } from "../../lib/types"
import VoiceAssistant from "../VoiceAssistant"

const NAV = [
  { to: "/farmer", label: "Home", icon: HomeIcon, end: true },
  { to: "/farmer/lots", label: "My Smart Lots", icon: LotsIcon },
  {
    to: "/farmer/market",
    label: "Market Intelligence",
    icon: MarketIcon,
  },
  {
    to: "/farmer/decision",
    label: "Best Selling Decision",
    icon: DecisionIcon,
  },
  {
    to: "/farmer/buyers",
    label: "Buyers & Offers",
    icon: BuyersIcon,
  },
  { to: "/farmer/logistics", label: "Logistics", icon: TruckIcon },
  {
    to: "/farmer/orders",
    label: "Orders & Payments",
    icon: OrdersIcon,
  },
  {
    to: "/farmer/earnings",
    label: "My Earnings",
    icon: EarningsIcon,
  },
  {
    to: "/farmer/notifications",
    label: "Notifications",
    icon: BellIcon,
  },
  { to: "/farmer/profile", label: "Profile", icon: ProfileIcon },
]

export default function FarmerShell() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", handleStatus)
    window.addEventListener("offline", handleStatus)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener("online", handleStatus)
      window.removeEventListener("offline", handleStatus)
    }
  }, [])

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

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  async function logout() {
    await supabaseSignOut()
    navigate("/")
  }

  const { lotId } = useParams()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0faf2]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2e7d3a]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f3faf4" }}>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-[272px] flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "#0f2a14", color: "white" }}
      >
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
            <div className="text-lg font-extrabold tracking-widest leading-none">
              UZHAVAN
            </div>
            <div
              className="text-[10px] mt-1"
              style={{ color: "rgba(107,201,122,0.75)" }}
            >
              Farmer
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => navigate("/farmer/lots/new")}
            className="w-full py-3 rounded-xl text-sm font-bold text-agri-900 mb-3"
            style={{
              background: "linear-gradient(135deg, #6bc97a 0%, #3da64e 100%)",
            }}
          >
            + Create Smart Lot
          </button>
          <div className="flex items-center gap-1.5 text-[10px] mb-3 font-semibold uppercase">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"
              }`}
            />
            <span
              className={
                isOnline ? "text-green-400 font-bold" : "text-red-400 font-bold"
              }
            >
              {isOnline ? "CONNECTED" : "SERVICE UNAVAILABLE"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="truncate pr-2">{user?.name ?? "Farmer"}</span>
            <button onClick={logout} className="text-agri-300 font-semibold">
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur border-b border-agri-100">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl bg-agri-50 text-agri-800"
            aria-label="Open menu"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="font-extrabold tracking-widest text-[#122b16]">
            UZHAVAN
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto relative">
          <Outlet />
        </main>
        <VoiceAssistant role="farmer" currentLotId={lotId} />
      </div>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function LotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </svg>
  )
}
function MarketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 18l5-6 4 3 7-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  )
}
function DecisionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" />
    </svg>
  )
}
function BuyersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c1.2-3.5 3.5-5 6-5s4.8 1.5 6 5" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.2" />
      <path d="M16 20c.4-2 1.6-3.2 3.4-3.8" strokeLinecap="round" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="6" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v2h-7v-5z" />
      <circle cx="6.5" cy="18" r="1.7" />
      <circle cx="17.5" cy="18" r="1.7" />
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  )
}
function EarningsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8" />
      <path
        d="M12 7v10M9.5 9.5c.7-1 4.3-1 5 1s-1.5 2-2.5 2.2c1.2.2 2.8.8 2.5 2.3-.5 1.8-4.2 1.8-5-.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6 16V10a6 6 0 1112 0v6l1.5 2h-15L6 16z"
        strokeLinejoin="round"
      />
      <path d="M10 20a2 2 0 004 0" strokeLinecap="round" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6" strokeLinecap="round" />
    </svg>
  )
}
