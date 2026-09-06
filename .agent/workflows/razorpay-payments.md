---
description: How to run, test, and deploy Razorpay Test Mode Payment integration
---

This workflow guides you through running the Razorpay test-mode payment gateway, testing checkout flow, and deploying the secure server-side verification code.

## Prerequisites
Ensure the environment contains the following keys in your deploy environment or local `.env`:
*   `RAZORPAY_KEY_ID`: Your Razorpay Test Key ID
*   `RAZORPAY_KEY_SECRET`: Your Razorpay Test Key Secret
*   `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay Webhook Secret

*Note: If these keys are not set, Vayalveli automatically launches in simulated testing mode, allowing full flow verification with zero configurations!*

## Local Development & Testing

1. Start Vayalveli locally:
   ```bash
   npm run dev
   ```
2. Navigate to the buyer dashboard at `/dashboard/buyer/discover`.
3. Select a Smart Lot, inspect, and submit a purchase bid offer.
4. Switch to the farmer dashboard and check available offers. Click **Accept Offer** to accept.
5. In the background, this transitions the lot to `sold` and creates a matching order in the `orders` register in `PENDING_PAYMENT` state.
6. Open the buyer orders dashboard at `/dashboard/buyer/orders` to find the pending payment.
7. Click **PAY SECURELY**.
   *   If keys are set, this loads the official Razorpay Checkout SDK script and triggers standard sandbox payment processing.
   *   If keys are omitted, a Sandbox simulation modal opens. Click **Approve Payment** to simulate verified checkout callback.
8. Verify that the order moves successfully to `PAID` state with a valid transaction ID receipt.
9. Track progress on the farmer order panel at `/farmer/orders` to execute escrow releases!

## Deploying the Supabase Edge Function
To push the server-side payment logic to your Supabase project:
1. Ensure the Supabase CLI is authenticated:
   ```bash
   supabase login
   ```
2. Set the environment secrets in Supabase:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=your_key_id RAZORPAY_KEY_SECRET=your_key_secret RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy razorpay
   ```
4. Verify the webhook URL in Razorpay dashboard matching:
   `https://[project-ref].supabase.co/functions/v1/razorpay/webhook`, subscribing to `order.paid` and `payment.failed` events.
