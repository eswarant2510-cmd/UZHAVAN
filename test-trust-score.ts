import assert from "node:assert/strict"
import { calculateTrustSummary } from "./src/lib/trust.ts"

const baseOrders = [
  {
    id: "ORD-1",
    buyerPhone: "9876500001",
    farmerPhone: "9876543210",
    status: "COMPLETED",
    paymentStatus: "VERIFIED",
    settlementStatus: "SETTLED",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "ORD-2",
    buyerPhone: "9876500001",
    farmerPhone: "9876543210",
    status: "COMPLETED",
    paymentStatus: "VERIFIED",
    settlementStatus: "SETTLED",
    createdAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "ORD-3",
    buyerPhone: "9876500001",
    farmerPhone: "9876543210",
    status: "DELIVERED",
    paymentStatus: "VERIFIED",
    settlementStatus: "RELEASE_ELIGIBLE",
    createdAt: "2026-01-15T00:00:00.000Z",
  },
]

const verifications = [
  {
    orderId: "ORD-1",
    actorPhone: "9876543210",
    role: "farmer",
    verificationResult: "CONFIRMED",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    orderId: "ORD-1",
    actorPhone: "9876500001",
    role: "buyer",
    verificationResult: "CONFIRMED",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
]

const disputes = [
  {
    id: "D-1",
    orderId: "ORD-2",
    raisedBy: "9876500001",
    disputeReason: "Quantity mismatch",
    disputeStatus: "RESOLVED",
    createdAt: "2026-01-13T00:00:00.000Z",
    note: "Seller accepted discrepancy and closed as partial resolution",
  },
]

const buyerSummary = calculateTrustSummary({
  role: "buyer",
  phone: "9876500001",
  orders: baseOrders,
  disputes,
  verifications,
  profileName: "Suresh Agarwal",
})

assert.equal(buyerSummary.hasEnoughHistory, true)
assert.equal(buyerSummary.score !== null, true)
assert.ok(buyerSummary.score !== null && buyerSummary.score >= 60)
assert.ok(buyerSummary.breakdown.some((item) => item.label === "Payment reliability"))

const newUser = calculateTrustSummary({
  role: "buyer",
  phone: "9999999999",
  orders: [],
  disputes: [],
  verifications: [],
  profileName: "New Buyer",
})

assert.equal(newUser.score, null)
assert.equal(newUser.hasEnoughHistory, false)

console.log("Trust score tests passed")
