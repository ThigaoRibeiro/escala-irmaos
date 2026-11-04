// Apoio dos testes de banco do Estoque. Rodam SOMENTE contra o Supabase local (Docker).
// As chaves abaixo são os valores de demonstração publicados pela Supabase para o ambiente
// local (`supabase start`). Elas NÃO funcionam em nenhum projeto remoto.
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

export const DB_TEST_ATIVO = process.env.ESTOQUE_DB_TEST === '1';

export const SUPABASE_URL = process.env.ESTOQUE_DB_URL || 'http://127.0.0.1:54321';
const JWT_SECRET = process.env.ESTOQUE_DB_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
export const ANON_KEY = process.env.ESTOQUE_DB_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const DB_CONTAINER = process.env.ESTOQUE_DB_CONTAINER || 'supabase_db_estoque-local-db';

// Trava de segurança: nunca rodar fora do ambiente local.
const host = new URL(SUPABASE_URL).hostname;
if (DB_TEST_ATIVO && !['127.0.0.1', 'localhost'].includes(host)) {
  throw new Error(`ESTOQUE_DB_TEST só pode rodar contra o Supabase local (recebido: ${host}).`);
}

function base64Url(data) {
  return Buffer.from(data).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function gerarJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const corpo = {
    iss: 'supabase-demo',
    aud: 'authenticated',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600 * 24,
    ...payload
  };
  const h = base64Url(JSON.stringify(header));
  const p = base64Url(JSON.stringify(corpo));
  const assinatura = base64Url(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${assinatura}`;
}

// Ids/e-mails iguais aos criados por scripts/estoque/local-bootstrap.sql
export const USUARIOS = {
  irmao: { id: '11111111-1111-1111-1111-111111111111', email: 'thiagor21@gmail.com' },
  cuidadoraAtiva: { id: '22222222-2222-2222-2222-222222222222', email: 'cuidadora.ativa@exemplo.com' },
  cuidadoraInativa: { id: '33333333-3333-3333-3333-333333333333', email: 'cuidadora.inativa@exemplo.com' },
  estranho: { id: '44444444-4444-4444-4444-444444444444', email: 'estranho.cadastrado@exemplo.com' }
};

const OPCOES = { auth: { persistSession: false, autoRefreshToken: false } };

export function clientePara(chave) {
  if (chave === 'anon') return createClient(SUPABASE_URL, ANON_KEY, OPCOES);
  const u = USUARIOS[chave];
  const token = gerarJwt({ sub: u.id, email: u.email });
  return createClient(SUPABASE_URL, ANON_KEY, { ...OPCOES, global: { headers: { Authorization: `Bearer ${token}` } } });
}

// SQL direto como dono do banco (container do Supabase local). Só para testes de estrutura.
export function psql(sql) {
  const r = spawnSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-t', '-A'], {
    input: sql,
    encoding: 'utf8'
  });
  return { ok: r.status === 0, saida: (r.stdout || '').trim(), erro: (r.stderr || '').trim() };
}

export function nomeUnico(prefixo) {
  return `${prefixo} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function criarProdutoTaxa(cliente, sobrescrever = {}) {
  const { data, error } = await cliente
    .from('estoque_produtos')
    .insert({
      nome: nomeUnico('Produto teste'),
      categoria: 'higiene',
      unidade_base: 'unidade',
      embalagem_nome: 'pacote',
      embalagem_quantidade: 10,
      modo_consumo: 'taxa',
      consumo_diario_base: 1,
      ...sobrescrever
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar produto de teste: ${error.message}`);
  return data;
}
