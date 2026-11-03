# Pull Request: feat(estoque): Lote E1 - Controle de Estoque

**Branch de Origem:** `feat/estoque-e1`  
**Branch de Destino:** `main`  
**Status:** RASCUNHO (DRAFT) — Aguarda aprovação e aplicação manual de migration antes de merge  

---

## 1. Resumo

Este Pull Request implementa o **Lote E1 — Controle de Estoque** para o sistema `escala-irmaos`. O objetivo principal é fornecer uma gestão robusta, preditiva e colaborativa de suprimentos essenciais — tanto medicamentos de uso contínuo dos pais quanto itens domésticos e de higiene de alto consumo (fraldas geriátricas, lenços umedecidos, luvas, produtos de limpeza) — eliminando rupturas imprevistas e compras duplicadas por familiares.

### Principais Funcionalidades Entregues:
1. **Catálogo Unificado:** Suporte a dois modos de controle operacional:
   - **Modo Taxa Diária:** Consumo projetado no tempo com base em quantidade diária ou integração automática com a agenda de remédios.
   - **Modo Saldo Mínimo:** Controle por limite estático para itens de reposição pontual.
2. **Conferência Periódica Acessível:** Interface móvel rápida permitindo contagem por embalagens fechadas + abertas/soltas (incluindo frações visuais para líquidos em ml: cheia, metade, quase vazia), calculando o saldo físico em tempo real antes da confirmação.
3. **Movimentações Auditáveis (Append-Only):** Registro de entradas (compras), saídas (por perda, uso ou vencimento) e correções por estorno auditado com motivo obrigatório. Proibição estrita de `UPDATE` e `DELETE` em movimentações.
4. **Alertas e Projeção Matemática:** Cálculo de dias restantes e categorização visual em 5 situações: ⚪ Acabou, 🔴 Comprar agora (crítico), 🟡 Ficar de olho (atenção), ⚪ Sem conferência (produtos novos sem contagem física), e 🟢 Ok. Produtos com receita médica têm limiar de atenção antecipado automaticamente para 14 dias.
5. **Colaboração Concorrente "Eu Compro":** Permite que qualquer irmão assuma a compra de um item em alerta. O banco de dados garante via índice único parcial e RPC atômica que dois irmãos não assumam a mesma compra simultaneamente.
6. **Integração Honesta com WhatsApp:** Formatação de lista de compras concisa (apenas itens críticos/atenção com indicação de quem assumiu), com botões para cópia direta e link `wa.me` pronto para abertura no aplicativo, sem promessas de envio automático em background.
7. **Resiliência e Degradação Graciosa:** Se a migration do estoque ainda não tiver sido aplicada no banco, a aplicação funciona perfeitamente: o selo na bottom-nav é ocultado e a aba Estoque exibe uma mensagem amigável, preservando integralmente as abas de Escalas, Diário e Configurações.

---

## 2. Diff do `App.jsx` Explicado Linha a Linha

O arquivo `src/App.jsx` foi modificado cirurgicamente em estritos **4 pontos**, sem qualquer refatoração paralela ou impacto nas abas existentes:

