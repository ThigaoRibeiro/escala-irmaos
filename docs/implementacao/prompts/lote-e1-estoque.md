# Lote E1 — Estoque: catálogo, conferência, movimentações, alertas, "eu compro" e WhatsApp

Pré-requisito: ler `docs/implementacao/prompts/prompt-base-estoque.md` por inteiro.
Branch: `feat/estoque-e1` a partir de `origin/main`.

**Fora do E1 (não implementar):** integração com o Diário, preços/links/buscas, scraping,
consumo aprendido, notificações push/e-mail, divisão de gastos, múltiplos locais de estoque.

---

## 1. Conceitos (decisões fechadas)

### 1.1 Unidade única por produto
Cada produto tem uma **unidade base** — aquilo que se conta e se consome — e uma **embalagem**:

| Produto | unidade_base | embalagem_nome | embalagem_quantidade |
|---|---|---|---|
| Fralda geriátrica G | fralda | pacote | 20 |
| Shampoo | ml | frasco | 400 |
| Memantina 10 mg | comprimido | caixa | 30 |

- **O banco guarda toda quantidade (conferência, entrada, saída, consumo, mínimos) na unidade base.**
- A embalagem é só ajuda de digitação e exibição: "3 pacotes" vira 60 fraldas ao salvar;
  a tela mostra "45 fraldas (≈ 2,3 pacotes)".
- Conversões são funções puras testadas (arredondamento de exibição: 1 casa decimal, vírgula pt-BR).

### 1.2 Conferência inicial obrigatória
Produto sem nenhuma conferência válida fica com situação **⚪ Sem conferência**: **não exibe
projeção, nem dias restantes, nem previsão**, e aparece com o botão "Fazer primeira conferência".
Sem saldo inicial confiável não há estimativa.

### 1.3 Dois modos de consumo
- **`taxa`** (uso contínuo: fralda, shampoo, remédio diário): exige `consumo_diario_base > 0`.
  O sistema estima o saldo descontando o consumo diário desde a última conferência.
- **`minimo`** (uso eventual: remédio "se precisar", curativo): exige `estoque_minimo_base` e
  `estoque_atencao_base` (≥ mínimo). Saldo = conferência + entradas − saídas registradas.

Consumo é **configurado manualmente**. Não há aprendizado automático no E1.

### 1.4 Remédios e a agenda existente
A tabela `medications` (existente, fora das migrations, colunas `id, time, name, dose, note`; `dose` é
texto livre) é **somente leitura** para o estoque e chega ao módulo como prop vinda do `App.jsx`.

- O vínculo produto ↔ medicamento é **configurável**: o usuário escolhe uma ou mais linhas da agenda
  (`medicamento_ids text[]`, sem foreign key — o tipo do `id` remoto não é garantido) e informa a
  **quantidade por administração** na unidade base (ex.: 1 comprimido).
- Só quando ambos estão configurados, o consumo diário passa a ser calculado:
  `consumo = nº de linhas vinculadas que ainda existem na agenda × quantidade_por_administracao`.
  Nunca interpretar o texto de `dose`.
- A tela mostra a origem do consumo: "pela agenda (2 horários × 1 comprimido)" ou "manual".
- Vínculo quebrado (linha removida da agenda): aviso visível "Vínculo com a agenda mudou — revise o
  consumo"; usa o consumo manual se houver; senão, situação ⚪ com o motivo.
- **Receita:** `requer_receita` + `antecedencia_receita_dias` (padrão 7 quando marcado) +
  `receita_validade` (opcional). Para esses itens, os limiares de 🟡 e 🔴 são antecipados em
  `antecedencia_receita_dias`. Selo "Receita vencida" ou "Receita vence em X dias" (quando a validade
  cair dentro do horizonte de 🟡).

### 1.5 Situações e limiares
Limiares por produto: `dias_atencao` (padrão 15) e `dias_critico` (padrão 5), com
`dias_critico < dias_atencao`.

Modo `taxa` (`A` = antecedência de receita, ou 0):
- ⚫ **Acabou**: saldo estimado ≤ 0
- 🔴 **Comprar agora**: dias restantes ≤ `dias_critico + A`
- 🟡 **Ficar de olho / pesquisar preço**: dias restantes ≤ `dias_atencao + A`
- 🟢 **Ok**: caso contrário

