import { getAuthProfile } from "./auth.ts"
import { supabase } from "./supabase.ts"

export type TrustRole = "farmer" | "buyer"

export type TrustCategory =
  | "LOW TRUST"
  | "MODERATE TRUST"
  | "GOOD TRUST"
  | "HIGH TRUST"

export interface TrustBreakdownItem {
  label: string
  earned: number
  max: number
}

export interface TrustSummary {
  role: TrustRole
  phone: string
  score: number | null
  category: TrustCategory | null
  hasEnoughHistory: boolean
  limitedHistory: boolean
  verifiedTransactionCount: number
  basisText: string
  breakdown: TrustBreakdownItem[]
  badges: string[]
}

interface TrustInput {
  role: TrustRole
  phone: string
  orders: Array<{
    id?: string
    buyerPhone?: string
    farmerPhone?: string
    status?: string
    paymentStatus?: string
    settlementStatus?: string
    createdAt?: string
  }>
  disputes?: Array<{
    id?: string
    orderId?: string
    raisedBy?: string
    disputeReason?: string
    disputeStatus?: string
  }>
  verifications?: Array<{
    id?: string
    orderId?: string
    actorPhone?: string
    role?: "farmer" | "buyer"
    verificationResult?: string
  }>
  profileName?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resolveCategory(score: number | null): TrustCategory | null {
  if (score === null) return null
  if (score <= 39) return "LOW TRUST"
  if (score <= 69) return "MODERATE TRUST"
  if (score <= 84) return "GOOD TRUST"
  return "HIGH TRUST"
}

const COMPLETED_ORDER_STATUSES = new Set([
  "DELIVERED",
  "BUYER_VERIFICATION",
  "SETTLEMENT_PENDING",
  "RELEASE_ELIGIBLE",
  "COMPLETED",
])

const PAYMENT_SUCCESS_STATUSES = new Set(["VERIFIED"])

export function calculateTrustSummary(input: TrustInput): TrustSummary {
  const { role, phone, orders, disputes = [], verifications = [], profileName } = input
  const relevantOrders = orders.filter((order) => {
    const actorPhone = role === "farmer" ? order.farmerPhone : order.buyerPhone
    return actorPhone === phone
  })

  const totalOrders = relevantOrders.length
  const verifiedTransactionCount = relevantOrders.filter((order) => {
    const paymentOk = PAYMENT_SUCCESS_STATUSES.has(String(order.paymentStatus || ""))
    const orderOk = COMPLETED_ORDER_STATUSES.has(String(order.status || ""))
    return paymentOk || orderOk
  }).length

  const totalDisputes = disputes.filter((dispute) => {
    const orderId = dispute.orderId || ""
    return (
      relevantOrders.some((order) => order.id === orderId) ||
      (dispute.raisedBy && dispute.raisedBy === phone)
    )
  })

  const resolvedDisputes = totalDisputes.filter(
    (dispute) => dispute.disputeStatus === "RESOLVED" || dispute.disputeStatus === "CLOSED",
  )
  const openDisputes = totalDisputes.filter(
    (dispute) => dispute.disputeStatus === "OPEN" || dispute.disputeStatus === "UNDER_REVIEW",
  )

  const adverseDisputeCount = resolvedDisputes.filter((dispute) => {
    const reason = dispute.disputeReason || ""
    return [
      "Quantity mismatch",
      "Damaged goods",
      "Wrong produce",
      "Delivery issue",
      "Payment/order mismatch",
    ].includes(reason)
  }).length

  const relevantVerifications = verifications.filter(
    (verification) =>
      verification.actorPhone === phone &&
      verification.verificationResult === "CONFIRMED",
  )

  const transactionReliabilityMax = role === "farmer" ? 25 : 25
  const verificationReliabilityMax = 20
  const deliveryOrPaymentMax = role === "farmer" ? 20 : 15
  const disputeMax = 15
  const profileMax = 10

  const transactionReliability =
    totalOrders === 0
      ? 0
      : clamp((verifiedTransactionCount / totalOrders) * transactionReliabilityMax, 0, transactionReliabilityMax)

  const verificationReliability =
    totalOrders === 0
      ? 0
      : clamp(
          (relevantVerifications.length / Math.max(totalOrders, 1)) * verificationReliabilityMax,
          0,
          verificationReliabilityMax,
        )

  const deliveryOrPaymentScore =
    role === "farmer"
      ? totalOrders === 0
        ? 0
        : clamp(
            ((relevantOrders.filter((order) => COMPLETED_ORDER_STATUSES.has(String(order.status || ""))).length / totalOrders) *
              deliveryOrPaymentMax),
            0,
            deliveryOrPaymentMax,
          )
      : totalOrders === 0
        ? 0
        : clamp(
            ((relevantOrders.filter((order) => PAYMENT_SUCCESS_STATUSES.has(String(order.paymentStatus || ""))).length / totalOrders) *
              deliveryOrPaymentMax),
            0,
            deliveryOrPaymentMax,
          )

  const disputePenalty = adverseDisputeCount * 5
  const disputeScore = clamp(disputeMax - disputePenalty, 0, disputeMax)

  const profileScore = profileName || totalOrders > 0 ? profileMax : 0

  const totalScore =
    role === "farmer"
      ? Math.round(
          transactionReliability +
            verificationReliability +
            deliveryOrPaymentScore +
            disputeScore +
            profileScore,
        )
      : Math.round(
          transactionReliability +
            verificationReliability +
            deliveryOrPaymentScore +
            disputeScore +
            profileScore,
        )

  const score = totalOrders === 0 ? null : totalScore
  const category = resolveCategory(score)
  const limitedHistory = totalOrders > 0 && totalOrders < 3
  const hasEnoughHistory = totalOrders >= 3

  const breakdown: TrustBreakdownItem[] =
    role === "farmer"
      ? [
          { label: "Transaction reliability", earned: Math.round(transactionReliability), max: transactionReliabilityMax },
          { label: "Verification history", earned: Math.round(verificationReliability), max: verificationReliabilityMax },
          { label: "Delivery accuracy", earned: Math.round(deliveryOrPaymentScore), max: deliveryOrPaymentMax },
          { label: "Dispute record", earned: Math.round(disputeScore), max: disputeMax },
          { label: "Profile verification", earned: profileScore, max: profileMax },
        ]
      : [
          { label: "Transaction reliability", earned: Math.round(transactionReliability), max: transactionReliabilityMax },
          { label: "Verification history", earned: Math.round(verificationReliability), max: verificationReliabilityMax },
          { label: "Payment reliability", earned: Math.round(deliveryOrPaymentScore), max: deliveryOrPaymentMax },
          { label: "Dispute record", earned: Math.round(disputeScore), max: disputeMax },
          { label: "Profile verification", earned: profileScore, max: profileMax },
        ]

  const badges: string[] = []
  if (profileName || totalOrders > 0) badges.push(role === "farmer" ? "✓ Verified Farmer" : "✓ Verified Buyer")
  if (verifiedTransactionCount >= 3) {
    badges.push(role === "farmer" ? "✓ Reliable Delivery" : "✓ Consistent Buyer")
  }
  if (openDisputes.length === 0 && adverseDisputeCount === 0) {
    badges.push("✓ Low Dispute History")
  }

  const basisText =
    totalOrders === 0
      ? "Not enough transaction history"
      : `Based on ${verifiedTransactionCount} verified transactions`

  return {
    role,
    phone,
    score,
    category,
    hasEnoughHistory,
    limitedHistory,
    verifiedTransactionCount,
    basisText,
    breakdown,
    badges,
  }
}

function isSupabaseConfigured() {
  const env =
    (typeof import.meta !== "undefined" && import.meta.env) ||
    (globalThis as any).__UZHAVAN_ENV__ ||
    {}

  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      !String(url).includes("placeholder-url") &&
      !String(key).includes("placeholder-anon-key"),
  )
}

