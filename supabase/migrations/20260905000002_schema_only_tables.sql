-- Migration: 20260905000002_schema_only_tables.sql
-- Description: Consolidated schema-only DDL migration creating all missing domain tables and Auth UUID ownership columns with 0 RLS policies.

-- ==========================================
-- 1. EXPAND EXISTING LIVE TABLES (Idempotent)
-- ==========================================

-- profiles: Ensure user_id column exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- smart_lots: Add expanded fields & owner_id
ALTER TABLE public.smart_lots 
  ADD COLUMN IF NOT EXISTS variety VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS min_price_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS photos TEXT[],
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.smart_lots DROP CONSTRAINT IF EXISTS smart_lots_status_check;
ALTER TABLE public.smart_lots ADD CONSTRAINT smart_lots_status_check CHECK (status IN ('active', 'sold', 'in_transit', 'cancelled'));
CREATE INDEX IF NOT EXISTS idx_smart_lots_owner_id ON public.smart_lots(owner_id);

-- buyer_offers: Add status, quantity_kg, and buyer_id
ALTER TABLE public.buyer_offers 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS quantity_kg NUMERIC DEFAULT 500 NOT NULL CHECK (quantity_kg >= 0),
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_offers_buyer_id ON public.buyer_offers(buyer_id);

-- ==========================================
-- 2. CREATE MISSING DOMAIN TABLES & UUID COLUMNS
-- ==========================================

-- transport_vehicles table
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id VARCHAR(50) PRIMARY KEY,
  vehicle_type VARCHAR(100) NOT NULL,
  capacity_kg NUMERIC NOT NULL CHECK (capacity_kg > 0),
  base_cost NUMERIC NOT NULL DEFAULT 0 CHECK (base_cost >= 0),
  cost_per_km NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_km >= 0),
  average_speed_kmh NUMERIC NOT NULL DEFAULT 40 CHECK (average_speed_kmh > 0),
  availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline'))
);

-- orders table (with legacy phone fields + Auth UUIDs)
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(50) PRIMARY KEY,
  lot_id VARCHAR(50) REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  offer_id VARCHAR(50) REFERENCES public.buyer_offers(id) ON DELETE CASCADE,
  buyer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  farmer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
    'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'TRANSPORT_PENDING', 'TRANSPORT_ACCEPTED',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'BUYER_VERIFICATION',
    'SETTLEMENT_PENDING', 'RELEASE_ELIGIBLE', 'COMPLETED', 'PAYMENT_FAILED', 'DISPUTED'
  )),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  settlement_status VARCHAR(30) DEFAULT 'NOT_CREATED' CHECK (settlement_status IN ('NOT_CREATED', 'ON_HOLD', 'RELEASE_ELIGIBLE', 'RELEASE_REQUESTED', 'SETTLED', 'REFUNDED', 'DISPUTED')),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farmer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON public.orders(farmer_id);

-- payment_transactions table
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

-- verification_records table
CREATE TABLE IF NOT EXISTS public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer')),
  verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('PENDING', 'CONFIRMED', 'DISPUTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  CONSTRAINT unique_verification_order_role UNIQUE (order_id, role)
);
CREATE INDEX IF NOT EXISTS idx_verification_records_actor_id ON public.verification_records(actor_id);

-- disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  raised_by VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  raised_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dispute_reason VARCHAR(50) NOT NULL CHECK (dispute_reason IN (
    'Quantity mismatch', 'Damaged goods', 'Wrong produce', 'Delivery issue', 'Payment/order mismatch', 'Other'
  )),
  dispute_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (dispute_status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by_id ON public.disputes(raised_by_id);

-- dispute_resolutions table
CREATE TABLE IF NOT EXISTS public.dispute_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_id VARCHAR(50) NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_type VARCHAR(30) NOT NULL CHECK (
    resolution_type IN ('RELEASE_SETTLEMENT', 'REFUND_BUYER', 'PARTIAL_RESOLUTION', 'KEEP_FUNDS_PROTECTED')
  ),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_admin_user_id ON public.dispute_resolutions(admin_user_id);

-- audit_events table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'ORDER_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED', 'SETTLEMENT_PROTECTED',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'FARMER_VERIFIED', 'BUYER_VERIFIED',
    'MUTUAL_VERIFICATION_COMPLETE', 'DISPUTE_OPENED', 'SETTLEMENT_RELEASE_REQUESTED',
    'SETTLEMENT_COMPLETED', 'REFUND_COMPLETED', 'DOCKET_CREATED', 'TRANSPORT_ASSIGNED',
    'TRANSPORT_ACCEPTED', 'DELIVERY_REPORTED', 'DOCKET_MATCHED', 'DOCKET_MISMATCHED',
    'DISPUTE_VIEWED', 'DISPUTE_ASSIGNED', 'RESOLUTION_CREATED', 'REFUND_REQUESTED',
    'PARTIAL_RESOLUTION_CREATED', 'DISPUTE_CLOSED'
  )),
  actor VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON public.audit_events(actor_id);

-- logistics_dockets sequence & table
CREATE SEQUENCE IF NOT EXISTS public.docket_human_id_seq START 1;

CREATE TABLE IF NOT EXISTS public.logistics_dockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_human_id VARCHAR(30) UNIQUE NOT NULL DEFAULT ('LWD-2026-' || LPAD(nextval('public.docket_human_id_seq')::text, 6, '0')),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lot_id VARCHAR(50) NOT NULL REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  farmer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  buyer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  transporter_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  farmer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  crop VARCHAR(50) NOT NULL,
  variety VARCHAR(50),
  agreed_quantity NUMERIC NOT NULL CHECK (agreed_quantity > 0),
  pickup_location VARCHAR(150) NOT NULL,
  delivery_location VARCHAR(150) NOT NULL,
  vehicle_identifier VARCHAR(50) NOT NULL,
  transport_option VARCHAR(50),
  expected_pickup_time TIMESTAMPTZ,
  expected_delivery_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  delivered_quantity NUMERIC CHECK (delivered_quantity >= 0),
  reported_delivery_location VARCHAR(150),
  reported_receiving_party VARCHAR(100),
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'TRANSPORT_ASSIGNED', 'TRANSPORT_ACCEPTED', 'PICKUP_PENDING', 'PICKUP_CONFIRMED', 
    'IN_TRANSIT', 'DELIVERED', 'DELIVERY_REPORTED', 'MATCHING_PENDING', 'MATCHED', 'MISMATCH'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_farmer_id ON public.logistics_dockets(farmer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_buyer_id ON public.logistics_dockets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_transporter_id ON public.logistics_dockets(transporter_id);

-- docket_evidence table
CREATE TABLE IF NOT EXISTS public.docket_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_id UUID NOT NULL REFERENCES public.logistics_dockets(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docket_evidence_uploader_id ON public.docket_evidence(uploader_id);

-- cart_items table (with legacy profiles user_id AND auth_user_id)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id VARCHAR(50) REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  crop VARCHAR(50) NOT NULL,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  price_per_kg NUMERIC NOT NULL CHECK (price_per_kg > 0),
  farmer_phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_auth_user_id ON public.cart_items(auth_user_id);
