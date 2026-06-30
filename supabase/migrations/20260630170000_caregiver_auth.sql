-- Modelo com login real no Supabase Auth para irmãos e cuidadoras.
-- As cuidadoras devem ser criadas por uma função administrativa segura usando service_role.

-- 1. Tabela de Cuidadoras (caregivers)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    auth_user_id uuid UNIQUE,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.caregivers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.caregivers ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.caregivers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true NOT NULL;
ALTER TABLE public.caregivers DROP COLUMN IF EXISTS password;

CREATE UNIQUE INDEX IF NOT EXISTS caregivers_email_key ON public.caregivers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS caregivers_auth_user_id_key ON public.caregivers (auth_user_id);

-- 2. Tabela de Escalas (shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    assigned_to text,
    caregiver_assigned text,
    status text DEFAULT 'confirmed'::text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Diários de Bordo (daily_logs)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    author text NOT NULL,
    caregiver text,
    meds_given boolean DEFAULT false,
    meals_ok boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.caregivers REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;
ALTER TABLE public.daily_logs REPLICA IDENTITY FULL;

GRANT SELECT ON TABLE public.caregivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_logs TO authenticated;

DROP POLICY IF EXISTS "Acesso público total caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Acesso público total shifts" ON public.shifts;
DROP POLICY IF EXISTS "Acesso público total logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Acesso publico total caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Acesso publico total shifts" ON public.shifts;
DROP POLICY IF EXISTS "Acesso publico total logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode ler caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode inserir caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode atualizar caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode remover caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode ler shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode inserir shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode atualizar shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode remover shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode ler daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode inserir daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode remover daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode ler caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode inserir caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode atualizar caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode remover caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode ler shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode inserir shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode atualizar shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode remover shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode ler daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode inserir daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode remover daily_logs" ON public.daily_logs;

CREATE POLICY "App publico pode ler caregivers"
ON public.caregivers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "App publico pode ler shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "App publico pode inserir shifts"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar shifts"
ON public.shifts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App publico pode remover shifts"
ON public.shifts
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "App publico pode ler daily_logs"
ON public.daily_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "App publico pode inserir daily_logs"
ON public.daily_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar daily_logs"
ON public.daily_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App publico pode remover daily_logs"
ON public.daily_logs
FOR DELETE
TO authenticated
USING (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caregivers;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- IMPORTANTE:
-- 1. Cadastre as cuidadoras criando usuários reais no Supabase Auth.
-- 2. A função "caregiver-admin" deve usar service_role para:
--    - criar usuário com email_confirm = true
--    - salvar name/email/auth_user_id/active na tabela caregivers
--    - excluir o usuário Auth e limpar a cuidadora quando ela sair