Modo `minimo`: ⚫ saldo ≤ 0; 🔴 saldo ≤ `estoque_minimo_base`; 🟡 saldo ≤ `estoque_atencao_base`;
🟢 caso contrário.

Regras adicionais:
- **Sinalização "está acabando"** pendente (feita depois da última conferência/entrada) eleva a
  situação para **pelo menos 🟡** e mostra "Avisado por Fulana em DD/MM".
- **Conferência antiga** (modo `taxa`, última conferência há mais de 30 dias): selo
  "Conferir de novo" — a estimativa pode ter se afastado da realidade.
- Ordem da lista: ⚫, 🔴, 🟡, ⚪, 🟢; dentro do grupo, menos dias restantes primeiro; empate por nome.
- Previsão de término exibida como data pt-BR em `America/Sao_Paulo`.

### 1.6 Cálculo do saldo (função pura)
1. Descartar movimentos estornados e os próprios estornos (ver 2.2).
2. Âncora = conferência válida mais recente por `ocorrido_em` (empate: `registrado_em`).
3. `saldo = âncora.quantidade + Σ entradas após a âncora − Σ saídas após a âncora`.
4. Modo `taxa`: `saldo_estimado = max(0, saldo − consumo_diario × dias_decorridos)`, com
   `dias_decorridos = (agora − âncora.ocorrido_em) / 86.400.000 ms` (fracionário, sem depender de fuso).
5. `dias_restantes = saldo_estimado / consumo_diario`.

## 2. Banco — `supabase/migrations/<timestamp>_estoque_e1.sql`

Timestamp maior que o da última migration existente (`20260706120000`). Somente objetos `estoque_*`.

### 2.1 `public.estoque_usuario_autorizado()` (SECURITY DEFINER, STABLE)
Retorna `true` se o e-mail do JWT (`lower(auth.jwt()->>'email')`) está na lista da família
(espelho exato das chaves de `USER_MAPPING` em `src/utils/db.js`) **ou** existe
`public.caregivers` com `active = true` e (`auth_user_id = auth.uid()` ou
`lower(email) = e-mail do JWT`). Caso contrário, `false`.
Um teste unitário deve ler a migration e falhar se a lista de e-mails divergir de `USER_MAPPING`.

### 2.2 Tabelas

**`estoque_produtos`** — `id uuid pk`, `nome text not null`, `categoria text not null check in
('fraldas_incontinencia','higiene','cuidados_pele','curativos','medicamentos','limpeza','outros')`,
`marca_preferida`, `observacoes`, `unidade_base text not null`, `embalagem_nome text not null`,
`embalagem_quantidade numeric > 0`, `modo_consumo text check in ('taxa','minimo')`,
`consumo_diario_base numeric null check >= 0`, `estoque_minimo_base`, `estoque_atencao_base`,
`dias_atencao int default 15`, `dias_critico int default 5` (check `0 <= critico < atencao`),
`requer_receita bool default false`, `antecedencia_receita_dias int default 0 check >= 0`,
`receita_validade date null`, `medicamento_ids text[] default '{}'`,
`quantidade_por_administracao numeric null check > 0`, `arquivado_em timestamptz null`,
`arquivado_por uuid null`, `criado_em`, `criado_por uuid`, `criado_por_email text`,
`atualizado_em`, `atualizado_por uuid`, `atualizado_por_email text`.
Checks de coerência: modo `taxa` exige consumo manual > 0 **ou** vínculo com a agenda completo;
modo `minimo` exige mínimo e atenção, com `atencao >= minimo`.
Nome único entre não arquivados (índice único parcial em `lower(nome)`).
Grants: SELECT, INSERT, UPDATE. DELETE revogado. Arquivar = preencher `arquivado_em`
(desarquivar permitido, auditado).

**`estoque_movimentos`** (só-inserção) — `id uuid pk`, `produto_id uuid fk not null`,
`tipo text check in ('conferencia','entrada','saida','estorno')`, `quantidade_base numeric`,
`motivo text` (entrada: `compra|doacao|outro`; saída: `uso|perda|vencimento|outro`; estorno: texto
obrigatório), `observacao`, `valor_pago numeric null`, `local_compra text null` (opcionais,
só em entrada/compra), `ocorrido_em timestamptz not null default now()`,
`registrado_em timestamptz not null default now()`, `registrado_por uuid`,
`registrado_por_email text`, `origem text not null default 'aba_estoque' check in
('aba_estoque','diario')` (preparação para o E2; o E1 só grava `aba_estoque`),
`estorna_movimento_id uuid null fk self`.
Regras (checks/trigger): conferência ≥ 0; entrada/saída > 0; estorno sem quantidade e com
`estorna_movimento_id`; um movimento só pode ser estornado uma vez (índice único parcial); não se
estorna um estorno; `ocorrido_em` entre `now() - 30 dias` e `now() + 5 min`; saída com motivo `uso`
só em produto modo `minimo`; não registrar em produto arquivado.
Grants: SELECT, INSERT. UPDATE e DELETE revogados.

