-- Migration to set up mutual verification, disputes, and audit trails

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30) DEFAULT 'NOT_CREATED' CHECK (settlement_status IN ('NOT_CREATED', 'ON_HOLD', 'RELEASE_ELIGIBLE', 'RELEASE_REQUESTED', 'SETTLED', 'REFUNDED', 'DISPUTED'));

-- Verification Records Table
CREATE TABLE IF NOT EXISTS public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer')),
  verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('PENDING', 'CONFIRMED', 'DISPUTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  CONSTRAINT unique_verification_order_role UNIQUE (order_id, role)
);

-- Disputes Table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  raised_by VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  dispute_reason VARCHAR(50) NOT NULL CHECK (dispute_reason IN (
    'Quantity mismatch', 'Damaged goods', 'Wrong produce', 'Delivery issue', 'Payment/order mismatch', 'Other'
  )),
  dispute_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (dispute_status IN ('OPEN', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

-- Audit Events Table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'ORDER_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED', 'SETTLEMENT_PROTECTED',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'FARMER_VERIFIED', 'BUYER_VERIFIED',
    'MUTUAL_VERIFICATION_COMPLETE', 'DISPUTE_OPENED', 'SETTLEMENT_RELEASE_REQUESTED',
    'SETTLEMENT_COMPLETED', 'REFUND_COMPLETED'
  )),
  actor VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Allow public read access to verification_records"
  ON public.verification_records FOR SELECT USING (true);

CREATE POLICY "Allow write access to verification_records"
  ON public.verification_records FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to disputes"
  ON public.disputes FOR SELECT USING (true);

CREATE POLICY "Allow write access to disputes"
  ON public.disputes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to audit_events"
  ON public.audit_events FOR SELECT USING (true);

CREATE POLICY "Allow write access to audit_events"
  ON public.audit_events FOR ALL USING (true) WITH CHECK (true);
