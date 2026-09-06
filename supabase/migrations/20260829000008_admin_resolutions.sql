-- Migration to support Admin resolutions, extended dispute statuses, and expanded audit events

-- 1. Update dispute status constraints
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_dispute_status_check;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_dispute_status_check CHECK (
  dispute_status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')
);

-- 2. Update audit event type constraints
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_event_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_event_type_check CHECK (
  event_type IN (
    'ORDER_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED', 'SETTLEMENT_PROTECTED',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'FARMER_VERIFIED', 'BUYER_VERIFIED',
    'MUTUAL_VERIFICATION_COMPLETE', 'DISPUTE_OPENED', 'SETTLEMENT_RELEASE_REQUESTED',
    'SETTLEMENT_COMPLETED', 'REFUND_COMPLETED', 'DOCKET_CREATED', 'TRANSPORT_ASSIGNED',
    'TRANSPORT_ACCEPTED', 'DELIVERY_REPORTED', 'DOCKET_MATCHED', 'DOCKET_MISMATCHED',
    -- New Admin audit events:
    'DISPUTE_VIEWED', 'DISPUTE_ASSIGNED', 'RESOLUTION_CREATED', 'REFUND_REQUESTED',
    'PARTIAL_RESOLUTION_CREATED', 'DISPUTE_CLOSED'
  )
);

-- 3. Create Dispute Resolutions Table
CREATE TABLE IF NOT EXISTS public.dispute_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_id VARCHAR(50) NOT NULL,
  resolution_type VARCHAR(30) NOT NULL CHECK (
    resolution_type IN ('RELEASE_SETTLEMENT', 'REFUND_BUYER', 'PARTIAL_RESOLUTION', 'KEEP_FUNDS_PROTECTED')
  ),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Allow public read access to dispute_resolutions"
  ON public.dispute_resolutions FOR SELECT USING (true);

CREATE POLICY "Allow write access to dispute_resolutions"
  ON public.dispute_resolutions FOR ALL USING (true) WITH CHECK (true);
