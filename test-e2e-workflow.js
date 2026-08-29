// Simulated E2E integration test for UZHAVAN Platform (Milestone 2.1)

const dbMock = {
  profiles: {
    9876543210: { phone: "9876543210", name: "Ramesh Farmer", role: "farmer" },

    9876500001: { phone: "9876500001", name: "Suresh Buyer", role: "buyer" },

    9876500002: {
      phone: "9876500002",
      name: "Vijay Transporter",
      role: "transport",
    },
  },

  lots: {},

  offers: {},

  orders: {},

  dockets: {},

  payments: {},

  verifications: {},

  auditEvents: {},
}

function addAuditEvent(orderId, type, actor) {
  if (!dbMock.auditEvents[orderId]) dbMock.auditEvents[orderId] = []

  dbMock.auditEvents[orderId].push({
    orderId,

    eventType: type,

    actor,

    timestamp: new Date().toISOString(),
  })
}

// 1. Farmer creates lot

function createLot(lotId, crop, quantityKg, expectedNetPerKg) {
  dbMock.lots[lotId] = {
    id: lotId,

    crop,

    quantityKg,

    expectedNetPerKg,

    status: "active",

    createdAt: new Date().toISOString(),
  }

  return dbMock.lots[lotId]
}

// 2. Buyer submits & Farmer accepts offer -> Creates Order

function createOfferAndOrder(
  orderId,
  offerId,
  lotId,
  buyerPhone,
  farmerPhone,
  agreedPriceKg,
) {
  const lot = dbMock.lots[lotId]

  if (!lot) throw new Error("Lot not found")

  dbMock.offers[offerId] = {
    id: offerId,

    lotId,

    buyerPhone,

    offerPricePerKg: agreedPriceKg,

    status: "accepted",

    createdAt: new Date().toISOString(),
  }

  const order = {
    id: orderId,

    lotId,

    offerId,

    buyerPhone,

    farmerPhone,

    amount: lot.quantityKg * agreedPriceKg,

    status: "PENDING_PAYMENT",

    paymentStatus: "PENDING",

    settlementStatus: "ON_HOLD",

    crop: lot.crop,
  }

  dbMock.orders[orderId] = order

  addAuditEvent(orderId, "ORDER_CREATED", buyerPhone)

  return order
}

// 3. Payment verified

function verifyPayment(orderId, txnId, providerOrderId) {
  const order = dbMock.orders[orderId]

  if (!order) throw new Error("Order not found")

  // Check webhook idempotency

  if (dbMock.payments[providerOrderId]) {
    // Already processed

    return dbMock.payments[providerOrderId]
  }

  const payment = {
    id: txnId,

    orderId,

    provider: "razorpay",

    providerOrderId,

    amount: order.amount,

    currency: "INR",

    status: "captured",
  }

  dbMock.payments[providerOrderId] = payment

  order.status = "PAID"

  order.paymentStatus = "VERIFIED"

  addAuditEvent(orderId, "PAYMENT_VERIFIED", "webhook-system")

  return payment
}

// 4. Transport assigned

function assignTransport(orderId, transporterPhone, vehiclePlate) {
  const order = dbMock.orders[orderId]

  if (!order) throw new Error("Order not found")

  const docket = {
    id: "docket-abc",

    orderId,

    lotId: order.lotId,

    transporterPhone,

    crop: order.crop,

    agreedQuantity: dbMock.lots[order.lotId].quantityKg,

    pickupLocation: "Nashik Farm, Maharashtra",

    deliveryLocation: "Mumbai Wholesale Market, Maharashtra",

    vehicleIdentifier: vehiclePlate,

    status: "TRANSPORT_ASSIGNED",
  }

  dbMock.dockets[orderId] = docket

  order.status = "TRANSPORT_PENDING"

  addAuditEvent(orderId, "DOCKET_CREATED", order.farmerPhone)

  addAuditEvent(orderId, "TRANSPORT_ASSIGNED", order.farmerPhone)

  return docket
}

// 5. Transporter accepts job

function acceptTransport(orderId, transporterPhone) {
  const docket = dbMock.dockets[orderId]

  if (docket.transporterPhone !== transporterPhone)
    throw new Error("Unauthorized transport agent")

  docket.status = "TRANSPORT_ACCEPTED"

  dbMock.orders[orderId].status = "TRANSPORT_ACCEPTED"

  addAuditEvent(orderId, "TRANSPORT_ACCEPTED", transporterPhone)
}

// 6. Pickup confirmed

function confirmPickup(orderId, transporterPhone) {
  const docket = dbMock.dockets[orderId]

  if (docket.transporterPhone !== transporterPhone)
    throw new Error("Unauthorized transport agent")

  docket.status = "PICKUP_CONFIRMED"

  dbMock.orders[orderId].status = "PICKUP_CONFIRMED"

  addAuditEvent(orderId, "PICKUP_CONFIRMED", transporterPhone)
}

// 7. Transit started

function startTransit(orderId, transporterPhone) {
  const docket = dbMock.dockets[orderId]

  if (docket.transporterPhone !== transporterPhone)
    throw new Error("Unauthorized transport agent")

  docket.status = "IN_TRANSIT"

  dbMock.orders[orderId].status = "IN_TRANSIT"

  addAuditEvent(orderId, "IN_TRANSIT", transporterPhone)
}

// 8. Delivery reported + Docket matching

