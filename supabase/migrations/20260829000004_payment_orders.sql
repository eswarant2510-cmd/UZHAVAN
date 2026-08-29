-- Migration to set up orders and payment transaction details for Razorpay integration

CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(50) PRIMARY KEY,
  lot_id VARCHAR(50) REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  offer_id VARCHAR(50) REFERENCES public.buyer_offers(id) ON DELETE CASCADE,
  buyer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  farmer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
    'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'TRANSPORT_PENDING',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'BUYER_VERIFICATION',
    'SETTLEMENT_PENDING', 'COMPLETED', 'PAYMENT_FAILED', 'DISPUTED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) REFERENCES public.orders(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
  provider_order_id VARCHAR(100) UNIQUE NOT NULL,
  provider_payment_id VARCHAR(100),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for Orders Table
CREATE POLICY "Allow public read access to orders"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Allow write access to orders"
  ON public.orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Setup RLS Policies for Payment Transactions Table
CREATE POLICY "Allow public read access to payments"
  ON public.payment_transactions FOR SELECT
  USING (true);

CREATE POLICY "Allow write access to payments"
  ON public.payment_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Prepopulate one demo seeds for testing checkout flow
INSERT INTO public.orders (id, lot_id, offer_id, buyer_phone, farmer_phone, amount, status)
VALUES ('ORD-101', 'LW001', 'off-abc', '9876500001', '9876543210', 14800, 'PENDING_PAYMENT')
ON CONFLICT (id) DO NOTHING;
