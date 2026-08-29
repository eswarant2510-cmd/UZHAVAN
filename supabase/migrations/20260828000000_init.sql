-- Init Migration for UZHAVAN Foundation Schema

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer', 'transport', 'admin')),
  source VARCHAR(20) DEFAULT 'live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Smart Lots Table
CREATE TABLE IF NOT EXISTS public.smart_lots (
  id VARCHAR(50) PRIMARY KEY,
  farmer_phone VARCHAR(20) REFERENCES public.profiles(phone) ON DELETE CASCADE,
  crop VARCHAR(50) NOT NULL,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  image_url TEXT,
  location VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'in_transit')),
  quality_grade VARCHAR(10) NOT NULL CHECK (quality_grade IN ('A', 'B', 'C')),
  quality_confidence INTEGER NOT NULL CHECK (quality_confidence BETWEEN 0 AND 100),
  quality_label VARCHAR(100) NOT NULL,
  quality_disclaimer TEXT NOT NULL,
  expected_net_per_kg NUMERIC NOT NULL,
  harvest_date DATE,
  expected_selling_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Buyer Offers Table
CREATE TABLE IF NOT EXISTS public.buyer_offers (
  id VARCHAR(50) PRIMARY KEY,
  lot_id VARCHAR(50) REFERENCES public.smart_lots(id) ON DELETE CASCADE,
  buyer_name VARCHAR(100) NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  offer_price_per_kg NUMERIC NOT NULL CHECK (offer_price_per_kg > 0),
  transport_cost NUMERIC NOT NULL CHECK (transport_cost >= 0),
  buyer_risk VARCHAR(20) NOT NULL CHECK (buyer_risk IN ('LOW', 'MEDIUM', 'HIGH')),
  distance_km NUMERIC NOT NULL CHECK (distance_km >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Market Intelligence Table
CREATE TABLE IF NOT EXISTS public.market_intelligence (
  crop VARCHAR(50) PRIMARY KEY,
  current_low NUMERIC NOT NULL CHECK (current_low >= 0),
  current_high NUMERIC NOT NULL CHECK (current_high >= current_low),
  demand VARCHAR(20) NOT NULL CHECK (demand IN ('LOW', 'MEDIUM', 'HIGH')),
  selling_window VARCHAR(50) NOT NULL,
  trend NUMERIC[] NOT NULL,
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Price Alerts Table
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  crop VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies for Profiles
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow insertions to profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 7. Define RLS Policies for Smart Lots
CREATE POLICY "Allow public read access to smart lots"
  ON public.smart_lots FOR SELECT
  USING (true);

CREATE POLICY "Allow farmers to insert smart lots"
  ON public.smart_lots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow farmers to update their own smart lots"
  ON public.smart_lots FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 8. Define RLS Policies for Buyer Offers
CREATE POLICY "Allow public read access to buyer offers"
  ON public.buyer_offers FOR SELECT
  USING (true);

CREATE POLICY "Allow users to write/modify buyer offers"
  ON public.buyer_offers FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Define RLS Policies for Market Intelligence
CREATE POLICY "Allow public read access to market intelligence"
  ON public.market_intelligence FOR SELECT
  USING (true);

CREATE POLICY "Allow admin writes to market intelligence"
  ON public.market_intelligence FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. Define RLS Policies for Price Alerts
CREATE POLICY "Allow public read access to price alerts"
  ON public.price_alerts FOR SELECT
  USING (true);

CREATE POLICY "Allow admin writes to price alerts"
  ON public.price_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Prepopulate Mocks
INSERT INTO public.profiles (phone, name, location, role, source) VALUES
  ('9876543210', 'Ramesh Patel', 'Nashik, Maharashtra', 'farmer', 'demo'),
  ('9876500001', 'Suresh Agarwal', 'Mumbai, Maharashtra', 'buyer', 'demo'),
  ('9876500002', 'Vijay Logistics', 'Pune, Maharashtra', 'transport', 'demo'),
  ('9876500003', 'UZHAVAN Admin', 'India', 'admin', 'demo')
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  role = EXCLUDED.role,
  source = EXCLUDED.source;

INSERT INTO public.smart_lots (id, farmer_phone, crop, quantity_kg, image_url, location, status, quality_grade, quality_confidence, quality_label, quality_disclaimer, expected_net_per_kg) VALUES
  ('LW001', '9876543210', 'Tomato', 500, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=900&h=700&fit=crop&auto=format', 'Nashik, Maharashtra', 'active', 'A', 88, 'Grade A — Indicative', 'Indicative quality signal from one photo. Not a certificate for the full batch.', 29.4),
  ('LW002', '9876543210', 'Onion', 800, 'https://images.unsplash.com/photo-1508747703725-49941c880c82?w=900&h=700&fit=crop&auto=format', 'Lasalgaon, Maharashtra', 'active', 'A', 82, 'Grade A — Indicative', 'Indicative quality signal from one photo. Not a certificate for the full batch.', 18.1),
  ('LW003', '9876543210', 'Grapes', 250, 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=900&h=700&fit=crop&auto=format', 'Nashik, Maharashtra', 'active', 'B', 76, 'Grade B — Indicative', 'Indicative quality signal from one photo. Not a certificate for the full batch.', 42.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buyer_offers (id, lot_id, buyer_name, verified, offer_price_per_kg, transport_cost, buyer_risk, distance_km) VALUES
  ('off-abc', 'LW001', 'ABC Traders', true, 31.0, 700.0, 'LOW', 42.0),
  ('off-nashi', 'LW001', 'Nashik Mandi Co-op', true, 29.5, 320.0, 'LOW', 18.0),
  ('off-pune', 'LW001', 'Pune Fresh Mart', false, 32.0, 2100.0, 'MEDIUM', 165.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.market_intelligence (crop, current_low, current_high, demand, selling_window, trend, image_url) VALUES
  ('Tomato', 28.0, 31.0, 'HIGH', '2–3 Days', '{24, 25, 26, 25.5, 27, 28, 29, 28.5, 30, 31}', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&h=600&fit=crop&auto=format'),
  ('Onion', 16.0, 22.0, 'MEDIUM', '4–7 Days', '{15, 16, 17, 16.5, 18, 19, 21, 20.5, 22, 21.5}', 'https://images.unsplash.com/photo-1508747703725-49941c880c82?w=900&h=600&fit=crop&auto=format'),
  ('Potato', 22.0, 28.0, 'HIGH', '1–3 Days', '{20, 21, 21.5, 23, 24, 25, 27, 26.5, 28, 27.5}', 'https://images.unsplash.com/photo-1544785349-c4a5301826fd?w=900&h=600&fit=crop&auto=format'),
  ('Sugarcane', 30.0, 38.0, 'MEDIUM', '4–6 Days', '{28, 29, 31, 32, 34, 33, 35, 36, 37, 38}', 'https://images.unsplash.com/photo-1464226184884-fa52ac9c7d08?w=900&h=600&fit=crop&auto=format'),
  ('Paddy', 24.0, 31.0, 'HIGH', '2–4 Days', '{22, 23, 24, 25, 27, 28, 29, 30, 31, 30.5}', 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=900&h=600&fit=crop&auto=format'),
  ('Cotton', 42.0, 52.0, 'HIGH', '3–5 Days', '{38, 40, 42, 44, 45, 47, 49, 50, 51, 52}', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=600&fit=crop&auto=format'),
  ('Maize', 19.0, 25.0, 'MEDIUM', '3–7 Days', '{17, 18, 20, 21, 22, 23, 24, 25, 24.5, 25}', 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=900&h=600&fit=crop&auto=format'),
  ('Chili', 46.0, 62.0, 'HIGH', '1–3 Days', '{40, 43, 45, 47, 50, 52, 54, 56, 59, 62}', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=900&h=600&fit=crop&auto=format')
ON CONFLICT (crop) DO NOTHING;

INSERT INTO public.price_alerts (id, title, message, crop) VALUES
  ('alert-tomato', 'Price Alert', 'Tomato price increased.', 'Tomato')
ON CONFLICT (id) DO NOTHING;
