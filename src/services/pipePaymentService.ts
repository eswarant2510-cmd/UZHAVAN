import { supabase } from "../lib/supabase"
import type { PaymentTransaction, PaymentSettlement } from "../lib/types"

export interface PipeOrderRequest {
  orderId: string
  amount: number
  currency?: string
  buyerId?: string
}

export interface PipeOrderResponse {
  success: boolean
  pipeOrderId?: string
  clientSecret?: string
  redirectUrl?: string
  mode: "sandbox" | "live" | "unconfigured"
  error?: string
}

export interface PipeVerifyRequest {
  orderId: string
  pipeOrderId: string
  pipePaymentId: string
  pipeSignature?: string
}

export interface PipeVerifyResponse {
  verified: boolean
  transaction?: PaymentTransaction
  settlement?: PaymentSettlement
  error?: string
}

export const PIPE_CONFIG = {
  get apiKey() {
    return (typeof import.meta !== "undefined" && import.meta.env?.VITE_PIPE_API_KEY) || ""
  },
  get environment() {
    return (typeof import.meta !== "undefined" && import.meta.env?.VITE_PIPE_ENV) || "sandbox"
  },
  get isConfigured() {
    return Boolean(typeof import.meta !== "undefined" && import.meta.env?.VITE_PIPE_API_KEY)
  },
}

/**
 * Creates a PiPe payment order via secure API call.
 */
export async function createPipeOrder(req: PipeOrderRequest): Promise<PipeOrderResponse> {
  try {
    const res = await fetch("/api/pipe/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return {
        success: false,
        mode: PIPE_CONFIG.isConfigured ? (PIPE_CONFIG.environment as any) : "unconfigured",
        error: errData.error || `PiPe order creation failed with status ${res.status}`,
      }
    }

    const data = await res.json()
    return {
      success: true,
      pipeOrderId: data.pipeOrderId,
      clientSecret: data.clientSecret,
      redirectUrl: data.redirectUrl,
      mode: data.mode || (PIPE_CONFIG.environment as any),
    }
  } catch (err: any) {
    return {
      success: false,
      mode: PIPE_CONFIG.isConfigured ? (PIPE_CONFIG.environment as any) : "unconfigured",
      error: err.message || "Failed to reach PiPe backend service",
    }
  }
}

/**
 * Verifies PiPe payment completion server-side before updating database state.
 */
export async function verifyPipePayment(req: PipeVerifyRequest): Promise<PipeVerifyResponse> {
  try {
    const res = await fetch("/api/pipe/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data.verified) {
      return {
        verified: false,
        error: data.error || "PiPe payment verification failed server-side.",
      }
    }

    return {
      verified: true,
      transaction: data.transaction,
      settlement: data.settlement,
    }
  } catch (err: any) {
    return {
      verified: false,
      error: err.message || "Network error during PiPe payment verification",
    }
  }
}
