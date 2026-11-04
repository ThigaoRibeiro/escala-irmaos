# Credenciais do projeto: onde moram e como renovar

> **Regra de ouro:** nenhuma senha, token ou chave vai para dentro do git.
> Este repositório é **público**: o que for commitado fica exposto para sempre.
> Este documento só diz **onde** cada coisa mora, **quando vence** e **como renovar**. Nunca os valores.

## 1. Mapa: o que existe e o que quebra se faltar

| Credencial | Onde mora | Vence? | Se faltar ou vencer |
|---|---|---|---|
| `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` | GitHub → Settings → Secrets → Actions | Não (só se você trocar a chave no Supabase) | O **próximo deploy** sai sem banco. O app já publicado continua igual. |
| `SUPABASE_ACCESS_TOKEN` (token de gestão do banco) | GitHub → Settings → Secrets → Actions | **Sim, até 90 dias** (ou "sem vencimento", se escolhido) | **O app da família NÃO é afetado.** Só ficam travadas as tarefas de manutenção (aplicar migrações, conferir o banco). |
| `SUPABASE_TOKEN_EXPIRA_EM` (a data de vencimento do token acima) | GitHub → Settings → Variables → Actions | É só uma data, não vence | O alarme semanal deixa de saber a data. Ainda confere se o token funciona. |
| Cópia local do token | `C:\Users\thiag\Projetos\escala-irmaos\.env` (ignorado pelo git) | Mesmo vencimento do token | O Claude perde o acesso de leitura ao banco. Nada em produção muda. |
| Login do GitHub CLI (`gh`) | Cofre de credenciais do Windows | Só se você revogar | Não consigo abrir PR, ver Actions nem publicar. |
| Chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) | Dentro do Supabase (segredos da função `caregiver-admin`) | Não | Não mexa. A criação de cuidadoras depende dela. |

**O ponto principal:** o app que a família usa só precisa da chave pública (`ANON_KEY`).
O token de gestão **não** é usado pelo app. Se ele vencer ou se perder, **ninguém da família percebe nada**.

## 2. Alarme automático (você não precisa lembrar das datas)

O arquivo `.github/workflows/verificar-token.yml` roda **toda segunda-feira às 08:00 (Brasília)** e confere:
1. se o token guardado no GitHub ainda é aceito pelo Supabase;
2. se faltam mais de 14 dias para ele vencer (usando a variável `SUPABASE_TOKEN_EXPIRA_EM`).

Se algo estiver errado, o GitHub **manda e-mail** avisando e a execução aparece em **vermelho** na aba *Actions*.
Para testar na hora: GitHub → aba **Actions** → **Verificar token do Supabase** → **Run workflow**.

Limite do GitHub: em repositório público, tarefas agendadas são **pausadas após 60 dias sem nenhuma atividade** no repositório. Como o projeto continua evoluindo, isso não deve acontecer. Se acontecer, basta clicar em *Enable workflow* na aba Actions.

## 3. Renovar o token (leva uns 5 minutos)

Faça isto quando o e-mail do alarme chegar (ou quando quiser trocar).

### Passo A: criar o token novo no Supabase
1. Abra https://supabase.com/dashboard/account/tokens
2. Clique em **Generate new token**.
3. **Nome:** `github-lessacare-AAAAMM` (troque AAAAMM pelo ano e mês, ex.: `github-lessacare-202611`).
4. **Escopo:** escolha **somente o projeto `escala-irmaos`** (nunca a conta inteira).
5. **Permissão:** *Full access* (necessário para aplicar migrações).
6. **Validade:** o máximo oferecido (**90 dias**) ou **sem vencimento**. Veja a nota abaixo.
7. Clique em criar e **copie o token agora**. Ele só aparece uma vez (começa com `sbp_`).

### Passo B: guardar no GitHub (o lugar certo, cifrado)
1. Abra https://github.com/ThigaoRibeiro/escala-irmaos/settings/secrets/actions
2. Se `SUPABASE_ACCESS_TOKEN` já existe, clique no **lápis** (Update). Se não, **New repository secret** com esse nome exato.
3. Cole o token e salve. (O GitHub nunca mais mostra o valor. É assim mesmo.)
4. Abra https://github.com/ThigaoRibeiro/escala-irmaos/settings/variables/actions
5. Crie ou atualize a variável `SUPABASE_TOKEN_EXPIRA_EM` com a data de vencimento no formato `AAAA-MM-DD` (a data aparece na lista de tokens do Supabase). Se o token for **sem vencimento**, escreva `nunca`.

### Passo C: cópia local para o Claude
1. Abra o arquivo `C:\Users\thiag\Projetos\escala-irmaos\.env` (se não existir, crie).
2. Deixe uma linha assim: `token: sbp_COLE_AQUI` (troque pelo token novo).
3. Salve. O git ignora esse arquivo, então ele nunca sobe para o GitHub.

### Passo D: conferir que deu certo
1. GitHub → **Actions** → **Verificar token do Supabase** → **Run workflow**.
2. Ele deve terminar **verde**, com a mensagem "Token aceito pelo Supabase (HTTP 200)".

### Passo E: apagar o token antigo
Volte em https://supabase.com/dashboard/account/tokens e apague o token anterior.

## 4. Qual validade escolher: 90 dias ou sem vencimento?

- **90 dias (recomendado):** se o token vazar, ele morre sozinho. O alarme avisa 14 dias antes, então você renova em 5 minutos duas ou três vezes por ano.
- **Sem vencimento:** você nunca precisa renovar, mas um token vazado **nunca** deixa de funcionar até você lembrar de apagá-lo. Se escolher assim, escreva `nunca` na variável e revise os tokens no painel de vez em quando.

Em qualquer caso, o token é do **projeto**, não da conta. Se vazar, o estrago fica limitado a este banco.

## 5. Quando algo dá errado

| Situação | O que fazer |
|---|---|
| **O alarme mandou e-mail** (token perto de vencer ou inválido) | Siga a seção 3, passos A a E. |
| **Perdi o token** | Não tem como recuperar. Crie outro (seção 3). O app da família continua funcionando. |
| **Acho que o token vazou** (apareceu em print, conversa ou arquivo) | Apague-o **na hora** no painel do Supabase e crie outro (seção 3). |
| **O deploy saiu sem banco** | Confira se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existem em Settings → Secrets. |

## 6. Como o Claude lê o token

O token fica em `C:\Users\thiag\Projetos\escala-irmaos\.env` (linha `token: sbp_...`). O Claude lê o arquivo dentro do script, **sem mostrar o valor**, e usa a API de gestão do Supabase:
`POST https://api.supabase.com/v1/projects/uccupbxozqnmhcloptcq/database/query`

Nunca coloque esse arquivo em pasta sincronizada (OneDrive ou Google Drive) nem o cole em chat, e-mail ou print.
