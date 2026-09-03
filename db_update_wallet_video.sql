-- 1. Add Video URL to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Create Wallets Table for User Wallet Balances
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
