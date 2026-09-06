-- Migration: 20260905000000_auth_uuid_migration.sql
-- Description: Add user_id column to profiles table and owner_id column to smart_lots table for Supabase Auth UUID integration

-- 1. Add user_id column to profiles referencing auth.users(id)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add owner_id column to smart_lots referencing auth.users(id)
ALTER TABLE public.smart_lots 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Create indexes for foreign key performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_lots_owner_id ON public.smart_lots(owner_id);
