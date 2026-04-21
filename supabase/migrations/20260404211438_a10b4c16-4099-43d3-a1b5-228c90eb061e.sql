ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valor_arroba DECIMAL(10,2) DEFAULT 300.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_cotacao_arroba DATE;