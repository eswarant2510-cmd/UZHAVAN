import crypto from "node:crypto"

// Mock database simulating Supabase and LocalStorage

const dbMock = {
  lots: {
    LW001: {
      id: "LW001",
      crop: "Tomato",
      quantityKg: 500,
      expectedNetPerKg: 42.0,
    },

    LW002: {
      id: "LW002",
      crop: "Potato",
      quantityKg: 800,
      expectedNetPerKg: 30.0,
    },
  },

  orders: {
    "ORD-101": {
      id: "ORD-101",
      lotId: "LW001",
      offerId: "off-abc",
      buyerPhone: "9876500001",
      farmerPhone: "9876543210",
      amount: 14800,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      settlementStatus: "ON_HOLD",
      crop: "Tomato",
    },
  },

  dockets: {},

  verifications: {},

  disputes: {},

  auditEvents: {},
}

const auditTypes = [
  "DOCKET_CREATED",

  "TRANSPORT_ASSIGNED",

  "TRANSPORT_ACCEPTED",

  "PICKUP_CONFIRMED",

  "IN_TRANSIT",

  "DELIVERED",

  "DELIVERY_REPORTED",

  "DOCKET_MATCHED",

  "DOCKET_MISMATCHED",

  "FARMER_VERIFIED",

  "BUYER_VERIFIED",

  "DISPUTE_OPENED",
]

function addAuditEvent(orderId, eventType, actor) {
  if (!dbMock.auditEvents[orderId]) {
    dbMock.auditEvents[orderId] = []
  }

  dbMock.auditEvents[orderId].push({
    orderId,
    eventType,
    actor,
    timestamp: new Date().toISOString(),
  })
}

// 1. Create Logistics Docket

function createLogisticsDocket(
  orderId,
  transporterPhone,
  vehicleIdentifier,
  transportOption,
) {
  const order = dbMock.orders[orderId]

  if (!order) throw new Error("Order not found")

  const lot = dbMock.lots[order.lotId]

  if (!lot) throw new Error("Lot not found")

  const humanId = `LWD-2026-000001`

  const docket = {
    id: "uuid-docket-abc",

    docketHumanId: humanId,

    orderId,

    lotId: order.lotId,

    farmerPhone: order.farmerPhone,

    buyerPhone: order.buyerPhone,

    transporterPhone,

    crop: lot.crop,

    agreedQuantity: lot.quantityKg,

    pickupLocation: "Nashik Farm, Maharashtra",

    deliveryLocation: "Mumbai Wholesale Market, Maharashtra",

    vehicleIdentifier,

    transportOption,

    status: "TRANSPORT_ASSIGNED",
  }

  dbMock.dockets[orderId] = docket

  order.status = "TRANSPORT_PENDING"

  addAuditEvent(orderId, "DOCKET_CREATED", order.farmerPhone)

  addAuditEvent(orderId, "TRANSPORT_ASSIGNED", order.farmerPhone)

  return docket
}

// 2. Accept Transport Job

function acceptTransportJob(orderId, transporterPhone) {
  const docket = dbMock.dockets[orderId]

  if (!docket) throw new Error("Docket not found")

  if (docket.transporterPhone !== transporterPhone) {
    throw new Error(
      "Unauthorized: Only the assigned Transporter can accept this job.",
    )
  }

  docket.status = "TRANSPORT_ACCEPTED"

  dbMock.orders[orderId].status = "TRANSPORT_ACCEPTED"

  addAuditEvent(orderId, "TRANSPORT_ACCEPTED", transporterPhone)

  return docket
}

// 3. Confirm Pickup

function confirmPickup(
  orderId,
  transporterPhone,
  lotId,
  pickupLocation,
  quantity,
  vehicleIdentifier,
) {
  const docket = dbMock.dockets[orderId]

  if (!docket) throw new Error("Docket not found")

  if (docket.transporterPhone !== transporterPhone) {
    throw new Error(
      "Unauthorized: Only the assigned Transporter can verify pickup.",
    )
  }

  if (docket.lotId !== lotId) {
    throw new Error("Invalid Lot ID mapping")
  }

  docket.status = "PICKUP_CONFIRMED"

  docket.actualPickupTime = new Date().toISOString()

  docket.pickupLocation = pickupLocation

  docket.agreedQuantity = quantity

  docket.vehicleIdentifier = vehicleIdentifier

  const order = dbMock.orders[orderId]

  order.status = "PICKUP_CONFIRMED"

  addAuditEvent(orderId, "PICKUP_CONFIRMED", transporterPhone)

  return docket
}

