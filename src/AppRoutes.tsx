import { Routes, Route, Navigate } from "react-router"
import { readSession } from "./lib/auth"
import LoginFarmer from "./pages/LoginFarmer"
import SmartLots from "./pages/farmer/SmartLots"
import LotDetail from "./pages/farmer/LotDetail"

export function useAuth() {
  const sessionUser = readSession()
  return { sessionUser }
}

export function AppRoutes() {
  const { sessionUser } = useAuth()

  return (
    <Routes>
      {/* Unified Login */}
      <Route path="/login" element={<LoginFarmer />} />
      <Route path="/login/farmer" element={<LoginFarmer />} />

      {/* Protected Farmer Area in the same tab */}
      <Route
        path="/farmer/dashboard"
        element={
          sessionUser?.loginNumber ? (
            <SmartLots />
          ) : (
            <Navigate to="/login/farmer" replace />
          )
        }
      />
      <Route
        path="/lots/:id"
        element={
          sessionUser ? <LotDetail /> : <Navigate to="/login/farmer" replace />
        }
      />

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/login/farmer" replace />} />
    </Routes>
  )
}

export default AppRoutes
