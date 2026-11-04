-- ==============================================================================
-- BOOTSTRAP LOCAL DE BANCO PARA TESTES DO ESTOQUE (LOTE E1)
-- Este script roda EXCLUSIVAMENTE em ambiente local para testes e desenvolvimento.
-- NUNCA vira migration de produção.
-- Cria tabelas pré-existentes do app (caregivers, shifts, daily_logs, daily_log_receipts, medications)
-- e os 5 perfis de usuários de teste exigidos pela Seção 4.2.
-- ==============================================================================

-- 1. Tabela de Cuidadoras (caregivers)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    auth_user_id uuid UNIQUE,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 4. Tabela de Recibos de Leitura (daily_log_receipts)
CREATE TABLE IF NOT EXISTS public.daily_log_receipts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    log_id text NOT NULL REFERENCES public.daily_logs (id) ON DELETE CASCADE,
    viewer_name text NOT NULL,
    viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    reaction text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Medicamentos / Agenda (medications)
CREATE TABLE IF NOT EXISTS public.medications (
    id text PRIMARY KEY,
    time text NOT NULL,
    name text NOT NULL,
    dose text,
    note text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS nas tabelas base
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.caregivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_log_receipts TO authenticated;
GRANT SELECT ON TABLE public.medications TO authenticated;

-- Policies equivalentes às de produção (espelham as migrations existentes: "App publico pode ..." para
-- authenticated). Sem elas, RLS ligado e nenhuma policy = o app local enxerga ZERO linhas (cuidadoras e
-- remédios incluídos) e desloga as cuidadoras. Apenas para o ambiente LOCAL de testes.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['caregivers', 'shifts', 'daily_logs', 'daily_log_receipts', 'medications'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "local leitura %1$s" ON public.%1$s', t);
        EXECUTE format('CREATE POLICY "local leitura %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['shifts', 'daily_logs', 'daily_log_receipts'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "local insercao %1$s" ON public.%1$s', t);
        EXECUTE format('CREATE POLICY "local insercao %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true)', t);
        EXECUTE format('DROP POLICY IF EXISTS "local atualizacao %1$s" ON public.%1$s', t);
        EXECUTE format('CREATE POLICY "local atualizacao %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Seed inicial de medicamentos na agenda
INSERT INTO public.medications (id, time, name, dose, note)
VALUES 
    ('med-1', '08:00', 'Memantina 10 mg', '1 comprimido', 'Após o café'),
    ('med-2', '20:00', 'Memantina 10 mg', '1 comprimido', 'Após o jantar'),
    ('med-3', '14:00', 'Quetiapina 25 mg', '1 comprimido', 'Se necessário')
ON CONFLICT (id) DO NOTHING;

-- Seed dos usuários de teste locais
-- Perfil 1: Irmão da Família (autorizado)
-- Perfil 2: Cuidadora Ativa (autorizada)
-- Perfil 3: Cuidadora Inativa (NÃO autorizada)
-- Perfil 4: Estranho cadastrado via signUp público (NÃO autorizado)
-- Perfil 5: Anônimo (NÃO autorizado)

-- Inserir / Atualizar Cuidadora Ativa
INSERT INTO public.caregivers (id, name, email, auth_user_id, active)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Maria Cuidadora Ativa',
    'cuidadora.ativa@exemplo.com',
    '22222222-2222-2222-2222-222222222222',
    true
)
ON CONFLICT (id) DO UPDATE
SET active = true, email = 'cuidadora.ativa@exemplo.com', auth_user_id = '22222222-2222-2222-2222-222222222222';

-- Inserir / Atualizar Cuidadora Inativa
INSERT INTO public.caregivers (id, name, email, auth_user_id, active)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Joana Ex-Cuidadora Inativa',
    'cuidadora.inativa@exemplo.com',
    '33333333-3333-3333-3333-333333333333',
    false
)
ON CONFLICT (id) DO UPDATE
SET active = false, email = 'cuidadora.inativa@exemplo.com', auth_user_id = '33333333-3333-3333-3333-333333333333';

-- Inserir usuários no schema auth.users caso exista (Supabase local)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- 1. Irmão (thiagor21@gmail.com)
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '11111111-1111-1111-1111-111111111111',
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'thiagor21@gmail.com',
            crypt('senha123456', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Thiago"}',
            false
        ) ON CONFLICT (id) DO UPDATE SET email = 'thiagor21@gmail.com';

        -- 2. Cuidadora Ativa
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '22222222-2222-2222-2222-222222222222',
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'cuidadora.ativa@exemplo.com',
            crypt('senha123456', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Maria Cuidadora Ativa"}',
            false
        ) ON CONFLICT (id) DO UPDATE SET email = 'cuidadora.ativa@exemplo.com';

        -- 3. Cuidadora Inativa
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '33333333-3333-3333-3333-333333333333',
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'cuidadora.inativa@exemplo.com',
            crypt('senha123456', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Joana Ex-Cuidadora"}',
            false
        ) ON CONFLICT (id) DO UPDATE SET email = 'cuidadora.inativa@exemplo.com';

        -- 4. Estranho (signUp público, sem autorização)
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '44444444-4444-4444-4444-444444444444',
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'estranho.cadastrado@exemplo.com',
            crypt('senha123456', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Estranho Sem Acesso"}',
            false
        ) ON CONFLICT (id) DO UPDATE SET email = 'estranho.cadastrado@exemplo.com';
    END IF;
END $$;
