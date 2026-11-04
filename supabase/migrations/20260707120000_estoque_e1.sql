-- Migration Estoque E1: Catálogo, Conferência, Movimentações, Sinalizações, Compras e Auditoria
-- Timestamp: 20260707120000 (superior a 20260706120000)
-- Apenas novos objetos com prefixo estoque_*

-- 1. Função de Validação de Autorização (Security Definer, Stable)
CREATE OR REPLACE FUNCTION public.estoque_usuario_autorizado()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email text;
    v_uid uuid;
    v_is_caregiver boolean;
BEGIN
    v_uid := auth.uid();
    v_email := lower(coalesce(auth.jwt()->>'email', ''));

    IF v_uid IS NULL AND v_email = '' THEN
        RETURN false;
    END IF;

    -- Espelho exato das chaves de USER_MAPPING em src/utils/db.js
    IF v_email IN (
        'thiagor21@gmail.com',
        'esterlessa13@gmail.com',
        'professorajeanelessa@gmail.com',
        'ananerianlv@gmail.com',
        'deividylan@gmail.com',
        'haniellessa@hotmail.com'
    ) THEN
        RETURN true;
    END IF;

    -- Cuidadora ativa cadastrada em public.caregivers
    SELECT EXISTS (
        SELECT 1
        FROM public.caregivers c
        WHERE c.active = true
          AND (
            (v_uid IS NOT NULL AND c.auth_user_id = v_uid)
            OR
            (v_email <> '' AND lower(c.email) = v_email)
          )
    ) INTO v_is_caregiver;

    RETURN coalesce(v_is_caregiver, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.estoque_usuario_autorizado() TO authenticated;
REVOKE ALL ON FUNCTION public.estoque_usuario_autorizado() FROM anon;

-- 2. Tabela de Produtos (estoque_produtos)
CREATE TABLE IF NOT EXISTS public.estoque_produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    categoria text NOT NULL CHECK (
        categoria IN (
            'fraldas_incontinencia',
            'higiene',
            'cuidados_pele',
            'curativos',
            'medicamentos',
            'limpeza',
            'outros'
        )
    ),
    marca_preferida text,
    observacoes text,
    unidade_base text NOT NULL,
    embalagem_nome text NOT NULL,
    embalagem_quantidade numeric NOT NULL CHECK (embalagem_quantidade > 0),
    modo_consumo text NOT NULL CHECK (modo_consumo IN ('taxa', 'minimo')),
    consumo_diario_base numeric CHECK (consumo_diario_base >= 0),
    estoque_minimo_base numeric CHECK (estoque_minimo_base >= 0),
    estoque_atencao_base numeric CHECK (estoque_atencao_base >= 0),
    dias_atencao integer NOT NULL DEFAULT 15 CHECK (dias_atencao > 0),
    dias_critico integer NOT NULL DEFAULT 5 CHECK (dias_critico >= 0 AND dias_critico < dias_atencao),
    requer_receita boolean NOT NULL DEFAULT false,
    antecedencia_receita_dias integer NOT NULL DEFAULT 0 CHECK (antecedencia_receita_dias >= 0),
    receita_validade date,
    medicamento_ids text[] NOT NULL DEFAULT '{}'::text[],
    quantidade_por_administracao numeric CHECK (quantidade_por_administracao > 0),
    arquivado_em timestamptz,
    arquivado_por uuid,
    criado_em timestamptz NOT NULL DEFAULT now(),
    criado_por uuid,
    criado_por_email text,
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_por uuid,
    atualizado_por_email text,
    CONSTRAINT estoque_produtos_modo_coerencia CHECK (
        (modo_consumo = 'taxa' AND (
            (consumo_diario_base IS NOT NULL AND consumo_diario_base > 0)
            OR
            (cardinality(medicamento_ids) > 0 AND quantidade_por_administracao IS NOT NULL AND quantidade_por_administracao > 0)
        ))
        OR
        (modo_consumo = 'minimo' AND (
            estoque_minimo_base IS NOT NULL
            AND estoque_atencao_base IS NOT NULL
            AND estoque_atencao_base >= estoque_minimo_base
        ))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS estoque_produtos_nome_ativo_idx
ON public.estoque_produtos (lower(trim(nome)))
WHERE arquivado_em IS NULL;

-- 3. Tabela de Movimentos (estoque_movimentos)
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id),
    tipo text NOT NULL CHECK (tipo IN ('conferencia', 'entrada', 'saida', 'estorno')),
    quantidade_base numeric,
    motivo text,
    observacao text,
    valor_pago numeric CHECK (valor_pago IS NULL OR valor_pago >= 0),
    local_compra text,
    ocorrido_em timestamptz NOT NULL DEFAULT now(),
    registrado_em timestamptz NOT NULL DEFAULT now(),
    registrado_por uuid,
    registrado_por_email text,
    origem text NOT NULL DEFAULT 'aba_estoque' CHECK (origem IN ('aba_estoque', 'diario')),
    estorna_movimento_id uuid REFERENCES public.estoque_movimentos(id),
    CONSTRAINT estoque_movimentos_regras_tipo CHECK (
        (tipo = 'conferencia' AND quantidade_base IS NOT NULL AND quantidade_base >= 0 AND estorna_movimento_id IS NULL)
        OR
        (tipo = 'entrada' AND quantidade_base IS NOT NULL AND quantidade_base > 0 AND motivo IN ('compra', 'doacao', 'outro') AND estorna_movimento_id IS NULL)
        OR
        (tipo = 'saida' AND quantidade_base IS NOT NULL AND quantidade_base > 0 AND motivo IN ('uso', 'perda', 'vencimento', 'outro') AND estorna_movimento_id IS NULL)
        OR
        (tipo = 'estorno' AND quantidade_base IS NULL AND estorna_movimento_id IS NOT NULL AND motivo IS NOT NULL AND trim(motivo) <> '')
    ),
    CONSTRAINT estoque_movimentos_compra_detalhes CHECK (
        (valor_pago IS NULL AND local_compra IS NULL)
        OR
        (tipo = 'entrada' AND motivo = 'compra')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS estoque_movimentos_estorna_unico_idx
ON public.estoque_movimentos (estorna_movimento_id)
WHERE tipo = 'estorno' AND estorna_movimento_id IS NOT NULL;

-- 4. Tabela de Sinalizações "Está Acabando" (estoque_sinalizacoes)
CREATE TABLE IF NOT EXISTS public.estoque_sinalizacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id),
    observacao text,
    criado_em timestamptz NOT NULL DEFAULT now(),
    criado_por uuid,
    criado_por_email text
);

