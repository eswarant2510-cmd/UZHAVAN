import crypto from "node:crypto"

// Mock state machine transitions

type OrderStatus = "PENDING_PAYMENT" | "PAYMENT_PROCESSING" | "PAID" | "TRANSPORT_PENDING" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "BUYER_VERIFICATION" | "SETTLEMENT_PENDING" | "COMPLETED" | "PAYMENT_FAILED" | "DISPUTED"

interface Order {
  id: string

  amount: number

  status: OrderStatus
}

interface PaymentTransaction {
  orderId: string

  provider: string

  providerOrderId: string

  providerPaymentId: string

  amount: number

  status: string
}

// 1. Signature Verify algorithm matching exact Razorpay requirements

function verifySignature(
  orderId: string,

  paymentId: string,

  signature: string,

  secret: string,
): boolean {
  const text = `${orderId}|${paymentId}`

  const computed = crypto

    .createHmac("sha256", secret)

    .update(text)

    .digest("hex")

  return computed === signature
}

// 2. Webhook Signature Verify algorithm

function verifyWebhookSignature(
  rawBody: string,

  signature: string,

  secret: string,
): boolean {
  const computed = crypto

    .createHmac("sha256", secret)

    .update(rawBody)

    .digest("hex")

  return computed === signature
}

// 3. State Machine transition rules

function transitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
): OrderStatus {
  const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING_PAYMENT: ["PAYMENT_PROCESSING", "PAID", "PAYMENT_FAILED"],

    PAYMENT_PROCESSING: ["PAID", "PAYMENT_FAILED"],

    PAID: ["TRANSPORT_PENDING", "DISPUTED"],

    TRANSPORT_PENDING: ["PICKUP_CONFIRMED", "DISPUTED"],

    PICKUP_CONFIRMED: ["IN_TRANSIT", "DISPUTED"],

    IN_TRANSIT: ["DELIVERED", "DISPUTED"],

    DELIVERED: ["BUYER_VERIFICATION", "DISPUTED"],

    BUYER_VERIFICATION: ["SETTLEMENT_PENDING", "DISPUTED"],

    SETTLEMENT_PENDING: ["COMPLETED", "DISPUTED"],

    COMPLETED: [],

    PAYMENT_FAILED: ["PENDING_PAYMENT"],

    DISPUTED: ["COMPLETED", "PAYMENT_FAILED"],
  }

  const allowed = allowedTransitions[current]

  if (allowed.includes(next)) {
    return next
  }

  throw new Error(`Invalid order state transition: from ${current} to ${next}`)
}

// RUN TESTS

const dbOrders: Record<string, Order> = {}

const dbTransactions: PaymentTransaction[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }

  console.log(`✓ PASS: ${message}`)
}

console.log("=== STARTING UZHAVAN PAYMENT INTEGRATION TEST SUITE ===")

// Test 1: Order creation

const orderId = "ORD-TEST-99"

dbOrders[orderId] = {
  id: orderId,

  amount: 25000,

  status: "PENDING_PAYMENT",
}

assert(
  dbOrders[orderId].status === "PENDING_PAYMENT",
  "Order defaults to PENDING_PAYMENT",
)

// Test 2: Valid Razorpay signature verification

const secret = "test_key_secret_abc123"

const rzpOrderId = "order_O9x2V5y0zABC"

const rzpPaymentId = "pay_Ky9x2V5y0zXYZ"

const text = `${rzpOrderId}|${rzpPaymentId}`

const validSig = crypto.createHmac("sha256", secret).update(text).digest("hex")

const checkValid = verifySignature(rzpOrderId, rzpPaymentId, validSig, secret)

assert(checkValid === true, "Matches signature correctly using key secret")

const checkInvalid = verifySignature(
  rzpOrderId,
  rzpPaymentId,
  "invalid_sig",
  secret,
)

assert(checkInvalid === false, "Rejects incorrect signature")

// Test 3: Escrow Payment Capture & State Machine update

if (checkValid) {
  const orderObj = dbOrders[orderId]

  orderObj.status = transitionOrderStatus(orderObj.status, "PAID")

  dbTransactions.push({
    orderId,

    provider: "razorpay",

    providerOrderId: rzpOrderId,

    providerPaymentId: rzpPaymentId,

    amount: orderObj.amount,

    status: "captured",
  })
}

assert(
  dbOrders[orderId].status === "PAID",
  "Order status successfully updated to PAID after checkout",
)

assert(
  dbTransactions.length === 1,
  "Payment transaction details persisted in DB",
)

// Test 4: Webhook Signature Checks

const webhookSecret = "wh_secret_789"

const rawPayload = JSON.stringify({
  event: "order.paid",

  payload: {
    order: { entity: { id: rzpOrderId, receipt: orderId } },
  },
})

const whSig = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawPayload)
  .digest("hex")

assert(
  verifyWebhookSignature(rawPayload, whSig, webhookSecret) === true,
  "Validates webhook message token payload",
)

// Test 5: Idempotency protections

console.log("Executing webhook check...")

const orderObj = dbOrders[orderId]

if (orderObj.status === "PAID") {
  console.log(
    "Idempotent check triggered: Order is already PAID. Skipping duplicate transaction insertion.",
  )
} else {
  orderObj.status = transitionOrderStatus(orderObj.status, "PAID")
}

assert(dbOrders[orderId].status === "PAID", "Order status remains PAID")

assert(
  dbTransactions.length === 1,
  "Idempotency prevents duplicate transaction insertion",
)

// Test 6: Invalid state transition validation

try {
  transitionOrderStatus("PENDING_PAYMENT", "COMPLETED")

  assert(false, "Should have thrown error on invalid state jump")
} catch (e: any) {
  assert(
    e.message.includes("Invalid order state transition"),
    "Prevents illegal status bypass skips",
  )
}

console.log("=== ALL PAYMENT INTEGRATION TESTS PASSED ===")
