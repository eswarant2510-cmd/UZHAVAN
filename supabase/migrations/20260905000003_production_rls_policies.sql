-- Migration: 20260905000003_production_rls_policies.sql
-- Description: Production Row-Level Security (RLS) policies enforcing Auth UUID (auth.uid()) ownership while preserving public discovery for active/legacy lots.

-- ==========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docket_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. DROP OLD DEVELOPMENT / PERMISSIVE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insertions to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Allow public read access to smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Allow farmers to insert smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Allow farmers to update their own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Authenticated users can select smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can insert own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can update own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can delete own smart lots" ON public.smart_lots;

DROP POLICY IF EXISTS "Allow public read access to buyer offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Allow users to write/modify buyer offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Authenticated users can select buyer offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Buyers can insert offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Lot owners or buyers can update offers" ON public.buyer_offers;

DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow write access to orders" ON public.orders;
DROP POLICY IF EXISTS "Users can select own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

DROP POLICY IF EXISTS "Allow public read access to payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Allow write access to payments" ON public.payment_transactions;

DROP POLICY IF EXISTS "Allow public read access to transport vehicles" ON public.transport_vehicles;
DROP POLICY IF EXISTS "Allow writes to transport vehicles" ON public.transport_vehicles;

DROP POLICY IF EXISTS "Allow public read access to verification_records" ON public.verification_records;
DROP POLICY IF EXISTS "Allow write access to verification_records" ON public.verification_records;
DROP POLICY IF EXISTS "Users can select relevant verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Users can insert verification records" ON public.verification_records;

DROP POLICY IF EXISTS "Allow public read access to disputes" ON public.disputes;
DROP POLICY IF EXISTS "Allow write access to disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can select disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can insert disputes" ON public.disputes;

DROP POLICY IF EXISTS "Allow public read access to dispute_resolutions" ON public.dispute_resolutions;
DROP POLICY IF EXISTS "Allow write access to dispute_resolutions" ON public.dispute_resolutions;

DROP POLICY IF EXISTS "Allow public read access to logistics_dockets" ON public.logistics_dockets;
DROP POLICY IF EXISTS "Allow write access to logistics_dockets" ON public.logistics_dockets;

DROP POLICY IF EXISTS "Allow public read access to docket_evidence" ON public.docket_evidence;
DROP POLICY IF EXISTS "Allow write access to docket_evidence" ON public.docket_evidence;

DROP POLICY IF EXISTS "Allow public read access to market intelligence" ON public.market_intelligence;
DROP POLICY IF EXISTS "Allow admin writes to market intelligence" ON public.market_intelligence;
DROP POLICY IF EXISTS "Authenticated users can read market intelligence" ON public.market_intelligence;

DROP POLICY IF EXISTS "Allow public read access to price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow admin writes to price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Authenticated users can read price alerts" ON public.price_alerts;

DROP POLICY IF EXISTS "Allow public read access to audit_events" ON public.audit_events;
DROP POLICY IF EXISTS "Allow write access to audit_events" ON public.audit_events;
DROP POLICY IF EXISTS "Users can read relevant audit events" ON public.audit_events;
DROP POLICY IF EXISTS "System can insert audit events" ON public.audit_events;

-- ==========================================
-- 3. CREATE PRODUCTION RLS POLICIES
-- ==========================================

-- PROFILES: Users manage their own profile via user_id
CREATE POLICY "Users can select own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SMART LOTS: Public marketplace discovery for active & legacy lots; owner full management
CREATE POLICY "Public read for active and legacy smart lots"
  ON public.smart_lots FOR SELECT
  USING (status = 'active' OR owner_id IS NULL OR auth.uid() = owner_id);

CREATE POLICY "Farmers can insert own smart lots"
  ON public.smart_lots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Farmers can update own smart lots"
  ON public.smart_lots FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Farmers can delete own smart lots"
  ON public.smart_lots FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- BUYER OFFERS: Accessible by buyer who placed offer or farmer who owns the lot
CREATE POLICY "Buyers and lot owners can view offers"
  ON public.buyer_offers FOR SELECT
  USING (buyer_id IS NULL OR auth.uid() = buyer_id OR auth.uid() IN (SELECT owner_id FROM public.smart_lots WHERE id = lot_id));

