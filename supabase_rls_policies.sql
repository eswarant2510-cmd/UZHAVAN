-- =========================================================
-- UZHAVAN - SMART LOTS SECURE RLS
-- Production policy based on Supabase Auth user ID
-- =========================================================

-- 1. Ensure public schema and RLS enabled
ALTER TABLE public.smart_lots ENABLE ROW LEVEL SECURITY;

-- 2. Remove old/insecure policies
DROP POLICY IF EXISTS "Public read access for smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers insert own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers update own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers delete own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Authenticated users can view smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can create own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can update own smart lots" ON public.smart_lots;
DROP POLICY IF EXISTS "Farmers can delete own smart lots" ON public.smart_lots;

-- =========================================================
-- SELECT
-- Active/public marketplace lots can be viewed.
-- This is intentional because buyers need to discover lots.
-- =========================================================

CREATE POLICY "Authenticated users can view smart lots"
ON public.smart_lots
FOR SELECT
TO authenticated
USING (true);

-- =========================================================
-- INSERT
-- A farmer can create a lot only for their own Auth user ID.
-- =========================================================

CREATE POLICY "Farmers can create own smart lots"
ON public.smart_lots
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()::text
);

-- =========================================================
-- UPDATE
-- Only the owner can modify their own lot.
-- =========================================================

CREATE POLICY "Farmers can update own smart lots"
ON public.smart_lots
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()::text
)
WITH CHECK (
    owner_id = auth.uid()::text
);

-- =========================================================
-- DELETE
-- Only the owner can delete their own lot.
-- =========================================================

CREATE POLICY "Farmers can delete own smart lots"
ON public.smart_lots
FOR DELETE
TO authenticated
USING (
    owner_id = auth.uid()::text
);
