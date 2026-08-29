import { useEffect, useState } from "react"
import { farmerApi } from "../../services/farmerApi"
import type {
  Order,
  OrderStatus,
  VerificationRecord,
  DisputeRecord,
  AuditEvent,
  DisputeReason,
  LogisticsDocket,
} from "../../lib/types"

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Logistics dockets map
  const [dockets, setDockets] =
    useState<Record<string, LogisticsDocket | null>>({})
  const [matchingResults, setMatchingResults] = useState<Record<string, any>>(
    {},
  )

  // States mapping order IDs to their detailed objects
  const [verifications, setVerifications] =
    useState<Record<string, VerificationRecord[]>>({})
  const [disputes, setDisputes] = useState<Record<string, DisputeRecord[]>>({})
  const [auditEvents, setAuditEvents] = useState<Record<string, AuditEvent[]>>(
    {},
  )

  // UI state
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  )
  const [showSimulatedModal, setShowSimulatedModal] = useState<Order | null>(
    null,
  )
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null)

  // Dispute Modal state
  const [disputeModalOrder, setDisputeModalOrder] = useState<Order | null>(null)
  const [disputeReason, setDisputeReason] =
    useState<DisputeReason>("Quantity mismatch")
  const [disputeNote, setDisputeNote] = useState("")

  // Simulation values for Reporting Deliveries
  const [reportedQty, setReportedQty] = useState<number>(500)
  const [reportedLoc, setReportedLoc] = useState<string>(
    "Mumbai Wholesale Market, Maharashtra",
  )

  // Load orders and metrics
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

  // Load Razorpay JS SDK dynamically
  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  async function handleStartPayment(order: Order) {
    setError(null)
    setProcessingOrderId(order.id)

    try {
      const res = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amount: order.amount }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Order creation backend failed")
      }

      if (data.warning || !import.meta.env.VITE_RAZORPAY_KEY_ID) {
        console.warn(
          "Razorpay credentials missing. Triggering local mock payment checkout.",
        )
        setShowSimulatedModal({ ...order, id: order.id })
        setProcessingOrderId(null)
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay checkout library.")
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "UZHAVAN Marketplace",
        description: `Order Purchase #${order.id}`,
        order_id: data.id,
        handler: async function (response: any) {
          try {
            setProcessingOrderId(order.id)
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(
                verifyData.error || "Signature verification failed",
              )
            }

            await farmerApi.updateOrderStatus(order.id, "PAID")

            // Webhook event dispatch
            await fetch("/api/razorpay-webhook", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": "simulated_webhook_sig",
              },
              body: JSON.stringify({
                event: "order.paid",
                payload: {
                  order: {
                    entity: {
                      id: response.razorpay_order_id,
                      receipt: order.id,
                    },
                  },
                  payment: {
                    entity: {
                      id: response.razorpay_payment_id,
                      status: "captured",
                    },
                  },
                },
              }),
            })

            loadOrders()
          } catch (verifyErr: any) {
            setError(verifyErr.message || "Failed to verify signature.")
            await farmerApi.updateOrderStatus(order.id, "PAYMENT_FAILED")
            loadOrders()
          } finally {
            setProcessingOrderId(null)
          }
        },
        prefill: {
          name: "Suresh Agarwal",
          contact: "9876500001",
        },
        theme: {
          color: "#16a34a",
        },
      }

      const rzpObj = new (window as any).Razorpay(options)
      rzpObj.open()
    } catch (err: any) {
      setError(err.message || "Payment launch failed")
    } finally {
      if (!showSimulatedModal) setProcessingOrderId(null)
    }
  }

  // Trigger Simulated Checkout Success
  async function handleSimulateSuccess(order: Order) {
    setShowSimulatedModal(null)
    setProcessingOrderId(order.id)

    try {
      const mockOrderId = `rzp_order_${Math.random().toString(36).slice(2, 10)}`
      const mockPayId = `pay_${Math.random().toString(36).slice(2, 12)}`

      const verifyRes = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPayId,
          razorpay_signature: "simulated_success",
        }),
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.error || "Simulation Verification rejected")
      }

      await farmerApi.updateOrderStatus(order.id, "PAID")

      // Webhook dispatch
      await fetch("/api/razorpay-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "simulated_webhook_sig",
        },
        body: JSON.stringify({
          event: "order.paid",
          payload: {
            order: { entity: { id: mockOrderId, receipt: order.id } },
            payment: { entity: { id: mockPayId, status: "captured" } },
          },
        }),
      })

      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingOrderId(null)
    }
  }

  async function handleInspectTransaction(orderId: string) {
    const txn = await farmerApi.getPaymentTransaction(orderId)
    setSelectedTxn(txn)
  }

  // Buyer submits delivery verification
  async function handleBuyerConfirm(orderId: string) {
    setError(null)
    try {
      await farmerApi.submitVerification(
        orderId,
        "buyer",
        "CONFIRMED",
        "Buyer confirmed receive",
      )
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to confirm verification.")
    }
  }

  // Raise dispute modal trigger
  function openDisputeModal(order: Order) {
    setDisputeModalOrder(order)
    setDisputeReason("Quantity mismatch")
    setDisputeNote("")
  }

  async function submitDispute() {
    if (!disputeModalOrder) return
    setError(null)
    try {
      await farmerApi.raiseDispute(
        disputeModalOrder.id,
        disputeReason,
        disputeNote,
      )
      setDisputeModalOrder(null)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || "Failed to raise dispute.")
    }
  }

  // ----------------------------------------------------
  // SIMULATOR TRANSPORTER FUNCTIONS
  // ----------------------------------------------------
  async function handleAssignTransporter(orderId: string) {
    setError(null)
    try {
      // Mock transporter phone number
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
      // Enforce security phone "9876555555"
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
      // Enforce security phone "9876555555" (Transporter)
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

  if (loading) {
    return (
      <div className="h-64 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#122b16]">
          Buyer Purchase Orders
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review accepted smart lots, complete secure escrow transactions,
          verify dockets, and track mutual releases
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-750 text-xs px-4 py-2.5 rounded-2xl font-semibold">
          ⚠️ {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="p-8 bg-slate-50 rounded-3xl text-center text-xs text-slate-500 font-semibold border">
          No active matching orders found.
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((o) => {
            const isPending = o.status === "PENDING_PAYMENT"
            const isProcessing = processingOrderId === o.id
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
            const buyerVerify = orderVerifications.find(
              (v) => v.role === "buyer",
            )

            const farmerConfirm =
              farmerVerify?.verificationResult === "CONFIRMED"
            const buyerConfirm = buyerVerify?.verificationResult === "CONFIRMED"

            return (
              <div
                key={o.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 space-y-5 hover:shadow-xs transition"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded font-black uppercase">
                      Order Docket
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-1">
                      Order #{o.id}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Crop Type: {o.crop} · Created:{" "}
                      {new Date(o.createdAt || "").toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-2xl font-black text-[#122b16]">
                      ₹{o.amount.toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-1 rounded inline-block border mt-1 ${
                        isDisputed
                          ? "bg-red-50 border-red-200 text-red-800"
                          : o.status === "COMPLETED"
                            ? "bg-slate-50 border-slate-200 text-slate-700"
                            : o.status === "RELEASE_ELIGIBLE"
                              ? "bg-emerald-50 border-emerald-250 text-emerald-800"
                              : o.status === "PAID"
                                ? "bg-green-50 border-green-200 text-green-800"
                                : o.status === "PENDING_PAYMENT"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-slate-50 border-slate-205 text-slate-700"
                      }`}
                    >
                      {isDisputed ? "DISPUTED" : o.status}
                    </span>
                  </div>
                </div>

                {/* Progress Visualizer with Logistics Steps */}
                <div className="pt-1">
                  <OrderTimeline status={o.status} />
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
                            {comparison.checks.orderMatched ? "✓" : "⚠"} Order
                            ID Link
                          </span>
                          <span className="flex items-center gap-1">
                            {comparison.checks.lotMatched ? "✓" : "⚠"} Lot ID
                            Link
                          </span>
                          <span className="flex items-center gap-1">
                            {comparison.checks.cropMatched ? "✓" : "⚠"} Crop
                            Match
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Escrow Details */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                      🛡️ Protected Escrow Properties
                    </h3>
                    <div className="text-[11px] space-y-1.5 font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Payment Status:</span>
                        <span
                          className={`font-black ${
                            o.paymentStatus === "VERIFIED"
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          {o.paymentStatus === "VERIFIED"
                            ? "✓ Verified"
                            : "⏳ Pending"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Settlement Status:</span>
                        <span className="font-extrabold text-slate-800">
                          {o.settlementStatus}
                        </span>
                      </div>
                      {isDisputed && (
                        <div className="bg-red-50 text-red-800 p-2.5 rounded-lg text-[10px] mt-1 space-y-0.5">
                          <p className="font-black">
                            ⚠️ Active Dispute Resolved Actions Suspended
                          </p>
                          <p className="text-slate-500 font-medium">
                            Reason: {openDisputes[0].disputeReason} · Raised By:{" "}
                            {openDisputes[0].raisedBy}
                          </p>
                          {openDisputes[0].note && (
                            <p className="italic text-slate-400 font-medium font-sans">
                              "{openDisputes[0].note}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mutual Verification Panel */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                      🤝 Mutual Verification Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                      <div
                        className={`p-2 rounded-xl border ${
                          farmerConfirm
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        <p className="text-[8px] uppercase tracking-wide text-slate-400">
                          Farmer Confirm
                        </p>
                        <p className="text-xs font-black mt-1">
                          {farmerConfirm ? "✓ Confirmed" : "⏳ Waiting"}
                        </p>
                      </div>

                      <div
                        className={`p-2 rounded-xl border ${
                          buyerConfirm
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        <p className="text-[8px] uppercase tracking-wide text-slate-400">
                          Buyer Confirm
                        </p>
                        <p className="text-xs font-black mt-1">
                          {buyerConfirm ? "✓ Confirmed" : "⏳ Waiting"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Event trail logs */}
                {orderEvents.length > 0 && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      📋 Escrow History Trail log
                    </h4>
                    <div className="text-[10px] space-y-1 font-semibold text-slate-500 max-h-24 overflow-y-auto pr-2">
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

                {/* SIMULATED TRANSPORTER CONSOLE (Rule 15 & 18 boundaries highlighted) */}
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
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
                                    className="w-full px-3 py-1.5 border rounded-lg"
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
                                    className="w-full px-3 py-1.5 border rounded-lg"
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

                {/* Verification Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium italic">
                    {o.status === "PAID" &&
                      "* Escrow protected. Carrier assignment in progress."}
                    {o.status === "DELIVERED" &&
                      !buyerConfirm &&
                      "* Validate received cargo state to release payout."}
                    {buyerConfirm &&
                      !farmerConfirm &&
                      "* Waiting for Ramesh (Farmer) to confirm delivery receipt."}
                    {buyerConfirm &&
                      farmerConfirm &&
                      o.status === "RELEASE_ELIGIBLE" &&
                      "✨ Mutual verification complete! Funds ready to settle."}
                  </div>

                  <div className="flex gap-2">
                    {o.status === "PAID" && (
                      <button
                        onClick={() => handleInspectTransaction(o.id)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-650 hover:bg-slate-50 transition"
                      >
                        📄 View Receipt
                      </button>
                    )}

                    {isPending && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleStartPayment(o)}
                        className="min-h-10 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow-md hover:scale-[1.01] transition disabled:opacity-50"
                      >
                        {isProcessing
                          ? "Launching Gateway..."
                          : "💳 PAY SECURELY"}
                      </button>
                    )}

                    {o.status === "DELIVERED" &&
                      !buyerConfirm &&
                      !isDisputed && (
                        <>
                          <button
                            onClick={() => openDisputeModal(o)}
                            className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100/80 rounded-xl text-xs font-black transition"
                          >
                            ⚠️ Raise Dispute
                          </button>
                          <button
                            onClick={() => handleBuyerConfirm(o.id)}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition"
                          >
                            ✓ Confirm Goods Received
                          </button>
                        </>
                      )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- MOCK SIMULATED PORTAL ON DETAILS CHECKOUT --- */}
      {showSimulatedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 sm:p-7 text-center space-y-4">
            <span className="text-4xl">🛠️</span>
            <h2 className="text-lg font-bold text-slate-900">
              Razorpay API Simulation
            </h2>

            <div className="bg-amber-50/60 text-amber-800 text-[10.5px] px-3.5 py-3 rounded-2xl font-bold leading-relaxed">
              No Razorpay API Credentials found in process environment
              variables. Initializing simulation mode.
            </div>

            <div className="text-xs text-slate-500 font-semibold text-left space-y-1.5 border border-slate-100 rounded-2xl p-4 bg-slate-50">
              <div className="flex justify-between">
                <span>Docker Order Receipt:</span>
                <span className="font-extrabold text-slate-800">
                  {showSimulatedModal.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Crop Value Amount:</span>
                <span className="font-extrabold text-slate-800">
                  ₹{showSimulatedModal.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sandbox Mode:</span>
                <span className="font-extrabold text-green-700">
                  TEST CHECKOUT
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSimulatedModal(null)}
                className="flex-1 py-2.5 border border-slate-205 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSimulateSuccess(showSimulatedModal)}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition"
              >
                Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSACTION RECEIPT DETAILS MODAL --- */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-105 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <button
              onClick={() => setSelectedTxn(null)}
              className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full cursor-pointer transition font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-2 border-b border-dashed border-slate-100 pb-4">
              <span className="text-base text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider font-black">
                ✓ PAYMENT VERIFIED
              </span>
              <p className="text-[10px] text-slate-400 uppercase pt-2 font-black tracking-wider">
                Authorized receipt summary
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-650 font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-black text-slate-800">
                  {selectedTxn.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Razorpay Payment ID:</span>
                <span className="font-black text-slate-700 select-all">
                  {selectedTxn.providerPaymentId || "unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Purchase Paid:</span>
                <span className="font-black text-[#122b16] text-sm">
                  ₹{Number(selectedTxn.amount).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Provider:</span>
                <span className="font-black text-slate-800">
                  {selectedTxn.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Checkout Mode:</span>
                <span className="font-extrabold text-green-605">TEST</span>
              </div>
            </div>

            <div className="bg-red-50 text-red-800 rounded-2xl p-4 text-[10.5px] font-black text-center uppercase tracking-wide">
              TEST MODE — NO REAL MONEY
            </div>
          </div>
        </div>
      )}

      {/* --- DISPUTE RAISING MODAL --- */}
      {disputeModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 sm:p-7 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              ⚠️ Raise Transaction Dispute
            </h3>

            <div className="space-y-3 text-xs">
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
                  Additional Details
                </label>
                <textarea
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Explain exactly what is wrong with the delivery..."
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold min-h-24 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 text-xs">
              <button
                onClick={() => setDisputeModalOrder(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-650 transition"
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

function OrderTimeline({ status }: { status: OrderStatus }) {
  const steps = [
    { label: "Order Created", state: "PENDING_PAYMENT" },
    { label: "Fulfillment Assign", state: "TRANSPORT_PENDING" },
    { label: "Pickup Complete", state: "PICKUP_CONFIRMED" },
    { label: "🚚 In Transit", state: "IN_TRANSIT" },
    { label: "Delivery Arrived", state: "DELIVERED" },
    { label: "Verification & Release", state: "COMPLETED" },
  ]

  const getIndex = (curr: OrderStatus) => {
    if (curr === "PENDING_PAYMENT" || curr === "PAYMENT_FAILED") return 0
    if (curr === "PAYMENT_PROCESSING") return 0
    if (curr === "PAID") return 1
    if (curr === "TRANSPORT_PENDING") return 1
    if (curr === "PICKUP_CONFIRMED") return 2
    if (curr === "IN_TRANSIT") return 3
    if (curr === "DELIVERED" || curr === "BUYER_VERIFICATION") return 4
    return 5
  }

  const activeIdx = getIndex(status)

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {steps.map((st, i) => (
        <div key={st.label} className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
              i <= activeIdx
                ? "bg-green-600 text-white"
                : "bg-slate-50 border border-slate-202 text-slate-400"
            }`}
          >
            {i < activeIdx ? "✓" : i === activeIdx ? "○" : i + 1}
          </div>
          <span
            className={`text-[10px] ${
              i <= activeIdx ? "font-bold text-slate-800" : "text-slate-400"
            }`}
          >
            {st.label}
          </span>
          {i < steps.length - 1 && <span className="text-slate-200">→</span>}
        </div>
      ))}
    </div>
  )
}
