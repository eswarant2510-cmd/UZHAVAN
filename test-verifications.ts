import crypto from "node:crypto"

// Core types mimicking types.ts

type OrderStatus = "PENDING_PAYMENT" | "PAYMENT_PROCESSING" | "PAID" | "TRANSPORT_PENDING" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "BUYER_VERIFICATION" | "SETTLEMENT_PENDING" | "RELEASE_ELIGIBLE" | "COMPLETED" | "PAYMENT_FAILED" | "DISPUTED"

interface Order {
  id: string

  amount: number

  status: OrderStatus

  paymentStatus: "PENDING" | "VERIFIED" | "FAILED"

  settlementStatus: "NOT_CREATED" | "ON_HOLD" | "RELEASE_ELIGIBLE" | "RELEASE_REQUESTED" | "SETTLED" | "REFUNDED" | "DISPUTED"
}

interface VerificationRecord {
  orderId: string

  actorPhone: string

  role: "farmer" | "buyer"

  verificationResult: "PENDING" | "CONFIRMED" | "DISPUTED"
}

interface DisputeRecord {
  orderId: string

  raisedBy: string

  disputeReason: string

  disputeStatus: "OPEN" | "RESOLVED"
}

interface AuditEvent {
  orderId: string

  eventType: string

  actor: string
}

// Global state simulation

let dbOrders: Record<string, Order> = {}

let dbVerifications: VerificationRecord[] = []

let dbDisputes: DisputeRecord[] = []

let dbAuditEvents: AuditEvent[] = []

function resetTestDb() {
  dbOrders = {}

  dbVerifications = []

  dbDisputes = []

  dbAuditEvents = []
}

// Target Logic Functions

function addAuditEvent(orderId: string, eventType: string, actor: string) {
  // Prevent duplicates for identical events to enforce idempotency

  const exists = dbAuditEvents.some(
    (e) =>
      e.orderId === orderId && e.eventType === eventType && e.actor === actor,
  )

  if (!exists) {
    dbAuditEvents.push({ orderId, eventType, actor })
  }
}

function processWebhookPayment(
  orderId: string,
  rzpOrderId: string,
  rzpPaymentId: string,
) {
  const order = dbOrders[orderId]

  if (!order) return

  // Idempotency: Protect paid orders from duplicate state mutations

  if (order.paymentStatus === "VERIFIED") {
    console.log(
      `[Webhook] Order ${orderId} already verified. Skipping duplicate transitions.`,
    )

    return
  }

  order.status = "PAID"

  order.paymentStatus = "VERIFIED"

  order.settlementStatus = "ON_HOLD"

  addAuditEvent(orderId, "PAYMENT_VERIFIED", "webhook")

  addAuditEvent(orderId, "SETTLEMENT_PROTECTED", "webhook")
}