**`estoque_sinalizacoes`** (só-inserção) — `id`, `produto_id fk`, `observacao text null`,
`criado_em`, `criado_por`, `criado_por_email`. Pendente = criada depois do último movimento de
conferência/entrada do produto (derivado na lógica pura; sem UPDATE).

**`estoque_compras`** ("eu compro") — `id`, `produto_id fk`,
`status text check in ('assumida','concluida','desistida')`, `assumida_em`, `assumida_por`,
`assumida_por_email`, `finalizada_em`, `finalizada_por`, `finalizada_por_email`,
`movimento_entrada_id uuid null fk`.
Índice único parcial: no máximo **uma** compra `assumida` por produto (dois irmãos clicando ao mesmo
tempo → o segundo recebe "Fulano já assumiu esta compra").
Sem INSERT/UPDATE/DELETE direto: escrita só pelas RPCs abaixo.

**`estoque_auditoria`** — trigger em INSERT/UPDATE de `estoque_produtos` grava `produto_id`,
`antes jsonb`, `depois jsonb`, `em`, `por`, `por_email`. Só SELECT.

### 2.3 Autoria forçada pelo banco
Trigger `BEFORE INSERT/UPDATE` em todas as tabelas: preenche `*_por = auth.uid()` e
`*_por_email = lower(auth.jwt()->>'email')`, `*_em = now()`, **ignorando** valores enviados.
`registrado_em` sempre `now()`.

### 2.4 RPCs (SECURITY DEFINER, `search_path` fixo, checam autorização primeiro)
- `estoque_assumir_compra(p_produto uuid)` → compra criada; erro legível se já assumida.
- `estoque_desistir_compra(p_compra uuid)` → só de `assumida`.
- `estoque_concluir_compra(p_compra uuid, p_quantidade_base numeric, p_valor_pago numeric,
  p_local text)` → **na mesma transação** insere a entrada (motivo `compra`) e conclui a compra
  apontando para ela.
Qualquer pessoa autorizada pode desistir/concluir (alguém pode comprar no lugar de outro); fica
auditado quem fez.

### 2.5 Policies e Realtime
RLS habilitado em todas; policies `TO authenticated USING/WITH CHECK
(public.estoque_usuario_autorizado())` apenas para os comandos concedidos. Nenhum grant para `anon`.
`REPLICA IDENTITY FULL` e inclusão em `supabase_realtime` (mesmo padrão `DO $$ … EXCEPTION` das
migrations existentes).

Entregar também `docs/implementacao/sql/estoque_e1_rollback.sql`.

## 3. Frontend — `src/features/estoque/`

### 3.1 Integração no `App.jsx` (único arquivo existente alterado)
- `const EstoqueTab = React.lazy(() => import('./features/estoque/EstoqueTab'))` e
  `EstoqueNavBadge` (também isolado).
- Botão "Estoque" (ícone `Package` do `lucide-react`, já instalado) na `bottom-nav`, **visível para
  todos**, entre "Diário" e "Configurações". Com 4 itens, `.nav-item` já tem `width: 25%`.
- Renderização: `activeTab === 'estoque'` → `<EstoqueTab medications={medications}
  caregivers={caregivers} currentUserEmail={userEmail} />` dentro de `Suspense` + ErrorBoundary do
  módulo.
- O selo da aba mostra a quantidade de itens ⚫+🔴; some se for 0, se o módulo der erro ou se as
  tabelas não existirem.

