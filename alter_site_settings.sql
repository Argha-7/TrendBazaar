-- Add new customization columns to site_settings
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'TrendBazaar',
ADD COLUMN IF NOT EXISTS store_logo_url TEXT,
ADD COLUMN IF NOT EXISTS announcement_text TEXT,
ADD COLUMN IF NOT EXISTS support_phone TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT;
