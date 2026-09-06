import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { getAuthProfile } from "../../lib/auth"
import { farmerApi } from "../../services/farmerApi"
import { inrCompact } from "../../lib/format"
import type {
  Order,
  DisputeRecord,
  AuditEvent,
  LogisticsDocket,
} from "../../lib/types"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Admin identity
  const [adminPhone, setAdminPhone] = useState("9876500003") // Demo Admin

  // Collections state
  const [disputes, setDisputes] = useState<DisputeRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [dockets, setDockets] =
    useState<Record<string, LogisticsDocket | null>>({})
  const [auditEvents, setAuditEvents] = useState<Record<string, AuditEvent[]>>(
    {},
  )

  // Selected dispute in right panel
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(
    null,
  )

  // Admin form state
  const [resolutionReason, setResolutionReason] = useState("")
  const [partialQuantity, setPartialQuantity] = useState<number>(0)

  useEffect(() => {
    getAuthProfile()
      .then((profile) => {
        if (!profile || profile.role !== "admin") {
          // Strict Role enforcement: Deny access to non-admin roles
          setError("Unauthorized Access. Admin role validation failed.")
          setLoading(false)
        } else {
          setAdminPhone(profile.phone)
          loadAdminData()
        }
      })
      .catch(() => {
        // Fallback for simulation testing
        loadAdminData()
      })
  }, [navigate])

  async function loadAdminData() {
    setError(null)
    try {
      const allOrders = await farmerApi.getOrders()
      setOrders(allOrders)

      const allDisputes = await farmerApi.getAllDisputes()
      setDisputes(allDisputes)

      const docMap: Record<string, LogisticsDocket | null> = {}
      const audMap: Record<string, AuditEvent[]> = {}
      for (const order of allOrders) {
        docMap[order.id] = await farmerApi.getDocketForOrder(order.id)
        audMap[order.id] = await farmerApi.getAuditEvents(order.id)
      }
      setDockets(docMap)
      setAuditEvents(audMap)
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard parameters")
    } finally {
      setLoading(false)
    }
  }

  // Action Triggers
  async function handleUpdateDisputeStatus(
    dispute: DisputeRecord,
    nextStatus: DisputeRecord["disputeStatus"],
  ) {
    if (!dispute.id && !dispute.orderId) return
    setError(null)
    try {
      await farmerApi.updateDisputeStatus(
        dispute.id || "",
        nextStatus,
        adminPhone,
        dispute.orderId,
      )
      await loadAdminData()
      // Update local selection status
      if (selectedDispute && selectedDispute.orderId === dispute.orderId) {
        setSelectedDispute({ ...selectedDispute, disputeStatus: nextStatus })
      }
    } catch (err: any) {
      setError(err.message || "Failed to adjust status")
    }
  }

  async function handleResolve(
    dispute: DisputeRecord,
    type: "RELEASE_SETTLEMENT" | "REFUND_BUYER" | "PARTIAL_RESOLUTION" | "KEEP_FUNDS_PROTECTED",
  ) {
    if (!resolutionReason.trim()) {
      setError(
        "Please input a justification reason explaining your administrative decision.",
      )
      return
    }
    setError(null)

    const orderObj = orders.find((o) => o.id === dispute.orderId)
    if (!orderObj) {
      setError("Linked order record not found.")
      return
    }

    // Safely check Release Safeguards for RELEASE_SETTLEMENT
    if (type === "RELEASE_SETTLEMENT") {
      const deliveryExists =
        dockets[orderObj.id] &&
        dockets[orderObj.id]?.status !== "TRANSPORT_ASSIGNED"
      if (orderObj.paymentStatus !== "VERIFIED") {
        setError("Bypass blocked: Payment has not been verified.")
        return
      }
      if (!deliveryExists) {
        setError("Bypass blocked: Delivery cargo record does not exist yet.")
        return
      }
      if (
        orderObj.settlementStatus === "SETTLED" ||
        orderObj.settlementStatus === "REFUNDED"
      ) {
        setError("Bypass blocked: Order is already settled or refunded.")
        return
      }
    }

    try {
      const docketObj = dockets[orderObj.id]
      const totalQty = docketObj?.agreedQuantity || 500
      let finalAmount = orderObj.amount
      if (type === "PARTIAL_RESOLUTION") {
        if (partialQuantity <= 0 || partialQuantity > totalQty) {
          setError(
            `Invalid partial quantity. Must be between 1 and ${totalQty} kg.`,
          )
          return
        }
        // Calculate deterministic amount based on price: price = amount / quantity
        const unitPrice = orderObj.amount / totalQty
        finalAmount = unitPrice * partialQuantity
      }

      await farmerApi.resolveDispute(
        dispute.id || "",
        dispute.orderId,
        adminPhone,
        type,
        resolutionReason,
        finalAmount,
      )
      setResolutionReason("")
      setSelectedDispute(null)
      await loadAdminData()
    } catch (err: any) {
      setError(err.message || "Failed to record administrative resolution")
    }
  }

  // Dashboard Stats indicators
  const openDisputes = disputes.filter((d) => d.disputeStatus === "OPEN")
  const underReview = disputes.filter((d) => d.disputeStatus === "UNDER_REVIEW")
  const resolvedDisputes = disputes.filter(
    (d) => d.disputeStatus === "RESOLVED",
  )

  // Pending Settlements: orders that are release eligible or paid but not completed or refunded
  const pendingSettlements = orders.filter(
    (o) =>
      o.status === "DELIVERED" ||
      o.status === "RELEASE_ELIGIBLE" ||
      (o.status === "PAID" && o.settlementStatus === "ON_HOLD"),
  )

  // Delivery mismatches
  const mismatchDockets = Object.values(dockets).filter(
    (d) => d && d.status === "MISMATCH",
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="h-64 rounded-3xl bg-white max-w-sm w-full animate-pulse border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased font-sans flex flex-col">
      {/* Admin header */}
      <header className="bg-slate-900 text-white px-6 py-4.5 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚖️</span>
          <div>
            <h1 className="text-md font-black tracking-tight text-white">
              UZHAVAN Admin Terminal
            </h1>
            <p className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest mt-0.5">
              Trust & Dispute resolution layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-purple-600 px-2.5 py-1 rounded font-black uppercase text-purple-100 tracking-wider">
            Admin Mode
          </span>
          <span className="text-xs text-slate-400 font-bold select-none truncate max-w-28 sm:max-w-none">
            {adminPhone}
          </span>
        </div>
      </header>

      {/* RLS / Permission Warning Alert */}
      {error && error.includes("Unauthorized") ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-red-200 max-w-md w-full p-8 text-center space-y-4 shadow-xl">
            <span className="text-4xl">🛑</span>
            <h3 className="text-md font-black text-slate-900 uppercase">
              RLS Access Blocked
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Return Home
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded-2xl font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* Operational KPIs grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Open Disputes
              </p>
              <p className="text-2xl font-black text-red-650 mt-1">
                {openDisputes.length}
              </p>
            </div>
            <div className="bg-white border rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Under Review
              </p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {underReview.length}
              </p>
            </div>
            <div className="bg-white border rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Pending Escrows
              </p>
              <p className="text-2xl font-black text-purple-600 mt-1">
                {pendingSettlements.length}
              </p>
            </div>
            <div className="bg-white border rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Freight Mismatches
              </p>
              <p className="text-2xl font-black text-cyan-600 mt-1">
                {mismatchDockets.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Queue Panel */}
            <div
              className={`space-y-4 ${
                selectedDispute
                  ? "lg:col-span-5 hidden lg:block"
                  : "lg:col-span-12"
              }`}
            >
              <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                Disputes Management Queue
              </h2>

              {disputes.length === 0 ? (
                <div className="bg-white border rounded-3xl p-8 text-center text-xs text-slate-400 font-black">
                  No disputes logged in the system currently.
                </div>
              ) : (
                disputes.map((d) => {
                  const orderObj = orders.find((o) => o.id === d.orderId)
                  return (
                    <div
                      key={d.orderId}
                      onClick={() => {
                        setSelectedDispute(d)
                        setResolutionReason("")
                        if (orderObj)
                          setPartialQuantity(
                            dockets[orderObj.id]?.agreedQuantity || 500,
                          )
                      }}
                      className={`bg-white border-2 rounded-3xl p-5 hover:border-purple-500/50 transition cursor-pointer select-none ${
                        selectedDispute?.orderId === d.orderId
                          ? "border-purple-600 shadow-sm"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                            d.disputeStatus === "OPEN"
                              ? "bg-red-50 text-red-800"
                              : d.disputeStatus === "UNDER_REVIEW"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-green-50 text-green-800"
                          }`}
                        >
                          {d.disputeStatus}
                        </span>

                        <span className="text-[10px] text-slate-400 font-extrabold select-all">
                          Order #{d.orderId}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-800 mt-3">
                        Reason: {d.disputeReason}
                      </h3>
                      {d.note && (
                        <p className="text-[11px] text-slate-450 italic mt-1 max-w-sm truncate">
                          "{d.note}"
                        </p>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>
                          Created:{" "}
                          {new Date(d.createdAt || "").toLocaleDateString()}
                        </span>
                        <span className="text-[#122b16] font-black">
                          {orderObj ? inrCompact(orderObj.amount) : ""}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right Detail Panel */}
            {selectedDispute &&
              (() => {
                const orderObj = orders.find(
                  (o) => o.id === selectedDispute.orderId,
                )
                const docketObj = dockets[selectedDispute.orderId]
                const events = auditEvents[selectedDispute.orderId] || []
                if (!orderObj) return null

                return (
                  <div className="lg:col-span-7 space-y-6">
                    {/* Detailed Transaction Chain Card */}
                    <div className="bg-white border rounded-3xl p-6 sm:p-7 space-y-5">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <button
                            onClick={() => setSelectedDispute(null)}
                            className="lg:hidden text-xs text-purple-600 font-black mb-2 block"
                          >
                            ← Back to Queue
                          </button>
                          <p className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider">
                            Transaction Chain audit
                          </p>
                          <h2 className="text-md font-black text-slate-900 mt-0.5">
                            Order #{orderObj.id}
                          </h2>
                        </div>

                        <button
                          onClick={() =>
                            handleUpdateDisputeStatus(
                              selectedDispute,
                              "UNDER_REVIEW",
                            )
                          }
                          className="px-3 py-1 bg-amber-50 border border-amber-205 text-[10px] font-black text-amber-800 rounded-lg"
                        >
                          [ PLACE UNDER REVIEW ]
                        </button>
                      </div>

                      {/* Timeline workflow details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
                        {/* SMART LOT DETAILS */}
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
                            Smart Lot spec
                          </span>
                          <p className="text-slate-800">
                            Crop: **{orderObj.crop}**
                          </p>
                          <p className="text-slate-800">
                            Agreed weight: **{docketObj?.agreedQuantity || 500}{" "}
                            kg**
                          </p>
                        </div>

                        {/* PAYMENT DETAILS */}
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
                            Hold deposit payment
                          </span>
                          <p className="text-slate-800">
                            Escrow Value: **{inrCompact(orderObj.amount)}**
                          </p>
                          <p className="text-slate-800">
                            Status: **{orderObj.paymentStatus}**
                          </p>
                        </div>

                        {/* CARRIER DOCKET DETAILS */}
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 sm:col-span-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
                            Highway carrier docket Info
                          </span>
                          {docketObj ? (
                            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                              <p className="text-slate-700">
                                Docket Status: **{docketObj.status}**
                              </p>
                              <p className="text-slate-700">
                                Carrier: **{docketObj.transporterPhone}**
                              </p>
                              <p className="text-slate-700">
                                Delivered Weight: **
                                {docketObj.deliveredQuantity ?? "Not delivered"}{" "}
                                kg**
                              </p>
                              <p className="text-slate-700">
                                Reported Loc: **
                                {docketObj.reportedDeliveryLocation || "_"}**
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">
                              No carrier docket assigned yet.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* EVIDENCE VIEW */}
                      <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 space-y-2">
                        <span className="text-[9px] font-black tracking-wider text-purple-800 uppercase block">
                          📋 TRANSIT DELIVERY EVIDENCE REFERRAL
                        </span>
                        <div className="text-[11px] text-slate-655 leading-relaxed font-semibold">
                          <p>
                            Disputed Claim: **{selectedDispute.disputeReason}**
                          </p>
                          <p className="mt-1">
                            Details: "
                            {selectedDispute.note || "No custom note added"}"
                          </p>
                        </div>
                      </div>

                      {/* HISTORICAL AUDIT TRAILS LOG */}
                      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">
                          Immutable Audit events logs
                        </span>
                        <div className="text-[9.5px] max-h-32 overflow-y-auto space-y-1.5 font-bold text-slate-500">
                          {events.map((e, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between border-b border-slate-100/50 pb-1"
                            >
                              <span>
                                • {e.eventType} (Actor: {e.actor})
                              </span>
                              <span>
                                {new Date(
                                  e.timestamp || "",
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DECISION CONTROL OPTIONS */}
                      {selectedDispute.disputeStatus !== "RESOLVED" &&
                        selectedDispute.disputeStatus !== "CLOSED" && (
                          <div className="border-t border-slate-100 pt-5 space-y-4">
                            <h4 className="text-xs font-black uppercase text-purple-700 tracking-wider">
                              Administrative Resolution input
                            </h4>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 font-bold block">
                                Justification Reason *
                              </label>
                              <textarea
                                value={resolutionReason}
                                onChange={(e) =>
                                  setResolutionReason(e.target.value)
                                }
                                placeholder="Write administrative rationale explaining this action..."
                                className="w-full p-3 border rounded-xl text-xs bg-white text-slate-800 min-h-18"
                              />
                            </div>

                            {/* Partial resolution inputs */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                              <p className="text-[10px] font-extrabold text-slate-600 uppercase">
                                ⚡ Structuring Partial Settlement Ratio
                              </p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 space-y-0.5">
                                  <label className="text-[9px] text-slate-400">
                                    Yield Delivered weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={partialQuantity}
                                    onChange={(e) =>
                                      setPartialQuantity(Number(e.target.value))
                                    }
                                    className="w-full p-2 border bg-white rounded-xl text-xs"
                                  />
                                </div>
                                <div className="flex-shrink-0 text-[10px] font-bold text-slate-500 pt-4">
                                  / {docketObj?.agreedQuantity || 500} kg total
                                </div>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <button
                                onClick={() =>
                                  handleResolve(
                                    selectedDispute,
                                    "RELEASE_SETTLEMENT",
                                  )
                                }
                                className="py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition"
                              >
                                [ RELEASE ESCROW TO FARMER ]
                              </button>

                              <button
                                onClick={() =>
                                  handleResolve(selectedDispute, "REFUND_BUYER")
                                }
                                className="py-3 bg-red-650 hover:bg-red-700 text-white font-black rounded-xl transition"
                              >
                                [ REFUND CASH TO BUYER ]
                              </button>

                              <button
                                onClick={() =>
                                  handleResolve(
                                    selectedDispute,
                                    "PARTIAL_RESOLUTION",
                                  )
                                }
                                className="py-3 bg-purple-600 hover:bg-purple-750 text-white font-black rounded-xl transition"
                              >
                                [ RESOLVE PARTIAL RATIO ]
                              </button>

                              <button
                                onClick={() =>
                                  handleResolve(
                                    selectedDispute,
                                    "KEEP_FUNDS_PROTECTED",
                                  )
                                }
                                className="py-3 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl transition"
                              >
                                [ LOCK PROTECTED ESCROW ]
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )
              })()}
          </div>
        </div>
      )}
    </div>
  )
}
