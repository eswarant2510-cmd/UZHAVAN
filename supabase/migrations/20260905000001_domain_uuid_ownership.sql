-- Migration: 20260905000001_domain_uuid_ownership.sql
-- Description: Add Supabase Auth UUID ownership columns (auth.users.id) to domain tables (buyer_offers, orders, logistics_dockets, disputes, verification_records, cart_items)

-- 1. buyer_offers: Add buyer_id Auth UUID
ALTER TABLE public.buyer_offers 
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_offers_buyer_id ON public.buyer_offers(buyer_id);

-- 2. orders: Add buyer_id and farmer_id Auth UUIDs
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON public.orders(farmer_id);

-- 3. logistics_dockets: Add farmer_id, buyer_id, and transporter_id Auth UUIDs
ALTER TABLE public.logistics_dockets 
  ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_farmer_id ON public.logistics_dockets(farmer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_buyer_id ON public.logistics_dockets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_dockets_transporter_id ON public.logistics_dockets(transporter_id);

-- 4. disputes: Add raised_by_id Auth UUID
ALTER TABLE public.disputes 
  ADD COLUMN IF NOT EXISTS raised_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by_id ON public.disputes(raised_by_id);

-- 5. verification_records: Add actor_id Auth UUID
ALTER TABLE public.verification_records 
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_verification_records_actor_id ON public.verification_records(actor_id);

-- 6. cart_items: Add auth_user_id Auth UUID without touching existing profiles(id) user_id FK
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cart_items_auth_user_id ON public.cart_items(auth_user_id);