function submitVerification(
  callerPhone: string,

  callerRole: "farmer" | "buyer",

  orderId: string,

  role: "farmer" | "buyer",

  result: "CONFIRMED" | "DISPUTED",
) {
  const order = dbOrders[orderId]

  if (!order) throw new Error("Order not found")

  // Authentication & Security check:

  if (!callerPhone) {
    throw new Error("Unauthenticated user rejected")
  }

  if (callerRole !== role) {
    throw new Error(
      `Unauthorized: Role mismatch. Caller is ${callerRole} attempting ${role} verification.`,
    )
  }

  // Idempotence: No duplicate verifications

  const existingIdx = dbVerifications.findIndex(
    (v) => v.orderId === orderId && v.role === role,
  )

  if (existingIdx !== -1) {
    if (dbVerifications[existingIdx].verificationResult === result) {
      console.log(
        `[Verify] Duplicate verification submitted for ${role}. Ignoring.`,
      )

      return
    }

    dbVerifications[existingIdx].verificationResult = result
  } else {
    dbVerifications.push({
      orderId,
      actorPhone: callerPhone,
      role,
      verificationResult: result,
    })
  }

  const evType = role === "farmer" ? "FARMER_VERIFIED" : "BUYER_VERIFIED"

  addAuditEvent(orderId, evType, callerPhone)

  // Evaluate mutual verification

  const verifications = dbVerifications.filter((v) => v.orderId === orderId)

  const hasFarmer = verifications.some(
    (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
  )

  const hasBuyer = verifications.some(
    (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
  )

  if (
    hasFarmer &&
    hasBuyer &&
    !dbDisputes.some((d) => d.orderId === orderId && d.disputeStatus === "OPEN")
  ) {
    order.status = "RELEASE_ELIGIBLE"

    order.settlementStatus = "RELEASE_ELIGIBLE"

    addAuditEvent(orderId, "MUTUAL_VERIFICATION_COMPLETE", "system")
  }
}

function raiseDispute(callerPhone: string, orderId: string, reason: string) {
  const order = dbOrders[orderId]

  if (!order) throw new Error("Order not found")

  const dispute: DisputeRecord = {
    orderId,

    raisedBy: callerPhone,

    disputeReason: reason,

    disputeStatus: "OPEN",
  }

  dbDisputes.push(dispute)

  order.status = "DISPUTED"

  order.settlementStatus = "DISPUTED"

  addAuditEvent(orderId, "DISPUTE_OPENED", callerPhone)
}

function canReleaseSettlement(
  order: Order,
  verifications: VerificationRecord[],
  disputesCount: number,
): boolean {
  const hasFarmerConfirm = verifications.some(
    (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
  )

  const hasBuyerConfirm = verifications.some(
    (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
  )

  return (
    order.paymentStatus === "VERIFIED" &&
    [
      "DELIVERED",
      "MUTUALLY_VERIFIED",
      "RELEASE_ELIGIBLE",
      "COMPLETED",
    ].includes(order.status) &&
    hasFarmerConfirm &&
    hasBuyerConfirm &&
    disputesCount === 0 &&
    order.settlementStatus !== "SETTLED"
  )
}

function executePayout(callerRole: string, orderId: string) {
  const order = dbOrders[orderId]

  if (!order) throw new Error("Order not found")

  if (callerRole !== "admin" && callerRole !== "system") {
    throw new Error("Direct payout trigger unauthorized for farmers or buyers.")
  }

  const verifications = dbVerifications.filter((v) => v.orderId === orderId)

  const activeDisputes = dbDisputes.filter(
    (d) => d.orderId === orderId && d.disputeStatus === "OPEN",
  )

  if (!canReleaseSettlement(order, verifications, activeDisputes.length)) {
    throw new Error("Escrow conditions not met.")
  }

  order.status = "COMPLETED"

  order.settlementStatus = "SETTLED"

  addAuditEvent(orderId, "SETTLEMENT_COMPLETED", "provider")
}

// Assert helper

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`)

  console.log(`✓ PASS: ${msg}`)
}

// MAIN RUNNER

console.log("=== RUNNING DETAILED TEST SUITE PER CRITICAL INSTRUCTIONS ===")

const farmerPhone = "9876543210"

const buyerPhone = "9876500001"

// TEST 1: Buyer payment succeeds. Expected: PAYMENT_VERIFIED

resetTestDb()

dbOrders["O1"] = {
  id: "O1",
  amount: 10000,
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  settlementStatus: "NOT_CREATED",
}

processWebhookPayment("O1", "rzp_order_01", "pay_01")

assert(
  dbOrders["O1"].paymentStatus === "VERIFIED",
  "T1: Order has payment status VERIFIED",
)

assert(
  dbOrders["O1"].settlementStatus === "ON_HOLD",
  "T1: Settlement status is ON_HOLD",
)

// TEST 2: Payment verified but delivery not completed. Expected: Settlement NOT releasable.

dbOrders["O1"].status = "PAID" // Not DELIVERED yet

assert(
  canReleaseSettlement(dbOrders["O1"], [], 0) === false,

  "T2: Settlement is not releasable prior to delivery",
)

// TEST 3: Delivery completed but only buyer verifies. Expected: Settlement NOT releasable.

dbOrders["O1"].status = "DELIVERED"

submitVerification(buyerPhone, "buyer", "O1", "buyer", "CONFIRMED")

assert(
  canReleaseSettlement(dbOrders["O1"], dbVerifications, 0) === false,

  "T3: Settlement remains locked with only Buyer verification",
)

// TEST 4: Delivery completed but only farmer verifies. Expected: Settlement NOT releasable.

resetTestDb()

dbOrders["O1"] = {
  id: "O1",
  amount: 10000,
  status: "DELIVERED",
  paymentStatus: "VERIFIED",
  settlementStatus: "ON_HOLD",
}

submitVerification(farmerPhone, "farmer", "O1", "farmer", "CONFIRMED")

assert(
  canReleaseSettlement(dbOrders["O1"], dbVerifications, 0) === false,

  "T4: Settlement remains locked with only Farmer verification",
)

// TEST 5: Both farmer and buyer verify. Expected: MUTUALLY_VERIFIED -> RELEASE_ELIGIBLE

submitVerification(buyerPhone, "buyer", "O1", "buyer", "CONFIRMED")

assert(
  dbOrders["O1"].status === "RELEASE_ELIGIBLE",
  "T5: Status advanced to RELEASE_ELIGIBLE",
)

assert(
  canReleaseSettlement(dbOrders["O1"], dbVerifications, 0) === true,

  "T5: Settlement verified as RELEASE ELIGIBLE",
)

// TEST 6: Buyer opens dispute. Expected: DISPUTED -> settlement NOT releasable.

resetTestDb()

dbOrders["O1"] = {
  id: "O1",
  amount: 10000,
  status: "DELIVERED",
  paymentStatus: "VERIFIED",
  settlementStatus: "ON_HOLD",
}

submitVerification(farmerPhone, "farmer", "O1", "farmer", "CONFIRMED")

submitVerification(buyerPhone, "buyer", "O1", "buyer", "CONFIRMED")

raiseDispute(buyerPhone, "O1", "Damaged goods")

assert(
  dbOrders["O1"].status === "DISPUTED",
  "T6: Status transitions to DISPUTED",
)

assert(
  dbOrders["O1"].settlementStatus === "DISPUTED",
  "T6: Settlement Status becomes DISPUTED",
)

assert(
  canReleaseSettlement(dbOrders["O1"], dbVerifications, 1) === false,

  "T6: Settlement locked under active buyer dispute",
)

// TEST 7: Farmer opens dispute. Expected: DISPUTED -> settlement NOT releasable.

resetTestDb()

dbOrders["O1"] = {
  id: "O1",
  amount: 10000,
  status: "DELIVERED",
  paymentStatus: "VERIFIED",
  settlementStatus: "ON_HOLD",
}

submitVerification(farmerPhone, "farmer", "O1", "farmer", "CONFIRMED")

submitVerification(buyerPhone, "buyer", "O1", "buyer", "CONFIRMED")

raiseDispute(farmerPhone, "O1", "Wrong produce")

assert(
  canReleaseSettlement(dbOrders["O1"], dbVerifications, 1) === false,

  "T7: Settlement locked under active farmer dispute",
)

// TEST 8: Duplicate verification request. Expected: No duplicate verification/release.

const beforeLen = dbVerifications.length

submitVerification(buyerPhone, "buyer", "O1", "buyer", "CONFIRMED")

assert(
  dbVerifications.length === beforeLen,
  "T8: Duplicate verifications ignored",
)

// TEST 9: Duplicate webhook. Expected: No duplicate payment state/event.

const auditLogsBefore = dbAuditEvents.length

processWebhookPayment("O1", "rzp_order_01", "pay_01")

assert(
  dbAuditEvents.length === auditLogsBefore,
  "T9: Duplicate webhook captures ignored",
)

// TEST 10: Unauthenticated user attempts verification. Expected: Rejected.

try {
  submitVerification("", "buyer", "O1", "buyer", "CONFIRMED")

  assert(false, "Should have thrown for empty caller")
} catch (e: any) {
  assert(
    e.message.includes("Unauthenticated"),
    "T10: Rejects empty auth profile",
  )
}

// TEST 11: Farmer attempts buyer verification. Expected: Rejected.

try {
  submitVerification(farmerPhone, "farmer", "O1", "buyer", "CONFIRMED")

  assert(false, "Should have blocked farmer pretending to be buyer")
} catch (e: any) {
  assert(
    e.message.includes("Unauthorized"),
    "T11: Blocks farmer verifying on behalf of buyer",
  )
}

// TEST 12: Buyer attempts farmer verification. Expected: Rejected.

try {
  submitVerification(buyerPhone, "buyer", "O1", "farmer", "CONFIRMED")

  assert(false, "Should have blocked buyer pretending to be farmer")
} catch (e: any) {
  assert(
    e.message.includes("Unauthorized"),
    "T12: Blocks buyer verifying on behalf of farmer",
  )
}

// TEST 13: Farmer attempts direct settlement release. Expected: Rejected.

try {
  executePayout("farmer", "O1")

  assert(false, "Should have blocked farmer executing release directly")
} catch (e: any) {
  assert(
    e.message.includes("unauthorized"),
    "T13: Farmer direct release triggers blocked",
  )
}

console.log("=== ALL SPECIFIED STATE TESTS PASSED SUCCESSFULLY ===")