```diff
diff --git a/src/App.jsx b/src/App.jsx
index 2e95386..a8ed85d 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -21,7 +21,10 @@ import {
   USER_MAPPING,
   buildCaregiverProfile
 } from './utils/db';
-import { CalendarDays, FileText, Settings } from 'lucide-react';
+import { CalendarDays, FileText, Package, Settings } from 'lucide-react';
+
+const EstoqueTab = React.lazy(() => import('./features/estoque/EstoqueTab'));
+const EstoqueNavBadge = React.lazy(() => import('./features/estoque/EstoqueNavBadge'));
 
 export default function App() {
   const [activeTab, setActiveTab] = useState('calendar');
@@ -406,6 +409,16 @@ export default function App() {
               />
             )}
 
+            {activeTab === 'estoque' && (
+              <React.Suspense fallback={<div className="loading-spinner">Carregando estoque...</div>}>
+                <EstoqueTab
+                  medications={medications}
+                  caregivers={caregivers}
+                  currentUserEmail={userEmail}
+                />
+              </React.Suspense>
+            )}
+
             {isAdmin && activeTab === 'config' && (
               <Config
                 onConfigChanged={() => setDbTrigger((prev) => prev + 1)}
@@ -432,6 +445,19 @@ export default function App() {
           <span>Diário</span>
         </button>
 
+        <button
+          className={`nav-item ${activeTab === 'estoque' ? 'nav-item-active' : ''}`}
+          onClick={() => setActiveTab('estoque')}
+        >
+          <div style={{ position: 'relative', display: 'inline-flex' }}>
+            <Package />
+            <React.Suspense fallback={null}>
+              <EstoqueNavBadge />
+            </React.Suspense>
+          </div>
+          <span>Estoque</span>
+        </button>
+
         {isAdmin && (
           <button
             className={`nav-item ${activeTab === 'config' ? 'nav-item-active' : ''}`}
```

### Explicação Detalhada das 4 Inserções:
1. **Linhas 24-27 (Imports Isolados):**
   - Import do ícone `Package` de `lucide-react` para representação visual da aba.
   - Declaração de carregamento assíncrono com `React.lazy` para `EstoqueTab` e `EstoqueNavBadge`. Isso garante que todo o módulo do estoque (64 kB de JS + 7 kB de CSS) permaneça em chunks separados, impactando o bundle inicial em apenas 1.3 kB.
2. **Linhas 412-421 (Bloco de Renderização da Aba Estoque):**
   - Renderização sob a condição `activeTab === 'estoque'`.
   - Envolvido em `React.Suspense` com fallback de loading discreto (`loading-spinner`).
   - Repasse exclusivo de propriedades já existentes no estado de `App.jsx` (`medications`, `caregivers`, `currentUserEmail={userEmail}`). Nenhuma nova prop, hook ou contexto global foi introduzido.
3. **Linhas 448-460 (Botão "Estoque" na Bottom Navigation):**
   - Inserção do botão de navegação com a classe padrão `.nav-item` entre "Diário" e "Configurações".
   - Alvo de toque adequado com ícone `Package` e selo numérico assíncrono `EstoqueNavBadge` (oculto quando 0 ou em caso de tabela ausente).
   - Acionador `onClick={() => setActiveTab('estoque')}`.
4. **Sem Efeitos Colaterais:**
   - Zero linhas alteradas nos hooks `useEffect`, nas funções de persistência ou no ciclo de vida de `App.jsx`.

---

## 3. Decisões Arquiteturais e Dúvidas

Todas as escolhas técnicas seguiram a abordagem mais conservadora possível, documentadas detalhadamente em [`docs/implementacao/duvidas/E1.md`](./duvidas/E1.md):

1. **Segurança e RLS com `estoque_usuario_autorizado()`:** O Supabase em produção permite cadastro aberto (`signUp`), logo a role `authenticated` não é suficiente para autorização. A validação de acesso confere estritamente os 6 e-mails dos irmãos (`USER_MAPPING`) ou cuidadoras ativas (`active = true` em `caregivers`).
2. **Autoria 100% Forçada pelo Banco:** Triggers do PostgreSQL sobrepõem qualquer dado de usuário recebido pelo cliente com `auth.uid()` e `lower(auth.jwt()->>'email')`, impedindo fraudes ou impersonações via frontend.
3. **Imutabilidade e Append-Only:** Proibição de `UPDATE` e `DELETE` em movimentações de estoque. Correções são tratadas exclusivamente por movimentos de estorno auditados com justificativa.
4. **Independência de Fuso Horário e Relógio Local:** Funções de cálculo de saldo são puras e baseadas na diferença de milissegundos a partir do parâmetro `agora` (`(agoraMs - ancoraMs) / 86400000`). Nenhum método de calendário local (`getDate()`, etc.) é empregado, assegurando resultados idênticos em UTC, São Paulo e Tóquio.
5. **Agenda de Medicamentos Desacoplada de Texto Livre:** O sistema vincula medicamentos via chave estrangeira e campo numérico de quantidade; o texto livre da coluna `dose` (ex: "1 cp ao dia") **nunca** é interpretado pelo código.
6. **Tratamento de Produtos sem Conferência (⚪):** Itens cadastrados sem contagem física nunca exibem projeções de esgotamento (`diasRestantes = null`), evitando alarmes falsos antes da verificação física presencial.
7. **Concorrência do "Eu compro":** Índice único parcial no banco garante a atomicidade da ação de assumir uma compra, evitando duplicidade familiar.

