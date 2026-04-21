-- Storage bucket for pasture photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pasto-fotos', 'pasto-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Add foto_url column to pastos
ALTER TABLE public.pastos ADD COLUMN IF NOT EXISTS foto_url text;

-- RLS policies for pasto-fotos bucket
DROP POLICY IF EXISTS "Pasto fotos are publicly viewable" ON storage.objects;
CREATE POLICY "Pasto fotos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'pasto-fotos');

DROP POLICY IF EXISTS "Users can upload own pasto fotos" ON storage.objects;
CREATE POLICY "Users can upload own pasto fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pasto-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own pasto fotos" ON storage.objects;
CREATE POLICY "Users can update own pasto fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pasto-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own pasto fotos" ON storage.objects;
CREATE POLICY "Users can delete own pasto fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'pasto-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);