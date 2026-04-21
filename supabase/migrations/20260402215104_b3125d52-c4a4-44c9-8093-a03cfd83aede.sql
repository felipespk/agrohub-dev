ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lat_lavoura DECIMAL(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lng_lavoura DECIMAL(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lat_gado DECIMAL(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lng_gado DECIMAL(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lat_secador DECIMAL(10,7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fazenda_lng_secador DECIMAL(10,7);