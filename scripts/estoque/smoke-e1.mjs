// Smoke test REAL do Estoque (E1.1): navegador de verdade + Supabase local (Docker).
//
// - Build de produção do app apontando para o Supabase LOCAL (saída em pasta temporária, fora do repo).
// - Fase A (com a migration): login com irmão e cuidadora ativa (Supabase Auth real), abre todas as abas
//   sem erro, e exercita o fluxo completo do Estoque, inclusive atualização em tempo real entre dois usuários.
// - Fase B: MEDE em 360x800, nos temas claro e escuro: rolagem horizontal, rótulos da navegação (3 e 4
//   itens) e tamanho dos alvos de toque do Estoque.
// - Fase C (sem a migration): o app não pode quebrar; a aba mostra "Estoque ainda não configurado".
//
// Nunca clica em "Sair". Capturas de tela ficam FORA do repositório (o repo é público).
// Uso: ESTOQUE_DB_TEST=1 node scripts/estoque/smoke-e1.mjs   (Docker + Supabase local rodando)
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPABASE_URL, ANON_KEY, DB_CONTAINER, USUARIOS, gerarJwt } from '../../tests/estoque/db/helpers.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = Number(process.env.ESTOQUE_SMOKE_PORT || 4199);
const BASE = `http://127.0.0.1:${PORTA}/`;
const SENHA = 'senha-local-smoke-1'; // só existe no Supabase local
const SAIDA_TELAS = process.env.ESTOQUE_SMOKE_OUT || path.join(os.tmpdir(), 'estoque-smoke');
const SAIDA_JSON = process.env.ESTOQUE_SMOKE_JSON || path.join(REPO, 'docs', 'implementacao', 'evidencias', 'E1.1', 'smoke-e1.json');
const SUFIXO = Date.now().toString(36);

const resultado = {
  geradoEm: new Date().toISOString(),
  node: process.version,
  navegador: null,
  viewport: '360x800 fixo (DPR 2, toque)',
  passos: [],
  medicoes: [],
  telas: []
};
let falhas = 0;

function registrar(nome, ok, detalhe = '') {
  resultado.passos.push({ nome, ok, detalhe });
  if (!ok) falhas++;
  console.log(`${ok ? '[OK]  ' : '[FALHA]'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

async function passo(nome, fn) {
  try {
    const detalhe = await fn();
    registrar(nome, true, typeof detalhe === 'string' ? detalhe : '');
  } catch (e) {
    registrar(nome, false, String(e?.message || e).split('\n')[0].slice(0, 400));
  }
}

// ---------- banco local (psql dentro do container) ----------
function psql(sql) {
  const r = spawnSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-t', '-A'], {
    input: sql, encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error(`psql falhou: ${(r.stderr || '').slice(0, 300)}`);
  return r.stdout.trim();
}
const lerArquivo = (...partes) => fs.readFileSync(path.join(REPO, ...partes), 'utf8');
const migrationSql = () => {
  const arq = fs.readdirSync(path.join(REPO, 'supabase', 'migrations')).find((f) => f.endsWith('_estoque_e1.sql'));
  return lerArquivo('supabase', 'migrations', arq);
};
const rollbackSql = () => lerArquivo('docs', 'implementacao', 'sql', 'estoque_e1_rollback.sql');

async function definirSenha(id) {
  const servico = gerarJwt({ role: 'service_role' });
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: { apikey: servico, Authorization: `Bearer ${servico}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: SENHA, email_confirm: true })
  });
  if (!r.ok) throw new Error(`Não foi possível definir a senha de teste (${r.status})`);
}

