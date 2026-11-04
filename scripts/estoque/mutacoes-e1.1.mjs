// Prova de mutação do Estoque (E1 + E1.1).
// Para cada mutação: aplica a alteração proposital, roda o ARQUIVO DE TESTE INTEIRO, registra quais testes
// caíram, restaura o arquivo original e confere que `git status` termina limpo.
// Mutações de banco: rollback + migration mutada no Supabase LOCAL; ao final, rollback + migration original.
//
// Uso (na raiz de um clone limpo, com tudo commitado):  node scripts/estoque/mutacoes-e1.1.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTAINER = process.env.ESTOQUE_DB_CONTAINER || 'supabase_db_estoque-local-db';
const SAIDA = process.env.ESTOQUE_MUT_OUT || path.join(RAIZ, 'docs', 'implementacao', 'evidencias', 'E1.1');
const VITEST = path.join(RAIZ, 'node_modules', 'vitest', 'vitest.mjs');

const MIGRATION = 'supabase/migrations/' + fs.readdirSync(path.join(RAIZ, 'supabase', 'migrations')).find((f) => f.endsWith('_estoque_e1.sql'));
const ROLLBACK = 'docs/implementacao/sql/estoque_e1_rollback.sql';
const SALDO = 'src/features/estoque/domain/saldo.js';
const SERVICO = 'src/features/estoque/data/estoqueService.js';
const BADGE = 'src/features/estoque/EstoqueNavBadge.jsx';
const APP = 'src/App.jsx';
const DB_TESTES = ['tests/estoque/db/estoque.db.test.js', 'tests/estoque/db/estoque.db.estrutura.test.js'];

