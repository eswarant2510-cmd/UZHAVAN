import { createBrowserRouter } from "react-router"
import Home from "./pages/Home"
import LoginFarmer from "./pages/LoginFarmer"
import LoginBuyer from "./pages/LoginBuyer"
import LoginTransport from "./pages/LoginTransport"
import LoginAdmin from "./pages/LoginAdmin"
import FarmerShell from "./components/farmer/FarmerShell"
import FarmerHome from "./pages/farmer/FarmerHome"
import SmartLots from "./pages/farmer/SmartLots"
import CreateSmartLot from "./pages/farmer/CreateSmartLot"
import LotDetail from "./pages/farmer/LotDetail"
import MarketIntelligencePage from "./pages/farmer/MarketIntelligence"
import BestSellingDecision from "./pages/farmer/BestSellingDecision"
import CompareOptions from "./pages/farmer/CompareOptions"
import WhatIfAnalysis from "./pages/farmer/WhatIfAnalysis"
import BuyersOffers from "./pages/farmer/BuyersOffers"
import Logistics from "./pages/farmer/Logistics"
import OrdersPayments from "./pages/farmer/OrdersPayments"
import Earnings from "./pages/farmer/Earnings"
import Notifications from "./pages/farmer/Notifications"
import Profile from "./pages/farmer/Profile"
import BuyerHome from "./pages/buyer/BuyerHome"
import Discover from "./pages/buyer/Discover"
import LotDetailBuyer from "./pages/buyer/LotDetail"
import MakeOffer from "./pages/buyer/MakeOffer"
import SmartMatch from "./pages/buyer/SmartMatch"
import OrdersBuyer from "./pages/buyer/Orders"
import PaymentBuyer from "./pages/buyer/Payment"
import TransportBuyer from "./pages/buyer/Transport"
import DeliveryBuyer from "./pages/buyer/Delivery"
import DisputeBuyer from "./pages/buyer/Dispute"
import AnalyticsBuyer from "./pages/buyer/Analytics"
import NotificationsBuyer from "./pages/buyer/Notifications"
import ProfileBuyer from "./pages/buyer/Profile"
import TransportDashboard from "./pages/placeholders/TransportDashboard"
import AdminDashboard from "./pages/placeholders/AdminDashboard"
import BuyerShell from "./components/buyer/BuyerShell"

import FarmerHomePlaceholder from "./pages/farmer/FarmerHomePlaceholder"

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/login/farmer", Component: LoginFarmer },
  { path: "/login/buyer", Component: LoginBuyer },
  { path: "/login/transport", Component: LoginTransport },
  { path: "/login/admin", Component: LoginAdmin },
  {
    path: "/farmer",
    Component: FarmerShell,
    children: [
      { index: true, Component: FarmerHome },
      { path: "lots", Component: SmartLots },
      { path: "lots/new", Component: CreateSmartLot },
      { path: "lots/:lotId", Component: LotDetail },
      { path: "market", Component: MarketIntelligencePage },
      { path: "decision", Component: BestSellingDecision },
      { path: "decision/compare", Component: CompareOptions },
      { path: "decision/what-if", Component: WhatIfAnalysis },
      { path: "buyers", Component: BuyersOffers },
      { path: "logistics", Component: Logistics },
      { path: "orders", Component: OrdersPayments },
      { path: "earnings", Component: Earnings },
      { path: "notifications", Component: Notifications },
      { path: "profile", Component: Profile },
    ],
  },
  {
    path: "/dashboard/buyer",
    Component: BuyerShell,
    children: [
      { index: true, Component: BuyerHome },
      { path: "discover", Component: Discover },
      { path: "lots/:lotId", Component: LotDetailBuyer },
      { path: "lots/:lotId/offer", Component: MakeOffer },
      { path: "match", Component: SmartMatch },
      { path: "orders", Component: OrdersBuyer },
      { path: "payments", Component: PaymentBuyer },
      { path: "transport", Component: TransportBuyer },
      { path: "delivery", Component: DeliveryBuyer },
      { path: "dispute", Component: DisputeBuyer },
      { path: "analytics", Component: AnalyticsBuyer },
      { path: "notifications", Component: NotificationsBuyer },
      { path: "profile", Component: ProfileBuyer },
    ],
  },
  { path: "/dashboard/transport", Component: TransportDashboard },
  { path: "/dashboard/admin", Component: AdminDashboard },
])
