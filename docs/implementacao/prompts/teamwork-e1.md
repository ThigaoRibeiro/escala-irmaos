/teamwork Lote E1: controle de estoque (catálogo, conferência, movimentações, alertas, "eu compro", WhatsApp).

Coordene uma equipe de agentes com os seguintes papéis e passos rigorosos. Nenhum agente começa antes do anterior concluir e registrar sua saída.

1. AGENTE DE SETUP E LEITURA:
   - Diretório: C:\Users\thiag\Projetos\escala-irmaos (único permitido; a pasta do OneDrive está corrompida e não deve ser tocada).
   - Conferir os SHA-256 dos documentos do plano antes de ler (se divergirem, PARAR e reportar):
     - docs/implementacao/prompts/prompt-base-estoque.md = de24d00683c12e774473106618d8a2ed0d85b2043adf26245aa9fa46a39ee557
     - docs/implementacao/prompts/lote-e1-estoque.md = 2a6ad7712ceefd8418123ca93e91fbf4dded6316074af79c402f9c929581813d
   - Executar: `git fetch origin` e `git switch -c feat/estoque-e1 origin/main` (os documentos do plano ainda não estão versionados e acompanham a troca de branch). Primeiro commit: somente `docs/implementacao/prompts/` com a mensagem "docs(estoque): plano do lote E1".
   - Contexto mandatório: ler por inteiro o prompt-base, o lote E1, `src/App.jsx`, `src/utils/db.js` (somente leitura), `src/index.css` (variáveis de tema e `.bottom-nav`) e as 3 migrations existentes.
   - Observações: a última migration é `20260706120000`; a tabela `medications` existe em produção mas não tem DDL no repo; o cadastro público (`signUp`) está aberto, então "autenticado" ≠ "autorizado"; o repositório é público.
   - Registrar a medição de base (antes de qualquer código): `npm ci`, `npm run lint`, build com Node 22 e tamanho do chunk principal.

2. AGENTE DE BANCO (Dev SQL):
   - Escrever `supabase/migrations/<timestamp>_estoque_e1.sql` conforme a seção 2 do lote: `estoque_usuario_autorizado()`, tabelas, triggers de autoria forçada, auditoria, RPCs de compra, policies, Realtime. Somente objetos `estoque_*`; zero ALTER/DROP em objetos existentes.
   - Escrever `docs/implementacao/sql/estoque_e1_rollback.sql`.
   - Montar o Supabase local FORA do repo com `scripts/estoque/db-local.ps1` + `scripts/estoque/local-bootstrap.sql` (tabela `medications`, usuários de teste: irmão, cuidadora ativa, cuidadora inativa, estranho via signUp). Não alterar `supabase/config.toml`.
   - Proibido: `supabase link`, `supabase db push` ou qualquer acesso ao projeto remoto.
   - Escrever os testes de banco da seção 4.2 (`ESTOQUE_DB_TEST=1`), incluindo o equivalente ao teste de 401: estranho, cuidadora inativa e anon recebem zero linhas e erro em toda escrita.

3. AGENTE DE IMPLEMENTAÇÃO (Dev Front):
   - Implementar `src/features/estoque/` conforme a seção 3 do lote, com toda regra de negócio em funções puras que recebem `agora`.
   - Alterar `src/App.jsx` apenas com: import lazy, botão "Estoque" na bottom-nav (visível para todos), bloco de renderização com Suspense + ErrorBoundary e props já existentes (`medications`, `caregivers`, `userEmail`).
   - Adicionar vitest, @testing-library/react e jsdom como devDependencies em versão exata, mais os scripts `test` e `test:tz` (UTC, America/Sao_Paulo, Asia/Tokyo). Nenhuma dependency de runtime nova.
   - Escrever os testes unitários e de componente da seção 4.1, imunes ao relógio local e ao fuso.
   - Responsividade: medir em viewport de 360 px nos temas claro e escuro (rolagem horizontal = 0, rótulos da bottom-nav com 3 e 4 itens sem corte, alvos de toque ≥ 44 px). Documentar só o que foi de fato medido e como.
   - Smoke com Supabase local: Escalas, Diário e Configurações seguem iguais; aba Estoque funciona com e sem a migration. Nunca clicar em "Sair".

4. AGENTE DE QA E MUTAÇÃO:
   - Fazer commit das alterações antes de mutar.
   - Executar as 12 mutações da seção 4.3, rodando o arquivo de teste inteiro a cada rodada; registrar a tabela mutação → teste que caiu; reverter cada mutação e terminar com `git status` limpo.
   - Validar que qualquer reversão proposital derruba os testes específicos; mutação sobrevivente = teste novo e nova rodada.
   - Criar e executar `scripts/estoque/evidencia-e1.ps1`: trava de arquivos permitidos vs `origin/main`, lint, testes nos 3 fusos, testes de banco, idempotência da migration, rollback, build com Node 22, tamanho dos chunks e SHA-256 dos artefatos. Todos os passos com saída 0 e hash conferido em `docs/implementacao/evidencias/E1/`.

5. AGENTE DE GOVERNANÇA E ENTREGA:
   - Sincronização: rodar `git fetch origin` e `git merge origin/main`; se houver mudança, rodar a evidência de novo.
   - Trava de segurança: NÃO fazer merge na main, NÃO dar push na main, NÃO fazer deploy, NÃO aplicar migration em produção. Permitido apenas push de `feat/estoque-e1` e abertura de PR em RASCUNHO.
   - Registrar entrada formal no Diário de Bordo (Obsidian), fora do repo: `C:\Users\thiag\Projetos\escala-irmaos-vault\Diario de Bordo\AAAA-MM-DD - E1 Estoque.md`.
   - Gerar a estrutura final do Pull Request: resumo, diff do `App.jsx` explicado linha a linha, decisões e desvios (com `docs/implementacao/duvidas/E1.md`), tabela de mutações, evidências com hashes, medições de 360 px, bundle antes/depois, plano de implantação (1. vistoria do revisor; 2. dono aplica a migration no SQL Editor; 3. verificação; 4. merge) e plano de reversão.
   - Encerrar reportando honestamente o que não foi feito, não passou ou não foi medido.