// ---------- build + servidor ----------
function construirApp() {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'estoque-e2e-dist-'));
  const vite = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js');
  const r = spawnSync(process.execPath, [vite, 'build', '--outDir', dist, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: REPO,
    env: { ...process.env, VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: ANON_KEY },
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error(`build falhou: ${(r.stderr || r.stdout).slice(0, 400)}`);
  return dist;
}

async function iniciarServidor(dist) {
  const vite = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js');
  const proc = spawn(process.execPath, [vite, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(PORTA), '--strictPort'], {
    cwd: REPO, stdio: 'ignore'
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return proc;
    } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error('servidor de preview não subiu');
}

// ---------- navegador ----------
const ERROS_ACEITOS_FASE_C = [/Failed to load resource.*(404|400)/i];
const ehRuidoDeFonte = (msg) => /fonts\.(googleapis|gstatic)\.com/i.test(msg.location()?.url || '');

async function novaPagina(browser, esquema) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    // Sem isMobile: o Chrome mobile encolhe a página para caber o conteúdo mais largo e esconde a
    // rolagem horizontal. Aqui o viewport fica fixo em 360 px e a rolagem aparece de verdade.
    isMobile: false,
    hasTouch: true,
    colorScheme: esquema,
    serviceWorkers: 'block',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo'
  });
  const page = await ctx.newPage();
  page.errosConsole = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !ehRuidoDeFonte(m)) page.errosConsole.push(m.text());
  });
  page.on('pageerror', (e) => page.errosConsole.push(`pageerror: ${e.message}`));
  return page;
}

async function entrar(page, email, base = BASE) {
  await page.goto(base);
  await page.getByPlaceholder('usuario ou email').fill(email);
  await page.locator('input[type="password"]').first().fill(SENHA);
  await page.locator('button[type="submit"]').click();
  await page.locator('.bottom-nav').waitFor({ timeout: 30000 });
}

const abrirAba = (page, nome) => page.locator('.bottom-nav .nav-item', { hasText: nome }).click();

async function esperarEstoque(page) {
  await page.locator('[data-testid="estoque-tab-container"], [data-testid="estoque-tabelas-ausentes"]').first().waitFor({ timeout: 20000 });
}

async function garantirSemTelaDeErro(page, rotulo) {
  for (const texto of ['Ocorreu um erro ao carregar o módulo de estoque', 'Não foi possível abrir o Estoque', 'Banco indisponível']) {
    if (await page.getByText(texto).count()) throw new Error(`${rotulo}: apareceu "${texto}"`);
  }
}

async function capturar(page, nome) {
  fs.mkdirSync(SAIDA_TELAS, { recursive: true });
  const arq = path.join(SAIDA_TELAS, `${nome}.png`);
  await page.screenshot({ path: arq });
  const sha = crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex');
  resultado.telas.push({ nome, arquivo: arq, sha256: sha });
}

// ---------- medições (executam dentro da página) ----------
function medirNoNavegador() {
  const de = document.documentElement;
  const larguraTexto = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width;
  };
  const nav = [...document.querySelectorAll('.bottom-nav .nav-item')].map((item) => {
    const rotulo = item.querySelector(':scope > span');
    const ri = item.getBoundingClientRect();
    const rr = rotulo.getBoundingClientRect();
    const linha = parseFloat(getComputedStyle(rotulo).lineHeight);
    return {
      texto: rotulo.textContent.trim(),
      larguraItem: +ri.width.toFixed(1),
      larguraTexto: +larguraTexto(rotulo).toFixed(1),
      cortado: larguraTexto(rotulo) > ri.width + 0.5 || rr.left < ri.left - 0.5 || rr.right > ri.right + 0.5,
      alturaItem: +ri.height.toFixed(1),
      quebrouLinha: Number.isFinite(linha) ? rr.height > linha * 1.6 : null
    };
  });
  // Elementos visíveis que passam da borda direita da janela (para atribuir a causa de uma rolagem).
  const limite = de.clientWidth + 0.5;
  const passam = [...document.querySelectorAll('body *')]
    .filter((el) => !el.closest('.bottom-nav'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ el, r }) => r.width > 0 && r.height > 0 && r.right > limite && getComputedStyle(el).position !== 'fixed')
    .filter(({ el }) => {
      // Contido numa área com rolagem/corte própria (ex.: fileira de categorias): não gera rolagem da página.
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (['auto', 'scroll', 'hidden'].includes(ox) && a.getBoundingClientRect().right <= limite) return false;
      }
      return true;
    })
    .sort((a, b) => b.r.right - a.r.right)
    .slice(0, 4)
    .map(({ el, r }) => ({ tag: el.tagName.toLowerCase(), classe: String(el.className || '').split(' ').slice(0, 2).join(' '), direita: +r.right.toFixed(1), noConteudo: !!el.closest('main, .est-modal-overlay') }));
  return {
    rolagemHorizontalPx: de.scrollWidth - de.clientWidth,
    larguraDocumento: de.scrollWidth,
    larguraJanela: de.clientWidth,
    elementosQuePassamDaBorda: passam,
    nav
  };
}