// ---------------------------------------------------------------------------------------------
// Definição das mutações. `trocas`: lista de [buscar, trocar]; `todas`: troca todas as ocorrências.
// ---------------------------------------------------------------------------------------------
const MUTACOES = [
  // --- As 12 da seção 4.3 do lote ---
  { id: 'M1', grupo: 'especificação', titulo: '<= vira < no limiar crítico', arquivo: SALDO,
    trocas: [['} else if (diasRestantes <= diasCritico) {', '} else if (diasRestantes < diasCritico) {']], testes: ['tests/estoque/unit/limiares.test.js'] },
  { id: 'M2', grupo: 'especificação', titulo: 'movimentos estornados continuam contando', arquivo: SALDO,
    trocas: [["prodMovs.filter(m => m.tipo !== 'estorno' && !idsEstornados.has(m.id))", "prodMovs.filter(m => m.tipo !== 'estorno')"]], testes: ['tests/estoque/unit/saldo.test.js'] },
  { id: 'M3', grupo: 'especificação', titulo: 'ignora a antecedência da receita', arquivo: SALDO,
    trocas: [["const antecedencia = produto.requer_receita ? (Number(produto.antecedencia_receita_dias) >= 0 ? Number(produto.antecedencia_receita_dias) : 7) : 0;", 'const antecedencia = 0;']],
    testes: ['tests/estoque/unit/limiares.test.js'] },
  { id: 'M4', grupo: 'especificação', titulo: 'usa a conferência mais ANTIGA como âncora', arquivo: SALDO,
    trocas: [['if (timeA !== timeB) return timeB - timeA;', 'if (timeA !== timeB) return timeA - timeB;']], testes: ['tests/estoque/unit/saldo.test.js'] },
  { id: 'M5', grupo: 'especificação', titulo: 'remove a elevação por sinalização pendente', arquivo: SALDO,
    trocas: [["if (situacao === 'ok') {\n      situacao = 'atencao';\n      situacaoLabel = 'Ficar de olho (sinalizado)';", "if (false) {\n      situacao = 'atencao';\n      situacaoLabel = 'Ficar de olho (sinalizado)';"]],
    testes: ['tests/estoque/unit/sinalizacao.test.js'] },
  { id: 'M6', grupo: 'especificação', titulo: 'dias decorridos pela data LOCAL (getDate) em vez de milissegundos', arquivo: SALDO,
    trocas: [['const diasDecorridos = Math.max(0, (agoraMs - ancoraOcorridoMs) / 86400000);', 'const diasDecorridos = Math.max(0, new Date(agoraMs).getDate() - new Date(ancoraOcorridoMs).getDate());']],
    testes: ['tests/estoque/unit/saldo.test.js'] },
  { id: 'M7', grupo: 'especificação', titulo: 'policy de SELECT com USING (true)', arquivo: MIGRATION, db: true,
    trocas: [['FOR SELECT\nTO authenticated\nUSING (public.estoque_usuario_autorizado());\n\nDROP POLICY IF EXISTS "estoque_produtos_insert_policy"', 'FOR SELECT\nTO authenticated\nUSING (true);\n\nDROP POLICY IF EXISTS "estoque_produtos_insert_policy"']],
    testes: DB_TESTES },
  { id: 'M8', grupo: 'especificação', titulo: 'remove a autoria forçada nos movimentos', arquivo: MIGRATION, db: true,
    trocas: [["    NEW.registrado_por := auth.uid();\n    NEW.registrado_por_email := lower(auth.jwt()->>'email');\n    NEW.registrado_em := now();", '    NEW.registrado_em := now();']],
    testes: DB_TESTES },
  { id: 'M9', grupo: 'especificação', titulo: 'GRANT UPDATE e DELETE em estoque_movimentos', arquivo: MIGRATION, db: true,
    trocas: [['GRANT SELECT, INSERT ON TABLE public.estoque_movimentos TO authenticated;', 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estoque_movimentos TO authenticated;']],
    testes: DB_TESTES },
  { id: 'M9b', grupo: 'especificação', titulo: 'remove o TRIGGER de só-inserção dos movimentos (camada independente do grant)', arquivo: MIGRATION, db: true,
    trocas: [['CREATE TRIGGER trg_estoque_movimentos_bloquear_upd_del\nBEFORE UPDATE OR DELETE ON public.estoque_movimentos\nFOR EACH ROW EXECUTE FUNCTION public.estoque_trg_bloquear_update_delete();', '-- trigger removido (mutação)']],
    testes: DB_TESTES },
  { id: 'M10', grupo: 'especificação', titulo: 'remove o índice único de compra assumida', arquivo: MIGRATION, db: true,
    trocas: [["CREATE UNIQUE INDEX IF NOT EXISTS estoque_compras_assumida_unica_idx\nON public.estoque_compras (produto_id)\nWHERE status = 'assumida';", '-- índice removido (mutação)']],
    testes: DB_TESTES },
  { id: 'M11', grupo: 'especificação', titulo: 'lê o texto de `dose` como quantidade', arquivo: SALDO,
    trocas: [['consumoDiario: existingMeds.length * qtdPorAdmin,', 'consumoDiario: existingMeds.reduce((t, m) => t + (parseFloat(m.dose) || 1), 0) * qtdPorAdmin,']],
    testes: ['tests/estoque/unit/agenda.test.js'] },
  { id: 'M12', grupo: 'especificação', titulo: 'mostra dias restantes em produto sem conferência (⚪)', arquivo: SALDO,
    trocas: [['      diasRestantes: null,\n      previsaoTermino: null,', '      diasRestantes: 30,\n      previsaoTermino: null,']],
    testes: ['tests/estoque/unit/semConferencia.test.js'] },

  // --- Uma por item corrigido na vistoria ---
  { id: 'B1', grupo: 'vistoria', titulo: 'canal Realtime com nome fixo (selo e aba colidem)', arquivo: SERVICO,
    trocas: [['.channel(`estoque_rt_${novoIdCanal()}`)', ".channel('estoque_rt')"]], testes: ['tests/estoque/unit/realtimeCanais.test.js'] },
  { id: 'B2', grupo: 'vistoria', titulo: 'remove a barreira de erro dos dois React.lazy no App', arquivo: APP,
    trocas: [['<EstoqueLazyBoundary modo="aba">', '<>'], ['<EstoqueLazyBoundary modo="selo">', '<>'], ['</EstoqueLazyBoundary>', '</>']], todas: true,
    testes: ['tests/estoque/components/AppIsolamento.test.jsx'] },
  { id: 'B3', grupo: 'vistoria', titulo: 'busca só a primeira página (trunca em 1000 linhas)', arquivo: SERVICO, db: false, bancoParaTeste: true,
    trocas: [['linhas.push(...data);', 'linhas.push(...data);\n    return { data: linhas, error: null };']], testes: ['tests/estoque/db/estoque.db.test.js'] },
  { id: 'A1', grupo: 'vistoria', titulo: 'concluir compra SEM as duas defesas (FOR UPDATE e checagem do UPDATE): o defeito original, entrada em dobro', arquivo: MIGRATION, db: true,
    trocas: [['WHERE c.id = p_compra\n    FOR UPDATE OF c;', 'WHERE c.id = p_compra;'],
      ["    IF NOT FOUND THEN\n        RAISE EXCEPTION 'A compra % mudou de situacao durante a operacao', p_compra;\n    END IF;\n\n    RETURN v_movimento_id;", '    RETURN v_movimento_id;']],
    testes: ['tests/estoque/db/estoque.db.test.js'] },
  { id: 'A1a', grupo: 'vistoria', titulo: 'concluir compra sem o FOR UPDATE (a checagem do UPDATE ainda protege; só o teste estrutural vê)', arquivo: MIGRATION, db: true,
    trocas: [['WHERE c.id = p_compra\n    FOR UPDATE OF c;', 'WHERE c.id = p_compra;']], testes: DB_TESTES },
  { id: 'A1b', grupo: 'vistoria', titulo: 'concluir compra sem a checagem do UPDATE (o FOR UPDATE ainda protege; só o teste estrutural vê)', arquivo: MIGRATION, db: true,
    trocas: [["    IF NOT FOUND THEN\n        RAISE EXCEPTION 'A compra % mudou de situacao durante a operacao', p_compra;\n    END IF;\n\n    RETURN v_movimento_id;", '    RETURN v_movimento_id;']], testes: DB_TESTES },
  { id: 'A2', grupo: 'vistoria', titulo: 'selo calcula sem a agenda de remédios', arquivo: BADGE,
    trocas: [['dados.sinalizacoes, medications, new Date()', 'dados.sinalizacoes, [], new Date()']], testes: ['tests/estoque/components/EstoqueNavBadgeAgenda.test.jsx'] },
  { id: 'A3', grupo: 'vistoria', titulo: 'vínculo parcial reduz o consumo pelos horários que sobraram', arquivo: SALDO,
    trocas: [['    // Usa o consumo manual, se houver; senão, fica sem estimativa (⚪) com o motivo.\n    if (consumoManual > 0) {',
      "    if (existingMeds.length > 0) {\n      return { consumoDiario: existingMeds.length * qtdPorAdmin, vinculoOrigem: 'x', vinculoMudou: true, vinculoQuebradoSemManual: false };\n    }\n    if (consumoManual > 0) {"]],
    testes: ['tests/estoque/unit/agenda.test.js'] },
  { id: 'A4', grupo: 'vistoria', titulo: '"Acabou" volta a usar o ícone ⚪', arquivo: SALDO,
    trocas: [["situacaoIcon = '⚫';", "situacaoIcon = '⚪';"]], todas: true, testes: ['tests/estoque/unit/limiares.test.js'] },
  { id: 'A4b', grupo: 'vistoria', titulo: '"Acabou" volta a usar o ícone ⚪ (cabeçalho e WhatsApp)', arquivo: 'src/features/estoque/domain/whatsapp.js',
    trocas: [['⚫ Acabou', '⚪ Acabou']], testes: ['tests/estoque/components/EstoqueHeaderIcones.test.jsx'] },
  { id: 'M1v', grupo: 'vistoria', titulo: 'aviso em produto sem conferência é ignorado', arquivo: SALDO,
    trocas: [["situacao: avisoSemConferencia ? 'atencao' : 'sem_conferencia',", "situacao: 'sem_conferencia',"]], testes: ['tests/estoque/unit/sinalizacaoSemConferencia.test.js'] },
  { id: 'M2v', grupo: 'vistoria', titulo: 'validade da receita no fim do dia UTC (21h de Brasília)', arquivo: SALDO,
    trocas: [['T23:59:59.999-03:00', 'T23:59:59.999Z']], testes: ['tests/estoque/unit/receitaFuso.test.js'] },
  { id: 'M3v', grupo: 'vistoria', titulo: 'arquivado_em volta a vir do cliente', arquivo: MIGRATION, db: true,
    trocas: [['NEW.arquivado_em := now();', '']], todas: true, testes: ['tests/estoque/db/estoque.db.test.js'] },
  { id: 'H1', grupo: 'vistoria', titulo: 'authenticated mantém TRUNCATE/TRIGGER/REFERENCES nos movimentos', arquivo: MIGRATION, db: true,
    trocas: [['REVOKE ALL ON TABLE public.estoque_movimentos FROM authenticated;\n', '']], testes: ['tests/estoque/db/estoque.db.estrutura.test.js'] },
  { id: 'H2', grupo: 'vistoria', titulo: 'anon/PUBLIC voltam a executar a RPC de compra', arquivo: MIGRATION, db: true,
    trocas: [['REVOKE ALL ON FUNCTION public.estoque_assumir_compra(uuid) FROM PUBLIC, anon;\n', '']], testes: ['tests/estoque/db/estoque.db.estrutura.test.js'] }
];

// ---------------------------------------------------------------------------------------------
function sh(cmd, args, opcoes = {}) {
  return spawnSync(cmd, args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opcoes });
}

function psqlArquivo(rel) {
  const sql = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const r = sh('docker', ['exec', '-i', CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: sql });
  if (r.status !== 0) throw new Error(`psql falhou em ${rel}: ${(r.stderr || '').slice(0, 300)}`);
}

function bancoLimpoComMigration(conteudoMigration) {
  psqlArquivo(ROLLBACK);
  const tmp = path.join(os.tmpdir(), `mut-mig-${Date.now()}.sql`);
  fs.writeFileSync(tmp, conteudoMigration);
  const r = sh('docker', ['exec', '-i', CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: conteudoMigration });
  fs.rmSync(tmp, { force: true });
  if (r.status !== 0) throw new Error(`migration mutada não aplicou: ${(r.stderr || '').slice(0, 300)}`);
}

function rodarTestes(testes, comBanco) {
  const json = path.join(os.tmpdir(), `vitest-mut-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const env = { ...process.env };
  if (comBanco) env.ESTOQUE_DB_TEST = '1'; else delete env.ESTOQUE_DB_TEST;
  const r = sh(process.execPath, [VITEST, 'run', ...testes, '--reporter=json', `--outputFile=${json}`], { env });
  let falhas = [];
  let total = 0;
  try {
    const dados = JSON.parse(fs.readFileSync(json, 'utf8'));
    total = dados.numTotalTests;
    for (const arq of dados.testResults) {
      if (arq.status === 'failed' && arq.assertionResults.length === 0) falhas.push(`(erro ao carregar ${path.basename(arq.name)})`);
      for (const t of arq.assertionResults) if (t.status === 'failed') falhas.push(t.fullName || t.title);
    }
  } catch { /* sem json: usa o código de saída */ }
  fs.rmSync(json, { force: true });
  return { status: r.status, falhas, total };
}

function adaptarEol(texto, eol) {
  return eol === '\r\n' ? texto.replace(/\r?\n/g, '\r\n') : texto;
}

function aplicar(conteudo, trocas, todas) {
  const eol = conteudo.includes('\r\n') ? '\r\n' : '\n';
  let saida = conteudo;
  for (const [buscar, trocar] of trocas) {
    const b = adaptarEol(buscar, eol);
    const t = adaptarEol(trocar, eol);
    const ocorrencias = saida.split(b).length - 1;
    if (ocorrencias === 0) throw new Error(`trecho não encontrado: ${buscar.slice(0, 80)}`);
    if (!todas && ocorrencias > 1) throw new Error(`trecho ambíguo (${ocorrencias}x): ${buscar.slice(0, 80)}`);
    saida = saida.split(b).join(t);
  }
  return saida;
}

function statusLimpo() {
  return sh('git', ['status', '--porcelain']).stdout.trim() === '';
}

// ---------------------------------------------------------------------------------------------
const resultados = [];
const inicio = Date.now();

if (!statusLimpo()) {
  console.error('A árvore de trabalho precisa estar limpa (commit antes de mutar).');
  process.exit(2);
}
const commit = sh('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();
console.log(`Prova de mutação — commit ${commit}`);

const migrationOriginal = fs.readFileSync(path.join(RAIZ, MIGRATION), 'utf8');

// Linha de base: os arquivos de teste precisam estar verdes SEM mutação.
const grupos = new Map();
for (const m of MUTACOES) {
  const comBanco = !!(m.db || m.bancoParaTeste);
  const chave = `${comBanco}|${m.testes.join(',')}`;
  if (!grupos.has(chave)) grupos.set(chave, { testes: m.testes, comBanco });
}
bancoLimpoComMigration(migrationOriginal);
let baseOk = true;
for (const g of grupos.values()) {
  const r = rodarTestes(g.testes, g.comBanco);
  const ok = r.status === 0;
  if (!ok) baseOk = false;
  console.log(`[linha de base] ${ok ? 'OK ' : 'FALHOU'} ${g.testes.join(' ')} (${r.total} testes)`);
}
if (!baseOk) {
  console.error('Linha de base vermelha: nenhuma mutação foi executada.');
  process.exit(2);
}

for (const m of MUTACOES) {
  const caminho = path.join(RAIZ, m.arquivo);
  const original = fs.readFileSync(caminho, 'utf8');
  const comBanco = !!(m.db || m.bancoParaTeste);
  let registro = { id: m.id, grupo: m.grupo, titulo: m.titulo, arquivo: m.arquivo, testes: m.testes };
  try {
    const mutado = aplicar(original, m.trocas, m.todas);
    fs.writeFileSync(caminho, mutado);
    if (m.db) bancoLimpoComMigration(m.arquivo === MIGRATION ? mutado : migrationOriginal);
    const r = rodarTestes(m.testes, comBanco);
    const derrubou = r.status !== 0 && r.falhas.length > 0;
    registro = { ...registro, resultado: derrubou ? 'MORTA' : 'SOBREVIVEU', testesQueCaíram: r.falhas.slice(0, 4), totalQueCaíram: r.falhas.length, totalTestes: r.total };
  } catch (e) {
    registro = { ...registro, resultado: 'ERRO', erro: String(e.message).slice(0, 300) };
  } finally {
    fs.writeFileSync(caminho, original); // restaura o arquivo exatamente como estava
    if (m.db) bancoLimpoComMigration(migrationOriginal);
  }
  resultados.push(registro);
  console.log(`[${registro.resultado.padEnd(10)}] ${m.id.padEnd(4)} ${m.titulo}${registro.totalQueCaíram ? ` -> ${registro.totalQueCaíram} teste(s) caíram` : ''}${registro.erro ? ` (${registro.erro})` : ''}`);
}

bancoLimpoComMigration(migrationOriginal);
const limpo = statusLimpo();
const mortas = resultados.filter((r) => r.resultado === 'MORTA').length;
const resumo = { commit, geradoEm: new Date().toISOString(), duracaoSegundos: Math.round((Date.now() - inicio) / 1000), total: resultados.length, mortas, sobreviventes: resultados.filter((r) => r.resultado === 'SOBREVIVEU').map((r) => r.id), erros: resultados.filter((r) => r.resultado === 'ERRO').map((r) => r.id), arvoreLimpaAoFinal: limpo };

fs.mkdirSync(SAIDA, { recursive: true });
fs.writeFileSync(path.join(SAIDA, 'mutacoes.json'), JSON.stringify({ resumo, resultados }, null, 2));
const linhas = ['| # | Grupo | Mutação | Arquivo | Resultado | Teste(s) que caíram |', '|---|---|---|---|---|---|'];
for (const r of resultados) {
  linhas.push(`| ${r.id} | ${r.grupo} | ${r.titulo} | \`${r.arquivo}\` | ${r.resultado} | ${(r.testesQueCaíram || []).map((t) => t.replace(/\|/g, '/')).slice(0, 2).join('<br>') || (r.erro || '-')} |`);
}
fs.writeFileSync(path.join(SAIDA, 'mutacoes.md'), `# Prova de mutação (commit ${commit})\n\n${mortas} de ${resultados.length} mutações derrubaram a suíte. Árvore limpa ao final: ${limpo ? 'sim' : 'NÃO'}.\n\n${linhas.join('\n')}\n`);

console.log(`\n${mortas}/${resultados.length} mutações mortas. Sobreviventes: ${resumo.sobreviventes.join(', ') || 'nenhum'}. Erros: ${resumo.erros.join(', ') || 'nenhum'}. Árvore limpa: ${limpo}`);
process.exit(mortas === resultados.length && limpo ? 0 : 1);