### 3.2 Camada de dados (`data/`)
Usa `getSupabaseClient()` (importado). Erro de tabela ausente (`42P01` / `PGRST205`) vira estado
"não configurado". Sem fallback de `localStorage` (modo local mostra "Disponível apenas com o banco
conectado"). Nomes de quem fez: mapear e-mail → nome via `USER_MAPPING` e `caregivers`
(só exibição; a autoria real vem do banco).

### 3.3 Telas e ações
- **Resumo no topo:** contagem por situação (⚫ 🔴 🟡 ⚪ 🟢), com toque que filtra a lista.
- **Lista** agrupada por situação (ordem 1.5). Card: nome, saldo ("45 fraldas · ≈ 2,3 pacotes"),
  "acaba por volta de DD/MM (≈ N dias)", selos (receita, conferir de novo, avisado por, 🛒 Fulano
  vai comprar, vínculo com a agenda mudou).
- **Ações no card:**
  - **Conferir** — entrada por "embalagens fechadas" + "unidades soltas"; para itens em ml, ajuda
    de fração da embalagem aberta (cheia, ¾, ½, ¼, quase vazia). Mostra o total na unidade base
    antes de confirmar.
  - **Comprei** — quantidade em embalagens ou unidades, valor e local opcionais. Se houver compra
    assumida, oferece concluí-la.
  - **Está acabando** — um toque + observação opcional.
  - **Eu compro / Desistir**.
  - **Registrar saída** — perda/vencimento (e "uso" só no modo mínimo).
  - **Histórico** — movimentos com quem/quando/origem; **Corrigir** = estorno com motivo obrigatório,
    nunca edição.
- **Cadastro/edição de produto:** todos os campos da seção 2.2 com validação clara e ajuda inline
  ("Quanto se usa por dia? Ex.: 6 fraldas"). Para remédios: escolher horários da agenda +
  quantidade por administração + receita. **Arquivar** (confirmação) e "Ver arquivados".
- **Itens sugeridos:** `catalogoSugerido.js` com a lista abaixo; tela com caixas de seleção e
  edição antes de salvar; itens criados ficam ⚪ até a primeira conferência. Botão adicional
  "Criar a partir da agenda de remédios" (um produto por nome de medicamento ainda não cadastrado,
  com os horários pré-vinculados; o usuário confirma embalagem e quantidade por administração).
- **Mensagem para WhatsApp:** dois botões com rótulos honestos:
  "Copiar mensagem" (clipboard, com fallback de seleção de texto) e
  "Abrir no WhatsApp" (`https://wa.me/?text=…`), com a explicação "Abre o WhatsApp com a mensagem
  pronta. Você escolhe o grupo dos irmãos e envia." **Não existe envio automático.**
  Formato (função pura testada):
  ```
  🧴 Estoque da mãe — DD/MM
  ⚫ Acabou
  • Nome — 🛒 Fulano vai comprar
  🔴 Comprar agora
  • Nome — 45 fraldas (≈ 2,3 pacotes), acaba ~DD/MM
  🟡 Ficar de olho (pesquisar preço)
  • …
  ⚪ 3 itens sem conferência
  ```
  Seções vazias omitidas; 🟢 não entra.
- **Realtime:** canal próprio; alterações de outra pessoa atualizam a lista e mostram aviso discreto.
- **Estados:** carregando, vazio (convite para itens sugeridos), não configurado, erro com
  "Tentar novamente".

### 3.4 Catálogo sugerido (editável, não é seed de banco)
Fralda geriátrica (tamanho a definir), roupa íntima descartável, lenço umedecido, lençol/forro
descartável, creme preventivo de assaduras, hidratante corporal, luvas descartáveis, sabonete
líquido, shampoo, condicionador, creme dental, escova de dentes, enxaguante bucal sem álcool,
desodorante, algodão, gaze, soro fisiológico, álcool 70%, cotonete, papel higiênico, sacos de lixo.
Cada um com sugestão de unidade base, embalagem e consumo, sempre editável.

## 4. Testes obrigatórios

### 4.1 Unitários (`tests/estoque/unit/`, rodando em 3 fusos)
- Conversões embalagem ↔ unidade base e formatação pt-BR.
- Saldo: âncora mais recente; empate por `registrado_em`; entradas/saídas antes da âncora ignoradas;
  estornos excluídos; saldo nunca negativo; dias fracionários.
- Limiares exatamente na fronteira (`=` cai na situação mais grave), com e sem receita.
- Modo mínimo nas três fronteiras.
- ⚪ sem conferência não expõe dias/previsão.
- Sinalização pendente eleva para 🟡; resolvida por conferência/entrada posterior; não rebaixa 🔴/⚫.
- Conferência antiga (> 30 dias) gera selo.
- Agenda: consumo pela agenda, vínculo parcialmente quebrado, totalmente quebrado com/sem manual;
  `dose` textual nunca é lida.
- Ordenação da lista.
- Mensagem do WhatsApp (snapshot + seções vazias omitidas + `encodeURIComponent` correto).
- Lista de e-mails da migration = chaves de `USER_MAPPING`.
- Componentes (Testing Library + jsdom): selo some com tabelas ausentes; ErrorBoundary contém erro do
  módulo sem derrubar o resto; ⚪ mostra só "Fazer primeira conferência".

### 4.2 Banco (`tests/estoque/db/`, `ESTOQUE_DB_TEST=1`, Supabase local)
Usuários de teste no bootstrap local: 1 irmão da lista, 1 cuidadora ativa, 1 cuidadora inativa,
1 conta criada por `signUp` comum ("estranho"), e `anon`.
- Irmão e cuidadora ativa: leem e escrevem.
- Cuidadora inativa, estranho e anon: **zero linhas** no SELECT e erro em toda escrita
  (equivalente do "teste de 401" deste projeto).
- Autoria: enviar `registrado_por`/e-mail falsos → banco grava o usuário real.
- Só-inserção: UPDATE/DELETE em movimentos e DELETE em produtos falham para todos os papéis.
- Estorno duplo e estorno de estorno falham; `ocorrido_em` fora da janela falha; saída "uso" em
  modo taxa falha; movimento em produto arquivado falha.
- "Eu compro" concorrente: duas chamadas simultâneas → exatamente uma `assumida`, outra com erro
  legível.
- `estoque_concluir_compra` é atômica (falha na entrada ⇒ compra continua `assumida`).
- Auditoria registra antes/depois na edição de produto.
- Migration aplicada duas vezes seguidas sem erro (idempotência); rollback remove só `estoque_*`.

### 4.3 Mutações mínimas (registrar tabela mutação → teste que caiu)
| # | Mutação | Deve derrubar |
|---|---|---|
| M1 | `<=` → `<` no limiar crítico | fronteira de limiar |
| M2 | Não excluir movimentos estornados | estornos |
| M3 | Ignorar `antecedencia_receita_dias` | limiares com receita |
| M4 | Usar a conferência mais **antiga** como âncora | âncora |
| M5 | Remover a elevação por sinalização | sinalização |
| M6 | Calcular dias com data local (`getDate`) em vez de ms | testes de fuso |
| M7 | Policy com `USING (true)` | estranho/inativa |
| M8 | Remover trigger de autoria | autoria forçada |
| M9 | `GRANT UPDATE` em `estoque_movimentos` | só-inserção |
| M10 | Remover índice único de compra assumida | concorrência |
| M11 | Ler o texto de `dose` como quantidade | agenda |
| M12 | Mostrar dias restantes em ⚪ | sem conferência |

## 5. Regressão zero (provas exigidas)
- `git diff --stat origin/main` mostra só arquivos permitidos (trava no script de evidência).
- Diff do `App.jsx` anexado ao PR e explicado linha a linha; nenhuma linha existente alterada além da
  inserção do botão/bloco.
- Build com Node 22 OK; módulo em chunk separado; tamanho do chunk principal antes/depois.
- Smoke com Supabase local: Escalas, Diário e Configurações abrem e funcionam como antes;
  aba Estoque funciona com e sem a migration aplicada.
- 360 px, claro e escuro: sem rolagem horizontal na aba Estoque e na `bottom-nav` com 3 e 4 itens;
  rótulos não cortados.

## 6. Critérios de aceite (o revisor vai conferir cada um)
1. Nada fora da lista de arquivos permitidos foi alterado.
2. Produto novo nunca mostra projeção antes da primeira conferência.
3. Toda quantidade persiste na unidade base; a UI sempre mostra base + embalagem.
4. Consumo de remédio pela agenda só com vínculo + quantidade por administração configurados.
5. Nenhuma autoria vem do cliente; estranho/inativa/anon não leem nem escrevem nada.
6. Nada é apagado; correção só por estorno; produto só arquivado.
7. "Eu compro" não permite duas compras assumidas para o mesmo produto.
8. WhatsApp: copiar + abrir com mensagem pronta; nenhuma promessa de envio automático.
9. App continua funcionando se a migration ainda não tiver sido aplicada.
10. Testes passam em 3 fusos; todas as mutações caem; evidência com saída 0 e hashes.
