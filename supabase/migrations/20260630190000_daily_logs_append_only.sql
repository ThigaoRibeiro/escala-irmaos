REVOKE UPDATE, DELETE ON TABLE public.daily_logs FROM authenticated;

DROP POLICY IF EXISTS "Familia pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode remover daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode remover daily_logs" ON public.daily_logs;
