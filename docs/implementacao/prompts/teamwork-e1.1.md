/teamwork [skip-interview] Lote E1.1: correções da vistoria do E1 (PR #1). Não há escopo novo: só corrigir o que a vistoria apontou.

PRÉ-CONDIÇÃO (VS Code + Antigravity): esta sessão precisa rodar numa janela do VS Code cuja pasta aberta seja C:\Users\thiag\Projetos\escala-irmaos. O Teamwork grava `.agents/` na raiz do workspace; no E1 a janela estava na pasta do OneDrive, e foi por isso que os arquivos foram parar lá. `.agents/` já está em `.git/info/exclude` do clone bom (local, não versionado). O estado do Teamwork NUNCA pode ser gravado na pasta do OneDrive nem ser commitado.

PASSO 0 (antes de qualquer agente; se falhar, PARAR e reportar sem criar nada):
   - Mostrar a raiz do workspace atual e a saída de `git -C C:\Users\thiag\Projetos\escala-irmaos rev-parse --show-toplevel`. A raiz do workspace precisa ser exatamente C:\Users\thiag\Projetos\escala-irmaos. Se for qualquer caminho em C:\Users\thiag\OneDrive, PARAR e pedir para reabrir a janela na pasta certa.
   - Confirmar que `.agents/` aparece em `C:\Users\thiag\Projetos\escala-irmaos\.git\info\exclude` e que `git status --short` NÃO lista `.agents/`.
   - Todo comando de terminal deve rodar com diretório de trabalho C:\Users\thiag\Projetos\escala-irmaos (usar caminho absoluto ou `Set-Location` explícito no início).

Coordene uma equipe de agentes com os seguintes papéis e passos rigorosos. Nenhum agente começa antes do anterior concluir e registrar sua saída.

1. AGENTE DE SETUP E LEITURA:
   - Diretório: C:\Users\thiag\Projetos\escala-irmaos (único permitido). Proibido ler, escrever ou referenciar qualquer caminho em C:\Users\thiag\OneDrive.
   - Conferir os SHA-256 antes de ler (se divergirem, PARAR e reportar):
     - docs/implementacao/vistorias/E1-2026-11-03-Claude.md = 7b4e9f82e45d9f8baff014a704f83aebd3eb5dfd0da2f07bd10ddc53b5f31ea7
     - docs/implementacao/prompts/prompt-base-estoque.md = de24d00683c12e774473106618d8a2ed0d85b2043adf26245aa9fa46a39ee557
     - docs/implementacao/prompts/lote-e1-estoque.md = 2a6ad7712ceefd8418123ca93e91fbf4dded6316074af79c402f9c929581813d
   - Executar `git fetch origin` e continuar na branch `feat/estoque-e1` (sem branch nova). Primeiro commit: somente a vistoria e este prompt, com a mensagem "docs(estoque): vistoria E1 e prompt E1.1".
   - Ler a vistoria por inteiro. Ela é a especificação deste lote. Cada item (B1–B6, A1–A4, M1–M5) vira uma linha numa tabela de rastreio em docs/implementacao/evidencias/E1.1/rastreio.md, com as colunas: item → teste que falhava antes → correção → mutação que reverte a correção.

2. AGENTE DE BANCO (Dev SQL):
   - Trazer o runner de banco para o repositório, em `tests/estoque/db/` (ex.: `tests/estoque/db/estoque.db.test.js` rodando sob vitest com `ESTOQUE_DB_TEST=1`, ou um runner .mjs versionado). Remover TODAS as referências ao OneDrive de `scripts/estoque/db-local.ps1` e `scripts/estoque/evidencia-e1.ps1` (B4).
   - A1: em `estoque_concluir_compra` e `estoque_desistir_compra`, travar a linha da compra com `SELECT … FOR UPDATE` antes de checar o status, e lançar erro se o UPDATE afetar 0 linhas. Teste: duas conclusões simultâneas da mesma compra → exatamente 1 entrada criada e 1 erro legível.
   - M3: o trigger de produtos força `arquivado_em = now()` ao arquivar, ignorando o valor do cliente. Teste com data falsa enviada pelo cliente.
   - A migration do E1 ainda NÃO foi aplicada em produção, então corrigir no próprio arquivo `20260707120000_estoque_e1.sql` (sem criar migration nova). Manter idempotência e rollback, com novos testes.
   - B3 (parte banco): teste com mais de 1000 movimentos num produto no Supabase local, provando que o saldo calculado pelo app continua correto (ver Dev Front).
   - Proibido: `supabase link`, `supabase db push` ou qualquer acesso ao projeto remoto.

3. AGENTE DE IMPLEMENTAÇÃO (Dev Front):
   - B1: cada assinatura Realtime usa um nome de canal ÚNICO (ex.: sufixo com `crypto.randomUUID()`), e o `unsubscribe` remove só o próprio canal. Teste com o `@supabase/supabase-js` REAL (sem mock do `channel`): assinar duas vezes em sequência não lança erro, e remover uma assinatura não remove a outra.
   - B2: no `App.jsx`, envolver cada `React.Suspense` do estoque (aba e selo) por um ErrorBoundary importado ESTATICAMENTE (arquivo pequeno em `src/features/estoque/`). O fallback do selo é `null`. Teste: um `React.lazy` cuja importação rejeita não derruba o restante do App (Escalas e Diário continuam renderizando). Continua valendo a regra: no `App.jsx`, só os pontos autorizados.
   - B3: buscar movimentos e sinalizações com paginação (`.range()`) até acabar, ou buscar só o necessário para o cálculo (desde a última conferência válida de cada produto). Nunca depender de uma única página. Teste unitário da paginação mais o teste de banco com mais de 1000 linhas.
   - A2: o selo recebe `medications` (prop já existente no App) e usa EXATAMENTE a mesma função de cálculo da aba. Teste: para os mesmos dados, incluindo um remédio vinculado à agenda, a contagem do selo é igual à soma ⚫+🔴 do cabeçalho da aba.
   - A3: vínculo parcial ou totalmente quebrado usa o consumo manual, se houver; senão, situação ⚪ com o motivo. Nunca reduzir o consumo pelos horários restantes. Mostrar sempre "Vínculo com a agenda mudou — revise o consumo".
   - A4: "Acabou" = ⚫ em todos os lugares (card, cabeçalho, WhatsApp).
   - M1: sinalização pendente em produto ⚪ eleva para 🟡 sem projeção e mostra "Avisado por…". Ela entra na mensagem do WhatsApp na seção 🟡, com "(sem conferência)".
   - M2: validade da receita = fim do dia em America/Sao_Paulo. Teste nos 3 fusos.
   - B5 e B6 (medição real e smoke): adicionar `@playwright/test` como devDependency em versão exata. Criar `scripts/estoque/smoke-e1.mjs` (ou spec Playwright) que, contra o Supabase local e com `.env.local` apontando para ele (arquivo já ignorado pelo git):
     a) faz login com um usuário de teste local da família e um da cuidadora ativa;
     b) abre Escalas, Diário, Configurações (para admin) e Estoque, falhando se aparecer o ErrorBoundary ou erro no console;
     c) no Estoque: cria um produto, faz a conferência, "Eu compro", conclui a compra, "Está acabando", estorna um movimento e abre a mensagem do WhatsApp;
     d) repete a abertura de todas as abas com o banco SEM a migration do estoque (o app não quebra; a aba mostra "Estoque ainda não configurado");
     e) em viewport 360×800, nos temas claro e escuro (`colorScheme`), MEDE e registra: `document.documentElement.scrollWidth - clientWidth` em cada aba; `scrollWidth <= clientWidth` de cada rótulo da bottom-nav, com 3 e 4 itens; altura e largura de cada alvo de toque do Estoque (lista dos que ficarem abaixo de 44 px);
     f) NUNCA clicar em "Sair".
     Os números medidos vão para docs/implementacao/evidencias/E1.1/. As capturas de tela ficam FORA do repo (repositório público, as telas mostram nomes); no repo, registrar só o caminho local e o hash. Apagar `tests/estoque/unit/responsividade360.test.js` ou reescrevê-lo sem alegar medição.