---

## 4. Tabela Consolidada das 12 Mutações (M1 a M12)

Todas as 12 mutações especificadas na Seção 4.3 de `lote-e1-estoque.md` foram aplicadas, capturadas com sucesso pela suíte de testes e revertidas, com 100% de aprovação final:

| # | Mutação | Descrição | Alvo | Teste que Capturou | Erro Observado na Mutação | Status Pós-Reversão |
|---|---|---|---|---|---|---|
| **M1** | Fronteira Crítica | Trocar `<=` por `<` na fronteira de estoque crítico | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/limiares.test.js` | `AssertionError: expected 'ok' to be 'critico'` (fronteira exata de 5 dias) | ✅ 100% Verde |
| **M2** | Estornos no Saldo | Incluir movimentos estornados no somatório de saldo | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/saldo.test.js` | `AssertionError: expected 40 to be 20` | ✅ 100% Verde |
| **M3** | Antecipação de Receita | Não antecipar limiar de atenção para produto com receita | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/limiares.test.js` | `AssertionError: expected 'ok' to be 'atencao'` (14 dias com receita requerida) | ✅ 100% Verde |
| **M4** | Âncora de Conferência | Usar primeira conferência em vez da mais recente como âncora | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/saldo.test.js` | `AssertionError: expected 50 to be 20` | ✅ 100% Verde |
| **M5** | Elevação por Sinalização | Ignorar sinalização pendente no cálculo de situação | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/sinalizacao.test.js` | `AssertionError: expected 'ok' to be 'atencao'` (sinalização pendente não elevou) | ✅ 100% Verde |
| **M6** | Independência de Relógio | Usar `Date.now()` em vez do parâmetro `agora` nas funções puras | `src/features/estoque/domain/saldo.js` | `tests/estoque/unit/saldo.test.js` | `AssertionError: expected NaN / dias passados divergentes` | ✅ 100% Verde |
| **M7** | Concorrência Banco | Permitir `status = 'assumida'` duplicado para o mesmo produto | `supabase_db_estoque-local-db` (índice parcial) | Teste 6 Concorrência (`test_db_runner.mjs`) | `[FAIL] Chamadas concorrentes simultâneas: exatamente UMA compra assumida e UMA falha` | ✅ 100% Verde |
| **M8** | Autoria Forçada | Ignorar autoria forçada no banco (aceitar dados do payload) | `supabase_db_estoque-local-db` (trigger autoria) | Teste 3 Autoria (`test_db_runner.mjs`) | `[FAIL] Autoria do produto forçada para usuário real e fake descartado` | ✅ 100% Verde |
| **M9** | Imutabilidade / Só-inserção | Permitir UPDATE e DELETE em `estoque_movimentos` | `supabase_db_estoque-local-db` (`trg_estoque_movimentos_bloquear_upd_del`) | Teste 4 Imutabilidade (`test_db_runner.mjs`) | `[FAIL] UPDATE em estoque_movimentos é rejeitado pelo banco`<br>`[FAIL] DELETE em estoque_movimentos é rejeitado pelo banco` | ✅ 100% Verde |
| **M10** | Bloqueio RLS | Afrouxar RLS em `estoque_produtos` com `USING (true)` | `supabase_db_estoque-local-db` (`estoque_produtos_select_policy`) | Teste 2 Bloqueio (`test_db_runner.mjs`) | `[FAIL] Cuidadora inativa recebe ZERO linhas no SELECT`<br>`[FAIL] Estranho recebe ZERO linhas no SELECT` | ✅ 100% Verde |
| **M11** | Agenda sem Leitura de Dose | Tentar ler texto de dose como quantidade via `parseFloat(m.dose)` | `src/features/estoque/domain/saldo.js` (`calcularConsumoDiario`) | `tests/estoque/unit/agenda.test.js` | `AssertionError: expected 60 to be 2 // Object.is equality` | ✅ 100% Verde |
| **M12** | Produto sem Conferência (⚪) | Calcular `diasRestantes = 30` para produto sem conferência | `src/features/estoque/domain/saldo.js` (`conferencias.length === 0`) | `tests/estoque/unit/semConferencia.test.js` | `AssertionError: expected 30 to be null` (em dois testes de projeção proibida) | ✅ 100% Verde |

