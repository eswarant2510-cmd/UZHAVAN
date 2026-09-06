-- Migration: 20260905000004_payment_settlements_ledger.sql
-- Description: Creates payment_settlements ledger table supporting the 80% immediate release and 20% hold model with RLS.

CREATE TABLE IF NOT EXISTS public.payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  authoritative_amount NUMERIC(12, 2) NOT NULL CHECK (authoritative_amount >= 0),
  immediate_release_amount NUMERIC(12, 2) NOT NULL CHECK (immediate_release_amount >= 0),
  held_amount NUMERIC(12, 2) NOT NULL CHECK (held_amount >= 0),
  remaining_release_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (remaining_release_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'FULLY_SETTLED', 'DISPUTED', 'REFUNDED', 'PARTIAL_SETTLED')),
  farmer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_settlement_split CHECK (immediate_release_amount + held_amount = authoritative_amount)
);

CREATE INDEX IF NOT EXISTS idx_payment_settlements_order_id ON public.payment_settlements(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_settlements_farmer_id ON public.payment_settlements(farmer_id);
CREATE INDEX IF NOT EXISTS idx_payment_settlements_buyer_id ON public.payment_settlements(buyer_id);

-- Enable RLS
ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Order participants can view payment settlements" ON public.payment_settlements;

-- RLS Policy: Order participants (farmer and buyer) can view settlement details
CREATE POLICY "Order participants can view payment settlements"
  ON public.payment_settlements FOR SELECT
  USING (
    auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) 
    OR 
    auth.uid() IN (SELECT farmer_id FROM public.orders WHERE id = order_id)
  );