-- 5. Tabela de Compras "Eu compro" (estoque_compras)
CREATE TABLE IF NOT EXISTS public.estoque_compras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id),
    status text NOT NULL CHECK (status IN ('assumida', 'concluida', 'desistida')),
    assumida_em timestamptz NOT NULL DEFAULT now(),
    assumida_por uuid,
    assumida_por_email text,
    finalizada_em timestamptz,
    finalizada_por uuid,
    finalizada_por_email text,
    movimento_entrada_id uuid REFERENCES public.estoque_movimentos(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS estoque_compras_assumida_unica_idx
ON public.estoque_compras (produto_id)
WHERE status = 'assumida';

-- 6. Tabela de Auditoria de Produtos (estoque_auditoria)
CREATE TABLE IF NOT EXISTS public.estoque_auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL,
    operacao text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE')),
    antes jsonb,
    depois jsonb,
    em timestamptz NOT NULL DEFAULT now(),
    por uuid,
    por_email text
);

-- 7. Triggers de Autoria Forçada e Regras de Negócio

-- 7.1 Autoria em estoque_produtos
CREATE OR REPLACE FUNCTION public.estoque_trg_autoria_produtos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.criado_por := auth.uid();
        NEW.criado_por_email := lower(auth.jwt()->>'email');
        NEW.criado_em := now();
        NEW.atualizado_por := auth.uid();
        NEW.atualizado_por_email := lower(auth.jwt()->>'email');
        NEW.atualizado_em := now();
        IF NEW.arquivado_em IS NOT NULL THEN
            NEW.arquivado_em := now();
            NEW.arquivado_por := auth.uid();
        ELSE
            NEW.arquivado_por := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.criado_por := OLD.criado_por;
        NEW.criado_por_email := OLD.criado_por_email;
        NEW.criado_em := OLD.criado_em;

        NEW.atualizado_por := auth.uid();
        NEW.atualizado_por_email := lower(auth.jwt()->>'email');
        NEW.atualizado_em := now();

        -- A data de arquivamento vem sempre do relógio do banco, nunca do cliente.
        IF NEW.arquivado_em IS NOT NULL AND OLD.arquivado_em IS NULL THEN
            NEW.arquivado_em := now();
            NEW.arquivado_por := auth.uid();
        ELSIF NEW.arquivado_em IS NULL AND OLD.arquivado_em IS NOT NULL THEN
            NEW.arquivado_por := NULL;
        ELSIF NEW.arquivado_em IS NOT NULL AND OLD.arquivado_em IS NOT NULL THEN
            NEW.arquivado_em := OLD.arquivado_em;
            NEW.arquivado_por := coalesce(OLD.arquivado_por, auth.uid());
        ELSE
            NEW.arquivado_por := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_produtos_autoria ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_produtos_autoria
