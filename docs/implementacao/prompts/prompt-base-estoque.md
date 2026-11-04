# Prompt-base — Controle de Estoque (Lessa Care)

Regras permanentes para **todos os lotes** da feature de estoque (E1–E4).
Leia por inteiro antes de qualquer lote. Em caso de conflito, este arquivo vence o prompt do lote,
exceto quando o lote disser explicitamente "exceção ao prompt-base".

Revisor técnico: Claude. Nenhum lote é considerado entregue sem vistoria registrada em
`docs/implementacao/vistorias/`.

---

## 1. Contexto do produto

O app (React 19 + Vite 8 + Supabase, PWA no GitHub Pages) é usado diariamente pela família e pelas
cuidadoras para a escala de cuidados e o diário de bordo da mãe. A nova feature resolve um problema
real: **descobrir tarde demais que algo acabou** (fralda, shampoo, remédio) e ter que comprar com
urgência, sem escolher o melhor produto nem o melhor preço.

Objetivo: dar visibilidade do estoque e avisar **com antecedência** — primeiro para pesquisar preço
(🟡), depois para comprar já (🔴) — antes que falte (⚫).

Quem usa: **todos** (irmãos e cuidadoras). As cuidadoras ficam de dia nos dias úteis; os irmãos se
revezam à noite e nos fins de semana. Todos podem fazer tudo; nada é apagado; tudo é auditado.

Estoque único: casa da mãe. Escopo de itens: higiene, cuidados pessoais **e remédios**.

## 2. Roteiro de lotes (não antecipar lotes futuros)

| Lote | Conteúdo | Status |
|---|---|---|
| **E1** | Aba Estoque: catálogo editável, conferência inicial obrigatória, movimentações auditáveis, regras de consumo e alertas, "eu compro", mensagem pronta para WhatsApp | atual |
| E2 | Bloco de estoque dentro da passagem de plantão (Diário), gravando movimentação **independente e explícita**; nunca inferir quantidade de texto do diário; mostrar separadamente se o diário e o estoque foram salvos | futuro |
| E3 | Links por loja, buscas prontas ("buscar em…"), preço anotado manualmente, histórico de preços, preço-alvo | futuro |
| E4 | Preço automático via APIs oficiais/afiliadas quando houver; scraping **apenas experimental e descartável**, só em lojas que permitam, sem contornar bloqueio, CAPTCHA ou termos de uso | futuro |
| Posterior | Sugestão de consumo aprendido pelo histórico (o sistema **sugere**, nunca altera sozinho); notificações push/e-mail | futuro |

Não implemente nada de lotes futuros "porque era fácil". Preparação permitida apenas quando o lote
atual pedir explicitamente (ex.: coluna `origem` em movimentos para o E2).

## 3. Ambiente e repositório

- Trabalhar **exclusivamente** em `C:\Users\thiag\Projetos\escala-irmaos`.
  A cópia em `C:\Users\thiag\OneDrive\Documentos\Projetos\escala-irmaos` está corrompida
  (não é um repositório Git válido). **Não ler, não escrever, não "consertar" essa pasta.**
- Remoto: `github.com/ThigaoRibeiro/escala-irmaos` — **repositório PÚBLICO**. Nada sensível em
  commits, docs, logs ou evidências (sem chaves, tokens, senhas, dados de saúde além do que o app já
  expõe, sem prints com e-mails).
- Branch base: `origin/main`. Branch de cada lote: `feat/estoque-eN`.
- **Push na `main` = deploy em produção** (GitHub Pages, sem staging). É proibido: merge na `main`,
  push na `main`, disparar deploy, editar `.github/workflows/deploy.yml`.
- Push da branch do lote e PR em **rascunho (draft)** são permitidos.
- CI usa **Node 22**; a máquina tem Node 24. O build de evidência deve ser feito com Node 22
  (ex.: `npx -y node@22 node_modules/vite/bin/vite.js build`) e registrado.
- Não existe `.env` local com as chaves de produção, e **não deve existir**. Testes contra banco usam
  **Supabase local** (Docker disponível).

## 4. Isolamento — regra de ouro

A feature é um módulo novo e isolado. Ela **não pode** alterar o comportamento de nada existente.

Permitido criar:
- `src/features/estoque/**` (componentes, hooks, lógica pura, camada de dados, CSS do módulo)
- `tests/estoque/**`
- `supabase/migrations/<timestamp>_estoque_eN.sql` (somente objetos novos com prefixo `estoque_`)
- `scripts/estoque/**`
- `docs/implementacao/**`
- `vitest.config.js`

Permitido alterar (diff mínimo, auditado linha a linha):
- `src/App.jsx` — **apenas**: import lazy do módulo, 1 botão de aba na `bottom-nav`, 1 bloco de
  renderização da aba, passagem de props já existentes. Nada de mudar estado, efeitos, handlers,
  auth ou carregamento existentes.
- `package.json` / `package-lock.json` — apenas devDependencies de teste e scripts `test*`.
  **Nenhuma** dependency de runtime nova sem aprovação do revisor.

Proibido alterar: `src/utils/db.js`, `src/components/**`, `src/index.css`, `src/App.css`,
`vite.config.js`, `supabase/config.toml`, `supabase/functions/**`, migrations existentes,
`.github/**`, `index.html`, `public/**`.
Importar (somente leitura) de `src/utils/db.js` é permitido: `getSupabaseClient`, `USER_MAPPING`.

Regras de isolamento em runtime:
- O módulo é carregado com `React.lazy` + `Suspense` e envolvido por um **ErrorBoundary próprio**.
  Qualquer erro no estoque mostra uma mensagem local na aba; as outras abas continuam funcionando.
