-- Migration: Add transport_vehicles table and options
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id VARCHAR(50) PRIMARY KEY,
  vehicle_type VARCHAR(100) NOT NULL,
  capacity_kg NUMERIC NOT NULL CHECK (capacity_kg > 0),
  base_cost NUMERIC NOT NULL DEFAULT 0 CHECK (base_cost >= 0),
  cost_per_km NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_km >= 0),
  average_speed_kmh NUMERIC NOT NULL DEFAULT 40 CHECK (average_speed_kmh > 0),
  availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline'))
);

-- Enable RLS
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Allow public read access to transport vehicles"
  ON public.transport_vehicles FOR SELECT
  USING (true);

-- Insert policy (admin/public check)
CREATE POLICY "Allow writes to transport vehicles"
  ON public.transport_vehicles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Populate seed transport options
INSERT INTO public.transport_vehicles (id, vehicle_type, capacity_kg, base_cost, cost_per_km, average_speed_kmh, availability_status) VALUES
  ('tr-mini', 'Mini Truck', 1000, 280.0, 10.0, 40, 'available'),
  ('tr-large', 'Large Truck', 5000, 770.0, 15.0, 50, 'available'),
  ('tr-heavy', 'Heavy Duty Multi-Axle', 15000, 1500.0, 22.0, 45, 'available')
ON CONFLICT (id) DO UPDATE SET
  vehicle_type = EXCLUDED.vehicle_type,
  capacity_kg = EXCLUDED.capacity_kg,
  base_cost = EXCLUDED.base_cost,
  cost_per_km = EXCLUDED.cost_per_km,
  average_speed_kmh = EXCLUDED.average_speed_kmh,
  availability_status = EXCLUDED.availability_status;
