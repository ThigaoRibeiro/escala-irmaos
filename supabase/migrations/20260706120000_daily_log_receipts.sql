CREATE TABLE IF NOT EXISTS public.daily_log_receipts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    log_id text NOT NULL REFERENCES public.daily_logs (id) ON DELETE CASCADE,
    viewer_name text NOT NULL,
    viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    reaction text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_log_receipts_log_id_viewer_name_key
ON public.daily_log_receipts (log_id, viewer_name);

ALTER TABLE public.daily_log_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_receipts REPLICA IDENTITY FULL;

GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_log_receipts TO authenticated;
REVOKE DELETE ON TABLE public.daily_log_receipts FROM authenticated;

DROP POLICY IF EXISTS "Familia pode ler daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "Familia pode inserir daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "Familia pode atualizar daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "Familia pode remover daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "App publico pode ler daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "App publico pode inserir daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "App publico pode atualizar daily_log_receipts" ON public.daily_log_receipts;
DROP POLICY IF EXISTS "App publico pode remover daily_log_receipts" ON public.daily_log_receipts;

CREATE POLICY "App publico pode ler daily_log_receipts"
ON public.daily_log_receipts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "App publico pode inserir daily_log_receipts"
ON public.daily_log_receipts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar daily_log_receipts"
ON public.daily_log_receipts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_log_receipts;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
