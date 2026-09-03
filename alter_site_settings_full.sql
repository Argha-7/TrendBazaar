-- 1. Extend Site Settings for Homepage Builder and Global Customizations
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'TrendBazaar',
ADD COLUMN IF NOT EXISTS store_logo_url TEXT,
ADD COLUMN IF NOT EXISTS announcement_text TEXT,
ADD COLUMN IF NOT EXISTS support_phone TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS homepage_layout JSONB DEFAULT '[]';

-- 2. Create User Profiles Table for Customers & Roles
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