4. AGENTE DE QA E MUTAÇÃO:
   - Fazer commit antes de mutar.
   - Rodar de novo as 12 mutações da seção 4.3 do lote, com a M6 EXATAMENTE como especificada (calcular dias com data local/`getDate` em vez de ms), mais uma mutação por item corrigido (B1, B2, B3, A1, A2, A3, A4, M1, M2, M3), cada uma revertendo a correção e derrubando o teste correspondente. Arquivo de teste inteiro a cada rodada; `git status` limpo ao final.
   - Atualizar `scripts/estoque/evidencia-e1.ps1`, ou criar `evidencia-e1.1.ps1`, incluindo smoke e medições. Executar a evidência a partir de um CLONE LIMPO do branch num diretório temporário (`git clone` + `npm ci`), para provar que tudo é reproduzível a partir do repositório. O log precisa mostrar o caminho do clone limpo. Todos os passos com saída 0 e hashes em docs/implementacao/evidencias/E1.1/.
   - Rodar `git grep -n -i "onedrive"` no branch e anexar a saída. Deve vir vazia, exceto nos documentos de plano e vistoria, que citam a proibição.

5. AGENTE DE GOVERNANÇA E ENTREGA:
   - M4: corrigir as inexatidões em `docs/implementacao/PR_E1.md` e `docs/implementacao/duvidas/E1.md` (sem FK com a agenda; hospedagem GitHub Pages; estorno `tipo='estorno'`; mãe; não existe staging).
   - `git fetch origin` + `git merge origin/main`; se houver mudança, rodar a evidência de novo.
   - Trava de segurança: NÃO fazer merge na main, NÃO dar push na main, NÃO fazer deploy, NÃO aplicar migration em produção. Apenas push de `feat/estoque-e1`; o PR #1 continua em RASCUNHO. Atualizar a descrição com a tabela de rastreio da vistoria.
   - Registrar no Diário de Bordo (Obsidian): `C:\Users\thiag\Projetos\escala-irmaos-vault\Diario de Bordo\AAAA-MM-DD - E1.1 Estoque.md`.
   - Encerrar reportando honestamente o que não foi feito, não passou ou não foi medido. Alegar medição sem número medido, ou evidência que não se reproduz a partir de clone limpo, invalida o lote.

Acceptance Criteria (o revisor vai conferir cada um)
- Cada item B1–B6, A1–A4 e M1–M5 da vistoria está fechado na tabela de rastreio, com teste e mutação.
- B1: aba Estoque abre e permanece funcional com o selo montado, provado no smoke real (sem ErrorBoundary acionado).
- B2: falha de importação do chunk do estoque não derruba as outras abas (teste automatizado).
- B3: saldo correto com mais de 1000 movimentos (teste de banco).
- A1: conclusão concorrente gera exatamente uma entrada.
- B4: `tests/estoque/db/` versionado; zero referências ao OneDrive em scripts e código; nada gravado no OneDrive nesta rodada.
- B5/B6: smoke real com e sem migration, e medições numéricas em 360 px nos dois temas.
- Evidência executada a partir de clone limpo, com saída 0 e hashes.
- Continuam valendo todos os critérios do prompt-base e da seção 6 do lote E1.
- O repositório é público: nenhuma chave, token, senha real ou captura de tela no repo.
