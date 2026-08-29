-- Expand Market Intelligence data for different crops
INSERT INTO public.market_intelligence (crop, current_low, current_high, demand, selling_window, trend, image_url) VALUES
  ('Onion', 16.0, 22.0, 'MEDIUM', '4–7 Days', '{15, 16, 17, 16.5, 18, 19, 21, 20.5, 22, 21.5}', 'https://images.unsplash.com/photo-1508747703725-49941c880c82?w=900&h=600&fit=crop&auto=format'),
  ('Potato', 22.0, 28.0, 'HIGH', '1–3 Days', '{20, 21, 21.5, 23, 24, 25, 27, 26.5, 28, 27.5}', 'https://images.unsplash.com/photo-1544785349-c4a5301826fd?w=900&h=600&fit=crop&auto=format'),
  ('Other', 35.0, 45.0, 'LOW', '8–12 Days', '{38, 39, 41, 40, 42, 43, 44, 43.5, 45, 44.5}', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=600&fit=crop&auto=format')
ON CONFLICT (crop) DO UPDATE SET
  current_low = EXCLUDED.current_low,
  current_high = EXCLUDED.current_high,
  demand = EXCLUDED.demand,
  selling_window = EXCLUDED.selling_window,
  trend = EXCLUDED.trend,
  image_url = EXCLUDED.image_url;