function readLocalTrustRecords() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { orders: [], disputes: [], verifications: [] }
  }

  const orders: any[] = JSON.parse(window.localStorage.getItem("uzhavan_orders") || "[]")
  const disputes: any[] = []
  const verifications: any[] = []

  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith("disputes_")) {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || "[]")
        disputes.push(...(Array.isArray(value) ? value : []))
      } catch {
        // Ignore malformed dispute payloads.
      }
    }

    if (key.startsWith("verifications_")) {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || "[]")
        verifications.push(...(Array.isArray(value) ? value : []))
      } catch {
        // Ignore malformed verification payloads.
      }
    }
  })

  return { orders, disputes, verifications }
}

export async function fetchTrustSummaryForRole(
  role: TrustRole,
  phone: string,
): Promise<TrustSummary> {
  const profile = (await getAuthProfile()) || null

  if (isSupabaseConfigured()) {
    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_phone.eq.${phone},farmer_phone.eq.${phone}`)

      const orderIds = (ordersData || []).map((order: any) => order.id)

      const [{ data: verificationData }, { data: disputesData }] = await Promise.all([
        supabase
          .from("verification_records")
          .select("*")
          .eq("actor_phone", phone),
        supabase
          .from("disputes")
          .select("*")
          .in("order_id", orderIds.length > 0 ? orderIds : ["__no_match__"]),
      ])

      const mappedOrders = (ordersData || []).map((order: any) => ({
        id: order.id,
        buyerPhone: order.buyer_phone,
        farmerPhone: order.farmer_phone,
        status: order.status,
        paymentStatus: order.payment_status,
        settlementStatus: order.settlement_status,
        createdAt: order.created_at,
      }))

      const mappedVerifications = (verificationData || []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        actorPhone: row.actor_phone,
        role: row.role,
        verificationResult: row.verification_result,
      }))

      const mappedDisputes = (disputesData || []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        raisedBy: row.raised_by,
        disputeReason: row.dispute_reason,
        disputeStatus: row.dispute_status,
      }))

      return calculateTrustSummary({
        role,
        phone,
        orders: mappedOrders,
        disputes: mappedDisputes,
        verifications: mappedVerifications,
        profileName: profile?.name || undefined,
      })
    } catch {
      // Fall through to local fallback below.
    }
  }

  const fallback = readLocalTrustRecords()
  const filteredOrders = fallback.orders.filter((order) => {
    const actorPhone = role === "farmer" ? order.farmerPhone : order.buyerPhone
    return actorPhone === phone
  })

  const filteredDisputes = fallback.disputes.filter((dispute) => {
    const orderId = dispute.orderId || ""
    return (
      filteredOrders.some((order) => order.id === orderId) ||
      (dispute.raisedBy && dispute.raisedBy === phone)
    )
  })

  const filteredVerifications = fallback.verifications.filter(
    (verification) => verification.actorPhone === phone,
  )

  return calculateTrustSummary({
    role,
    phone,
    orders: filteredOrders,
    disputes: filteredDisputes,
    verifications: filteredVerifications,
    profileName: profile?.name || undefined,
  })
}