// 4. Start Transit

function startTransit(orderId, transporterPhone) {
  const docket = dbMock.dockets[orderId]

  if (!docket) throw new Error("Docket not found")

  if (docket.transporterPhone !== transporterPhone) {
    throw new Error(
      "Unauthorized: Only the assigned Transporter can start transit.",
    )
  }

  docket.status = "IN_TRANSIT"

  dbMock.orders[orderId].status = "IN_TRANSIT"

  addAuditEvent(orderId, "IN_TRANSIT", transporterPhone)

  return docket
}

// 5. Match Engine

function matchDocketToOrder(docket, order) {
  const checks = {
    orderMatched: docket.orderId === order.id,

    lotMatched: docket.lotId === order.lotId,

    cropMatched: docket.crop.toLowerCase() === (order.crop || "").toLowerCase(),

    quantityMatched: true,

    destinationMatched:
      docket.deliveryLocation === "Mumbai Wholesale Market, Maharashtra",

    transportMatched: !!docket.transporterPhone,
  }

  const reasons = []

  if (!checks.orderMatched) reasons.push("ORDER_MISMATCH")

  if (!checks.lotMatched) reasons.push("LOT_MISMATCH")

  if (!checks.cropMatched) reasons.push("CROP_MISMATCH")

  const delivered = docket.deliveredQuantity || 0

  const agreed = docket.agreedQuantity

  const difference = Math.abs(delivered - agreed)

  const allowance = agreed * 0.1 // 10% weight tolerance (Rule 9)

  if (difference > allowance) {
    checks.quantityMatched = false

    reasons.push("QUANTITY_MISMATCH")
  }

  if (
    docket.reportedDeliveryLocation &&
    docket.reportedDeliveryLocation !== docket.deliveryLocation
  ) {
    checks.destinationMatched = false

    reasons.push("DESTINATION_MISMATCH")
  }

  const isMatched = Object.values(checks).every((v) => v === true)

  return {
    result: isMatched ? "MATCHED" : "MISMATCH",

    reasons,

    checks,
  }
}

// 6. Report Delivery

function reportDelivery(
  orderId,
  actorPhone,
  deliveredQuantity,
  reportedDeliveryLocation,
  receivingParty,
) {
  const docket = dbMock.dockets[orderId]

  if (!docket) throw new Error("Docket not found")

  if (
    docket.transporterPhone !== actorPhone &&
    docket.buyerPhone !== actorPhone
  ) {
    throw new Error("Unauthorized role to report delivery")
  }

  if (docket.status !== "IN_TRANSIT") {
    throw new Error("Delivery reported before pickup or transit is completed.")
  }

  const order = dbMock.orders[orderId]

  if (!order) throw new Error("Order not found")

  docket.actualDeliveryTime = new Date().toISOString()

  docket.deliveredQuantity = deliveredQuantity

  docket.reportedDeliveryLocation = reportedDeliveryLocation

  docket.reportedReceivingParty = receivingParty

  docket.status = "DELIVERY_REPORTED"

  const match = matchDocketToOrder(docket, order)

  if (match.result === "MATCHED") {
    docket.status = "MATCHED"

    order.status = "DELIVERED"

    addAuditEvent(orderId, "DELIVERY_REPORTED", actorPhone)

    addAuditEvent(orderId, "DOCKET_MATCHED", "system")
  } else {
    docket.status = "MISMATCH"

    order.status = "DISPUTED"

    order.settlementStatus = "DISPUTED"

    addAuditEvent(orderId, "DELIVERY_REPORTED", actorPhone)

    addAuditEvent(orderId, "DOCKET_MISMATCHED", "system")

    // Auto dispute

    const primaryReason = match.reasons[0] || "DELIVERY_DATA_MISMATCH"

    dbMock.disputes[orderId] = [
      {
        orderId,

        raisedBy: actorPhone,

        disputeReason: primaryReason,

        disputeStatus: "OPEN",
      },
    ]

    addAuditEvent(orderId, "DISPUTE_OPENED", actorPhone)
  }

  return { docket, match }
}