function medirAlvosNoNavegador(seletorRaiz) {
  const raiz = document.querySelector(seletorRaiz) || document.body;
  const itens = [...raiz.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]')];
  const visiveis = itens.filter((el) => {
    const r = el.getBoundingClientRect();
    const estilo = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none';
  });
  const pequenos = visiveis
    .map((el) => {
      const alvo = ['checkbox', 'radio'].includes(el.type) && el.closest('label') ? el.closest('label') : el;
      const r = alvo.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        classe: (el.className && String(el.className).split(' ').slice(0, 2).join(' ')) || '',
        texto: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
        largura: +r.width.toFixed(1),
        altura: +r.height.toFixed(1)
      };
    })
    .filter((x) => x.largura < 44 || x.altura < 44);
  return { total: visiveis.length, abaixoDe44: pequenos.length, itens: pequenos.slice(0, 25) };
}

async function medirTela(page, papel, esquema, tela, seletorAlvos) {
  const base = await page.evaluate(medirNoNavegador);
  const alvos = seletorAlvos ? await page.evaluate(medirAlvosNoNavegador, seletorAlvos) : null;
  resultado.medicoes.push({ papel, esquema, tela, ...base, alvos });
  return base;
}


// Baseline: a mesma medição na origin/main PURA (sem nenhum código do estoque), num worktree temporário.
// node_modules é compartilhado por junção; a junção é removida (rmdir, nunca recursivo) antes de apagar o worktree.
async function medirBaselineMain(browser) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'estoque-baseline-'));
  const wt = path.join(raiz, 'main');
  const git = (args) => spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  const add = git(['worktree', 'add', '--detach', wt, 'origin/main']);
  if (add.status !== 0) throw new Error(`git worktree falhou: ${add.stderr.slice(0, 200)}`);
  const ligacao = path.join(wt, 'node_modules');
  let servidorBase = null;
  let dist = null;
  let junctionRemovida = false;
  try {
    fs.symlinkSync(path.join(REPO, 'node_modules'), ligacao, 'junction');
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'estoque-baseline-dist-'));
    const vite = path.join(ligacao, 'vite', 'bin', 'vite.js');
    const b = spawnSync(process.execPath, [vite, 'build', '--outDir', dist, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: wt, env: { ...process.env, VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: ANON_KEY }, encoding: 'utf8'
    });
    if (b.status !== 0) throw new Error(`build da main falhou: ${(b.stderr || b.stdout).slice(0, 300)}`);
    const porta = PORTA + 1;
    servidorBase = spawn(process.execPath, [vite, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(porta), '--strictPort'], { cwd: wt, stdio: 'ignore' });
    const base = `http://127.0.0.1:${porta}/`;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(base)).ok) break; } catch { /* subindo */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    const page = await novaPagina(browser, 'light');
    await entrar(page, USUARIOS.irmao.email, base);
    await abrirAba(page, 'Escalas');
    await page.waitForTimeout(500);
    const m = await page.evaluate(medirNoNavegador);
    await page.context().close();
    return { commit: git(['rev-parse', '--short', 'origin/main']).stdout.trim(), rolagemHorizontalPx: m.rolagemHorizontalPx, elementos: m.elementosQuePassamDaBorda.slice(0, 2) };
  } finally {
    servidorBase?.kill();
    try { fs.rmdirSync(ligacao); junctionRemovida = true; } catch { /* já removida */ }
    if (junctionRemovida || !fs.existsSync(ligacao)) {
      git(['worktree', 'remove', '--force', wt]);
      fs.rmSync(raiz, { recursive: true, force: true });
    }
    if (dist) fs.rmSync(dist, { recursive: true, force: true });
    if (!fs.existsSync(path.join(REPO, 'node_modules', 'vite'))) throw new Error('ATENÇÃO: node_modules do repositório sumiu');
  }
}

