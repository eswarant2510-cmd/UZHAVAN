export type UserRole = "farmer" | "buyer" | "transport" | "admin"

export type BuyerRisk = "LOW" | "MEDIUM" | "HIGH"

export type QualityGrade = "A" | "B" | "C"

export type DemandLevel = "HIGH" | "MEDIUM" | "LOW"

export type DataSource = "demo" | "live"

export interface LocationDetails {
  formattedAddress: string
  state?: string
  district?: string
  city?: string
  locality?: string
  postalCode?: string
  lat?: number
  lng?: number
  placeId?: string
  dataSource?: "google_places" | "browser_gps" | "user_input" | "estimate"
}

export interface SessionUser {
  id?: string
  userId?: string
  role: UserRole
  phone: string
  loginNumber?: string
  name: string
  location: string
  locationDetails?: LocationDetails
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
  userId?: string
  createdByLoginNumber?: string
  ownerId?: string
  createdAt?: string
  crop: string
  variety?: string
  quantityKg: number
  unit?: string
  imageUrl: string
  photos?: string[]
  location: string
  locationDetails?: LocationDetails
  quality: QualitySignal
  expectedNetPerKg: number
  minPricePerKg?: number
  status: "active" | "sold" | "in_transit" | "cancelled"
  harvestDate?: string
  expectedSellingDate?: string
  farmerPhone?: string
}

export interface CartItem {
  id: string
  userId: string
  lotId: string
  crop: string
  quantityKg: number
  pricePerKg: number
  farmerPhone?: string
  createdAt?: string
}

export interface UserProfile {
  id: string
  userId: string
  phone: string
  name: string
  role: UserRole
  location: string
  bio?: string
  email?: string
  updatedAt?: string
}

export interface UserSettings {
  id: string
  userId: string
  notificationsEnabled: boolean
  preferredLanguage: string
  currency: string
  updatedAt?: string
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

export type TransporterVerificationStatus = "UZHAVAN_VERIFIED" | "PENDING_VERIFICATION" | "UNVERIFIED" | "GOOGLE_LISTED"

export type VehicleCategory = "Mini Truck" | "Pickup" | "Light Commercial Vehicle" | "Medium Goods Vehicle" | "Heavy Goods Vehicle" | "Refrigerated Vehicle"

export type QuoteType = "ACTUAL QUOTE" | "ESTIMATED QUOTE"

export interface TransporterProfile {
  id: string
  companyName: string
  transporterPhone: string
  publicPhone?: string
  website?: string
  businessAddress: string
  state: string
  district: string
  serviceAreas: string[]
  vehicleTypes: VehicleCategory[]
  maxCapacityKg: number
  refrigeratedAvailable: boolean
  gpsTrackingCapable: boolean
  verificationStatus: TransporterVerificationStatus
  trustScore: number
  completedShipmentsCount: number
  onTimeDeliveryRatePct: number
  cancellationRatePct: number
  isAvailable: boolean
}

export interface TransportOption {
  id: string
  transporterId?: string
  transporterName?: string
  transporterPhone?: string
  vehicleType: string
  vehicleCategory?: VehicleCategory
  capacityKg: number
  baseCost: number
  costPerKm: number
  averageSpeedKmh: number
  availabilityStatus: "available" | "busy" | "offline"
  refrigerated?: boolean
  verificationStatus?: TransporterVerificationStatus
  trustScore?: number
  quoteType?: QuoteType
  estimatedCost?: number
  estimatedTravelTimeHours?: number
  origin?: string
  destination?: string
  distanceKm?: number
  routePolyline?: string
  scoreExplanation?: string
  recommendationScore?: number
}

export interface FarmerDashboardData {
  farmer: SessionUser
  weather: { tempC: number; label: string }
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
  userId?: string
  buyerUserId?: string
  farmerUserId?: string
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
  buyerDeliveryLocation?: string
  buyerDeliveryLocationDetails?: LocationDetails
  farmerPickupLocationDetails?: LocationDetails
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

export interface PaymentSettlement {
  id?: string
  orderId: string
  paymentTransactionId?: string
  authoritativeAmount: number
  immediateReleaseAmount: number
  heldAmount: number
  remainingReleaseAmount: number
  status: "HELD" | "FULLY_SETTLED" | "DISPUTED" | "REFUNDED" | "PARTIAL_SETTLED"
  farmerId?: string
  buyerId?: string
  createdAt?: string
  updatedAt?: string
}

export function calculate8020Settlement(authoritativeAmount: number): {
  immediateRelease: number
  held: number
} {
  const amount = Math.max(0, Number(authoritativeAmount) || 0)
  // Calculate 80% immediate release rounded to 2 decimal places
  const immediateRelease = Math.round(amount * 0.8 * 100) / 100
  // Ensure exact total match: 80% + 20% = 100%
  const held = Math.round((amount - immediateRelease) * 100) / 100
  return { immediateRelease, held }
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
  orderId?: string
  eventType: "ORDER_CREATED" | "PAYMENT_VERIFIED" | "PAYMENT_FAILED" | "SETTLEMENT_PROTECTED" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "FARMER_VERIFIED" | "BUYER_VERIFIED" | "MUTUAL_VERIFICATION_COMPLETE" | "DISPUTE_OPENED" | "SETTLEMENT_RELEASE_REQUESTED" | "SETTLEMENT_COMPLETED" | "REFUND_COMPLETED" | "DOCKET_CREATED" | "TRANSPORT_ASSIGNED" | "TRANSPORT_ACCEPTED" | "DELIVERY_REPORTED" | "DOCKET_MATCHED" | "DOCKET_MISMATCHED" | "DISPUTE_VIEWED" | "DISPUTE_ASSIGNED" | "RESOLUTION_CREATED" | "REFUND_REQUESTED" | "PARTIAL_RESOLUTION_CREATED" | "DISPUTE_CLOSED" | "PROFILE_UPDATED" | "PRODUCT_CREATED" | "PRODUCT_UPDATED" | "PRODUCT_DELETED" | "CART_UPDATED" | "ORDER_UPDATED" | "UNAUTHORIZED_ACCESS_ATTEMPT"
  actor: string
  details?: string
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
  pickupLocationDetails?: LocationDetails
  deliveryLocation: string
  deliveryLocationDetails?: LocationDetails
  vehicleIdentifier: string
  transportOption?: string
  expectedPickupTime?: string
  expectedDeliveryTime?: string
  actualPickupTime?: string
  actualDeliveryTime?: string
  deliveredQuantity?: number
  reportedDeliveryLocation?: string
  reportedReceivingParty?: string
  trackingStatus?: "NOT_STARTED" | "TRACKING_ACTIVE" | "PAUSED" | "COMPLETED"
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