- O módulo cria o **seu próprio canal Realtime** (nome `estoque`) e o encerra ao desmontar.
  Não usar nem modificar `subscribeToRealtimeChanges`.
- CSS do módulo com prefixo de classe `est-` e escopo no contêiner do módulo. Reutilizar variáveis
  de tema existentes (`--primary`, `--color-warning`, etc.); não redefinir variáveis globais.
- Se as tabelas `estoque_*` ainda não existirem no banco (migration não aplicada), o app **não pode
  quebrar**: o selo da aba some e a aba mostra "Estoque ainda não configurado". Testar isso.
- Não alterar chaves de `localStorage` existentes, nem configuração do cliente Supabase, nem nada que
  force novo login.
- **Nunca clicar em "Sair"** em testes automatizados (o `signOut()` pode encerrar a sessão em todos
  os dispositivos).

## 5. Banco de dados e segurança

- O agente **nunca** aplica migration em produção, nunca roda `supabase link`, `supabase db push`,
  nem usa credenciais do projeto remoto. Ele escreve o SQL; o revisor revisa; o dono aplica.
- Migrations: idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` só de policies `estoque_*`),
  somente objetos novos com prefixo `estoque_`. Zero `ALTER`/`DROP` em objetos existentes.
  Entregar também `docs/implementacao/sql/estoque_eN_rollback.sql` que remove **apenas** objetos
  `estoque_*` (com aviso de perda de dados no topo).
- **Atenção de segurança:** o cadastro público (`signUp`) está aberto no Login. Logo, "usuário
  autenticado" **não** significa "pessoa autorizada". As tabelas novas não podem usar `USING (true)`.
  Toda policy usa a função `public.estoque_usuario_autorizado()` (definida no E1).
- Auditoria vem do banco: `auth.uid()` e o e-mail do JWT são gravados por default/trigger,
  **sobrescrevendo** qualquer valor enviado pelo frontend. Nunca confiar em nome/e-mail vindo do
  cliente para autoria.
- **Nada é apagado.** Produtos são arquivados; movimentos são só-inserção (correção = estorno).
  `DELETE` revogado em todas as tabelas `estoque_*`; `UPDATE` revogado nas tabelas de histórico.
- `anon` não recebe nenhum grant nas tabelas `estoque_*`.
- Funções `SECURITY DEFINER` sempre com `SET search_path = public, pg_temp` e checagem explícita de
  `estoque_usuario_autorizado()` no início.
- Ambiente local: **não** alterar `supabase/config.toml`. O Supabase local roda num workdir
  temporário **fora do repo** (ex.: `C:\Users\thiag\Projetos\_estoque-local-db`), montado por
  `scripts/estoque/db-local.ps1`, que faz `supabase init` lá, copia as migrations do repo e aplica um
  bootstrap só-local (`scripts/estoque/local-bootstrap.sql`) com o que não está versionado no repo
  (ex.: tabela `medications`, usuários de teste). O bootstrap **nunca** vira migration.

## 6. Qualidade e testes

- Vitest (devDependency, versão exata). `npm test` roda os testes unitários sem precisar de Docker.
  Testes de banco ficam atrás de `ESTOQUE_DB_TEST=1` e rodam contra o Supabase local.
- Toda regra de negócio fica em **funções puras** (`src/features/estoque/logic/**`), recebendo `agora`
  como parâmetro. Proibido `Date.now()`/`new Date()` sem argumento dentro da lógica.
- Testes **imunes ao fuso e ao relógio**: a suíte unitária roda em `TZ=UTC`,
  `TZ=America/Sao_Paulo` e `TZ=Asia/Tokyo` com resultados idênticos. Datas exibidas com
  `timeZone: 'America/Sao_Paulo'` explícito.
- Prova de mutação obrigatória (lista mínima no prompt do lote). Commitar antes de mutar; cada mutação
  é aplicada, o **arquivo de teste inteiro** é rodado, o resultado é registrado, a mutação é revertida
  (`git checkout -- <arquivo>`), e ao final `git status` precisa estar limpo.
- Responsividade: validar em viewport de **360 px** nos temas claro e escuro
  (`prefers-color-scheme`). Documentar só o que foi **de fato medido** (ex.: largura de rolagem
  horizontal = 0, alvos de toque ≥ 44 px), com o método usado.
- Texto da interface em **pt-BR**, claro para pessoas não técnicas. Nada de jargão ("movimento",
  "anchor", "RLS") na UI.
- Lint (`npm run lint`) sem novos avisos.

## 7. Evidências e entrega

- Script do lote em `scripts/estoque/evidencia-eN.ps1`. Cada passo registra comando, código de saída
  e SHA-256 dos artefatos relevantes em `docs/implementacao/evidencias/EN/`. Todos os passos devem
  sair com código 0. O próprio script inclui a **trava de arquivos permitidos** (seção 4): falha se
  qualquer arquivo fora da lista tiver sido alterado em relação a `origin/main`.
- Registrar tamanho do bundle principal antes/depois (o módulo deve ir para um chunk separado).
- Diário de bordo no Obsidian, fora do repo (repo é público):
  `C:\Users\thiag\Projetos\escala-irmaos-vault\Diario de Bordo\AAAA-MM-DD - EN Estoque.md`
  (criar a pasta se não existir).
- PR em rascunho com: resumo, decisões tomadas, desvios da especificação (com motivo), evidências,
  plano de implantação (ordem: migration → verificação → merge) e plano de reversão.
- Honestidade: se algo não foi feito, não passou ou não foi medido, escrever isso. Evidência inventada
  invalida o lote inteiro.
- Dúvida de requisito: **não inventar**. Registrar em `docs/implementacao/duvidas/EN.md`, escolher a
  opção mais conservadora e sinalizar no PR.
