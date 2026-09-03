-- Run this in the Supabase SQL Editor to update your products table schema
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS meesho_price numeric,
ADD COLUMN IF NOT EXISTS rating numeric,
ADD COLUMN IF NOT EXISTS reviews numeric,
ADD COLUMN IF NOT EXISTS bank_offer text,
ADD COLUMN IF NOT EXISTS specs jsonb;