function reportDeliveryAndMatch(
  orderId,
  transporterPhone,
  deliveredQuantity,
  reportedDeliveryLocation,
) {
  const docket = dbMock.dockets[orderId]

  if (docket.transporterPhone !== transporterPhone)
    throw new Error("Unauthorized transport agent")

  docket.deliveredQuantity = deliveredQuantity

  docket.reportedDeliveryLocation = reportedDeliveryLocation

  docket.status = "DELIVERY_REPORTED"

  const order = dbMock.orders[orderId]

  // Matching engine logic

  const quantityMatched =
    Math.abs(deliveredQuantity - docket.agreedQuantity) <=
    docket.agreedQuantity * 0.1

  const destinationMatched =
    reportedDeliveryLocation === docket.deliveryLocation

  if (quantityMatched && destinationMatched) {
    docket.status = "MATCHED"

    order.status = "DELIVERED"

    order.settlementStatus = "RELEASE_ELIGIBLE"

    addAuditEvent(orderId, "DELIVERY_REPORTED", transporterPhone)

    addAuditEvent(orderId, "DOCKET_MATCHED", "matching-engine-system")
  } else {
    docket.status = "MISMATCH"

    order.status = "DISPUTED"

    order.settlementStatus = "DISPUTED"

    addAuditEvent(orderId, "DELIVERY_REPORTED", transporterPhone)

    addAuditEvent(orderId, "DOCKET_MISMATCHED", "matching-engine-system")
  }
}

// 9. Mutual Verification

function verifyRole(orderId, actorPhone, role, selection) {
  const order = dbMock.orders[orderId]

  if (!order) throw new Error("Order not found")

  if (!dbMock.verifications[orderId]) dbMock.verifications[orderId] = []

  dbMock.verifications[orderId].push({
    role,

    actorPhone,

    verificationResult: selection,
  })

  const evType = role === "farmer" ? "FARMER_VERIFIED" : "BUYER_VERIFIED"

  addAuditEvent(orderId, evType, actorPhone)

  // Check if both confirmed

  const confirmations = dbMock.verifications[orderId].filter(
    (v) => v.verificationResult === "CONFIRMED",
  )

  if (
    confirmations.length === 2 &&
    order.settlementStatus === "RELEASE_ELIGIBLE"
  ) {
    order.settlementStatus = "SETTLED"

    order.status = "COMPLETED"

    addAuditEvent(orderId, "MUTUAL_VERIFICATION_COMPLETE", "system")

    addAuditEvent(orderId, "SETTLEMENT_COMPLETED", "blockchain-ledger-system")
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error("❌ E2E FAIL: " + message)

    process.exit(1)
  }

  console.log("✓ E2E PASS: " + message)
}

// --- RUN SYSTEM WORKFLOW ---

console.log("=== RUNNING MANDATORY INTEGRATION FLOW ===")

const orderId = "ORD-E2E"

const lotId = "LW-E2E"

const offerId = "off-E2E"

const farmer = "9876543210"

const buyer = "9876500001"

const transporter = "9876500002"

// Step 1: Farmer creates lot

const lotObj = createLot(lotId, "Tomato", 500, 42.0)

assert(
  lotObj.crop === "Tomato" && lotObj.quantityKg === 500,
  "1. Farmer creates Tomato Smart Lot (500 kg).",
)

// Step 2: Buyer accepts/Farmer accepts offer -> creates Order

const orderObj = createOfferAndOrder(
  orderId,
  offerId,
  lotId,
  buyer,
  farmer,
  42.0,
)

assert(
  orderObj.status === "PENDING_PAYMENT" && orderObj.amount === 21000,
  "2. Buyer accepts offer, Order created pending payment.",
)

// Step 3: Payment verified

verifyPayment(orderId, "pay_capture_111", "order_rzp_999")

assert(
  orderObj.paymentStatus === "VERIFIED" && orderObj.status === "PAID",
  "3. Escrow Deposit Payment successfully verified via Razorpay webhook.",
)

// Step 4: Transport assigned

assignTransport(orderId, transporter, "MH-12-GG-4321")

assert(
  dbMock.dockets[orderId].vehicleIdentifier === "MH-12-GG-4321",
  "4. Transporter assigned to highway freight docket.",
)

// Step 5: Transporter Accepts

acceptTransport(orderId, transporter)

assert(
  dbMock.orders[orderId].status === "TRANSPORT_ACCEPTED",
  "5. Carrier accepted the route delivery contract.",
)

// Step 6: Pickup confirmed

confirmPickup(orderId, transporter)

assert(
  dbMock.orders[orderId].status === "PICKUP_CONFIRMED",
  "6. Cargo pickup confirmed at origin farm checkpost.",
)

// Step 7: Transit started

startTransit(orderId, transporter)

assert(
  dbMock.orders[orderId].status === "IN_TRANSIT",
  "7. Truck moved status to active transit.",
)

// Step 8: Delivery reported + docket matched

reportDeliveryAndMatch(
  orderId,
  transporter,
  500,
  "Mumbai Wholesale Market, Maharashtra",
)

assert(
  dbMock.dockets[orderId].status === "MATCHED" &&
    orderObj.status === "DELIVERED",
  "8. Matching engine matched exactly (500 kg destination load).",
)

// Step 9: Mutual verification

verifyRole(orderId, farmer, "farmer", "CONFIRMED")

verifyRole(orderId, buyer, "buyer", "CONFIRMED")

// Step 10: Settlement released automatically without Admin intervention

assert(
  orderObj.settlementStatus === "SETTLED" && orderObj.status === "COMPLETED",
  "9. Mutual Verification triggers automatic escrow settlement release to Farmer.",
)

console.log("=== INTEGRATION FLOW COMPLETED SUCCESSFULLY ===\n")
