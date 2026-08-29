import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { getAuthProfile } from "../../lib/auth"
import { farmerApi } from "../../services/farmerApi"
import type { Order, LogisticsDocket, DocketStatus } from "../../lib/types"

export default function TransportDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Authenticated Transporter Profile Phone
  const [transporterPhone, setTransporterPhone] = useState("9876500002") // Default to Vijay Logistics
  const [transporterName, setTransporterName] = useState("Vijay Logistics")

  // Orders and Dockets state
  const [orders, setOrders] = useState<Order[]>([])
  const [dockets, setDockets] = useState<LogisticsDocket[]>([])
  const [selectedDocket, setSelectedDocket] = useState<LogisticsDocket | null>(
    null,
  )

  // Tab states: 'pending' | 'active' | 'completed'
  const [activeTab, setActiveTab] =
    useState<"pending" | "active" | "completed">("active")

  // Form parameters
  const [pickupWeight, setPickupWeight] = useState<number>(500)
  const [pickupLoc, setPickupLoc] = useState<string>("Nashik Farm, Maharashtra")
  const [pickupVehicle, setPickupVehicle] = useState<string>("MH-15-AB-1234")

  const [deliveryWeight, setDeliveryWeight] = useState<number>(500)
  const [deliveryLoc, setDeliveryLoc] = useState<string>(
    "Mumbai Wholesale Market, Maharashtra",
  )
  const [deliveryNotes, setDeliveryNotes] = useState<string>("")

  useEffect(() => {
    getAuthProfile()
      .then((profile) => {
        if (profile) {
          if (profile.role === "farmer") {
            navigate("/farmer")
          } else if (profile.role === "buyer") {
            navigate("/dashboard/buyer/discover")
          } else {
            setTransporterPhone(profile.phone)
            setTransporterName(profile.name)
          }
        }
        loadShipments()
      })
      .catch(() => {
        loadShipments()
      })
  }, [navigate])

  async function loadShipments() {
    setError(null)
    try {
      const allOrders = await farmerApi.getOrders()
      setOrders(allOrders)

      const docList: LogisticsDocket[] = []
      for (const order of allOrders) {
        const doc = await farmerApi.getDocketForOrder(order.id)
        if (doc && doc.transporterPhone === transporterPhone) {
          docList.push(doc)
        }
      }
      setDockets(docList)
    } catch (err: any) {
      setError(err.message || "Failed to load logistics shipments")
    } finally {
      setLoading(false)
    }
  }

  // Filtered Dockets per category
  const pendingDockets = dockets.filter(
    (d) => d.status === "TRANSPORT_ASSIGNED",
  )
  const activeDockets = dockets.filter((d) =>
    [
      "TRANSPORT_ACCEPTED",
      "PICKUP_CONFIRMED",
      "IN_TRANSIT",
      "DELIVERY_REPORTED",
      "MATCHING_PENDING",
      "MISMATCH",
    ].includes(d.status),
  )
  const completedDockets = dockets.filter(
    (d) => d.status === "MATCHED" || d.status === "DELIVERED",
  )

  const currentList =
    activeTab === "pending"
      ? pendingDockets
      : activeTab === "completed"
        ? completedDockets
        : activeDockets

  // Action operations
  async function handleAcceptJob(orderId: string) {
    setError(null)
    try {
      const updated = await farmerApi.acceptTransportJob(
        orderId,
        transporterPhone,
      )
      setSelectedDocket(updated)
      await loadShipments()
    } catch (err: any) {
      setError(err.message || "Accept failed")
    }
  }

  async function handleConfirmPickup(orderId: string, lotId: string) {
    setError(null)
    try {
      const updated = await farmerApi.confirmPickup(
        orderId,
        transporterPhone,
        lotId,
        pickupLoc,
        pickupWeight,
        pickupVehicle,
      )
      setSelectedDocket(updated)
      await loadShipments()
    } catch (err: any) {
      setError(err.message || "Pickup confirm failed")
    }
  }

  async function handleStartTransit(orderId: string) {
    setError(null)
    try {
      const updated = await farmerApi.startTransit(orderId, transporterPhone)
      setSelectedDocket(updated)
      await loadShipments()
    } catch (err: any) {
      setError(err.message || "Transit start failed")
    }
  }

  async function handleReportDelivery(orderId: string) {
    setError(null)
    try {
      const response = await farmerApi.reportDelivery(
        orderId,
        transporterPhone,
        deliveryWeight,
        deliveryLoc,
        "Suresh Agarwal",
        deliveryNotes || undefined,
      )
      setSelectedDocket(response.docket)
      await loadShipments()
    } catch (err: any) {
      setError(err.message || "Delivery report failed")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="h-64 rounded-3xl bg-white max-w-sm w-full animate-pulse border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Navbar header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚚</span>
          <div>
            <h1 className="text-md font-black text-slate-900 tracking-tight">
              UZHAVAN Transporter
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              Carrier Shell Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-xs font-black text-slate-800">
              {transporterName}
            </p>
            <p className="text-[9px] text-[#ea580c] font-black uppercase tracking-wider">
              Carrier Mode
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 uppercase">
            {transporterName[0]}
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-750 text-xs px-4 py-2.5 rounded-2xl font-bold border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => {
              setActiveTab("active")
              setSelectedDocket(null)
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition capitalize ${
              activeTab === "active"
                ? "bg-[#ea580c] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            🚛 Active ({activeDockets.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("pending")
              setSelectedDocket(null)
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition capitalize ${
              activeTab === "pending"
                ? "bg-[#ea580c] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            📦 Pending ({pendingDockets.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("completed")
              setSelectedDocket(null)
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition capitalize ${
              activeTab === "completed"
                ? "bg-[#ea580c] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            ✓ Completed ({completedDockets.length})
          </button>
        </div>

        {/* Layout list vs details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel: List */}
          <div
            className={`space-y-4 ${
              selectedDocket
                ? "md:col-span-5 hidden md:block"
                : "md:col-span-12"
            }`}
          >
            {currentList.length === 0 ? (
              <div className="bg-white border rounded-3xl p-8 text-center text-xs text-slate-400 font-extrabold">
                No shipments found in this category.
              </div>
            ) : (
              currentList.map((d) => {
                const orderObj = orders.find((o) => o.id === d.orderId)
                return (
                  <div
                    key={d.orderId}
                    onClick={() => {
                      setSelectedDocket(d)
                      setPickupWeight(d.agreedQuantity)
                      setDeliveryWeight(d.agreedQuantity)
                    }}
                    className={`bg-white border-2 rounded-3xl p-5 hover:border-[#ea580c]/50 transition cursor-pointer select-none ${
                      selectedDocket?.id === d.id
                        ? "border-[#ea580c]"
                        : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                          {d.status}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-800 mt-2">
                          {d.crop} · {d.agreedQuantity} kg
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                          {d.docketHumanId}
                        </p>
                      </div>
                      <span className="text-right text-[11px] font-black text-slate-800 uppercase shrink-0">
                        {orderObj ? `Order #${orderObj.id}` : ""}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold">
                      <div>
                        <p className="text-[8px] uppercase text-slate-400">
                          Pickup
                        </p>
                        <p className="truncate text-slate-750">
                          {d.pickupLocation}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase text-slate-400">
                          Destination
                        </p>
                        <p className="truncate text-slate-750">
                          {d.deliveryLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right panel: Details */}
          {selectedDocket && (
            <div className="md:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 space-y-5">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <button
                      onClick={() => setSelectedDocket(null)}
                      className="md:hidden text-xs text-[#ea580c] font-black mb-2 block"
                    >
                      ← Back to Jobs list
                    </button>
                    <p className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                      Logistics Docket details
                    </p>
                    <h2 className="text-md font-black text-slate-900 mt-0.5">
                      {selectedDocket.docketHumanId}
                    </h2>
                  </div>

                  <span className="px-3 py-1 bg-amber-50 border border-amber-205 text-amber-800 text-[10px] font-black uppercase rounded-lg">
                    {selectedDocket.status}
                  </span>
                </div>

                {/* READ ONLY COMMERCIAL DATA HIGHLIGHT */}
                <div className="bg-slate-50 border border-slate-202 rounded-2xl p-4.5 space-y-3">
                  <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                    🔒 READ-ONLY AGREED TERMS (COMMERCIALS)
                  </span>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] text-slate-600 font-semibold">
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Crop Commodity
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        {selectedDocket.crop}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Agreed Contract Qty
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        {selectedDocket.agreedQuantity} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Farmer Partner
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        Ramesh Patel (Nashik Office)
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Buyer Delivery Agent
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        Suresh Agarwal (Mumbai)
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Agreed Transport Cost
                      </p>
                      <p className="text-[#ea580c] font-black">
                        ₹2,800 Hold Escrow
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase">
                        Associated Order
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        #{selectedDocket.orderId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* TIMELINE PROGRESS INDICATOR */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    🛠️ Workflow Pipeline
                  </h4>

                  {/* Accept Job button */}
                  {selectedDocket.status === "TRANSPORT_ASSIGNED" && (
                    <button
                      onClick={() => handleAcceptJob(selectedDocket.orderId)}
                      className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs rounded-xl shadow-xs transition"
                    >
                      [ ACCEPT TRANSPORT JOB ]
                    </button>
                  )}

                  {/* Pickup Confirmation form */}
                  {selectedDocket.status === "TRANSPORT_ACCEPTED" && (
                    <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-4.5 space-y-4 text-xs font-semibold">
                      <p className="text-[#ea580c] font-black text-[11px] uppercase tracking-wide">
                        📦 Farmer Pickup Verification Details
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">
                            Pickup Quantity (kg)
                          </label>
                          <input
                            type="number"
                            value={pickupWeight}
                            onChange={(e) =>
                              setPickupWeight(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 border rounded-xl bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">
                            Carrier Vehicle ID
                          </label>
                          <input
                            type="text"
                            value={pickupVehicle}
                            onChange={(e) => setPickupVehicle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">
                          Pickup Location ("Reported Location")
                        </label>
                        <input
                          type="text"
                          value={pickupLoc}
                          onChange={(e) => setPickupLoc(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-white"
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleConfirmPickup(
                            selectedDocket.orderId,
                            selectedDocket.lotId,
                          )
                        }
                        className="w-full py-3 bg-[#ea580c] text-white font-black text-xs rounded-xl shadow-xs hover:bg-[#c2410c] transition mt-2"
                      >
                        [ CONFIRM PICKUP COMPLETE ]
                      </button>
                    </div>
                  )}

                  {/* Start Transit options */}
                  {selectedDocket.status === "PICKUP_CONFIRMED" && (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4.5 text-center space-y-3.5">
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Cargo metadata verified at Nashik origin. Ready to begin
                        highway transport transit sequence.
                      </p>
                      <button
                        onClick={() =>
                          handleStartTransit(selectedDocket.orderId)
                        }
                        className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs rounded-xl shadow-xs transition"
                      >
                        [ START TRANSIT ROUTING ]
                      </button>
                    </div>
                  )}

                  {/* Report Delivery form */}
                  {selectedDocket.status === "IN_TRANSIT" && (
                    <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-4.5 space-y-4 text-xs font-semibold">
                      <p className="text-[#ea580c] font-black text-[11px] uppercase tracking-wide">
                        📍 Delivery Receiving Details
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">
                            Delivered Quantity (kg)
                          </label>
                          <input
                            type="number"
                            value={deliveryWeight}
                            onChange={(e) =>
                              setDeliveryWeight(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 border rounded-xl bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">
                            Notes / Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="Dehydration check, normal weight loss..."
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">
                          Delivery Address Location ("Reported Location")
                        </label>
                        <input
                          type="text"
                          value={deliveryLoc}
                          onChange={(e) => setDeliveryLoc(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-white"
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleReportDelivery(selectedDocket.orderId)
                        }
                        className="w-full py-3 bg-[#ea580c] text-white font-black text-xs rounded-xl shadow-xs hover:bg-[#c2410c] transition mt-2"
                      >
                        [ RECORD DELIVERY RECEIVED ]
                      </button>
                    </div>
                  )}

                  {/* Mismatch & Match alerts */}
                  {selectedDocket.status === "MISMATCH" && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 space-y-1.5 text-xs font-semibold">
                      <p className="font-black text-sm">
                        ⚠ QUANTITY / PARAMETER MISMATCH DETECTED
                      </p>
                      <p className="text-slate-655 font-medium leading-relaxed">
                        UZHAVAN deterministic engine flagged discrepancies
                        between contract specs and actual carrier delivery data.
                        Escrow settlement remains locked until dispute
                        resolution completes.
                      </p>
                    </div>
                  )}

                  {selectedDocket.status === "MATCHED" && (
                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 space-y-1.5 text-xs font-semibold">
                      <p className="font-black text-sm">
                        ✓ DELIVERY VERIFIED & MATCHED SUCCESS
                      </p>
                      <p className="text-slate-655 font-medium leading-relaxed">
                        Cargo matching completed successfully. Release
                        instructions triggered to farmer and buyer dashboards.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
