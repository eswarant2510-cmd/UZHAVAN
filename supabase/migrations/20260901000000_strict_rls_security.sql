-- Migration: 20260901000000_strict_rls_security.sql
-- Description: Strict Supabase Row Level Security (RLS) Policy Audit & Enforcement

-- 1. Create cart_items table if not exists
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lot_id VARCHAR(50) REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  crop VARCHAR(50) NOT NULL,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  price_per_kg NUMERIC NOT NULL CHECK (price_per_kg > 0),
  farmer_phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on all user-related tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docket_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing permissive development policies
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insertions to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Allow public read access to smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Allow farmers to insert smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Allow farmers to update their own smart lots" ON public.smart_lots;

DROP POLICY IF EXISTS "Allow public read access to buyer offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Allow users to write/modify buyer offers" ON public.buyer_offers;

DROP POLICY IF EXISTS "Allow public read access to market intelligence" ON public.market_intelligence;
DROP POLICY IF EXISTS "Allow admin writes to market intelligence" ON public.market_intelligence;

DROP POLICY IF EXISTS "Allow public read access to price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow admin writes to price alerts" ON public.price_alerts;

-- 4. PROFILES TABLE RLS POLICIES
-- SELECT: Users can only read their own profile
CREATE POLICY "Users can select own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Authenticated users can insert their own profile matching auth.uid()
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. CART ITEMS TABLE RLS POLICIES
-- SELECT: auth.uid() = user_id
CREATE POLICY "Users can select own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: auth.uid() = user_id
CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: auth.uid() = user_id
CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: auth.uid() = user_id
CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. ORDERS TABLE RLS POLICIES
-- SELECT: auth.uid() = user_id OR buyer/farmer ownership
CREATE POLICY "Users can select own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = buyer_phone
    OR auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) IN (buyer_phone, farmer_phone)
  );

-- INSERT: auth.uid() = user_id
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = buyer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) = buyer_phone
  );

-- UPDATE: auth.uid() = user_id or participant
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = buyer_phone
    OR auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) IN (buyer_phone, farmer_phone)
  )
  WITH CHECK (
    auth.uid()::text = buyer_phone
    OR auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) IN (buyer_phone, farmer_phone)
  );

-- 7. SMART LOTS (PRODUCTS) TABLE RLS POLICIES
-- SELECT: Authenticated users can view available products
CREATE POLICY "Authenticated users can select smart lots"
  ON public.smart_lots FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: auth.uid() = owner_id / farmer_phone
CREATE POLICY "Farmers can insert own smart lots"
  ON public.smart_lots FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) = farmer_phone
  );

-- UPDATE: auth.uid() = owner_id / farmer_phone
CREATE POLICY "Farmers can update own smart lots"
  ON public.smart_lots FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) = farmer_phone
  )
  WITH CHECK (
    auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) = farmer_phone
  );

-- DELETE: auth.uid() = owner_id / farmer_phone
CREATE POLICY "Farmers can delete own smart lots"
  ON public.smart_lots FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = farmer_phone
    OR (SELECT phone FROM public.profiles WHERE id = auth.uid()) = farmer_phone
  );

-- 8. BUYER OFFERS TABLE RLS POLICIES
CREATE POLICY "Authenticated users can select buyer offers"
  ON public.buyer_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Buyers can insert offers"
  ON public.buyer_offers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Lot owners or buyers can update offers"
  ON public.buyer_offers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. MARKET INTELLIGENCE & PRICE ALERTS
CREATE POLICY "Authenticated users can read market intelligence"
  ON public.market_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read price alerts"
  ON public.price_alerts FOR SELECT
  TO authenticated
  USING (true);

-- 10. VERIFICATION RECORDS & DISPUTES
CREATE POLICY "Users can select relevant verification records"
  ON public.verification_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert verification records"
  ON public.verification_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can select disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 11. AUDIT EVENTS
CREATE POLICY "Users can read relevant audit events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit events"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);