BEFORE INSERT OR UPDATE ON public.estoque_produtos
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_autoria_produtos();

-- 7.2 Auditoria em estoque_produtos
CREATE OR REPLACE FUNCTION public.estoque_trg_auditoria_produtos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.estoque_auditoria (
            produto_id,
            operacao,
            antes,
            depois,
            em,
            por,
            por_email
        ) VALUES (
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            now(),
            auth.uid(),
            lower(auth.jwt()->>'email')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.estoque_auditoria (
            produto_id,
            operacao,
            antes,
            depois,
            em,
            por,
            por_email
        ) VALUES (
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            now(),
            auth.uid(),
            lower(auth.jwt()->>'email')
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_produtos_auditoria ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_produtos_auditoria
AFTER INSERT OR UPDATE ON public.estoque_produtos
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_auditoria_produtos();

-- 7.3 Validação e Autoria em estoque_movimentos
CREATE OR REPLACE FUNCTION public.estoque_trg_validar_movimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prod_arquivado_em timestamptz;
    v_prod_modo_consumo text;
    v_estornado_tipo text;
    v_estornado_produto_id uuid;
BEGIN
    NEW.registrado_por := auth.uid();
    NEW.registrado_por_email := lower(auth.jwt()->>'email');
    NEW.registrado_em := now();

    SELECT arquivado_em, modo_consumo
    INTO v_prod_arquivado_em, v_prod_modo_consumo
    FROM public.estoque_produtos
    WHERE id = NEW.produto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % nao encontrado', NEW.produto_id;
    END IF;

    IF v_prod_arquivado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Nao e permitido registrar movimentacao em produto arquivado';
    END IF;

    -- Intervalo: ultimos 30 dias ate 5 minutos no futuro
    IF NEW.ocorrido_em < (now() - INTERVAL '30 days') OR NEW.ocorrido_em > (now() + INTERVAL '5 minutes') THEN
        RAISE EXCEPTION 'Data de ocorrencia fora do intervalo permitido (ultimos 30 dias ate 5 minutos no futuro)';
    END IF;

    -- Saída com motivo uso só em modo mínimo
    IF NEW.tipo = 'saida' AND NEW.motivo = 'uso' AND v_prod_modo_consumo <> 'minimo' THEN
        RAISE EXCEPTION 'Saida com motivo uso so e permitida para produtos com modo de consumo minimo';
    END IF;

    -- Estorno
    IF NEW.tipo = 'estorno' THEN
        IF NEW.estorna_movimento_id IS NULL THEN
            RAISE EXCEPTION 'Estorno exige identificacao do movimento estornado (estorna_movimento_id)';
        END IF;

        SELECT tipo, produto_id
        INTO v_estornado_tipo, v_estornado_produto_id
        FROM public.estoque_movimentos
        WHERE id = NEW.estorna_movimento_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Movimento original a ser estornado (%) nao encontrado', NEW.estorna_movimento_id;
        END IF;

        IF v_estornado_tipo = 'estorno' THEN
            RAISE EXCEPTION 'Nao e permitido estornar um movimento de estorno';
        END IF;

        IF v_estornado_produto_id <> NEW.produto_id THEN
            RAISE EXCEPTION 'O estorno deve pertencer ao mesmo produto do movimento original';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_movimentos_validar ON public.estoque_movimentos;
CREATE TRIGGER trg_estoque_movimentos_validar
BEFORE INSERT ON public.estoque_movimentos
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_validar_movimento();

-- 7.4 Autoria e Validação em estoque_sinalizacoes
CREATE OR REPLACE FUNCTION public.estoque_trg_autoria_sinalizacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prod_arquivado_em timestamptz;
BEGIN
    NEW.criado_por := auth.uid();
    NEW.criado_por_email := lower(auth.jwt()->>'email');
    NEW.criado_em := now();

    SELECT arquivado_em INTO v_prod_arquivado_em
    FROM public.estoque_produtos
    WHERE id = NEW.produto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % nao encontrado', NEW.produto_id;
    END IF;

    IF v_prod_arquivado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Nao e permitido sinalizar produto arquivado';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_sinalizacoes_autoria ON public.estoque_sinalizacoes;
CREATE TRIGGER trg_estoque_sinalizacoes_autoria
BEFORE INSERT ON public.estoque_sinalizacoes
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_autoria_sinalizacoes();

-- 7.5 Bloqueios de UPDATE e DELETE para garantir Append-Only / Imutabilidade
CREATE OR REPLACE FUNCTION public.estoque_trg_bloquear_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operacao DELETE proibida nas tabelas de estoque';
END;
$$;

CREATE OR REPLACE FUNCTION public.estoque_trg_bloquear_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operacoes de UPDATE e DELETE proibidas nesta tabela de estoque (somente insercao)';
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_produtos_bloquear_delete ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_produtos_bloquear_delete
BEFORE DELETE ON public.estoque_produtos
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_bloquear_delete();

DROP TRIGGER IF EXISTS trg_estoque_movimentos_bloquear_upd_del ON public.estoque_movimentos;
CREATE TRIGGER trg_estoque_movimentos_bloquear_upd_del
BEFORE UPDATE OR DELETE ON public.estoque_movimentos
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_bloquear_update_delete();

DROP TRIGGER IF EXISTS trg_estoque_sinalizacoes_bloquear_upd_del ON public.estoque_sinalizacoes;
CREATE TRIGGER trg_estoque_sinalizacoes_bloquear_upd_del
BEFORE UPDATE OR DELETE ON public.estoque_sinalizacoes
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_bloquear_update_delete();

DROP TRIGGER IF EXISTS trg_estoque_auditoria_bloquear_upd_del ON public.estoque_auditoria;
CREATE TRIGGER trg_estoque_auditoria_bloquear_upd_del
BEFORE UPDATE OR DELETE ON public.estoque_auditoria
FOR EACH ROW EXECUTE FUNCTION public.estoque_trg_bloquear_update_delete();

-- 8. RPCs para Compras ("Eu compro")

-- 8.1 Assumir Compra
CREATE OR REPLACE FUNCTION public.estoque_assumir_compra(p_produto uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_compra_id uuid;
    v_prod_arquivado_em timestamptz;
BEGIN
    IF NOT public.estoque_usuario_autorizado() THEN
        RAISE EXCEPTION 'Usuario nao autorizado para operacoes de estoque' USING ERRCODE = '42501';
    END IF;

    SELECT arquivado_em INTO v_prod_arquivado_em
    FROM public.estoque_produtos
    WHERE id = p_produto;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % nao encontrado', p_produto;
    END IF;

    IF v_prod_arquivado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Nao e permitido assumir compra de produto arquivado';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.estoque_compras
        WHERE produto_id = p_produto AND status = 'assumida'
    ) THEN
        RAISE EXCEPTION 'Compra ja assumida por outro usuario para este produto' USING ERRCODE = '23505';
    END IF;

    BEGIN
        INSERT INTO public.estoque_compras (
            produto_id,
            status,
            assumida_em,
            assumida_por,
            assumida_por_email
        ) VALUES (
            p_produto,
            'assumida',
            now(),
            auth.uid(),
            lower(auth.jwt()->>'email')
        )
        RETURNING id INTO v_compra_id;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'Compra ja assumida por outro usuario para este produto' USING ERRCODE = '23505';
    END;

    RETURN v_compra_id;
END;
$$;

-- 8.2 Desistir de Compra Assumida
CREATE OR REPLACE FUNCTION public.estoque_desistir_compra(p_compra uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status text;
BEGIN
    IF NOT public.estoque_usuario_autorizado() THEN
        RAISE EXCEPTION 'Usuario nao autorizado para operacoes de estoque' USING ERRCODE = '42501';
    END IF;

    -- FOR UPDATE: serializa com concluir/desistir simultaneos da mesma compra.
    SELECT status INTO v_status
    FROM public.estoque_compras
    WHERE id = p_compra
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compra % nao encontrada', p_compra;
    END IF;

    IF v_status <> 'assumida' THEN
        RAISE EXCEPTION 'Apenas compras assumidas podem ser canceladas/desistidas (status atual: %)', v_status;
    END IF;

    UPDATE public.estoque_compras
    SET status = 'desistida',
        finalizada_em = now(),
        finalizada_por = auth.uid(),
        finalizada_por_email = lower(auth.jwt()->>'email')
    WHERE id = p_compra AND status = 'assumida';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A compra % mudou de situacao durante a operacao', p_compra;
    END IF;
END;
$$;

-- 8.3 Concluir Compra
CREATE OR REPLACE FUNCTION public.estoque_concluir_compra(
    p_compra uuid,
    p_quantidade_base numeric,
    p_valor_pago numeric DEFAULT NULL,
    p_local text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_produto_id uuid;
    v_status text;
    v_prod_arquivado_em timestamptz;
    v_movimento_id uuid;
BEGIN
    IF NOT public.estoque_usuario_autorizado() THEN
        RAISE EXCEPTION 'Usuario nao autorizado para operacoes de estoque' USING ERRCODE = '42501';
    END IF;

    IF p_quantidade_base IS NULL OR p_quantidade_base <= 0 THEN
        RAISE EXCEPTION 'Quantidade base para conclusao de compra deve ser maior que zero';
    END IF;

    SELECT c.produto_id, c.status, p.arquivado_em
    INTO v_produto_id, v_status, v_prod_arquivado_em
    FROM public.estoque_compras c
    JOIN public.estoque_produtos p ON p.id = c.produto_id
    WHERE c.id = p_compra
    FOR UPDATE OF c;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compra % nao encontrada', p_compra;
    END IF;

    IF v_status <> 'assumida' THEN
        RAISE EXCEPTION 'Apenas compras assumidas podem ser concluidas (status atual: %)', v_status;
    END IF;

    IF v_prod_arquivado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Nao e permitido concluir compra de produto arquivado';
    END IF;

    -- Na mesma transação: insere entrada e conclui a compra
    INSERT INTO public.estoque_movimentos (
        produto_id,
        tipo,
        motivo,
        quantidade_base,
        valor_pago,
        local_compra,
        ocorrido_em,
        registrado_em,
        registrado_por,
        registrado_por_email,
        origem
    ) VALUES (
        v_produto_id,
        'entrada',
        'compra',
        p_quantidade_base,
        p_valor_pago,
        p_local,
        now(),
        now(),
        auth.uid(),
        lower(auth.jwt()->>'email'),
        'aba_estoque'
    )
    RETURNING id INTO v_movimento_id;

    UPDATE public.estoque_compras
    SET status = 'concluida',
        finalizada_em = now(),
        finalizada_por = auth.uid(),
        finalizada_por_email = lower(auth.jwt()->>'email'),
        movimento_entrada_id = v_movimento_id
    WHERE id = p_compra AND status = 'assumida';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A compra % mudou de situacao durante a operacao', p_compra;
    END IF;

    RETURN v_movimento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.estoque_assumir_compra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_desistir_compra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_concluir_compra(uuid, numeric, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.estoque_assumir_compra(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.estoque_desistir_compra(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.estoque_concluir_compra(uuid, numeric, numeric, text) FROM anon;

-- 9. Grants e Revogações de Permissões de Tabela
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_sinalizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_auditoria ENABLE ROW LEVEL SECURITY;

-- Revoga tudo de anon
REVOKE ALL ON TABLE public.estoque_produtos FROM anon;
REVOKE ALL ON TABLE public.estoque_movimentos FROM anon;
REVOKE ALL ON TABLE public.estoque_sinalizacoes FROM anon;
REVOKE ALL ON TABLE public.estoque_compras FROM anon;
REVOKE ALL ON TABLE public.estoque_auditoria FROM anon;

-- Grants para authenticated
GRANT SELECT, INSERT, UPDATE ON TABLE public.estoque_produtos TO authenticated;
REVOKE DELETE ON TABLE public.estoque_produtos FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.estoque_movimentos TO authenticated;
REVOKE UPDATE, DELETE ON TABLE public.estoque_movimentos FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.estoque_sinalizacoes TO authenticated;
REVOKE UPDATE, DELETE ON TABLE public.estoque_sinalizacoes FROM authenticated;

GRANT SELECT ON TABLE public.estoque_compras TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.estoque_compras FROM authenticated;

GRANT SELECT ON TABLE public.estoque_auditoria TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.estoque_auditoria FROM authenticated;

-- 10. Policies RLS (Zero USING(true); estritamente via estoque_usuario_autorizado)
DROP POLICY IF EXISTS "estoque_produtos_select_policy" ON public.estoque_produtos;
CREATE POLICY "estoque_produtos_select_policy"
ON public.estoque_produtos
FOR SELECT
TO authenticated
USING (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_produtos_insert_policy" ON public.estoque_produtos;
CREATE POLICY "estoque_produtos_insert_policy"
ON public.estoque_produtos
FOR INSERT
TO authenticated
WITH CHECK (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_produtos_update_policy" ON public.estoque_produtos;
CREATE POLICY "estoque_produtos_update_policy"
ON public.estoque_produtos
FOR UPDATE
TO authenticated
USING (public.estoque_usuario_autorizado())
WITH CHECK (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_movimentos_select_policy" ON public.estoque_movimentos;
CREATE POLICY "estoque_movimentos_select_policy"
ON public.estoque_movimentos
FOR SELECT
TO authenticated
USING (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_movimentos_insert_policy" ON public.estoque_movimentos;
CREATE POLICY "estoque_movimentos_insert_policy"
ON public.estoque_movimentos
FOR INSERT
TO authenticated
WITH CHECK (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_sinalizacoes_select_policy" ON public.estoque_sinalizacoes;
CREATE POLICY "estoque_sinalizacoes_select_policy"
ON public.estoque_sinalizacoes
FOR SELECT
TO authenticated
USING (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_sinalizacoes_insert_policy" ON public.estoque_sinalizacoes;
CREATE POLICY "estoque_sinalizacoes_insert_policy"
ON public.estoque_sinalizacoes
FOR INSERT
TO authenticated
WITH CHECK (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_compras_select_policy" ON public.estoque_compras;
CREATE POLICY "estoque_compras_select_policy"
ON public.estoque_compras
FOR SELECT
TO authenticated
USING (public.estoque_usuario_autorizado());

DROP POLICY IF EXISTS "estoque_auditoria_select_policy" ON public.estoque_auditoria;
CREATE POLICY "estoque_auditoria_select_policy"
ON public.estoque_auditoria
FOR SELECT
TO authenticated
USING (public.estoque_usuario_autorizado());

-- 11. Configuração de Realtime (Replica Identity Full + Publicação)
ALTER TABLE public.estoque_produtos REPLICA IDENTITY FULL;
ALTER TABLE public.estoque_movimentos REPLICA IDENTITY FULL;
ALTER TABLE public.estoque_sinalizacoes REPLICA IDENTITY FULL;
ALTER TABLE public.estoque_compras REPLICA IDENTITY FULL;
ALTER TABLE public.estoque_auditoria REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_produtos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_movimentos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_sinalizacoes;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_compras;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_auditoria;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