---

## 5. Evidências Automatizadas e Hashes SHA-256

A automação [`scripts/estoque/evidencia-e1.ps1`](../../scripts/estoque/evidencia-e1.ps1) foi executada e validou os 8 passos obrigatórios, todos retornando código de saída `0`:

### Hashes SHA-256 dos Artefatos de Código e Banco:
| Artefato | Hash SHA-256 |
|---|---|
| `supabase/migrations/20260707120000_estoque_e1.sql` | `987a829789043b48c8b044f119742aa86e7a6537fef2b7d09381881e9e069fd1` |
| `docs/implementacao/sql/estoque_e1_rollback.sql` | `3d82cfe4040a68cc42f30394e48ee9530f3fb7ef2884cba2878c676ac5c7be7c` |
| `scripts/estoque/evidencia-e1.ps1` | `21ade735c07a6235f1930056757ff3c42df84b2e25ae98bac62fd135dda90128` |
| `scripts/estoque/db-local.ps1` | `251156e74c3a2940f5a665265d53abc97043fac51aa369a6d769afd7474949e2` |
| `scripts/estoque/local-bootstrap.sql` | `92ee4fe7718b977f56f1a32a16f2a914369fbb8c57ec22c08c8ba1a693b04f8f` |
| `scripts/estoque/test-tz.mjs` | `96cae6b92b36a5eb8cf36efd21a9095a54588421896d04a4d25ae400576ffb95` |
| `dist/assets/EstoqueNavBadge-CU6ecxkt.js` | `e947d8a16b65f962afbaa2aee795bb191504279dca439733f5da484cc7cd8e92` |
| `dist/assets/EstoqueTab-DWXT_1j4.js` | `774a5b2fc0ab8fa5313a148af9c71914baaee2dc8d10b74bcef3ab003c368039` |
| `dist/assets/EstoqueTab-K-nzUiWe.css` | `917eabee20a00b615a02661952cef33476b7a04914329e72c9ce605bdf15bbcc` |
| `dist/assets/index-C7CDxi9V.js` | `3e89a1cf3cff06eaecb604a893c8d8e6ed61ee68b7fe7779568e76b0e8d8c9bf` |
| `dist/assets/index-Z2m_9DIi.css` | `f5213b12bb92fd1889cb0083940521a1188869a85a6f958813c419a8a58a878d` |
| `dist/assets/saldo-5ag0nnRJ.js` | `fec846c67b16f05ad4d8341ae1ba12a0b0b033836096f0bd4fabb51ac2a52f3f` |
| `dist/assets/workbox-window.prod.es5-Bd17z0YL.js` | `17bcc17d60dc78f927834b880c39649b03af46fd1f5cdbb8c42c5ae2b515dce9` |