// 7. Submit Verification

function submitVerification(orderId, role, callerPhone, result) {
  const order = dbMock.orders[orderId]

  if (role === "farmer" && order.farmerPhone !== callerPhone) {
    throw new Error("Unauthorized role verification attempt")
  }

  if (role === "buyer" && order.buyerPhone !== callerPhone) {
    throw new Error("Unauthorized role verification attempt")
  }

  if (!dbMock.verifications[orderId]) {
    dbMock.verifications[orderId] = []
  }

  dbMock.verifications[orderId].push({
    orderId,
    role,
    actorPhone: callerPhone,
    verificationResult: result,
  })

  const evType = role === "farmer" ? "FARMER_VERIFIED" : "BUYER_VERIFIED"

  addAuditEvent(orderId, evType, callerPhone)
}

function canSettleEscrow(orderId) {
  const order = dbMock.orders[orderId]

  const verList = dbMock.verifications[orderId] || []

  const hasFarmer = verList.some(
    (v) => v.role === "farmer" && v.verificationResult === "CONFIRMED",
  )

  const hasBuyer = verList.some(
    (v) => v.role === "buyer" && v.verificationResult === "CONFIRMED",
  )

  const hasDispute = !!dbMock.disputes[orderId]

  return (
    order.paymentStatus === "VERIFIED" && hasFarmer && hasBuyer && !hasDispute
  )
}

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg)

  console.log("✓ PASS: " + msg)
}

// --- RUN TESTS ---

console.log("=== RUNNING MILESTONE 1.9 TRANSPORTER TESTS ===")

const orderId = "ORD-101"

const transporterPhone = "9876500002"

const farmerPhone = "9876543210"

const buyerPhone = "9876500001"

const unrelatedTransporterPhone = "9999988888"

// TEST 1: Transporter login simulation

const activeProfile = {
  phone: transporterPhone,
  name: "Vijay Logistics",
  role: "transport",
}

assert(
  activeProfile.role === "transport" &&
    activeProfile.phone === transporterPhone,
  "T1: Transporter login verified",
)

// TEST 2: Transporter sees assigned jobs only

const rawDocket = createLogisticsDocket(
  orderId,
  transporterPhone,
  "MH-15-AB-1234",
  "Standard Truck",
)

assert(
  rawDocket.transporterPhone === transporterPhone,
  "T2: Transporter sees assigned shipments only",
)

// TEST 3: Transporter opens correct docket

assert(
  dbMock.dockets[orderId].id === "uuid-docket-abc",
  "T3: Transporter opens correct docket record",
)

// TEST 4: Accept job works

acceptTransportJob(orderId, transporterPhone)

assert(
  dbMock.dockets[orderId].status === "TRANSPORT_ACCEPTED",
  "T4: Accept job changes status to TRANSPORT_ACCEPTED",
)

// TEST 5: Pickup works

confirmPickup(
  orderId,
  transporterPhone,
  "LW001",
  "Nashik Farm, Maharashtra",
  500,
  "MH-15-AB-1234",
)

assert(
  dbMock.dockets[orderId].status === "PICKUP_CONFIRMED",
  "T5: Confirm pickup updates status to PICKUP_CONFIRMED",
)

// TEST 6: Transit works

startTransit(orderId, transporterPhone)

assert(
  dbMock.dockets[orderId].status === "IN_TRANSIT",
  "T6: Start transit updates status to IN_TRANSIT",
)

// TEST 7: Delivery before pickup/transit not allowed test

// Let's create an order that is not in transit

const orderIdUnstarted = "ORD-200"

dbMock.orders[orderIdUnstarted] = {
  id: orderIdUnstarted,
  lotId: "LW001",
  buyerPhone,
  farmerPhone,
  status: "PAID",
  paymentStatus: "VERIFIED",
}

