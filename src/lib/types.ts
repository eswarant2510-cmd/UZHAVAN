export type UserRole = "farmer" | "buyer" | "transport" | "admin"

export type BuyerRisk = "LOW" | "MEDIUM" | "HIGH"

export type QualityGrade = "A" | "B" | "C"

export type DemandLevel = "HIGH" | "MEDIUM" | "LOW"

export type DataSource = "demo" | "live"

export interface SessionUser {
  role: UserRole
  phone: string
  name: string
  location: string
  source: DataSource
}

export interface QualitySignal {
  grade: QualityGrade
  confidencePct: number
  label: string
  disclaimer: string
}

export interface SmartLot {
  id: string
  crop: string
  variety?: string
  quantityKg: number
  unit?: string
  imageUrl: string
  photos?: string[]
  location: string
  quality: QualitySignal
  expectedNetPerKg: number
  minPricePerKg?: number
  status: "active" | "sold" | "in_transit" | "cancelled"
  harvestDate?: string
  expectedSellingDate?: string
  farmerPhone?: string
}

export interface BuyerOffer {
  id: string
  buyerName: string
  verified: boolean
  offerPricePerKg: number
  transportCost: number
  buyerRisk: BuyerRisk
  distanceKm: number
  lotId?: string
  quantityKg?: number
  status?: "active" | "accepted" | "rejected"
  createdAt?: string
}

export interface NetRealisationResult {
  offerId: string
  buyerName: string
  verified: boolean
  offerPricePerKg: number
  quantityKg: number
  gross: number
  transportCost: number
  platformFee: number
  riskHold: number
  net: number
  netPerKg: number
  buyerRisk: BuyerRisk
  recommended: boolean
}

export interface MarketIntelligence {
  crop: string
  currentLow: number
  currentHigh: number
  demand: DemandLevel
  sellingWindow: string
  trend: number[]
  imageUrl: string
}

export interface PriceAlert {
  id: string
  title: string
  message: string
  crop: string
}

export interface TransportOption {
  id: string
  vehicleType: string
  capacityKg: number
  baseCost: number
  costPerKm: number
  averageSpeedKmh: number
  availabilityStatus: "available" | "busy" | "offline"
  estimatedCost?: number
  estimatedTravelTimeHours?: number
  origin?: string
  destination?: string
  distanceKm?: number
}

export interface FarmerDashboardData {
  farmer: SessionUser
  weather: { tempC: number label: string }
  kpis: {
    activeLots: number
    bestOpportunityPerKg: number
    inEscrow: number
    earnings: number
  }
  featuredLot: SmartLot | null
  lots: SmartLot[]
  recommendation: NetRealisationResult | null
  market: MarketIntelligence
  alert: PriceAlert | null
  source: DataSource
}

export type OrderStatus = "PENDING_PAYMENT" | "PAYMENT_PROCESSING" | "PAID" | "TRANSPORT_PENDING" | "TRANSPORT_ACCEPTED" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "BUYER_VERIFICATION" | "SETTLEMENT_PENDING" | "RELEASE_ELIGIBLE" | "COMPLETED" | "PAYMENT_FAILED" | "DISPUTED"

export type PaymentStatus = "PENDING" | "VERIFIED" | "FAILED"

export type SettlementStatus = "NOT_CREATED" | "ON_HOLD" | "RELEASE_ELIGIBLE" | "RELEASE_REQUESTED" | "SETTLED" | "REFUNDED" | "DISPUTED"

export interface Order {
  id: string
  lotId: string
  offerId: string
  buyerPhone: string
  farmerPhone: string
  amount: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  settlementStatus: SettlementStatus
  createdAt?: string
  updatedAt?: string
  crop?: string
}

export interface PaymentTransaction {
  id: string
  orderId: string
  provider: string
  providerOrderId: string
  providerPaymentId?: string
  amount: number
  currency: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface VerificationRecord {
  id?: string
  orderId: string
  actorPhone: string
  role: "farmer" | "buyer"
  verificationResult: "PENDING" | "CONFIRMED" | "DISPUTED"
  createdAt?: string
  note?: string
}

export type DisputeReason = "Quantity mismatch" | "Damaged goods" | "Wrong produce" | "Delivery issue" | "Payment/order mismatch" | "Other"

export interface DisputeRecord {
  id?: string
  orderId: string
  raisedBy: string
  disputeReason: DisputeReason
  disputeStatus: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED"
  createdAt?: string
  note?: string
}

export interface DisputeResolution {
  id?: string
  disputeId: string
  orderId: string
  adminId: string
  resolutionType: "RELEASE_SETTLEMENT" | "REFUND_BUYER" | "PARTIAL_RESOLUTION" | "KEEP_FUNDS_PROTECTED"
  reason: string
  amount?: number
  createdAt?: string
}

export interface AuditEvent {
  id?: string
  orderId: string
  eventType: "ORDER_CREATED" | "PAYMENT_VERIFIED" | "PAYMENT_FAILED" | "SETTLEMENT_PROTECTED" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "FARMER_VERIFIED" | "BUYER_VERIFIED" | "MUTUAL_VERIFICATION_COMPLETE" | "DISPUTE_OPENED" | "SETTLEMENT_RELEASE_REQUESTED" | "SETTLEMENT_COMPLETED" | "REFUND_COMPLETED" | "DOCKET_CREATED" | "TRANSPORT_ASSIGNED" | "TRANSPORT_ACCEPTED" | "DELIVERY_REPORTED" | "DOCKET_MATCHED" | "DOCKET_MISMATCHED" | "DISPUTE_VIEWED" | "DISPUTE_ASSIGNED" | "RESOLUTION_CREATED" | "REFUND_REQUESTED" | "PARTIAL_RESOLUTION_CREATED" | "DISPUTE_CLOSED"
  actor: string
  timestamp?: string
}

export type DocketStatus = "TRANSPORT_ASSIGNED" | "TRANSPORT_ACCEPTED" | "PICKUP_PENDING" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_REPORTED" | "MATCHING_PENDING" | "MATCHED" | "MISMATCH"

export interface LogisticsDocket {
  id?: string
  docketHumanId?: string
  orderId: string
  lotId: string
  farmerPhone: string
  buyerPhone: string
  transporterPhone: string
  crop: string
  variety?: string
  agreedQuantity: number
  pickupLocation: string
  deliveryLocation: string
  vehicleIdentifier: string
  transportOption?: string
  expectedPickupTime?: string
  expectedDeliveryTime?: string
  actualPickupTime?: string
  actualDeliveryTime?: string
  deliveredQuantity?: number
  reportedDeliveryLocation?: string
  reportedReceivingParty?: string
  status: DocketStatus
  createdAt?: string
  updatedAt?: string
}

export interface DocketEvidence {
  id?: string
  docketId: string
  uploadedBy: string
  fileReference: string
  createdAt?: string
}
