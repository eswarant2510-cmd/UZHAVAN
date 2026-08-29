import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Grab credentials from Deno variables

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || ""

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || ""

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || ""

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""

const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Compute Hmac-SHA256 signature in Deno Web Crypto API

async function calculateHmacSha256(
  message: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()

  const keyData = encoder.encode(secret)

  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",

    keyData,

    { name: "HMAC", hash: "SHA-256" },

    false,

    ["sign"],
  )

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",

    cryptoKey,

    messageData,
  )

  const signatureBytes = new Uint8Array(signatureBuffer)

  return Array.from(signatureBytes)

    .map((b) => b.toString(16).padStart(2, "0"))

    .join("")
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)

  const path = url.pathname.split("/").pop()

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Create Razorpay Test Order Server-Side

    if (path === "create-order") {
      const { orderId } = await req.json()

      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId" }), {
          status: 400,

          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Fetch agreed order amount from DB

      const { data: order, error: orderErr } = await supabaseAdmin

        .from("orders")

        .select("amount")

        .eq("id", orderId)

        .maybeSingle()

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,

          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const amountPaise = Math.round(Number(order.amount) * 100)

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        // Safe local test response when keys are unconfigured

        const mockRzpOrderId = `rzp_test_order_${Math.random().toString(36).slice(2, 10)}`

        return new Response(
          JSON.stringify({
            id: mockRzpOrderId,

            amount: amountPaise,

            currency: "INR",

            warning:
              "Razorpay credentials unconfigured. Running in Local Test simulation.",
          }),
          {
            status: 200,

            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      // Query Razorpay server

      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },

        body: JSON.stringify({
          amount: amountPaise,

          currency: "INR",

          receipt: orderId,
        }),
      })

      const rzpBody = await rzpRes.json()

      if (!rzpRes.ok) {
        throw new Error(
          rzpBody.error?.description || "Razorpay order generation failed.",
        )
      }

      return new Response(JSON.stringify(rzpBody), {
        status: 200,

        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Verify Razorpay Signature and Update DB Status

    if (path === "verify-payment") {
      const {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = await req.json()

      if (
        !orderId ||
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), {
          status: 400,

          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      let isVerified = false

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        // Simulation verification mode

        if (razorpay_signature === "simulated_success") {
          isVerified = true
        }
      } else {
        const text = `${razorpay_order_id}|${razorpay_payment_id}`

        const computedSignature = await calculateHmacSha256(
          text,
          RAZORPAY_KEY_SECRET,
        )

        isVerified = computedSignature === razorpay_signature
      }

      if (!isVerified) {
        return new Response(
          JSON.stringify({ error: "Signature verification failed" }),
          {
            status: 400,

            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      // Update Order Status to PAID and save payment transaction details

      const { data: orderDetails } = await supabaseAdmin
        .from("orders")
        .select("amount")
        .eq("id", orderId)
        .maybeSingle()

      const amt = orderDetails ? Number(orderDetails.amount) : 0

      const { error: ordErr } = await supabaseAdmin

        .from("orders")

        .update({ status: "PAID", updated_at: new Date().toISOString() })

        .eq("id", orderId)

      if (ordErr) throw ordErr

      await supabaseAdmin.from("payment_transactions").insert({
        order_id: orderId,

        provider: "razorpay",

        provider_order_id: razorpay_order_id,

        provider_payment_id: razorpay_payment_id,

        amount: amt,

        currency: "INR",

        status: "captured",
      })

      return new Response(JSON.stringify({ verified: true, status: "PAID" }), {
        status: 200,

        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 3. Webhook signature checking and verification

    if (path === "webhook") {
      const rawBody = await req.text()

      const headerSig = req.headers.get("X-Razorpay-Signature") || ""

      let bodyObj

      try {
        bodyObj = JSON.parse(rawBody)
      } catch {
        return new Response("Invalid body JSON", { status: 400 })
      }

      if (RAZORPAY_WEBHOOK_SECRET) {
        const computedSig = await calculateHmacSha256(
          rawBody,
          RAZORPAY_WEBHOOK_SECRET,
        )

        if (computedSig !== headerSig) {
          return new Response("Webhook signature validation failed", {
            status: 400,
          })
        }
      }

      const event = bodyObj.event

      const payload = bodyObj.payload

      if (event === "order.paid" || event === "payment.captured") {
        const rzpOrderId =
          payload.order?.entity?.id || payload.payment?.entity?.order_id

        const rzpPayId = payload.payment?.entity?.id

        const statusVal = payload.payment?.entity?.status || "captured"

        if (rzpOrderId) {
          // Find matching order in database

          const { data: transaction } = await supabaseAdmin

            .from("payment_transactions")

            .select("order_id")

            .eq("provider_order_id", rzpOrderId)

            .maybeSingle()

          let orderId = transaction ? transaction.order_id : null

          if (!orderId) {
            // Check in orders directly if transaction is missing

            const { data: targetOrder } = await supabaseAdmin

              .from("orders")

              .select("id")

              .eq("id", payload.order?.entity?.receipt)

              .maybeSingle()

            orderId = targetOrder ? targetOrder.id : null
          }

          if (orderId) {
            const { data: currentOrder } = await supabaseAdmin

              .from("orders")

              .select("status, amount")

              .eq("id", orderId)

              .maybeSingle()

            // Idempotency: Protect paid orders from duplicate state mutations

            if (currentOrder && currentOrder.status !== "PAID") {
              await supabaseAdmin

                .from("orders")

                .update({
                  status: "PAID",
                  updated_at: new Date().toISOString(),
                })

                .eq("id", orderId)

              // Record payment transaction if missing

              if (!transaction) {
                await supabaseAdmin.from("payment_transactions").insert({
                  order_id: orderId,

                  provider: "razorpay",

                  provider_order_id: rzpOrderId,

                  provider_payment_id: rzpPayId,

                  amount: Number(currentOrder.amount),

                  currency: "INR",

                  status: statusVal,
                })
              }
            }
          }
        }
      } else if (event === "payment.failed") {
        const rzpOrderId = payload.payment?.entity?.order_id

        if (rzpOrderId) {
          const { data: targetOrder } = await supabaseAdmin

            .from("orders")

            .select("id")

            .eq("id", payload.payment?.entity?.receipt)

            .maybeSingle()

          if (targetOrder) {
            await supabaseAdmin

              .from("orders")

              .update({
                status: "PAYMENT_FAILED",
                updated_at: new Date().toISOString(),
              })

              .eq("id", targetOrder.id)
          }
        }
      }

      return new Response("Received", { status: 200 })
    }

    return new Response(JSON.stringify({ error: "Unsupported endpoint" }), {
      status: 404,

      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,

      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
