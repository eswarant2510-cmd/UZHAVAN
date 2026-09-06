-- Migration to add status and quantity_kg columns to buyer_offers
ALTER TABLE public.buyer_offers 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS quantity_kg NUMERIC DEFAULT 500 NOT NULL CHECK (quantity_kg >= 0);

-- Update seed offers with distinct values
UPDATE public.buyer_offers SET quantity_kg = 500 WHERE id = 'off-abc';
UPDATE public.buyer_offers SET quantity_kg = 800 WHERE id = 'off-nashi';
UPDATE public.buyer_offers SET quantity_kg = 1000 WHERE id = 'off-pune';
