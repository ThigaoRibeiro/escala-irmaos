// Evidência do lote E1.1 (Estoque). Roda TUDO a partir de um CLONE LIMPO do commit atual, para provar que
// o resultado é reproduzível só com o que está no repositório (sem pastas locais, sem OneDrive).
//
// Pré-requisitos: Docker + Supabase local rodando (scripts/estoque/db-local.ps1 start), Chrome instalado, Node 22+.
// Uso:  node scripts/estoque/evidencia-e1.1.mjs      (na raiz do repo, com tudo commitado)
// Saída: docs/implementacao/evidencias/E1.1/ (logs numerados, mutacoes.*, smoke-e1.json, SHA256SUMS.txt)
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs', 'implementacao', 'evidencias', 'E1.1');
const CONTAINER = process.env.ESTOQUE_DB_CONTAINER || 'supabase_db_estoque-local-db';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'estoque-e1.1-'));
const CLONE = path.join(TMP, 'clone-limpo');

const passos = [];
let falhou = false;

const sha256 = (arquivo) => crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function git(args, cwd = CLONE) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function psql(sql) {
  const r = spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-t', '-A'], { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { codigo: r.status, saida: (r.stdout || '').trim(), erro: (r.stderr || '').trim() };
}

// Registra um passo: grava o log numerado e o código de saída.
function registrar(numero, nome, { comando, codigo, saida, detalhe }) {
  const arquivo = `${String(numero).padStart(2, '0')}-${nome}.log`;
  const cabecalho = [`Passo ${numero}: ${nome}`, `Data: ${new Date().toISOString()}`, `Clone limpo: ${CLONE}`, `Comando: ${comando}`, `Codigo de saida: ${codigo}`, detalhe ? `Resumo: ${detalhe}` : '', '', '--- saida ---', ''].filter((l) => l !== undefined).join('\n');
  fs.writeFileSync(path.join(SAIDA, arquivo), cabecalho + '\n' + (saida || '') + '\n');
  const ok = codigo === 0;
  if (!ok) falhou = true;
  passos.push({ numero, nome, arquivo, codigo, ok, detalhe: detalhe || '' });
  console.log(`${ok ? '[OK]  ' : '[FALHA]'} ${String(numero).padStart(2, '0')} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

function executar(numero, nome, cmd, args, { cwd = CLONE, env = {}, detalhe } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024, shell: cmd.endsWith('.cmd') });
  registrar(numero, nome, { comando: `${cmd} ${args.join(' ')}`, codigo: r.status ?? 1, saida: `${r.stdout || ''}${r.stderr ? `\n[stderr]\n${r.stderr}` : ''}`, detalhe: typeof detalhe === 'function' ? detalhe(r) : detalhe });
  return r;
}

function contagemObjetos() {
  const q = (sql) => psql(sql).saida;
  return {
    tabelas: q("select count(*) from pg_tables where schemaname='public' and tablename like 'estoque\\_%'"),
    funcoes: q("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'estoque\\_%'"),
    policies: q("select count(*) from pg_policies where schemaname='public' and tablename like 'estoque\\_%'"),
    triggers: q("select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relname like 'estoque\\_%'"),
    indices: q("select count(*) from pg_indexes where schemaname='public' and tablename like 'estoque\\_%'"),
    publicacao: q("select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename like 'estoque\\_%'")
  };
}

function assinaturaEstrutura() {
  // Hash da estrutura: definições das funções, policies, grants e colunas. Igual após reaplicar = idempotente.
  const partes = [
    psql("select string_agg(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''), E'\\n' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'estoque\\_%'").saida,
    psql("select string_agg(tablename||policyname||cmd||coalesce(qual,'')||coalesce(with_check,''), E'\\n' order by tablename,policyname) from pg_policies where schemaname='public' and tablename like 'estoque\\_%'").saida,
    psql("select string_agg(table_name||grantee||privilege_type, E'\\n' order by table_name,grantee,privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name like 'estoque\\_%'").saida,
    psql("select string_agg(table_name||column_name||data_type||coalesce(column_default,''), E'\\n' order by table_name,ordinal_position) from information_schema.columns where table_schema='public' and table_name like 'estoque\\_%'").saida
  ];
  return crypto.createHash('sha256').update(partes.join('\n--\n')).digest('hex');
}

// =====================================================================================================
fs.mkdirSync(SAIDA, { recursive: true });
for (const f of fs.readdirSync(SAIDA)) if (/^\d\d-.*\.log$/.test(f)) fs.rmSync(path.join(SAIDA, f));
console.log('=== Evidência E1.1 — clone limpo em', CLONE, '===\n');

// 00. Clone limpo do commit atual
{
  const statusRepo = git(['status', '--porcelain'], REPO).stdout.trim();
  if (statusRepo) {
    console.error('Há alterações não commitadas no repositório. Faça commit antes (a evidência vale para um commit).');
    console.error(statusRepo);
    process.exit(2);
  }
  git(['fetch', 'origin', '--quiet'], REPO);
  const sha = git(['rev-parse', 'HEAD'], REPO).stdout.trim();
  const clone = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', REPO, CLONE], { encoding: 'utf8' });
  const co = git(['checkout', '--quiet', '--detach', sha]);
  const refBase = git(['fetch', '--quiet', REPO, '+refs/remotes/origin/main:refs/remotes/origin/main']);
  const limpo = git(['status', '--porcelain']).stdout.trim() === '';
  registrar(0, 'clone-limpo', {
    comando: `git clone --no-hardlinks ${REPO} ${CLONE} && git checkout ${sha}`,
    codigo: clone.status === 0 && co.status === 0 && refBase.status === 0 && limpo ? 0 : 1,
    saida: `commit testado: ${sha}\norigin/main: ${git(['rev-parse', 'origin/main']).stdout.trim()}\nstatus limpo: ${limpo}\n${clone.stderr}${co.stderr}${refBase.stderr}`,
    detalhe: `commit ${sha.slice(0, 7)}`
  });
  if (falhou) process.exit(1);
}

// 01. Trava de arquivos permitidos (vs origin/main)
{
  const permitidos = [/^src\/features\/estoque\//, /^tests\/estoque\//, /^supabase\/migrations\/.*_estoque_e1\.sql$/, /^scripts\/estoque\//, /^docs\/implementacao\//, /^vitest\.config\.js$/, /^src\/App\.jsx$/, /^package\.json$/, /^package-lock\.json$/];
  const arquivos = git(['diff', '--name-only', 'origin/main...HEAD']).stdout.split('\n').filter(Boolean);
  const fora = arquivos.filter((f) => !permitidos.some((re) => re.test(f)));
  const app = git(['diff', '--numstat', 'origin/main...HEAD', '--', 'src/App.jsx']).stdout.trim().split(/\s+/);
  const pkgBase = JSON.parse(git(['show', 'origin/main:package.json']).stdout);
  const pkgAtual = JSON.parse(fs.readFileSync(path.join(CLONE, 'package.json'), 'utf8'));
  const depsIguais = JSON.stringify(pkgBase.dependencies) === JSON.stringify(pkgAtual.dependencies);
  const devNovas = Object.keys(pkgAtual.devDependencies).filter((d) => !(d in pkgBase.devDependencies));
  const devExatas = devNovas.every((d) => /^\d/.test(pkgAtual.devDependencies[d]));
  const proibidosAlterados = ['src/utils/db.js', 'src/index.css', 'src/App.css', 'vite.config.js', 'supabase/config.toml', 'index.html'].filter((f) => arquivos.includes(f));
  const ok = fora.length === 0 && depsIguais && devExatas && proibidosAlterados.length === 0 && Number(app[1]) === 1;
  registrar(1, 'trava-arquivos', {
    comando: 'git diff --name-only origin/main...HEAD + conferencias de package.json e App.jsx',
    codigo: ok ? 0 : 1,
    saida: [`arquivos alterados: ${arquivos.length}`, `fora da lista permitida: ${fora.join(', ') || 'nenhum'}`, `App.jsx: +${app[0]} / -${app[1]} linhas (esperado: 1 linha removida, a do import do lucide)`, `dependencies identicas a origin/main: ${depsIguais}`, `devDependencies novas: ${devNovas.map((d) => `${d}@${pkgAtual.devDependencies[d]}`).join(', ')}`, `devDependencies em versao exata: ${devExatas}`, `arquivos proibidos alterados: ${proibidosAlterados.join(', ') || 'nenhum'}`, '', ...arquivos].join('\n'),
    detalhe: `${arquivos.length} arquivos; App.jsx +${app[0]}/-${app[1]}`
  });
}

// 02. Nenhuma referência ao OneDrive fora dos documentos de plano/vistoria
{
  // O próprio script de evidência cita a palavra que procura; fica de fora, junto com os planos/vistorias.
  const r = git(['grep', '-n', '-i', 'onedrive', '--', '.', ':!docs/implementacao/prompts', ':!docs/implementacao/vistorias', ':!scripts/estoque/evidencia-e1.1.mjs']);
  registrar(2, 'sem-referencias-onedrive', {
    comando: "git grep -n -i onedrive -- . ':!docs/implementacao/prompts' ':!docs/implementacao/vistorias' ':!scripts/estoque/evidencia-e1.1.mjs'",
    codigo: r.status === 1 ? 0 : 1, // 1 = nenhuma ocorrência
    saida: r.stdout || '(nenhuma ocorrência)',
    detalhe: r.status === 1 ? 'nenhuma ocorrência' : 'ENCONTRADO'
  });
}

// 03. Segredos e dados pessoais (repositório público)
{
  const arquivos = git(['ls-files']).stdout.split('\n').filter((f) => f && !/(^package-lock\.json$|\.png$|\.ico$|\.svg$)/.test(f));
  const familia = new Set(['thiagor21@gmail.com', 'esterlessa13@gmail.com', 'professorajeanelessa@gmail.com', 'ananerianlv@gmail.com', 'deividylan@gmail.com', 'haniellessa@hotmail.com']);
  const dominiosFicticios = /(@(exemplo\.com|nao-autorizado\.com|lessacare\.com|cuidadora\.com|example\.com)|^seu@email\.com)$/i; // seu@email.com: placeholder do Login
  const problemas = [];
  for (const f of arquivos) {
    const txt = fs.readFileSync(path.join(CLONE, f), 'utf8');
    for (const m of txt.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
      let payload = {};
      try { payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { /* ignora */ }
      if (!(payload.role === 'anon' && payload.iss === 'supabase-demo')) problemas.push(`${f}: JWT que não é a chave anon de demonstração do Supabase local`);
    }
    if (/service_role\s*[:=]\s*['"]eyJ/.test(txt) || /sb_secret_[A-Za-z0-9]/.test(txt)) problemas.push(`${f}: possível chave de serviço`);
    for (const m of txt.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi)) {
      const e = m[0].toLowerCase();
      if (!familia.has(e) && !dominiosFicticios.test(e) && !/@(types|supabase|vitejs|testing-library)\//.test(e)) problemas.push(`${f}: e-mail ${e}`);
    }
  }
  const png = git(['ls-files', '*.png', '*.jpg', '*.jpeg']).stdout.split('\n').filter((f) => f && !/^(public|src\/assets)\//.test(f));
  if (png.length) problemas.push(`imagens fora de public/ e src/assets/: ${png.join(', ')}`);
  registrar(3, 'segredos-e-dados-pessoais', { comando: 'varredura de JWT, chaves de serviço, e-mails e imagens nos arquivos rastreados', codigo: problemas.length === 0 ? 0 : 1, saida: problemas.join('\n') || `${arquivos.length} arquivos verificados; nenhum problema`, detalhe: problemas.length ? `${problemas.length} problema(s)` : `${arquivos.length} arquivos` });
}

// 04-06. Dependências, lint, testes unitários nos 3 fusos
executar(4, 'npm-ci', npx.replace('npx', 'npm'), ['ci', '--no-audit', '--no-fund']);
if (!passos.find((p) => p.numero === 4)?.ok) { console.error('npm ci falhou; abortando.'); process.exit(1); }
executar(5, 'lint', npx, ['oxlint']);
executar(6, 'testes-3-fusos', process.execPath, ['scripts/estoque/test-tz.mjs'], { detalhe: (r) => (/Tests\s+(\d+) passed/.exec(r.stdout || '') ? `${/Tests\s+(\d+) passed/.exec(r.stdout)[1]} testes por fuso (UTC, America/Sao_Paulo, Asia/Tokyo)` : '') });

// 07. Testes de banco contra o Supabase local (bootstrap + migration do CLONE)
{
  const bootstrap = psqlArquivo(path.join(CLONE, 'scripts', 'estoque', 'local-bootstrap.sql'));
  const rollback = psqlArquivo(path.join(CLONE, 'docs', 'implementacao', 'sql', 'estoque_e1_rollback.sql'));
  const migration = psqlArquivo(path.join(CLONE, 'supabase', 'migrations', fs.readdirSync(path.join(CLONE, 'supabase', 'migrations')).find((f) => f.endsWith('_estoque_e1.sql'))));
  if (bootstrap.codigo !== 0 || rollback.codigo !== 0 || migration.codigo !== 0) {
    registrar(7, 'testes-banco', { comando: 'preparo do banco local', codigo: 1, saida: `${bootstrap.erro}\n${rollback.erro}\n${migration.erro}` });
  } else {
    executar(7, 'testes-banco', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/estoque/db'], { env: { ESTOQUE_DB_TEST: '1' }, detalhe: (r) => (/Tests\s+(\d+) passed/.exec(r.stdout || '') ? `${/Tests\s+(\d+) passed/.exec(r.stdout)[1]} testes de banco (RLS, autoria, só-inserção, compras, estrutura)` : '') });
  }
}

function psqlArquivo(arquivo) {
  const r = spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: fs.readFileSync(arquivo, 'utf8'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { codigo: r.status, saida: r.stdout, erro: r.stderr };
}

// 08. Idempotência da migration e rollback (contagem de objetos + hash da estrutura)
{
  const migArq = path.join(CLONE, 'supabase', 'migrations', fs.readdirSync(path.join(CLONE, 'supabase', 'migrations')).find((f) => f.endsWith('_estoque_e1.sql')));
  const rbArq = path.join(CLONE, 'docs', 'implementacao', 'sql', 'estoque_e1_rollback.sql');
  const log = [];
  const passo = (rotulo, r) => { log.push(`${rotulo}: codigo ${r.codigo}${r.erro ? ` (${r.erro.slice(0, 200)})` : ''}`); return r.codigo === 0; };
  let ok = true;
  ok = passo('rollback inicial', psqlArquivo(rbArq)) && ok;
  const zeroAntes = contagemObjetos();
  log.push(`objetos estoque_* após rollback inicial: ${JSON.stringify(zeroAntes)}`);
  ok = passo('1a aplicação da migration', psqlArquivo(migArq)) && ok;
  const aposPrimeira = contagemObjetos();
  const hash1 = assinaturaEstrutura();
  ok = passo('2a aplicação (idempotência)', psqlArquivo(migArq)) && ok;
  const aposSegunda = contagemObjetos();
  const hash2 = assinaturaEstrutura();
  log.push(`objetos após 1a aplicação: ${JSON.stringify(aposPrimeira)}`, `objetos após 2a aplicação: ${JSON.stringify(aposSegunda)}`, `hash da estrutura 1a: ${hash1}`, `hash da estrutura 2a: ${hash2}`);
  const idempotente = JSON.stringify(aposPrimeira) === JSON.stringify(aposSegunda) && hash1 === hash2;
  ok = passo('rollback', psqlArquivo(rbArq)) && ok;
  const aposRollback = contagemObjetos();
  const rollbackLimpo = Object.values(aposRollback).every((v) => v === '0');
  log.push(`objetos estoque_* após rollback: ${JSON.stringify(aposRollback)} (esperado: tudo 0)`);
  const preexistentes = psql("select string_agg(tablename, ',' order by tablename) from pg_tables where schemaname='public' and tablename not like 'estoque\\_%'").saida;
  log.push(`tabelas preexistentes intactas após o rollback: ${preexistentes}`);
  ok = passo('restauração da migration', psqlArquivo(migArq)) && ok;
  const restaurado = contagemObjetos();
  const hash3 = assinaturaEstrutura();
  log.push(`objetos após restauração: ${JSON.stringify(restaurado)}`, `hash da estrutura restaurada: ${hash3}`);
  const volta = JSON.stringify(restaurado) === JSON.stringify(aposPrimeira) && hash3 === hash1;
  const preservou = ['caregivers', 'daily_log_receipts', 'daily_logs', 'medications', 'shifts'].every((t) => preexistentes.split(',').includes(t));
  registrar(8, 'migration-idempotencia-rollback', {
    comando: 'rollback -> migration -> migration -> rollback -> migration (contagem de objetos e hash da estrutura)',
    codigo: ok && idempotente && rollbackLimpo && volta && preservou ? 0 : 1,
    saida: log.join('\n') + `\n\nidempotente=${idempotente} rollbackLimpo=${rollbackLimpo} restauracaoIgual=${volta} tabelasPreexistentesIntactas=${preservou}`,
    detalhe: `idempotente=${idempotente}, rollback remove tudo=${rollbackLimpo}, restauração idêntica=${volta}`
  });
}

// 09. Smoke real (navegador + Supabase local) e medições em 360 px
executar(9, 'smoke-navegador', process.execPath, ['scripts/estoque/smoke-e1.mjs'], {
  env: { ESTOQUE_SMOKE_JSON: path.join(SAIDA, 'smoke-e1.json'), ESTOQUE_SMOKE_OUT: path.join(TMP, 'telas') },
  detalhe: (r) => (/Resultado: (\d+)\/(\d+) passos OK/.exec(r.stdout || '') || [])[0] || ''
});

// 10. Prova de mutação (no clone limpo; restaura cada arquivo e confere git status limpo)
executar(10, 'mutacoes', process.execPath, ['scripts/estoque/mutacoes-e1.1.mjs'], {
  env: { ESTOQUE_MUT_OUT: SAIDA },
  detalhe: (r) => (/(\d+)\/(\d+) mutações mortas/.exec(r.stdout || '') || [])[0] || ''
});

// 11. Build de produção com Node 22 e tamanho dos chunks (antes/depois)
{
  const tamanhos = (dir) => fs.readdirSync(path.join(dir, 'dist', 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => ({ arquivo: f, bytes: fs.statSync(path.join(dir, 'dist', 'assets', f)).size })).sort((a, b) => b.bytes - a.bytes);
  const depois = executar(11, 'build-node22-depois', npx, ['-y', 'node@22', 'node_modules/vite/bin/vite.js', 'build'], { detalhe: () => '' });
  // Baseline: origin/main pura em worktree temporário (node_modules por junção; removida antes de apagar).
  const base = path.join(TMP, 'base-main');
  git(['worktree', 'add', '--detach', base, 'origin/main']);
  const ligacao = path.join(base, 'node_modules');
  let antes = null;
  let saidaBase = '';
  try {
    fs.symlinkSync(path.join(CLONE, 'node_modules'), ligacao, 'junction');
    const b = spawnSync(npx, ['-y', 'node@22', 'node_modules/vite/bin/vite.js', 'build'], { cwd: base, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
    saidaBase = `${b.stdout}\n${b.stderr}`;
    if (b.status === 0) antes = tamanhos(base);
  } finally {
    try { fs.rmdirSync(ligacao); } catch { /* ok */ }
    if (!fs.existsSync(ligacao)) git(['worktree', 'remove', '--force', base]);
  }
  const depoisT = depois.status === 0 ? tamanhos(CLONE) : [];
  const principal = (lista) => (lista || []).find((t) => /^index-.*\.js$/.test(t.arquivo));
  const chunkEstoque = depoisT.find((t) => /^EstoqueTab-.*\.js$/.test(t.arquivo));
  const kB = (n) => (n / 1000).toFixed(2);
  const linhas = [
    `chunk principal ANTES (origin/main): ${antes ? `${principal(antes)?.arquivo} ${kB(principal(antes)?.bytes)} kB` : 'build do baseline falhou'}`,
    `chunk principal DEPOIS (E1.1):       ${principal(depoisT) ? `${principal(depoisT).arquivo} ${kB(principal(depoisT).bytes)} kB` : '-'}`,
    `diferença no chunk principal: ${antes && principal(depoisT) ? `${((principal(depoisT).bytes - principal(antes).bytes) / 1000).toFixed(2)} kB` : '-'}`,
    `chunk do módulo Estoque (carregado sob demanda): ${chunkEstoque ? `${chunkEstoque.arquivo} ${kB(chunkEstoque.bytes)} kB` : 'NÃO ENCONTRADO'}`,
    '', 'todos os chunks (depois):', ...depoisT.map((t) => `  ${t.arquivo}  ${kB(t.bytes)} kB`)
  ];
  const ok = depois.status === 0 && !!antes && !!chunkEstoque;
  registrar(12, 'chunks-antes-depois', { comando: 'build Node 22 de origin/main e do commit testado; comparação de tamanhos', codigo: ok ? 0 : 1, saida: linhas.join('\n') + `\n\n--- build do baseline ---\n${saidaBase}`, detalhe: linhas.slice(0, 3).join(' | ') });
  fs.writeFileSync(path.join(SAIDA, 'chunks.json'), JSON.stringify({ antes, depois: depoisT }, null, 2));
}

// 13. SHA-256 de todos os artefatos + conferência dos hashes
{
  const dist = path.join(CLONE, 'dist', 'assets');
  const copiaDist = path.join(SAIDA, 'dist-hashes.txt');
  fs.writeFileSync(copiaDist, fs.readdirSync(dist).sort().map((f) => `${sha256(path.join(dist, f))}  dist/assets/${f}`).join('\n') + '\n');
  const alvos = fs.readdirSync(SAIDA).filter((f) => f !== 'SHA256SUMS.txt').sort();
  const linhas = alvos.map((f) => `${sha256(path.join(SAIDA, f))}  ${f}`);
  fs.writeFileSync(path.join(SAIDA, 'SHA256SUMS.txt'), linhas.join('\n') + '\n');
  const confere = linhas.every((l) => { const [h, f] = l.split(/\s+/); return sha256(path.join(SAIDA, f)) === h; });
  const resumo = passos.map((p) => `| ${String(p.numero).padStart(2, '0')} | ${p.nome} | ${p.ok ? 'OK (0)' : `FALHA (${p.codigo})`} | ${p.detalhe.replace(/\|/g, '/')} |`);
  const md = ['# Evidência E1.1', '', `Gerada em ${new Date().toISOString()} a partir de um clone limpo (${git(['rev-parse', '--short', 'HEAD']).stdout.trim()}).`, '', '| # | Passo | Resultado | Resumo |', '|---|---|---|---|', ...resumo, `| 13 | hashes-sha256 | ${confere ? 'OK (0)' : 'FALHA'} | ${alvos.length} arquivos conferidos em SHA256SUMS.txt |`, ''].join('\n');
  fs.writeFileSync(path.join(SAIDA, 'EVIDENCIA.md'), md);
  // Hash do próprio EVIDENCIA.md entra depois da escrita
  const todos = fs.readdirSync(SAIDA).filter((f) => f !== 'SHA256SUMS.txt').sort();
  fs.writeFileSync(path.join(SAIDA, 'SHA256SUMS.txt'), todos.map((f) => `${sha256(path.join(SAIDA, f))}  ${f}`).join('\n') + '\n');
  passos.push({ numero: 13, nome: 'hashes-sha256', ok: confere });
  if (!confere) falhou = true;
  console.log(`${confere ? '[OK]  ' : '[FALHA]'} 13 hashes-sha256 — ${todos.length} arquivos`);
}

// Limpeza do clone temporário
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ok */ }
console.log(falhou ? '\nEVIDÊNCIA COM FALHAS' : '\nEVIDÊNCIA COMPLETA: todos os passos com saída 0');
process.exit(falhou ? 1 : 0);