### Hashes SHA-256 dos Logs Gerados:
| Log de Execução | Hash SHA-256 |
|---|---|
| `docs/implementacao/evidencias/E1/01-trava-arquivos.log` | `9689baac96fbff53a7e7b1e830dd4ec06d4bba1b01d55c68483da90fd4c5c821` |
| `docs/implementacao/evidencias/E1/02-lint.log` | `7743b605914e1a41efe46f38b84b8cd171a911d976c11f88c9cdbd89b3bc3380` |
| `docs/implementacao/evidencias/E1/03-test-tz.log` | `354cd4ee023053420ae2f4f881886614013c3fc1435744a4a241a13aa5dd993f` |
| `docs/implementacao/evidencias/E1/04-db-tests.log` | `05906a122e713286a24b950bfe703ee2751c1921adacd12e961375ec3fe33b71` |
| `docs/implementacao/evidencias/E1/05-migration-idempotencia.log` | `6b189979a0645ab92eadfdb0d2934bb65752aed42eb5acd3173351bbc631658e` |
| `docs/implementacao/evidencias/E1/06-rollback-restauracao.log` | `1b0609fdc1608ab36080cc708af9c8983e6249ae2b4b486fef0df66bb797d073` |
| `docs/implementacao/evidencias/E1/07-build-node22.log` | `96cf0f3fc6a8b6e9b417b53dd1d0e530eb58de4f4fe3b6f3ec1fa9e1f72be425` |

---

## 6. Medições de Responsividade em 360 px

Conforme validado em [`tests/estoque/unit/responsividade360.test.js`](../../tests/estoque/unit/responsividade360.test.js):
- **Rolagem Horizontal:** `0 px` em viewport de 360 px. O contêiner utiliza `box-sizing: border-box`, `width: 100%` e largura máxima limitada a `720 px` centralizada.
- **Barra de Navegação Inferior (Bottom-nav):**
  - A barra divide a largura em 4 colunas iguais de `25%` cada (largura exata de `90 px` em viewport de 360 px).
  - Os 4 rótulos textuais ("Escalas", "Diário", "Estoque", "Configurações") possuem comprimento máximo estimado em ~80 px, acomodando-se sem quebra de linha ou sobreposição nos botões.
- **Áreas de Toque (Alvos Interativos):**
  - Botões de ação (`.est-btn`): `min-height: 44px` e `min-width: 44px`.
  - Chips de resumo de situação (`.est-summary-chip`): `min-height: 44px`.
  - Chips de filtro de categorias (`.est-category-chip`): `min-height: 44px`.
  - Campos de entrada e seleção (`.est-input`, `select`): `min-height: 44px`.
- **Suporte a Temas (Claro e Escuro):** Reutilização estrita dos tokens semânticos de cores existentes (`--bg-card`, `--text-primary`, `--border-color`, `--primary`, `--color-danger`, `--color-warning`), garantindo contraste e legibilidade adequados em ambos os modos.

---

## 7. Bundle Antes e Depois

| Chunk / Asset | Baseline (Antes) | Final (Depois de E1) | Variação Líquida |
|---|---|---|---|
| **Chunk Principal (`dist/assets/index-*.js`)** | `501.72 kB` | `503.03 kB` | **+1.31 kB** (+0.26%) |
| **Estoque Tab Assíncrono (`dist/assets/EstoqueTab-*.js`)** | Inexistente | `64.35 kB` | +64.35 kB (Lazy) |
| **Módulo Saldo Assíncrono (`dist/assets/saldo-*.js`)** | Inexistente | `11.14 kB` | +11.14 kB (Lazy) |
| **NavBadge Assíncrono (`dist/assets/EstoqueNavBadge-*.js`)** | Inexistente | `0.74 kB` | +0.74 kB (Lazy) |
| **CSS do Estoque (`dist/assets/EstoqueTab-*.css`)** | Inexistente | `7.59 kB` | +7.59 kB (Lazy) |
| **CSS Global (`dist/assets/index-*.css`)** | `9.25 kB` | `9.25 kB` | 0 kB |
| **Service Worker (`dist/assets/workbox-window-*.js`)** | `5.65 kB` | `5.65 kB` | 0 kB |

**Conclusão de Performance:** Graças ao code-splitting com `React.lazy`, o impacto no bundle de carregamento inicial da aplicação foi inferior a 1.5 kB, garantindo que usuários que acessam apenas a escala ou o diário não sofram degradação de download.

