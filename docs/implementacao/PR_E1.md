# feat(estoque): Lote E1 + correções E1.1 — Controle de estoque

**Status:** RASCUNHO. Não fazer merge antes de aplicar a migration (guia: `docs/implementacao/PUBLICAR_E1.md`).
Evidência gerada a partir de um **clone limpo** do commit `c124658`; commits posteriores só alteram documentação.

## O que é

Aba **Estoque** para a família e as cuidadoras: catálogo (higiene, cuidados pessoais e remédios), primeira
conferência obrigatória, histórico de movimentações com autoria, consumo diário (manual ou pela agenda de remédios),
alertas 🟡 (pesquisar preço) / 🔴 (comprar agora) / ⚫ (acabou), "está acabando", "eu compro" e mensagem pronta
para o WhatsApp (copiar ou abrir; não existe envio automático). Nada é apagado: produtos são arquivados e correções
são estornos.

Fora deste lote: Diário (E2), preços e links (E3), automação de preços (E4).

## Isolamento (zero regressão)

- Módulo novo em `src/features/estoque/`; tabelas e funções novas com prefixo `estoque_`. Nenhuma tabela, função
  ou policy existente é alterada.
- `src/App.jsx`: **+33 / −1 linhas** — só o import dos dois componentes carregados sob demanda, o ícone, o botão da
  aba e o bloco da aba, cada um dentro de uma barreira de erro estática. A única linha removida é o import do
  `lucide-react`, que ganhou o ícone `Package`.
- Nenhuma dependência de runtime nova (`dependencies` idêntica à `origin/main`). Novas, só de desenvolvimento e em
  versão exata: `vitest`, `@testing-library/react`, `jsdom`, `playwright-core`.
- Chunk principal: **501,73 kB → 503,84 kB (+2,12 kB)**; o módulo vai em chunk separado (carregado só ao usar).
- Se a migration ainda não foi aplicada, o app não quebra: o selo some e a aba mostra "Estoque ainda não
  configurado" (provado no navegador).

## Evidências (todas com saída 0; `docs/implementacao/evidencias/E1.1/`)

| Verificação | Resultado |
|---|---|
| Clone limpo do commit, `npm ci`, lint | OK |
| Trava de arquivos permitidos, sem referências a pasta local, sem chaves/e-mails/imagens indevidas | OK |
| Testes unitários e de componente (65) em UTC, America/Sao_Paulo e Asia/Tokyo | OK |
| Testes de banco contra Supabase local (46): RLS, autoria, só-inserção, compras, estrutura | OK |
| Migration idempotente, rollback remove todos os objetos `estoque_*`, restauração idêntica (hash da estrutura) | OK |
| **Smoke real no Chrome** com Supabase Auth local: irmão e cuidadora, todas as abas, fluxo completo, tempo real entre dois usuários, sem a migration | 28/28 |
| **Mutações**: 12 da especificação + uma por item corrigido | 28/28 mortas, árvore limpa |
| Build com Node 22; chunks antes/depois | OK |
| SHA-256 de todos os artefatos (`SHA256SUMS.txt`) | conferido |

## Medições em 360×800 (Chrome, claro e escuro, 46 medições: 4 abas + 8 modais, para irmão e cuidadora)

- Nenhum elemento do conteúdo da aba ou dos modais passa da borda da tela.
- Rótulos da barra inferior (3 e 4 itens): o maior ("Configurações") tem 77,2 px de 90 px; sem corte nem quebra de linha.
- Alvos de toque do Estoque e dos modais: **0** abaixo de 44 px (a medição achou botões de 20 a 36 px; foram corrigidos).
- **Pré-existente, fora do escopo:** o SUPERADMIN tem 50 px de rolagem horizontal em **todas** as abas. Medido
  idêntico na `origin/main` (`ed6c8f2`); vem da barra superior (`src/components/Navbar.jsx`). A barra inferior
  existente também tem itens de 41 px de altura.
- Não medido: aparelho físico real, teclado virtual, orientação paisagem.

## Banco de dados

- `supabase/migrations/20260707120000_estoque_e1.sql` (só objetos novos) e rollback em
  `docs/implementacao/sql/estoque_e1_rollback.sql`. **Não aplicada em produção.**
- Segurança: o cadastro público do app está aberto, então as tabelas usam `estoque_usuario_autorizado()` (os 6
  e-mails da família ou cuidadora ativa). Autoria gravada pelo banco. `anon` sem acesso a nada. Nenhuma policy
  `USING (true)`.

## O que o dono precisa fazer

1. Rodar as consultas de verificação, aplicar a migration no SQL Editor e conferir (`PUBLICAR_E1.md`).
2. Fazer o merge; acompanhar o Actions; conferir as abas.

## Pendências fora deste lote

- Policies das tabelas atuais e cadastro público aberto (lote de segurança próprio).
- Rolagem de 50 px do SUPERADMIN e altura de 41 px da barra inferior.
- A tabela `medications` não tem DDL no repositório; conferir as colunas em produção (Etapa 0 do guia).

Detalhes: `duvidas/E1.md`, `RASTREIO_E1.1.md`, `vistorias/E1-2026-11-03-Claude.md`.
