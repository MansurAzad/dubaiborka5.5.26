
-- Add payment-related columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_phone text,
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz;