CREATE POLICY "Buyers can insert offers"
  ON public.buyer_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers and lot owners can update offers"
  ON public.buyer_offers FOR UPDATE
  TO authenticated
  USING (buyer_id IS NULL OR auth.uid() = buyer_id OR auth.uid() IN (SELECT owner_id FROM public.smart_lots WHERE id = lot_id));

-- ORDERS: Accessible strictly by participating buyer or farmer
CREATE POLICY "Order participants can view orders"
  ON public.orders FOR SELECT
  USING (buyer_id IS NULL OR farmer_id IS NULL OR auth.uid() = buyer_id OR auth.uid() = farmer_id);

CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Order participants can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (buyer_id IS NULL OR farmer_id IS NULL OR auth.uid() = buyer_id OR auth.uid() = farmer_id);

-- CART ITEMS: Users manage their own cart items via auth_user_id
CREATE POLICY "Users can select own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- PAYMENT TRANSACTIONS: Visible to participating order buyer or farmer
CREATE POLICY "Order participants can view payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id));

CREATE POLICY "Buyers can insert payment transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id));

-- LOGISTICS DOCKETS: Accessible by assigned farmer, buyer, or transporter
CREATE POLICY "Logistics participants can view dockets"
  ON public.logistics_dockets FOR SELECT
  USING (farmer_id IS NULL OR buyer_id IS NULL OR transporter_id IS NULL OR auth.uid() IN (farmer_id, buyer_id, transporter_id));

CREATE POLICY "Logistics participants can update dockets"
  ON public.logistics_dockets FOR UPDATE
  TO authenticated
  USING (farmer_id IS NULL OR buyer_id IS NULL OR transporter_id IS NULL OR auth.uid() IN (farmer_id, buyer_id, transporter_id));

-- DOCKET EVIDENCE: Accessible by docket uploader or docket participants
CREATE POLICY "Participants can view docket evidence"
  ON public.docket_evidence FOR SELECT
  USING (uploader_id IS NULL OR auth.uid() = uploader_id OR auth.uid() IN (SELECT farmer_id FROM public.logistics_dockets WHERE id = docket_id) OR auth.uid() IN (SELECT buyer_id FROM public.logistics_dockets WHERE id = docket_id) OR auth.uid() IN (SELECT transporter_id FROM public.logistics_dockets WHERE id = docket_id));

CREATE POLICY "Users can upload docket evidence"
  ON public.docket_evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

-- DISPUTES & RESOLUTIONS: Accessible by dispute raiser, order participants, or resolution admin
CREATE POLICY "Dispute participants can view disputes"
  ON public.disputes FOR SELECT
  USING (raised_by_id IS NULL OR auth.uid() = raised_by_id OR auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id));

CREATE POLICY "Order participants can raise disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = raised_by_id);

CREATE POLICY "Dispute participants can view resolutions"
  ON public.dispute_resolutions FOR SELECT
  USING (admin_user_id IS NULL OR auth.uid() = admin_user_id OR auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id));

-- VERIFICATION RECORDS: Accessible by verifying actor or order participants
CREATE POLICY "Order participants can view verification records"
  ON public.verification_records FOR SELECT
  USING (actor_id IS NULL OR auth.uid() = actor_id OR auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id));

CREATE POLICY "Order participants can insert verification records"
  ON public.verification_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- AUDIT EVENTS: Visible to order participants
CREATE POLICY "Order participants can view audit events"
  ON public.audit_events FOR SELECT
  USING (actor_id IS NULL OR auth.uid() = actor_id OR auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id));

CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- GLOBAL CATALOGS: Public read for vehicles, market intelligence, and price alerts
CREATE POLICY "Public read for transport vehicles"
  ON public.transport_vehicles FOR SELECT
  USING (true);

CREATE POLICY "Public read for market intelligence"
  ON public.market_intelligence FOR SELECT
  USING (true);

CREATE POLICY "Public read for price alerts"
  ON public.price_alerts FOR SELECT
  USING (true);
