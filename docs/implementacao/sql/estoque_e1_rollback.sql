-- ==============================================================================
-- ROLLBACK: LOTE E1 - ESTOQUE
-- ATENÇÃO: ESTE SCRIPT REMOVE TODOS OS DADOS E OBJETOS DO MÓDULO DE ESTOQUE (estoque_*)
-- NÃO EXECUTE EM PRODUÇÃO A MENOS QUE TENHA CERTEZA DO ROLLBACK.
-- NÃO ALTERA NEM REMOVE NENHUMA TABELA EXISTENTE (caregivers, shifts, daily_logs, daily_log_receipts).
-- ==============================================================================

-- 1. Remoção das tabelas da publicação Realtime (se presentes)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estoque_auditoria;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estoque_compras;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estoque_sinalizacoes;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estoque_movimentos;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.estoque_produtos;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- 2. Remoção das Tabelas do Estoque (em ordem reversa de dependência com CASCADE)
DROP TABLE IF EXISTS public.estoque_auditoria CASCADE;
DROP TABLE IF EXISTS public.estoque_compras CASCADE;
DROP TABLE IF EXISTS public.estoque_sinalizacoes CASCADE;
DROP TABLE IF EXISTS public.estoque_movimentos CASCADE;
DROP TABLE IF EXISTS public.estoque_produtos CASCADE;

-- 3. Remoção das RPCs e Funções do Estoque
DROP FUNCTION IF EXISTS public.estoque_concluir_compra(uuid, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.estoque_desistir_compra(uuid);
DROP FUNCTION IF EXISTS public.estoque_assumir_compra(uuid);

DROP FUNCTION IF EXISTS public.estoque_trg_auditoria_produtos();
DROP FUNCTION IF EXISTS public.estoque_trg_validar_movimento();
DROP FUNCTION IF EXISTS public.estoque_trg_autoria_sinalizacoes();
DROP FUNCTION IF EXISTS public.estoque_trg_autoria_produtos();
DROP FUNCTION IF EXISTS public.estoque_trg_bloquear_update_delete();
DROP FUNCTION IF EXISTS public.estoque_trg_bloquear_delete();

DROP FUNCTION IF EXISTS public.estoque_usuario_autorizado();