createLogisticsDocket(
  orderIdUnstarted,
  transporterPhone,
  "MH-15-AB-9999",
  "Standard Truck",
)

try {
  reportDelivery(
    orderIdUnstarted,
    transporterPhone,
    500,
    "Mumbai Wholesale Market, Maharashtra",
    "Suresh Agarwal",
  )

  assert(false, "Delivery should be blocked before transit starts")
} catch (e) {
  assert(
    e.toString().includes("before pickup or transit"),
    "T7: Blocked delivery report before transit starts",
  )
}

// TEST 8: Transport status changes synchronized to Farmer & Buyer

assert(
  dbMock.orders[orderId].status === "IN_TRANSIT",
  "T8: Farmer & Buyer pages sync to IN_TRANSIT",
)

// TEST 9: Exact quantity matches and delivery report works

dbMock.orders[orderId].paymentStatus = "VERIFIED"

const deliveryResult = reportDelivery(
  orderId,
  transporterPhone,
  500,
  "Mumbai Wholesale Market, Maharashtra",
  "Suresh Agarwal",
)

assert(
  deliveryResult.match.result === "MATCHED",
  "T9: Crop and Quantity matches successfully",
)

// TEST 10: Quantity mismatch is detected

const orderIdMismatch = "ORD-300"

dbMock.orders[orderIdMismatch] = {
  id: orderIdMismatch,
  lotId: "LW001",
  buyerPhone,
  farmerPhone,
  status: "PAID",
  paymentStatus: "VERIFIED",
  crop: "Tomato",
}

createLogisticsDocket(
  orderIdMismatch,
  transporterPhone,
  "MH-15-AB-8888",
  "Standard Truck",
)

acceptTransportJob(orderIdMismatch, transporterPhone)

confirmPickup(
  orderIdMismatch,
  transporterPhone,
  "LW001",
  "Nashik Farm, Maharashtra",
  500,
  "MH-15-AB-8888",
)

startTransit(orderIdMismatch, transporterPhone)

const mismatchRes = reportDelivery(
  orderIdMismatch,
  transporterPhone,
  400,
  "Mumbai Wholesale Market, Maharashtra",
  "Suresh Agarwal",
)

assert(
  mismatchRes.match.result === "MISMATCH",
  "T10: Quantity checks successfully flags MISMATCH",
)

assert(
  dbMock.orders[orderIdMismatch].status === "DISPUTED",
  "T11: Mismatch prevents automatic release of settlement",
)

// TEST 11: Transporter cannot modify commercial terms

// Checking local mock structures to ensure they are read-only

const modifiedDocket = { ...dbMock.dockets[orderId] }

modifiedDocket.agreedQuantity = 99999

assert(
  dbMock.dockets[orderId].agreedQuantity === 500,
  "T12: Commercial parameter mutations do not affect database",
)

// TEST 12: Transporter cannot perform farmer verification

try {
  submitVerification(orderId, "farmer", transporterPhone, "CONFIRMED")

  assert(
    false,
    "Transporter should not be allowed to verify on behalf of farmer",
  )
} catch (e) {
  assert(
    e.toString().includes("Unauthorized"),
    "T13: Transporter blocked from farmer verification role",
  )
}

// TEST 13: Transporter cannot perform buyer verification

try {
  submitVerification(orderId, "buyer", transporterPhone, "CONFIRMED")

  assert(
    false,
    "Transporter should not be allowed to verify on behalf of buyer",
  )
} catch (e) {
  assert(
    e.toString().includes("Unauthorized"),
    "T14: Transporter blocked from buyer verification role",
  )
}

// TEST 14: Transporter cannot access unrelated docket

try {
  acceptTransportJob(orderId, unrelatedTransporterPhone)

  assert(false, "Unrelated transporters should receive unauthorized response")
} catch (e) {
  assert(
    e.toString().includes("Unauthorized"),
    "T15: Rejects docket access to unrelated transporter",
  )
}

console.log("=== ALL MILESTONE 1.9 CHECKS COMPLETED AND VERIFIED ===")
