# Rastreio da vistoria E1 → correções E1.1

Cada item da vistoria (`vistorias/E1-2026-11-03-Claude.md`) com o teste que o cobre, a correção e a mutação que
reverte a correção e derruba o teste. As mutações rodam no clone limpo (`evidencias/E1.1/mutacoes.md`).

"Falhava antes": os testes dos itens A1, M3 e B3 (banco) e A2, A3, A4, M1, M2 (domínio) foram executados contra o
código ainda sem correção e falharam (4 falhas no banco e 11 no domínio, registradas na sessão de correção).
Os de B1 e B2 são provados pela mutação (reverter a correção derruba o teste).

| Item | Defeito | Teste | Correção | Mutação |
|---|---|---|---|---|
| B1 | Aba Estoque quebrava ao abrir (mesmo nome de canal Realtime no selo e na aba) | `unit/realtimeCanais.test.js` (supabase-js real, sem simular `channel`); smoke A10, A12, A17 | nome único por assinatura; cada uma remove só o próprio canal | B1 |
| B2 | Falha de carregamento do chunk derrubava o app inteiro | `components/AppIsolamento.test.jsx` (App real, chunks rejeitando) | `EstoqueLazyBoundary` estático em volta dos dois `React.lazy` | B2 |
| B3 | Saldo errado depois de 1000 movimentos | `db/estoque.db.test.js` (1201 movimentos) | busca paginada com ordenação total | B3 |
| B4 | Testes de banco e scripts na pasta do OneDrive | `tests/estoque/db/*` versionados; evidência 02 (sem OneDrive) e 00 (clone limpo) | testes e scripts no repo, sem caminhos fixos | (verificação estrutural) |
| B5 | "Medição" de 360 px era leitura de CSS | smoke fase B: 46 medições reais, claro e escuro | teste falso removido; medição no navegador; alvos de 44 px nos modais | (medição) |
| B6 | Sem smoke no app real | smoke fases A e C: 28/28 | script `smoke-e1.mjs` | (fluxo) |
| A1 | Corrida em "concluir compra" (entrada em dobro) | `db/estoque.db.test.js` (A1, 2 testes) + `db/estoque.db.estrutura.test.js` (duas defesas) | `FOR UPDATE` + checagem do `UPDATE` | A1, A1a, A1b |
| A2 | Selo ignorava a agenda de remédios | `unit/resumo.test.js`, `components/EstoqueNavBadgeAgenda.test.jsx`; smoke A15 (selo = cabeçalho = 2) | contagem única `domain/resumo.js`; selo recebe `medications` | A2 |
| A3 | Vínculo parcial reduzia o consumo | `unit/agenda.test.js` | usa consumo manual ou ⚪ com motivo | A3 |
| A4 | "Acabou" com ícone ⚪ | `components/EstoqueHeaderIcones.test.jsx`, `unit/limiares.test.js` | ⚫ em card, cabeçalho, ordenação e WhatsApp | A4, A4b |
| M1 | Aviso em produto sem conferência era ignorado | `unit/sinalizacaoSemConferencia.test.js` | eleva para 🟡 sem projeção; aparece no WhatsApp | M1v |
| M2 | Receita vencia às 21h (fim do dia em UTC) | `unit/receitaFuso.test.js` (3 fusos) | fim do dia em Brasília | M2v |
| M3 | `arquivado_em` vinha do relógio do cliente | `db/estoque.db.test.js` | trigger usa `now()` | M3v |
| M4 | Inexatidões nos documentos | revisão | `duvidas/E1.md` e `PR_E1.md` reescritos | — |
| M5 | Mutação M6 trocada por `Date.now()` | mutação M6 exatamente como especificada (`getDate`) | — | M6 |

## Achados adicionais desta rodada

| Achado | Como apareceu | Correção |
|---|---|---|
| `authenticated` com `TRUNCATE`/`TRIGGER`/`REFERENCES` nas tabelas; funções `estoque_*` executáveis por `anon`/PUBLIC | teste de estrutura (catálogo do Postgres) | `REVOKE ALL` antes dos `GRANT`; EXECUTE fechado (mutações H1, H2) |
| Bootstrap local sem policies: o app local via zero cuidadoras e zero remédios e deslogava a cuidadora | smoke real | policies equivalentes às de produção no `local-bootstrap.sql` |
| Botões e linhas de 20 a 36 px nos modais | medição real | 44 px (mutação não aplicável; coberto pela medição) |
| M9 e M10 da especificação sobreviviam por haver duas camadas de proteção | primeira rodada de mutação | testes separados por camada (privilégios, trigger, índice) |

## Fora do escopo (pré-existente, medido e registrado)

- Rolagem horizontal de 50 px a 360 px para o SUPERADMIN, em todas as abas, idêntica na `origin/main` (`ed6c8f2`).
- Itens da barra de navegação inferior com 41 px de altura, também na `origin/main`.
