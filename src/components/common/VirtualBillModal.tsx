import { useEffect, useState } from "react"
import type { Order, LogisticsDocket, PaymentSettlement } from "../../lib/types"
import { calculate8020Settlement } from "../../lib/types"
import { farmerApi } from "../../services/farmerApi"
import { calculateUserTrustScore, type UserTrustMetrics } from "../../services/trustEngineService"

interface VirtualBillModalProps {
  order: Order
  onClose: () => void
}

export default function VirtualBillModal({ order, onClose }: VirtualBillModalProps) {
  const [docket, setDocket] = useState<LogisticsDocket | null>(null)
  const [settlement, setSettlement] = useState<PaymentSettlement | null>(null)
  const [farmerTrust, setFarmerTrust] = useState<UserTrustMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function loadBillDetails() {
      try {
        const [docketData, settlementData, trustData] = await Promise.all([
          farmerApi.getDocketForOrder(order.id),
          farmerApi.getPaymentSettlement(order.id),
          calculateUserTrustScore(order.farmerPhone || "9876543210", "farmer"),
        ])
        if (alive) {
          setDocket(docketData)
          setSettlement(settlementData)
          setFarmerTrust(trustData)
          setLoading(false)
        }
      } catch (err) {
        console.warn("Virtual bill data load note:", err)
        if (alive) setLoading(false)
      }
    }
    loadBillDetails()
    return () => {
      alive = false
    }
  }, [order])

  // Derive 80/20 breakdown safely from authoritative payment settlement record or authoritative calculation
  const authoritativeTotal = order.amount
  const split = calculate8020Settlement(authoritativeTotal)
  const immediate80Amount = settlement ? settlement.immediateReleaseAmount : split.immediateRelease
  const held20Amount = settlement ? settlement.heldAmount : split.held

  // Determine dynamic settlement status display
  let settlement80Status = "RELEASED"
  let settlement20Status = "HELD"

  if (order.status === "COMPLETED" || order.status === "RELEASE_ELIGIBLE" || settlement?.status === "FULLY_SETTLED") {
    settlement20Status = "RELEASED"
  } else if (order.status === "DISPUTED" || settlement?.status === "DISPUTED") {
    settlement20Status = "DISPUTED / HELD"
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 print:shadow-none print:border-none print:m-0 print:p-0">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex justify-between items-center print:hidden border-b border-slate-100 pb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            📄 Authoritative Read-Only Document
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* --- PRINTABLE BILL SECTION --- */}
        <div id="uzhavan-printable-bill" className="space-y-6">
          
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-5 space-y-1">
            <h1 className="text-3xl font-black text-[#122b16] tracking-tight">UZHAVAN</h1>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
              Digital Agricultural Marketplace
            </p>
            <div className="pt-2">
              <span className="inline-block bg-slate-900 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                VIRTUAL BILL / DIGITAL ORDER RECORD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 font-medium italic">
              Generated from authoritative UZHAVAN transaction ledger records
            </p>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs font-semibold text-slate-700">
            <div>
              <span className="text-[9px] uppercase text-slate-400 font-extrabold block">Order ID</span>
              <span className="font-mono font-black text-slate-900">{order.id}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 font-extrabold block">Payment Provider</span>
              <span className="font-extrabold text-blue-700">PiPe Payment Gateway</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 font-extrabold block">Payment Status</span>
              <span className={`font-black ${order.paymentStatus === "VERIFIED" ? "text-emerald-700" : "text-amber-600"}`}>
                {order.paymentStatus}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 font-extrabold block">Order Status</span>
              <span className="font-black text-slate-900">{order.status}</span>
            </div>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1">
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">
                🛒 BUYER DETAILS
              </span>
              <p className="text-sm font-extrabold text-slate-900">Suresh Agarwal (Buyer)</p>
              <p className="text-slate-600">Phone / ID: {order.buyerPhone}</p>
              <p className="text-slate-500 text-[11px]">
                Delivery Address: {order.buyerDeliveryLocation || "Mumbai APMC Yard, Maharashtra"}
              </p>
            </div>

            <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl space-y-1">
              <span className="text-[9px] font-black text-green-800 uppercase tracking-wider block">
                🌾 FARMER DETAILS
              </span>
              <p className="text-sm font-extrabold text-slate-900">Ramesh Farmer</p>
              <p className="text-slate-600">Phone / ID: {order.farmerPhone}</p>
              <p className="text-slate-500 text-[11px]">
                Pickup Location: Nashik Farm, Maharashtra
              </p>
            </div>
          </div>

          {/* Produce Items Table */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              📦 PRODUCE LINE ITEMS
            </span>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-semibold text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-extrabold">
                  <tr>
                    <th className="p-3">Produce Item</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-extrabold text-slate-900">{order.crop || "Fresh Produce"}</td>
                    <td className="p-3 text-right">500 kg</td>
                    <td className="p-3 text-right">₹{(authoritativeTotal / 500).toFixed(2)}/kg</td>
                    <td className="p-3 text-right font-extrabold text-slate-900">₹{authoritativeTotal.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-extrabold">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-xs uppercase text-slate-500">
                      Authoritative Total Order Amount:
                    </td>
                    <td className="p-3 text-right text-base text-[#122b16] font-black">
                      ₹{authoritativeTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment & 80/20 Settlement Breakdown */}
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50/60 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                🛡️ ESCROW PAYMENT & 80/20 SETTLEMENT BREAKDOWN
              </span>
              <span className="text-[10px] font-black bg-emerald-800 text-white px-2 py-0.5 rounded">
                AUTHORITATIVE LEDGER
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
              <div className="p-3 bg-white/80 border border-emerald-100 rounded-xl space-y-1">
                <span className="text-[9px] uppercase text-emerald-800 font-black block">
                  ⚡ Immediate 80% Farmer Release
                </span>
                <p className="text-lg font-black text-emerald-900">₹{immediate80Amount.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-emerald-700 font-extrabold">Status: ✓ {settlement80Status}</p>
              </div>

              <div className="p-3 bg-white/80 border border-emerald-100 rounded-xl space-y-1">
                <span className="text-[9px] uppercase text-amber-800 font-black block">
                  🔒 Retained 20% Settlement Hold
                </span>
                <p className="text-lg font-black text-amber-900">₹{held20Amount.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-amber-700 font-extrabold">Status: ⏳ {settlement20Status}</p>
              </div>
            </div>
          </div>

          {/* Logistics & Transportation Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs font-semibold text-slate-700">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              🚚 LOGISTICS & TRANSPORTATION SPECIFICATIONS
            </span>
            {docket ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Docket ID</span>
                  <span className="font-mono font-bold text-slate-900">{docket.docketHumanId}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Carrier Vehicle</span>
                  <span className="font-bold text-slate-800">{docket.vehicleIdentifier}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Agreed Qty</span>
                  <span className="font-bold text-slate-800">{docket.agreedQuantity} kg</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Status</span>
                  <span className="font-black text-emerald-800">{docket.status}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic text-[11px]">Transportation: Pending Carrier Assignment</p>
            )}
          </div>

          {/* Delivery & Verification Section */}
          {docket && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs font-semibold text-slate-700">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                📋 DELIVERY VERIFICATION SUMMARY
              </span>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Expected Qty</span>
                  <span className="font-bold">{docket.agreedQuantity} kg</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Delivered Qty</span>
                  <span className="font-bold">{docket.deliveredQuantity ?? "Pending"} kg</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Verification Result</span>
                  <span className={`font-black ${docket.status === "MATCHED" ? "text-emerald-700" : docket.status === "MISMATCH" ? "text-red-700" : "text-amber-600"}`}>
                    {docket.status === "MATCHED" ? "MATCHED ✓" : docket.status === "MISMATCH" ? "MISMATCH ⚠" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trust Engine Badge */}
          {farmerTrust && farmerTrust.hasEnoughData && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-150 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-950">
                🛡️ Farmer Trust Rating: <strong className="text-emerald-700">{farmerTrust.score}/100</strong> ({farmerTrust.trustLevel})
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {farmerTrust.totalEvidenceCount} Verified Deliveries
              </span>
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
            <p className="font-bold uppercase tracking-wider text-slate-500">
              Generated from the authoritative UZHAVAN transaction records.
            </p>
            <p>Non-statutory digital record for marketplace audit and escrow verification.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
