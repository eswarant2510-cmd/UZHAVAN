-- Migration: Expand smart_lots table to support variety, unit, minimum acceptable price, and multiple photos

ALTER TABLE public.smart_lots ADD COLUMN IF NOT EXISTS variety VARCHAR(100);
ALTER TABLE public.smart_lots ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';
ALTER TABLE public.smart_lots ADD COLUMN IF NOT EXISTS min_price_per_kg NUMERIC;
ALTER TABLE public.smart_lots ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Update status check constraint to include 'cancelled'
ALTER TABLE public.smart_lots DROP CONSTRAINT IF EXISTS smart_lots_status_check;
ALTER TABLE public.smart_lots ADD CONSTRAINT smart_lots_status_check CHECK (status IN ('active', 'sold', 'in_transit', 'cancelled'));
