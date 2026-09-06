-- Migration to update check constraints on logistics_dockets and orders to allow TRANSPORT_ACCEPTED status

-- Drop existing constraints
ALTER TABLE public.logistics_dockets DROP CONSTRAINT IF EXISTS logistics_dockets_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraints including TRANSPORT_ACCEPTED
ALTER TABLE public.logistics_dockets ADD CONSTRAINT logistics_dockets_status_check CHECK (
  status IN (
    'TRANSPORT_ASSIGNED', 'TRANSPORT_ACCEPTED', 'PICKUP_PENDING', 'PICKUP_CONFIRMED', 
    'IN_TRANSIT', 'DELIVERED', 'DELIVERY_REPORTED', 'MATCHING_PENDING', 'MATCHED', 'MISMATCH'
  )
);

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'TRANSPORT_PENDING', 'TRANSPORT_ACCEPTED',
    'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'BUYER_VERIFICATION',
    'SETTLEMENT_PENDING', 'RELEASE_ELIGIBLE', 'COMPLETED', 'PAYMENT_FAILED', 'DISPUTED'
  )
);