// =====================================================================================
async function main() {
  // Pré-condições
  const rest = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } }).catch(() => null);
  if (!rest || !rest.ok) throw new Error('Supabase local indisponível. Suba o Docker e o Supabase local antes (scripts/estoque/db-local.ps1).');

  // Bootstrap local idempotente (tabelas do app, policies equivalentes às de produção, usuários de teste).
  psql(lerArquivo('scripts', 'estoque', 'local-bootstrap.sql'));
  // Estado limpo do estoque: rollback + migration (só objetos estoque_*, no banco LOCAL).
  psql(rollbackSql());
  psql(migrationSql());
  // Os usuários do bootstrap local entram direto em auth.users com colunas de token NULL, que o GoTrue
  // não consegue ler ("converting NULL to string"). Normaliza só essas duas contas de teste locais.
  psql(`update auth.users set
      confirmation_token = coalesce(confirmation_token, ''), recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''), email_change_token_new = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''), phone_change = coalesce(phone_change, ''),
      phone_change_token = coalesce(phone_change_token, ''), reauthentication_token = coalesce(reauthentication_token, '')
    where id in ('${USUARIOS.irmao.id}', '${USUARIOS.cuidadoraAtiva.id}')`);
  await definirSenha(USUARIOS.irmao.id);
  await definirSenha(USUARIOS.cuidadoraAtiva.id);

  const dist = construirApp();
  const servidor = await iniciarServidor(dist);
  const browser = await chromium.launch({ channel: process.env.ESTOQUE_SMOKE_CANAL || 'chrome', headless: true });
  resultado.navegador = browser.version();

  try {
    // ---------------------------- FASE A: com a migration ----------------------------
    console.log('\n=== FASE A: com a migration aplicada ===');
    const nome = `Fralda Smoke ${SUFIXO}`;
    const admin = await novaPagina(browser, 'light');
    const cuid = await novaPagina(browser, 'light');

    await passo('A1. Irmão entra (Supabase Auth real) e o app carrega', async () => { await entrar(admin, USUARIOS.irmao.email); });
    await passo('A2. Cuidadora entra (Supabase Auth real) e o app carrega', async () => { await entrar(cuid, USUARIOS.cuidadoraAtiva.email); });

    await passo('A3. Irmão: Escalas, Diário, Configurações e Estoque abrem sem tela de erro', async () => {
      for (const aba of ['Escalas', 'Diário', 'Configurações', 'Estoque']) {
        await abrirAba(admin, aba);
        if (aba === 'Estoque') await esperarEstoque(admin); else await admin.waitForTimeout(400);
        await garantirSemTelaDeErro(admin, aba);
      }
    });
    await passo('A4. Cuidadora: Escalas, Diário e Estoque abrem; Configurações não aparece', async () => {
      for (const aba of ['Escalas', 'Diário', 'Estoque']) {
        await abrirAba(cuid, aba);
        if (aba === 'Estoque') await esperarEstoque(cuid); else await cuid.waitForTimeout(400);
        await garantirSemTelaDeErro(cuid, aba);
      }
      if (await cuid.locator('.bottom-nav .nav-item', { hasText: 'Configurações' }).count()) throw new Error('cuidadora vê Configurações');
    });

    await abrirAba(admin, 'Estoque');
    await esperarEstoque(admin);
    const card = admin.locator('[data-testid^="estoque-card-"]', { hasText: nome });

    await passo('A5. Cadastrar produto pela tela (fralda, pacote de 20, 6 por dia)', async () => {
      await admin.getByRole('button', { name: /Novo/ }).first().click();
      const modal = admin.locator('.est-modal-overlay');
      await modal.getByPlaceholder('Ex: Fralda Geriátrica G, Shampoo Johnson').fill(nome);
      await modal.getByPlaceholder('Ex: fralda, comprimido, ml').fill('fralda');
      await modal.getByPlaceholder('Ex: pacote, caixa, frasco').fill('pacote');
      await modal.locator('.est-form-group', { hasText: 'Qtd por emb' }).locator('input').first().fill('20');
      await modal.getByPlaceholder('Ex: 6 fraldas por dia').fill('6');
      await modal.getByRole('button', { name: /Salvar produto/ }).click();
      await card.waitFor({ timeout: 15000 });
    });

    await passo('A6. Produto novo fica ⚪ sem projeção e pede a primeira conferência', async () => {
      const texto = await card.innerText();
      if (!texto.includes('Fazer primeira conferência')) throw new Error('sem o botão de primeira conferência');
      if (/acaba por volta|dias\)/.test(texto)) throw new Error('mostrou projeção antes da conferência');
    });

    await passo('A7. Primeira conferência: 3 pacotes = 60 fraldas, com previsão de término', async () => {
      await card.getByRole('button', { name: /Fazer primeira conferência/ }).click();
      const modal = admin.locator('.est-modal-overlay');
      await modal.locator('input[type="number"]').first().fill('3');
      await modal.getByRole('button', { name: /Confirmar conferência/ }).click();
      await card.getByText(/acaba por volta de/).waitFor({ timeout: 15000 });
    });

    await passo('A8. "Está acabando" registra o aviso com o nome de quem avisou', async () => {
      admin.once('dialog', (d) => d.accept('restam poucos'));
      await card.getByRole('button', { name: /Está acabando/ }).click();
      await card.getByText(/Avisado por/).waitFor({ timeout: 15000 });
    });

    await passo('A9. "Eu compro" marca o comprador no card', async () => {
      await card.getByRole('button', { name: /Eu compro/ }).click();
      await card.getByText(/vai comprar/).waitFor({ timeout: 15000 });
    });

    const cardCuid = cuid.locator('[data-testid^="estoque-card-"]', { hasText: nome });
    await passo('A10. TEMPO REAL: a cuidadora vê a compra assumida sem recarregar a página', async () => {
      await cardCuid.getByText(/vai comprar/).waitFor({ timeout: 20000 });
    });

    await passo('A11. Cuidadora conclui a compra (1 pacote = 20 fraldas)', async () => {
      await cardCuid.getByRole('button', { name: /Concluir compra/ }).click();
      const modal = cuid.locator('.est-modal-overlay');
      await modal.locator('input[type="number"]').first().fill('1');
      await modal.getByRole('button', { name: /Confirmar entrada/ }).click();
      await cardCuid.getByText(/vai comprar/).waitFor({ state: 'detached', timeout: 15000 });
    });

    await passo('A12. TEMPO REAL: o irmão vê a compra concluída sem recarregar', async () => {
      await card.getByText(/vai comprar/).waitFor({ state: 'detached', timeout: 20000 });
    });

    await passo('A13. Banco: entrada de 20 gravada com a autoria da cuidadora (vinda do login, não do cliente)', async () => {
      const linha = psql(`select count(*)||'|'||coalesce(sum(m.quantidade_base),0)||'|'||bool_and(m.registrado_por_email='${USUARIOS.cuidadoraAtiva.email}') from estoque_movimentos m join estoque_produtos p on p.id=m.produto_id where p.nome='${nome}' and m.tipo='entrada'`);
      if (linha !== '1|20|true') throw new Error(`esperado 1|20|true, obtido ${linha}`);
    });

    await passo('A14. Histórico + estorno: corrigir a entrada exige motivo e gera um estorno', async () => {
      await card.getByRole('button', { name: /Histórico/ }).click();
      const modal = admin.locator('.est-modal-overlay');
      const item = modal.locator('.est-history-item', { hasText: 'Entrada' }).first();
      await item.getByRole('button', { name: /Corrigir/ }).click();
      await modal.getByPlaceholder('Ex: digitação errada da quantidade').fill('Compra lançada em duplicidade');
      await modal.getByRole('button', { name: /Confirmar estorno/ }).click();
      await modal.locator('.est-history-item', { hasText: 'Estornado' }).first().waitFor({ timeout: 15000 });
      await modal.locator('[aria-label="Fechar"]').first().click();
      const n = psql(`select count(*) from estoque_movimentos m join estoque_produtos p on p.id=m.produto_id where p.nome='${nome}' and m.tipo='estorno'`);
      if (n !== '1') throw new Error(`estornos no banco: ${n}`);
    });

    // Itens que disparam o selo: um acabou (⚫) e um remédio vinculado à agenda em situação crítica (🔴).
    psql(`
      with p1 as (insert into estoque_produtos (nome,categoria,unidade_base,embalagem_nome,embalagem_quantidade,modo_consumo,estoque_minimo_base,estoque_atencao_base)
        values ('Luvas Smoke ${SUFIXO}','higiene','par','caixa',50,'minimo',5,10) returning id)
      insert into estoque_movimentos (produto_id,tipo,quantidade_base) select id,'conferencia',0 from p1;
      with p2 as (insert into estoque_produtos (nome,categoria,unidade_base,embalagem_nome,embalagem_quantidade,modo_consumo,medicamento_ids,quantidade_por_administracao)
        values ('Memantina Smoke ${SUFIXO}','medicamentos','comprimido','caixa',30,'taxa',array['med-1','med-2'],1) returning id)
      insert into estoque_movimentos (produto_id,tipo,quantidade_base) select id,'conferencia',8 from p2;
    `);

    await passo('A15. Selo da navegação = ⚫ acabou + 🔴 comprar do cabeçalho (inclui remédio ligado à agenda)', async () => {
      await admin.reload();
      await admin.locator('.bottom-nav').waitFor();
      const selo = await admin.locator('.est-nav-badge').first().innerText({ timeout: 20000 });
      await abrirAba(admin, 'Estoque');
      await esperarEstoque(admin);
      const num = async (rotulo) => Number(await admin.locator('.est-summary-chip', { hasText: rotulo }).locator('.est-summary-icon-count span').nth(1).innerText());
      const soma = (await num('Acabou')) + (await num('Comprar'));
      if (Number(selo) !== soma || soma !== 2) throw new Error(`selo=${selo} cabeçalho(⚫+🔴)=${soma}; esperado 2 e 2`);
      return `selo=${selo}, cabeçalho=${soma}`;
    });

    await passo('A16. WhatsApp: "Copiar mensagem" e "Abrir no WhatsApp" com mensagem pronta, sem envio automático', async () => {
      await admin.getByRole('button', { name: /WhatsApp/ }).first().click();
      const modal = admin.locator('.est-modal-overlay');
      await modal.getByRole('button', { name: /Copiar mensagem/ }).waitFor();
      const link = modal.getByRole('link', { name: /Abrir no WhatsApp/ });
      const href = await link.getAttribute('href');
      if (!href?.startsWith('https://wa.me/?text=')) throw new Error(`href inesperado: ${href}`);
      const texto = await modal.locator('textarea').inputValue();
      if (!texto.includes('Estoque da mãe') || !texto.includes('⚫ Acabou') || !texto.includes('🔴 Comprar agora')) throw new Error('mensagem sem as seções esperadas');
      if (!(await modal.innerText()).includes('Não existe envio automático')) throw new Error('falta o aviso de que não há envio automático');
      await capturar(admin, 'A16-whatsapp-claro');
      await modal.locator('[aria-label="Fechar"]').first().click();
    });

    await passo('A17. Nenhum erro de console/página nas duas sessões (Realtime do selo + aba convivem)', async () => {
      const erros = [...admin.errosConsole, ...cuid.errosConsole];
      if (erros.length) throw new Error(`${erros.length} erro(s): ${erros.slice(0, 3).join(' | ')}`);
    });

    await admin.context().close();
    await cuid.context().close();

    // ---------------------------- FASE B: medições em 360 px ----------------------------
    console.log('\n=== FASE B: medições em 360x800 (claro e escuro) ===');
    for (const papel of ['irmao', 'cuidadora']) {
      for (const esquema of ['light', 'dark']) {
        const email = papel === 'irmao' ? USUARIOS.irmao.email : USUARIOS.cuidadoraAtiva.email;
        const page = await novaPagina(browser, esquema);
        await passo(`B. Medir ${papel} / ${esquema}`, async () => {
          await entrar(page, email);
          const abas = papel === 'irmao' ? ['Escalas', 'Diário', 'Configurações', 'Estoque'] : ['Escalas', 'Diário', 'Estoque'];
          const resumo = [];
          for (const aba of abas) {
            await abrirAba(page, aba);
            if (aba === 'Estoque') { await esperarEstoque(page); await page.locator('[data-testid^="estoque-card-"]').first().waitFor({ timeout: 15000 }); }
            await page.waitForTimeout(500);
            const m = await medirTela(page, papel, esquema, aba, aba === 'Estoque' ? '.est-container' : null);
            resumo.push(`${aba}:${m.rolagemHorizontalPx}px`);
            if (aba === 'Estoque') await capturar(page, `B-estoque-${papel}-${esquema}`);
          }
          // Todos os modais do Estoque (abre, mede, fecha)
          const primeiroCard = page.locator('[data-testid^="estoque-card-"]').first();
          const modais = [
            ['Novo produto', () => page.getByRole('button', { name: /Novo/ }).first()],
            ['Sugeridos', () => page.getByRole('button', { name: /Sugeridos/ }).first()],
            ['WhatsApp', () => page.getByRole('button', { name: /WhatsApp/ }).first()],
            ['Conferência', () => primeiroCard.getByRole('button', { name: /Conferir/ }).first()],
            ['Compra', () => primeiroCard.getByRole('button', { name: /Comprei|Concluir compra/ }).first()],
            ['Saída', () => primeiroCard.getByRole('button', { name: /Saída/ }).first()],
            ['Histórico', () => primeiroCard.getByRole('button', { name: /Histórico/ }).first()],
            ['Editar produto', () => primeiroCard.getByRole('button', { name: /Editar/ }).first()]
          ];
          for (const [rotuloModal, abrir] of modais) {
            await abrir().click();
            await page.locator('.est-modal-overlay').waitFor({ timeout: 10000 });
            await medirTela(page, papel, esquema, `Estoque: modal ${rotuloModal}`, '.est-modal-overlay');
            await page.locator('.est-modal-overlay [aria-label="Fechar"]').first().click();
            await page.locator('.est-modal-overlay').waitFor({ state: 'detached', timeout: 10000 });
          }
          if (page.errosConsole.length) throw new Error(`erros de console: ${page.errosConsole[0]}`);
          return resumo.join(' ');
        });
        await page.context().close();
      }
    }

    // ---------------------------- FASE C: sem a migration ----------------------------
    console.log('\n=== FASE C: SEM a migration (tabelas do estoque ausentes) ===');
    psql(rollbackSql());
    for (const papel of ['irmao', 'cuidadora']) {
      const email = papel === 'irmao' ? USUARIOS.irmao.email : USUARIOS.cuidadoraAtiva.email;
      const page = await novaPagina(browser, 'light');
      await passo(`C. ${papel}: sem a migration, nada quebra e o Estoque avisa que não está configurado`, async () => {
        await entrar(page, email);
        const abas = papel === 'irmao' ? ['Escalas', 'Diário', 'Configurações'] : ['Escalas', 'Diário'];
        for (const aba of abas) {
          await abrirAba(page, aba);
          await page.waitForTimeout(400);
          await garantirSemTelaDeErro(page, aba);
        }
        await abrirAba(page, 'Estoque');
        await esperarEstoque(page);
        await page.getByText('Estoque ainda não configurado').waitFor({ timeout: 10000 });
        if (await page.locator('.est-nav-badge').count()) throw new Error('selo apareceu sem tabelas');
        await garantirSemTelaDeErro(page, 'Estoque');
        // Voltar às outras abas depois de abrir o Estoque
        await abrirAba(page, 'Escalas');
        await garantirSemTelaDeErro(page, 'Escalas (depois do Estoque)');
        const inesperados = page.errosConsole.filter((t) => !ERROS_ACEITOS_FASE_C.some((re) => re.test(t)));
        if (inesperados.length) throw new Error(`erros inesperados: ${inesperados[0]}`);
        await capturar(page, `C-sem-migration-${papel}`);
        return `${page.errosConsole.length} mensagem(ns) 404 esperada(s) do navegador`;
      });
      await page.context().close();
    }

    // ---------------------------- FASE D: baseline na origin/main ----------------------------
    console.log('\n=== FASE D: baseline (origin/main pura, sem código do estoque) ===');
    await passo('D. Medir a rolagem horizontal do SUPERADMIN na origin/main (Escalas, 360 px)', async () => {
      resultado.baselineMain = await medirBaselineMain(browser);
      return `origin/main ${resultado.baselineMain.commit}: ${resultado.baselineMain.rolagemHorizontalPx}px`;
    });
  } finally {
    psql(migrationSql()); // deixa o banco local migrado
    await browser.close();
    servidor.kill();
    fs.rmSync(dist, { recursive: true, force: true });
  }

  // ---------- veredito das medições ----------
  const estoque = resultado.medicoes.filter((m) => m.tela === 'Estoque');
  const comRolagem = resultado.medicoes.filter((m) => m.rolagemHorizontalPx > 0);
  const navCortada = resultado.medicoes.flatMap((m) => m.nav.filter((n) => n.cortado || n.quebrouLinha));
  const rolagemNoConteudo = comRolagem.filter((m) => m.elementosQuePassamDaBorda.some((e) => e.noConteudo));
  registrar('B-resumo. Nenhum elemento do CONTEÚDO (abas e modais) passa da borda em 360 px',
    rolagemNoConteudo.length === 0,
    rolagemNoConteudo.length ? rolagemNoConteudo.map((m) => `${m.papel}/${m.esquema}/${m.tela}`).join('; ') : `${resultado.medicoes.length} medições`);
  const soNavbar = comRolagem.filter((m) => !rolagemNoConteudo.includes(m));
  resultado.rolagemFora = {
    telasMedidas: resultado.medicoes.length,
    telasComRolagemHorizontal: comRolagem.length,
    telasSomenteComElementoDoTopo: soNavbar.length,
    papeis: [...new Set(comRolagem.map((m) => m.papel))]
  };
  const escalasIrmao = resultado.medicoes.find((m) => m.papel === 'irmao' && m.esquema === 'light' && m.tela === 'Escalas');
  const preExistente = comRolagem.length > 0 && soNavbar.length === comRolagem.length &&
    comRolagem.every((m) => m.papel === 'irmao') &&
    resultado.baselineMain && resultado.baselineMain.rolagemHorizontalPx === escalasIrmao?.rolagemHorizontalPx;
  registrar('B-resumo. Rolagem horizontal da página causada pelo estoque = 0',
    comRolagem.length === 0 || preExistente,
    comRolagem.length === 0
      ? `${resultado.medicoes.length} medições sem rolagem`
      : preExistente
        ? `AVISO pré-existente: ${comRolagem.length} de ${resultado.medicoes.length} medições (só o papel "irmao"/SUPERADMIN, TODAS as abas) têm ${escalasIrmao.rolagemHorizontalPx}px de rolagem, idêntica na origin/main ${resultado.baselineMain.commit} (${resultado.baselineMain.rolagemHorizontalPx}px). Elemento fora do conteúdo: ${JSON.stringify(comRolagem[0].elementosQuePassamDaBorda[0])}`
        : `${comRolagem.length} medições com rolagem sem explicação pelo baseline: ${JSON.stringify(comRolagem[0].elementosQuePassamDaBorda[0])}`);
  registrar('B-resumo. Rótulos da navegação (3 e 4 itens) sem corte nem quebra de linha', navCortada.length === 0,
    navCortada.length ? JSON.stringify(navCortada.slice(0, 3)) : `${resultado.medicoes.length} medições`);
  const abaixo44 = resultado.medicoes.filter((m) => m.alvos && m.alvos.abaixoDe44 > 0);
  registrar('B-resumo. Alvos de toque do Estoque >= 44 px', abaixo44.length === 0,
    abaixo44.length ? abaixo44.map((m) => `${m.papel}/${m.esquema}/${m.tela}: ${m.alvos.abaixoDe44} de ${m.alvos.total}`).join('; ') : `${estoque.length} telas`);
}

try {
  await main();
} catch (e) {
  registrar('Execução do smoke', false, String(e?.message || e).slice(0, 500));
}

resultado.resumo = { passos: resultado.passos.length, falhas };
fs.mkdirSync(path.dirname(SAIDA_JSON), { recursive: true });
fs.writeFileSync(SAIDA_JSON, JSON.stringify(resultado, null, 2));
console.log(`\nResultado: ${resultado.passos.length - falhas}/${resultado.passos.length} passos OK. Medições em ${path.relative(REPO, SAIDA_JSON)}`);
process.exit(falhas > 0 ? 1 : 0);
