-- Migration to set up Logistics Docket and Matching Engine tables

-- Create sequence for predicting/generating human readable docket numbers (e.g. LWD-2026-000001)
CREATE SEQUENCE IF NOT EXISTS public.docket_human_id_seq START 1;

-- Logistics Dockets table
CREATE TABLE IF NOT EXISTS public.logistics_dockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_human_id VARCHAR(30) UNIQUE NOT NULL DEFAULT ('LWD-2026-' || LPAD(nextval('public.docket_human_id_seq')::text, 6, '0')),
  order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lot_id VARCHAR(50) NOT NULL REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  farmer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  buyer_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  transporter_phone VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
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
    'TRANSPORT_ASSIGNED', 'PICKUP_PENDING', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 
    'DELIVERED', 'DELIVERY_REPORTED', 'MATCHING_PENDING', 'MATCHED', 'MISMATCH'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Docket Evidence table
CREATE TABLE IF NOT EXISTS public.docket_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_id UUID NOT NULL REFERENCES public.logistics_dockets(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(20) NOT NULL REFERENCES public.profiles(phone) ON DELETE CASCADE,
  file_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.logistics_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docket_evidence ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Allow public read access to logistics_dockets"
  ON public.logistics_dockets FOR SELECT USING (true);

CREATE POLICY "Allow write access to logistics_dockets"
  ON public.logistics_dockets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to docket_evidence"
  ON public.docket_evidence FOR SELECT USING (true);

CREATE POLICY "Allow write access to docket_evidence"
  ON public.docket_evidence FOR ALL USING (true) WITH CHECK (true);
