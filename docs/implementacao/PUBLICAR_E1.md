# Como publicar o Estoque (E1) com segurança

Linguagem simples, para quem não programa. São 3 etapas. Cada uma tem uma checagem, e todas se desfazem.

**Regra de ouro:** a ordem é **primeiro o banco, depois o app**. O app foi feito para funcionar mesmo se o banco
ainda não estiver pronto (a aba Estoque só mostra "ainda não configurado"), mas é mais tranquilo nessa ordem.

## Etapa 0: antes de tudo (só olhar, não muda nada)

No painel do Supabase, abra **SQL Editor** e rode estas duas consultas. Elas só leem.

```sql
-- 1) A tabela de cuidadoras tem as colunas que o estoque usa?
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'caregivers'
  and column_name in ('email', 'active', 'auth_user_id');
-- Esperado: 3 linhas (email, active, auth_user_id)

-- 2) A agenda de remédios tem as colunas que o app usa?
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'medications'
  and column_name in ('id', 'time', 'name');
-- Esperado: 3 linhas. Anote o tipo de "id" (text ou uuid): o estoque funciona nos dois casos.
```

Se alguma consulta devolver menos de 3 linhas, **pare** e me mostre o resultado.

## Etapa 1: o banco (cria 5 tabelas novas; não altera nada existente)

1. No **SQL Editor**, abra uma consulta nova.
2. Cole o conteúdo inteiro do arquivo `supabase/migrations/20260707120000_estoque_e1.sql`.
3. Clique em **Run**. Esperado: "Success".
4. Confira:

```sql
select tablename from pg_tables
where schemaname = 'public' and tablename like 'estoque\_%' order by 1;
-- Esperado: estoque_auditoria, estoque_compras, estoque_movimentos, estoque_produtos, estoque_sinalizacoes
```

**Para desfazer:** cole e rode `docs/implementacao/sql/estoque_e1_rollback.sql`. Ele remove só o que começa com
`estoque_` (e apaga os dados do estoque, se já houver). As tabelas de escala e diário não são tocadas.

## Etapa 2: o app

1. Abra o Pull Request do estoque no GitHub e passe de "rascunho" para "pronto".
2. Faça o **merge na `main`**. O GitHub publica sozinho em alguns minutos (aba **Actions** do repositório).
3. Quando o Actions ficar verde, abra o site e confira, nesta ordem:
   - [ ] Escalas abre e mostra a escala.
   - [ ] Diário abre.
   - [ ] Configurações abre (só para os irmãos).
   - [ ] A aba **Estoque** abre e mostra "Nenhum item" ou o botão de itens sugeridos.
   - [ ] Ninguém precisou fazer login de novo.

**Para desfazer:** no GitHub, abra o Pull Request já mergeado e clique em **Revert**; o GitHub gera outro PR que
volta ao app anterior. Faça o merge dele. (O banco pode ficar como está, as tabelas novas não atrapalham.)

## Etapa 3: primeiros passos no app (cinco minutos)

1. Na aba Estoque, toque em **Sugeridos** e marque os itens que a família usa. Eles entram como ⚪ (sem conferência).
2. Para cada item, toque em **Fazer primeira conferência** e conte o que tem em casa. **Só depois disso** o app
   passa a calcular quantos dias faltam.
3. Ajuste o consumo diário de cada item em **Editar** (por exemplo, 6 fraldas por dia).

## O que NÃO faz parte deste lote

- Preços, links de farmácia e alertas de promoção (lotes E3 e E4).
- Estoque dentro do Diário de passagem de plantão (lote E2).
- Envio automático ao grupo do WhatsApp. Não existe forma oficial de fazer isso; o app copia a mensagem ou abre o
  WhatsApp com ela pronta, e você escolhe o grupo.