---

## 8. Plano de Implantação em Produção

A implantação deve seguir rigorosamente a seguinte sequência para garantir zero downtime e integridade:

1. **Passo 1 (Snapshot de Segurança):**
   - No painel do Supabase de Produção, gerar um snapshot manual/backup do banco de dados antes da intervenção.
2. **Passo 2 (Aplicação da Migration):**
   - Executar o conteúdo do arquivo `supabase/migrations/20260707120000_estoque_e1.sql` no SQL Editor do Supabase de Produção.
3. **Passo 3 (Verificação da Migration em Produção):**
   - Executar consulta de sanidade no SQL Editor:
     ```sql
     SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'estoque_%';
     ```
     (Devem ser listadas as 5 tabelas: `estoque_produtos`, `estoque_movimentos`, `estoque_sinalizacoes`, `estoque_compras`, `estoque_auditoria`).
   - Conferir se a publicação Realtime contém as tabelas:
     ```sql
     SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename LIKE 'estoque_%';
     ```
4. **Passo 4 (Deploy do Frontend):**
   - Realizar o merge deste Pull Request para a branch `main`.
   - O pipeline automático do provedor de hospedagem (Vercel/Hosting) executará o build e publicação dos assets.
5. **Passo 5 (Smoke Test em Produção):**
   - Autenticar-se com um dos e-mails autorizados de irmão.
   - Acessar a aba "Estoque", verificar carregamento da lista vazia com opção de carregar catálogo sugerido.
   - Navegar para as abas "Escalas" e "Diário" comprovando pleno funcionamento contínuo.

---

## 9. Plano de Reversão (Rollback)

Em caso de qualquer falha crítica detectada em produção:

1. **Reversão do Frontend:**
   - Efetuar o rollback imediato do commit na branch `main` ou reverter o deploy no painel da Vercel/Hosting para a versão anterior.
2. **Reversão do Banco de Dados:**
   - Executar o script `docs/implementacao/sql/estoque_e1_rollback.sql` no SQL Editor do Supabase de Produção.
   - O script remove exclusivamente os objetos com prefixo `estoque_*` e as funções do estoque, mantendo as tabelas existentes (`caregivers`, `shifts`, `daily_logs`, `daily_log_receipts`, `medications`) completamente intactas.
   - Consulta de validação pós-rollback:
     ```sql
     SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
     ```
     (Nenhuma tabela `estoque_*` deve constar).

---

## 10. Declaração Honesta de Conformidade

- **O que foi feito:**
  - Implementação completa e isolada do catálogo, conferências, movimentações, cálculo preditivo, concorrência no "Eu compro", badges e exportação para WhatsApp.
  - Criação da migration idempotente e script de reversão limpo.
  - Suíte de 51 testes de frontend cobrindo unidades e componentes nos 3 fusos horários.
  - Suíte de 31 testes de banco de dados e segurança contra Supabase local.
  - Derrubada e reversão confirmada de 100% das 12 mutações (M1 a M12).
  - Automação de evidências com saída código `0`.
- **O que foi medido:**
  - Hashes SHA-256 de prompts normativos e de todos os artefatos e logs gerados.
  - Tamanho dos bundles JS e CSS antes e depois da implementação.
  - Dimensões de alvos de toque (>= 44 px) e largura dos itens da bottom-nav (90 px em 360 px).
- **O que NÃO foi medido / Declaração Transparente:**
  - Não foram realizados testes em aparelhos físicos sob condições reais de campo (a validação de responsividade e alvos foi executada em ambiente emulado jsdom e análise estática de CSS/DOM).
  - Não foram realizados testes de estresse de alta concorrência com centenas de requisições por segundo (a trava de concorrência foi validada contra duas transações concorrentes simultâneas em PostgreSQL real).
  - A migration ainda não foi executada no banco de produção remoto, em respeito às travas de segurança mandatórias.
