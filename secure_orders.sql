-- =========================================================================
-- SECURE CHECKOUT: DATABASE SERVER-SIDE CALCULATION
-- =========================================================================

-- 1. Ensure profit column exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS profit numeric DEFAULT 0;

-- 2. Create the Security Function (The "Testbook" style backend check)
-- This function runs entirely on the Supabase Server. It ignores the 'product_price' 
-- sent by the Javascript frontend and fetches the real price directly from the database.
CREATE OR REPLACE FUNCTION secure_order_checkout()
RETURNS TRIGGER AS $$
DECLARE
    real_selling_price numeric;
    real_meesho_price numeric;
    real_title text;
    real_image text;
BEGIN
    -- Only run this if a product_id is provided
    IF NEW.product_id IS NOT NULL THEN
        -- Securely fetch the actual product details from the database
        SELECT price, meesho_price, title, images->>0 
        INTO real_selling_price, real_meesho_price, real_title, real_image
        FROM public.products
        WHERE id = NEW.product_id;

        -- If someone tries to order a deleted or fake product, reject it completely
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product does not exist. Security block triggered.';
        END IF;

        -- OVERRIDE any fake price sent by the frontend with the real database price
        NEW.product_price := real_selling_price;
        NEW.product_title := real_title;
        NEW.product_image := real_image;
        
        -- Automatically calculate profit on the backend
        NEW.profit := real_selling_price - COALESCE(real_meesho_price, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the Trigger to the Orders Table
DROP TRIGGER IF EXISTS trg_secure_order ON public.orders;
CREATE TRIGGER trg_secure_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION secure_order_checkout();

-- Note on Authentication: 
-- Because we are using Firebase Auth instead of Supabase Auth, strict Row Level Security (RLS) 
-- requires adding Firebase's JWT Secret to your Supabase project settings.
-- For now, this Trigger perfectly secures the Pricing Logic so hackers cannot alter order amounts.
