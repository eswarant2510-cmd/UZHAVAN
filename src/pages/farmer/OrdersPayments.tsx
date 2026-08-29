import { useEffect, useState } from "react"
import { farmerApi } from "../../services/farmerApi"
import { inrCompact } from "../../lib/format"
import type {
  Order,
  OrderStatus,
  VerificationRecord,
  DisputeRecord,
  AuditEvent,
  DisputeReason,
  LogisticsDocket,
} from "../../lib/types"

export default function OrdersPayments() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mapping order IDs to detail values
  const [verifications, setVerifications] =
    useState<Record<string, VerificationRecord[]>>({})
  const [disputes, setDisputes] = useState<Record<string, DisputeRecord[]>>({})
  const [auditEvents, setAuditEvents] = useState<Record<string, AuditEvent[]>>(
    {},
  )
  const [dockets, setDockets] =
    useState<Record<string, LogisticsDocket | null>>({})
  const [matchingResults, setMatchingResults] = useState<Record<string, any>>(
    {},
  )

  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Dispute form state
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null)
  const [disputeReason, setDisputeReason] =
    useState<DisputeReason>("Quantity mismatch")
  const [disputeNote, setDisputeNote] = useState("")

  // Simulation values for Reporting Deliveries
  const [reportedQty, setReportedQty] = useState<number>(500)
  const [reportedLoc, setReportedLoc] = useState<string>(
    "Mumbai Wholesale Market, Maharashtra",
  )

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await farmerApi.getOrders()
      setOrders(data)

      const vMap: Record<string, VerificationRecord[]> = {}
      const dMap: Record<string, DisputeRecord[]> = {}
      const aMap: Record<string, AuditEvent[]> = {}
      const docMap: Record<string, LogisticsDocket | null> = {}
      const matchMap: Record<string, any> = {}

      for (const order of data) {
        vMap[order.id] = await farmerApi.getVerificationRecords(order.id)
        dMap[order.id] = await farmerApi.getDisputes(order.id)
        aMap[order.id] = await farmerApi.getAuditEvents(order.id)

        const docket = await farmerApi.getDocketForOrder(order.id)
        docMap[order.id] = docket
        if (docket) {
          matchMap[order.id] = farmerApi.matchDocketToOrder(docket, order)
        }
      }

      setVerifications(vMap)
      setDisputes(dMap)
      setAuditEvents(aMap)
      setDockets(docMap)
      setMatchingResults(matchMap)
    } catch (err: any) {
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  async function handleTransitionStatus(
    orderId: string,
    nextStatus: OrderStatus,
  ) {
    setUpdatingId(orderId)
    setError(null)
    try {
      await farmerApi.updateOrderStatus(orderId, nextStatus)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to advance order status.")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleFarmerConfirm(orderId: string) {
    setUpdatingId(orderId)
    setError(null)
    try {
      await farmerApi.submitVerification(
        orderId,
        "farmer",
        "CONFIRMED",
        "Farmer verified delivery goods",
      )
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to submit verification.")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleTriggerSettlement(orderId: string) {
    setUpdatingId(orderId)
    setError(null)
    try {
      await farmerApi.settleOrderFunds(orderId)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to execute escrow release.")
    } finally {
      setUpdatingId(null)
    }
  }

  // Raise dispute
  function openDisputeModal(order: Order) {
    setDisputeOrder(order)
    setDisputeReason("Quantity mismatch")
    setDisputeNote("")
  }

  async function submitDispute() {
    if (!disputeOrder) return
    setError(null)
    try {
      await farmerApi.raiseDispute(disputeOrder.id, disputeReason, disputeNote)
      setDisputeOrder(null)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to submit dispute details.")
    }
  }

  // ----------------------------------------------------
  // SIMULATOR TRANSPORTER FUNCTIONS
  // ----------------------------------------------------
  async function handleAssignTransporter(orderId: string) {
    setError(null)
    try {
      await farmerApi.createLogisticsDocket(
        orderId,
        "9876555555",
        "MH-15-AB-1234",
        "Standard Truck",
      )
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Logistics docket creation failed")
    }
  }

  async function handleTransporterPickup(
    orderId: string,
    lotId: string,
    vehicle: string,
    agreedQty: number,
  ) {
    setError(null)
    try {
      await farmerApi.confirmPickup(
        orderId,
        "9876555555",
        lotId,
        "Nashik Farm, Maharashtra",
        agreedQty,
        vehicle,
      )
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Transporter pickup report failed")
    }
  }

  async function handleTransporterDelivery(
    orderId: string,
    deliveredQty: number,
    dest: string,
  ) {
    setError(null)
    try {
      await farmerApi.reportDelivery(
        orderId,
        "9876555555",
        deliveredQty,
        dest,
        "Suresh Agarwal",
        "receipt_doc_reference",
      )
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Transporter delivery report failed")
    }
  }

  // Calculate statistics
  const totalEarnings = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.amount, 0)

  const inEscrow = orders
    .filter((o) =>
      [
        "PAID",
        "TRANSPORT_PENDING",
        "PICKUP_CONFIRMED",
        "IN_TRANSIT",
        "DELIVERED",
        "BUYER_VERIFICATION",
        "SETTLEMENT_PENDING",
        "RELEASE_ELIGIBLE",
      ].includes(o.status),
    )
    .reduce((sum, o) => sum + o.amount, 0)

  if (loading) {
    return (
      <div className="h-64 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold text-green-700 tracking-wider uppercase">
          Escrow, Shipments & Logistics
        </p>
        <h1 className="text-3xl font-black text-slate-900 mt-0.5">
          Orders & Payments
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor secure payment holds, verify transport dockets, match freight
          parameters, and release settlements
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#122b16] to-[#1a3f21] p-6 text-white shadow-xs relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/5 rounded-full blur-xl" />
          <p className="text-xs uppercase font-extrabold tracking-widest text-[#a7e4b0]">
            In Escrow Hold
          </p>
          <p className="text-3xl font-black mt-2">{inrCompact(inEscrow)}</p>
          <p className="text-[10px] text-slate-350 mt-2 font-medium">
            * Funds verified on Razorpay, released upon delivery confirm
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-205 p-6 shadow-xs">
          <p className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
            Settled Earnings
          </p>
          <p className="text-3xl font-black mt-2 text-slate-900">
            {inrCompact(totalEarnings)}
          </p>
          <p className="text-[10px] text-slate-450 mt-2 font-semibold">
            * Released directly to primary savings accounts
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-750 text-xs px-4 py-2.5 rounded-2xl font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-6">
        {orders.map((o) => {
          const isUpdating = updatingId === o.id
          const orderVerifications = verifications[o.id] || []
          const orderDisputes = disputes[o.id] || []
          const orderEvents = auditEvents[o.id] || []
          const docket = dockets[o.id]
          const comparison = matchingResults[o.id]

          const openDisputes = orderDisputes.filter(
            (d) => d.disputeStatus === "OPEN",
          )
          const isDisputed = openDisputes.length > 0

          const farmerVerify = orderVerifications.find(
            (v) => v.role === "farmer",
          )
          const buyerVerify = orderVerifications.find((v) => v.role === "buyer")

          const farmerConfirm = farmerVerify?.verificationResult === "CONFIRMED"
          const buyerConfirm = buyerVerify?.verificationResult === "CONFIRMED"

          // Check Release Eligibility condition
          const settlementEligible =
            farmerConfirm &&
            buyerConfirm &&
            o.paymentStatus === "VERIFIED" &&
            !isDisputed &&
            o.status !== "COMPLETED"

          return (
            <div
              key={o.id}
              className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-7 space-y-5 hover:shadow-xs transition"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">
                      Order #{o.id}
                    </span>
                    <span
                      className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                        isDisputed
                          ? "bg-red-50 text-red-800"
                          : "bg-[#122b16] text-[#a7e4b0]"
                      }`}
                    >
                      {isDisputed
                        ? "DISPUTED"
                        : o.status === "PENDING_PAYMENT"
                          ? "PENDING BUYR PAY"
                          : "ESCROW ACTIVE"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Harvest: {o.crop} · Created:{" "}
                    {new Date(o.createdAt || "").toLocaleDateString()}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black text-[#122b16]">
                    {inrCompact(o.amount)}
                  </p>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 mt-1.5 rounded inline-block border ${
                      isDisputed
                        ? "bg-red-50 border-red-200 text-red-800"
                        : o.status === "PAID"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : o.status === "PENDING_PAYMENT"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-205 text-slate-650"
                    }`}
                  >
                    {isDisputed ? "DISPUTED" : o.status}
                  </span>
                </div>
              </div>

              {/* Order Timeline Visual */}
              <div className="pt-1">
                <TimelineVisual status={o.status} />
              </div>

              {/* Logistics Docket Info Layer */}
              {docket && (
                <div className="bg-[#f4faf6] border border-green-100/60 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-green-800 uppercase tracking-widest">
                      🚚 Digital Logistics Docket
                    </span>
                    <span className="text-xs font-black text-[#122b16] select-all bg-white px-2.5 py-0.5 rounded border border-green-150">
                      {docket.docketHumanId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-650 font-semibold leading-relaxed">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">
                        Carrier Vehicle
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        {docket.vehicleIdentifier}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">
                        Crop Quantity
                      </p>
                      <p className="text-slate-800 font-extrabold">
                        {docket.agreedQuantity} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">
                        Origin / Farm
                      </p>
                      <p className="text-slate-850 truncate">
                        {docket.pickupLocation}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">
                        Intended Destination
                      </p>
                      <p className="text-slate-850 truncate">
                        {docket.deliveryLocation}
                      </p>
                    </div>
                  </div>

                  {/* Quality Docket Match Results */}
                  {comparison && (
                    <div className="border-t border-green-100/60 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="font-extrabold text-slate-450 uppercase">
                          Matching Engine Results
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                            comparison.result === "MATCHED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {comparison.result}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          {comparison.checks.orderMatched ? "✓" : "⚠"} Order ID
                          Link
                        </span>
                        <span className="flex items-center gap-1">
                          {comparison.checks.lotMatched ? "✓" : "⚠"} Lot ID Link
                        </span>
                        <span className="flex items-center gap-1">
                          {comparison.checks.cropMatched ? "✓" : "⚠"} Crop Match
                        </span>
                        <span className="flex items-center gap-1">
                          {comparison.checks.quantityMatched ? "✓" : "⚠"}{" "}
                          Quantity Match (Agreed vs Delivery:{" "}
                          {docket.deliveredQuantity ?? "?"} kg)
                        </span>
                        <span className="flex items-center gap-1">
                          {comparison.checks.destinationMatched ? "✓" : "⚠"}{" "}
                          Destination (Reported Location)
                        </span>
                        <span className="flex items-center gap-1">
                          {comparison.checks.transportMatched ? "✓" : "⚠"}{" "}
                          Transporter Verified
                        </span>
                      </div>

                      {docket.deliveredQuantity !== undefined && (
                        <div className="bg-white/80 border border-green-50 rounded-xl p-2.5 text-[10.5px]">
                          <p className="font-extrabold text-[#122b16] uppercase text-[9px] tracking-wide">
                            Transporter delivery report
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1 font-semibold text-slate-600">
                            <span>
                              Delivered: **{docket.deliveredQuantity} kg**
                            </span>
                            <span>
                              Location: **
                              {docket.reportedDeliveryLocation ||
                                "Manual Entry"}
                              **
                            </span>
                            <span>
                              Receiver: **{docket.reportedReceivingParty}**
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detail Panels grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Protected Escrow status */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    🔐 Protected Settlement State
                  </h4>
                  <div className="text-[11px] font-bold text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span
                        className={
                          o.paymentStatus === "VERIFIED"
                            ? "text-green-600 font-black"
                            : "text-amber-600"
                        }
                      >
                        {o.paymentStatus === "VERIFIED"
                          ? "✓ Payment Verified"
                          : "⏳ Pending Capture"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Settlement Status:</span>
                      <span className="font-extrabold text-slate-800">
                        {o.settlementStatus}
                      </span>
                    </div>
                    {isDisputed && (
                      <div className="bg-red-50 text-red-800 rounded-lg p-2.5 space-y-0.5 text-[9.5px]">
                        <p className="font-black">⚠️ DISPUTE UNDER REVIEW</p>
                        <p className="text-slate-500 font-medium">
                          Payment: protected / settlement pending
                        </p>
                        <p className="text-slate-500 font-medium">
                          Reason: {openDisputes[0].disputeReason}
                        </p>
                        <p className="text-slate-500 font-medium">
                          Status: Admin Review
                        </p>
                        {openDisputes[0].note && (
                          <p className="italic text-slate-450 font-medium font-sans">
                            "{openDisputes[0].note}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mutual Verification Panel */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    🤝 CUSTOMER MUTUAL VERIFICATION
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-extrabold">
                    <div
                      className={`p-2 rounded-xl border ${
                        farmerConfirm
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      <p className="text-[8px] uppercase tracking-wide text-slate-400">
                        My Confirm
                      </p>
                      <p className="text-xs mt-1">
                        {farmerConfirm ? "✓ Confirmed" : "⏳ Pending"}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        buyerConfirm
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-white border-slate-205 text-slate-400"
                      }`}
                    >
                      <p className="text-[8px] uppercase tracking-wide text-slate-400">
                        Buyer Confirm
                      </p>
                      <p className="text-xs mt-1">
                        {buyerConfirm ? "✓ Confirmed" : "⏳ Pending"}
                      </p>
                    </div>
                  </div>

                  {settlementEligible && (
                    <div className="text-[10px] text-green-700 bg-green-50 rounded-lg p-2 text-center font-black uppercase tracking-wide">
                      🎉 ✓ SETTLEMENT RELEASE ELIGIBLE
                    </div>
                  )}
                </div>
              </div>

              {/* History events trail log */}
              {orderEvents.length > 0 && (
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    📋 Escrow History Trail log
                  </h4>
                  <div className="text-[9.5px] space-y-1 font-semibold text-slate-500 max-h-24 overflow-y-auto pr-2">
                    {orderEvents.map((ev, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          • {ev.eventType} (Actor: {ev.actor})
                        </span>
                        <span className="text-[9px] text-slate-450">
                          {new Date(ev.timestamp || "").toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SIMULATED TRANSPORTER CONSOLE ON FARMER PAGE */}
              {o.status !== "PENDING_PAYMENT" && o.status !== "COMPLETED" && (
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                    🛠️ Transporter Console (Transporter Joe - 9876555555)
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {!docket ? (
                      <button
                        onClick={() => handleAssignTransporter(o.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition"
                      >
                        Assign Transporter (Create Docket)
                      </button>
                    ) : (
                      <>
                        {docket.status === "TRANSPORT_ASSIGNED" && (
                          <button
                            onClick={() =>
                              handleTransporterPickup(
                                o.id,
                                o.lotId,
                                "MH-15-AB-1234",
                                docket.agreedQuantity,
                              )
                            }
                            className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-black transition"
                          >
                            Confirm Transporter Pickup [PICKUP_CONFIRMED]
                          </button>
                        )}

                        {docket.status === "IN_TRANSIT" && (
                          <div className="w-full space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-left">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">
                                  Delivered Quantity (kg)
                                </label>
                                <input
                                  type="number"
                                  value={reportedQty}
                                  onChange={(e) =>
                                    setReportedQty(Number(e.target.value))
                                  }
                                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">
                                  Delivered Location ("Reported Location")
                                </label>
                                <input
                                  type="text"
                                  value={reportedLoc}
                                  onChange={(e) =>
                                    setReportedLoc(e.target.value)
                                  }
                                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleTransporterDelivery(
                                  o.id,
                                  reportedQty,
                                  reportedLoc,
                                )
                              }
                              className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-black transition mt-1"
                            >
                              Record Transporter Delivery [DELIVERY_REPORTED]
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Actions details controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-[10.5px] text-slate-400 font-semibold italic">
                  {o.status === "PENDING_PAYMENT" &&
                    "* Waiting for buyer payload checks."}
                  {o.status === "PAID" &&
                    "* Payment secured. Carriers ready to pick up."}
                  {o.status === "DELIVERED" &&
                    !farmerConfirm &&
                    "* Confirm delivery to mark mutual transaction status."}
                  {farmerConfirm &&
                    !buyerConfirm &&
                    "* Waiting for Suresh (Buyer) to submit confirmation."}
                  {settlementEligible &&
                    "* Click button below to release provider payout funds."}
                  {o.status === "COMPLETED" &&
                    "💸 Settlement complete. Funds successfully paid out."}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Real Actions */}
                  {o.status === "DELIVERED" &&
                    !farmerConfirm &&
                    !isDisputed && (
                      <>
                        <button
                          onClick={() => openDisputeModal(o)}
                          className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl text-xs font-black transition"
                        >
                          ⚠️ Raise Dispute
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => handleFarmerConfirm(o.id)}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow-xs transition"
                        >
                          {isUpdating
                            ? "Processing..."
                            : "✓ Confirm Goods Sent & Release"}
                        </button>
                      </>
                    )}

                  {settlementEligible && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleTriggerSettlement(o.id)}
                      className="px-6 py-2.5 bg-[#122b16] text-[#a7e4b0] hover:bg-[#1a3d20] rounded-xl text-xs font-black shadow-md transition"
                    >
                      {isUpdating
                        ? "Releasing Payout..."
                        : "💸 Release Escrow Funds"}
                    </button>
                  )}

                  {/* Sandbox Simulated state transitions for testing */}
                  {o.status === "PAID" && !docket && (
                    <button
                      disabled={isUpdating}
                      onClick={() =>
                        handleTransitionStatus(o.id, "TRANSPORT_PENDING")
                      }
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      [Simulate Ready transport]
                    </button>
                  )}

                  {o.status === "TRANSPORT_PENDING" && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleTransitionStatus(o.id, "IN_TRANSIT")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      [Simulate Dispatch Cargo]
                    </button>
                  )}

                  {o.status === "IN_TRANSIT" && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleTransitionStatus(o.id, "DELIVERED")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      [Simulate Delivery Arrival]
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* --- DISPUTE RAISING MODAL --- */}
      {disputeOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 sm:p-7 text-center space-y-4">
            <h3 className="text-base font-black text-slate-900">
              ⚠️ Raise Transaction Dispute
            </h3>

            <div className="space-y-3 text-xs text-left">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wide">
                  Select Reason
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) =>
                    setDisputeReason(e.target.value as DisputeReason)
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-white text-slate-700"
                >
                  <option value="Quantity mismatch">Quantity mismatch</option>
                  <option value="Damaged goods">Damaged goods</option>
                  <option value="Wrong produce">Wrong produce</option>
                  <option value="Delivery issue">Delivery issue</option>
                  <option value="Payment/order mismatch">
                    Payment/order mismatch
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wide">
                  Details
                </label>
                <textarea
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Describe your dispute claims here..."
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold min-h-24 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 text-xs">
              <button
                onClick={() => setDisputeOrder(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-655 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                className="flex-1 py-3 bg-red-650 text-white rounded-xl font-black shadow-xs transition"
              >
                File Dispute Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineVisual({ status }: { status: OrderStatus }) {
  const steps = [
    {
      label: "Pay pending",
      activeStates: ["PENDING_PAYMENT", "PAYMENT_FAILED", "PAYMENT_PROCESSING"],
    },
    { label: "Escrow hold", activeStates: ["PAID"] },
    {
      label: "freight assign",
      activeStates: ["TRANSPORT_PENDING", "PICKUP_CONFIRMED"],
    },
    { label: "In transit", activeStates: ["IN_TRANSIT"] },
    {
      label: "Cargo DELIVERED",
      activeStates: ["DELIVERED", "BUYER_VERIFICATION", "SETTLEMENT_PENDING"],
    },
    {
      label: "payout release",
      activeStates: ["COMPLETED", "RELEASE_ELIGIBLE"],
    },
  ]

  const activeIdx = steps.findIndex((s) => s.activeStates.includes(status))

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {steps.map((st, i) => {
        const isPastOrCurrent = i <= activeIdx
        return (
          <div key={st.label} className="flex items-center gap-1.5 shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${
                isPastOrCurrent
                  ? "bg-green-600 text-white"
                  : "bg-slate-50 border border-slate-205 text-slate-400"
              }`}
            >
              {i < activeIdx ? "✓" : i === activeIdx ? "○" : i + 1}
            </div>
            <span
              className={`text-[9.5px] uppercase tracking-wider font-extrabold ${
                isPastOrCurrent ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {st.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-slate-150 font-bold">→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
