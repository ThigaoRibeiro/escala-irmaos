// @vitest-environment node
// Testes de banco do Estoque contra o Supabase LOCAL (Docker). Rodam com ESTOQUE_DB_TEST=1.
import { describe, it, expect, beforeAll } from 'vitest';
import { DB_TEST_ATIVO, clientePara, criarProdutoTaxa, nomeUnico } from './helpers.js';
import { buscarDadosEstoque } from '../../../src/features/estoque/data/estoqueService.js';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

const suite = DB_TEST_ATIVO ? describe : describe.skip;

suite('Estoque (banco local): acesso, autoria, só-inserção e compras', () => {
  let irmao, cuidadoraAtiva, cuidadoraInativa, estranho, anon;
  let produto;
  let movimentoEntrada;

  beforeAll(async () => {
    irmao = clientePara('irmao');
    cuidadoraAtiva = clientePara('cuidadoraAtiva');
    cuidadoraInativa = clientePara('cuidadoraInativa');
    estranho = clientePara('estranho');
    anon = clientePara('anon');
    produto = await criarProdutoTaxa(irmao, { nome: nomeUnico('Fralda G'), consumo_diario_base: 4 });
  });

  describe('1. Quem tem acesso lê e escreve', () => {
    it('irmão lê o produto criado', async () => {
      const { data, error } = await irmao.from('estoque_produtos').select('*').eq('id', produto.id);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('cuidadora ativa lê o produto', async () => {
      const { data, error } = await cuidadoraAtiva.from('estoque_produtos').select('*').eq('id', produto.id);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('cuidadora ativa registra conferência', async () => {
      const { data, error } = await cuidadoraAtiva
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'conferencia', quantidade_base: 50 })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.id).toBeTruthy();
    });

    it('irmão registra sinalização "está acabando"', async () => {
      const { data, error } = await irmao
        .from('estoque_sinalizacoes')
        .insert({ produto_id: produto.id, observacao: 'Está acabando rápido' })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.id).toBeTruthy();
    });
  });

  describe('2. Cuidadora inativa, estranho (signUp) e anon: zero linhas e erro em escrita', () => {
    const quem = [
      ['cuidadora inativa', () => cuidadoraInativa],
      ['estranho', () => estranho],
      ['anon', () => anon]
    ];

    for (const [rotulo, obter] of quem) {
      it(`${rotulo} recebe zero linhas em todas as tabelas do estoque`, async () => {
        for (const tabela of ['estoque_produtos', 'estoque_movimentos', 'estoque_sinalizacoes', 'estoque_compras', 'estoque_auditoria']) {
          const { data } = await obter().from(tabela).select('*');
          expect(data === null || data.length === 0, `${rotulo} leu ${tabela}`).toBe(true);
        }
      });

      it(`${rotulo} é bloqueado ao inserir movimento, sinalização e produto`, async () => {
        const mov = await obter().from('estoque_movimentos').insert({ produto_id: produto.id, tipo: 'conferencia', quantidade_base: 10 });
        expect(mov.error).not.toBeNull();
        const sin = await obter().from('estoque_sinalizacoes').insert({ produto_id: produto.id });
        expect(sin.error).not.toBeNull();
        const prod = await obter().from('estoque_produtos').insert({
          nome: nomeUnico('Invasor'), categoria: 'higiene', unidade_base: 'u', embalagem_nome: 'u',
          embalagem_quantidade: 1, modo_consumo: 'taxa', consumo_diario_base: 1
        });
        expect(prod.error).not.toBeNull();
      });

      it(`${rotulo} é bloqueado nas RPCs de compra`, async () => {
        const r = await obter().rpc('estoque_assumir_compra', { p_produto: produto.id });
        expect(r.error).not.toBeNull();
      });
    }
  });

  describe('3. Autoria vem do banco (dados forjados pelo cliente são ignorados)', () => {
    const falsoUid = '99999999-9999-9999-9999-999999999999';
    const falsoEmail = 'hacker@nao-autorizado.com';

    it('produto: criado_por e e-mail forçados para o usuário real', async () => {
      const { data, error } = await irmao
        .from('estoque_produtos')
        .insert({
          nome: nomeUnico('Produto autoria'), categoria: 'higiene', unidade_base: 'frasco', embalagem_nome: 'unidade',
          embalagem_quantidade: 1, modo_consumo: 'taxa', consumo_diario_base: 1,
          criado_por: falsoUid, criado_por_email: falsoEmail
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.criado_por).toBe('11111111-1111-1111-1111-111111111111');
      expect(data.criado_por_email).toBe('thiagor21@gmail.com');
    });

    it('movimento: registrado_por e e-mail forçados para o usuário real', async () => {
      const { data, error } = await irmao
        .from('estoque_movimentos')
        .insert({
          produto_id: produto.id, tipo: 'entrada', motivo: 'doacao', quantidade_base: 15,
          registrado_por: falsoUid, registrado_por_email: falsoEmail
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.registrado_por).toBe('11111111-1111-1111-1111-111111111111');
      expect(data.registrado_por_email).toBe('thiagor21@gmail.com');
      movimentoEntrada = data;
    });

    it('sinalização: autoria forçada', async () => {
      const { data, error } = await cuidadoraAtiva
        .from('estoque_sinalizacoes')
        .insert({ produto_id: produto.id, criado_por: falsoUid, criado_por_email: falsoEmail })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.criado_por_email).toBe('cuidadora.ativa@exemplo.com');
    });
  });

  describe('4. Nada é apagado nem editado', () => {
    it('DELETE em produto é rejeitado', async () => {
      const { error } = await irmao.from('estoque_produtos').delete().eq('id', produto.id);
      expect(error).not.toBeNull();
    });

    it('UPDATE em movimento é rejeitado', async () => {
      const { error } = await irmao.from('estoque_movimentos').update({ quantidade_base: 999 }).eq('id', movimentoEntrada.id);
      expect(error).not.toBeNull();
    });

    it('DELETE em movimento é rejeitado', async () => {
      const { error } = await irmao.from('estoque_movimentos').delete().eq('id', movimentoEntrada.id);
      expect(error).not.toBeNull();
    });

    it('INSERT/UPDATE/DELETE direto em compras e auditoria são rejeitados', async () => {
      const ins = await irmao.from('estoque_compras').insert({ produto_id: produto.id, status: 'assumida' });
      expect(ins.error).not.toBeNull();
      const aud = await irmao.from('estoque_auditoria').insert({ produto_id: produto.id, operacao: 'INSERT' });
      expect(aud.error).not.toBeNull();
    });
  });

  describe('5. Regras dos movimentos', () => {
    let estorno;

    it('estorno válido funciona', async () => {
      const { data, error } = await irmao
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'estorno', estorna_movimento_id: movimentoEntrada.id, motivo: 'Digitado errado' })
        .select()
        .single();
      expect(error).toBeNull();
      estorno = data;
    });

    it('estorno duplo do mesmo movimento é rejeitado', async () => {
      const { error } = await irmao
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'estorno', estorna_movimento_id: movimentoEntrada.id, motivo: 'De novo' });
      expect(error).not.toBeNull();
    });

    it('estorno de estorno é rejeitado', async () => {
      const { error } = await irmao
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'estorno', estorna_movimento_id: estorno.id, motivo: 'Estornando o estorno' });
      expect(error).not.toBeNull();
    });

    it('data anterior a 30 dias é rejeitada', async () => {
      const antiga = new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString();
      const { error } = await irmao
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'conferencia', quantidade_base: 10, ocorrido_em: antiga });
      expect(error).not.toBeNull();
    });

    it('saída com motivo "uso" em produto modo taxa é rejeitada', async () => {
      const { error } = await irmao
        .from('estoque_movimentos')
        .insert({ produto_id: produto.id, tipo: 'saida', motivo: 'uso', quantidade_base: 2 });
      expect(error).not.toBeNull();
    });

    it('saída "uso" em modo mínimo é aceita; produto arquivado não recebe movimento', async () => {
      const minimo = await criarProdutoTaxa(irmao, {
        nome: nomeUnico('Curativo'), categoria: 'curativos', modo_consumo: 'minimo',
        consumo_diario_base: null, estoque_minimo_base: 5, estoque_atencao_base: 10
      });
      const saida = await irmao.from('estoque_movimentos').insert({ produto_id: minimo.id, tipo: 'saida', motivo: 'uso', quantidade_base: 1 });
      expect(saida.error).toBeNull();

      const arq = await irmao.from('estoque_produtos').update({ arquivado_em: new Date().toISOString() }).eq('id', minimo.id);
      expect(arq.error).toBeNull();

      const mov = await irmao.from('estoque_movimentos').insert({ produto_id: minimo.id, tipo: 'conferencia', quantidade_base: 20 });
      expect(mov.error).not.toBeNull();

      const { data: auditoria } = await irmao.from('estoque_auditoria').select('*').eq('produto_id', minimo.id).order('em', { ascending: true });
      expect(auditoria.length).toBeGreaterThanOrEqual(2);
      const upd = auditoria.find((l) => l.operacao === 'UPDATE');
      expect(upd.antes).toBeTruthy();
      expect(upd.depois.arquivado_em).toBeTruthy();
    });
  });

  describe('6. "Eu compro" (RPCs)', () => {
    it('duas pessoas assumindo ao mesmo tempo: exatamente uma consegue', async () => {
      const p = await criarProdutoTaxa(irmao);
      const resultados = await Promise.all([
        irmao.rpc('estoque_assumir_compra', { p_produto: p.id }),
        cuidadoraAtiva.rpc('estoque_assumir_compra', { p_produto: p.id })
      ]);
      const ok = resultados.filter((r) => !r.error);
      const falhas = resultados.filter((r) => r.error);
      expect(ok).toHaveLength(1);
      expect(falhas).toHaveLength(1);
      const { data: assumidas } = await irmao.from('estoque_compras').select('*').eq('produto_id', p.id).eq('status', 'assumida');
      expect(assumidas).toHaveLength(1);
    });

    it('concluir com quantidade inválida falha e a compra continua assumida (atomicidade)', async () => {
      const p = await criarProdutoTaxa(irmao);
      const { data: compraId } = await irmao.rpc('estoque_assumir_compra', { p_produto: p.id });
      const r = await irmao.rpc('estoque_concluir_compra', { p_compra: compraId, p_quantidade_base: -5 });
      expect(r.error).not.toBeNull();
      const { data: compra } = await irmao.from('estoque_compras').select('*').eq('id', compraId).single();
      expect(compra.status).toBe('assumida');
      const { data: entradas } = await irmao.from('estoque_movimentos').select('id').eq('produto_id', p.id).eq('tipo', 'entrada');
      expect(entradas).toHaveLength(0);
    });

    it('conclusão válida gera a entrada e vincula à compra', async () => {
      const p = await criarProdutoTaxa(irmao);
      const { data: compraId } = await irmao.rpc('estoque_assumir_compra', { p_produto: p.id });
      const { data: movId, error } = await cuidadoraAtiva.rpc('estoque_concluir_compra', {
        p_compra: compraId, p_quantidade_base: 40, p_valor_pago: 85.5, p_local: 'Farmácia'
      });
      expect(error).toBeNull();
      const { data: compra } = await irmao.from('estoque_compras').select('*').eq('id', compraId).single();
      expect(compra.status).toBe('concluida');
      expect(compra.movimento_entrada_id).toBe(movId);
    });

    // A1: toque duplo / duas pessoas concluindo a mesma compra não podem gerar estoque em dobro.
    it('A1: conclusões simultâneas da MESMA compra geram exatamente uma entrada', async () => {
      for (let rodada = 0; rodada < 12; rodada++) {
        const p = await criarProdutoTaxa(irmao);
        const { data: compraId } = await irmao.rpc('estoque_assumir_compra', { p_produto: p.id });
        const resultados = await Promise.all(
          [irmao, cuidadoraAtiva, irmao, cuidadoraAtiva].map((c) =>
            c.rpc('estoque_concluir_compra', { p_compra: compraId, p_quantidade_base: 10 })
          )
        );
        const sucessos = resultados.filter((r) => !r.error).length;
        const { data: entradas } = await irmao.from('estoque_movimentos').select('id').eq('produto_id', p.id).eq('tipo', 'entrada');
        expect(entradas, `rodada ${rodada}: entradas duplicadas`).toHaveLength(1);
        expect(sucessos, `rodada ${rodada}: sucessos`).toBe(1);
      }
    });

    it('A1: desistir e concluir ao mesmo tempo nunca deixam entrada com compra desistida', async () => {
      for (let rodada = 0; rodada < 8; rodada++) {
        const p = await criarProdutoTaxa(irmao);
        const { data: compraId } = await irmao.rpc('estoque_assumir_compra', { p_produto: p.id });
        await Promise.all([
          irmao.rpc('estoque_concluir_compra', { p_compra: compraId, p_quantidade_base: 10 }),
          cuidadoraAtiva.rpc('estoque_desistir_compra', { p_compra: compraId })
        ]);
        const { data: compra } = await irmao.from('estoque_compras').select('*').eq('id', compraId).single();
        const { data: entradas } = await irmao.from('estoque_movimentos').select('id').eq('produto_id', p.id).eq('tipo', 'entrada');
        if (compra.status === 'concluida') expect(entradas, `rodada ${rodada}`).toHaveLength(1);
        else expect(entradas, `rodada ${rodada}: compra ${compra.status} com entrada`).toHaveLength(0);
      }
    });
  });

  describe('7. M3: arquivamento usa o relógio do banco', () => {
    it('arquivado_em enviado pelo cliente (data falsa) é ignorado', async () => {
      const p = await criarProdutoTaxa(irmao);
      const falsa = '2001-01-01T00:00:00.000Z';
      const { data, error } = await irmao.from('estoque_produtos').update({ arquivado_em: falsa }).eq('id', p.id).select().single();
      expect(error).toBeNull();
      const diffMs = Math.abs(Date.now() - new Date(data.arquivado_em).getTime());
      expect(diffMs).toBeLessThan(60_000);
    });
  });

  describe('8. B3: mais de 1000 movimentos não podem truncar o saldo', () => {
    it('o app calcula o saldo com TODOS os movimentos (âncora é o último registro)', async () => {
      const p = await criarProdutoTaxa(irmao, { nome: nomeUnico('Produto volumoso'), consumo_diario_base: 1 });

      const lote = (n) => Array.from({ length: n }, () => ({ produto_id: p.id, tipo: 'entrada', motivo: 'doacao', quantidade_base: 1 }));
      for (let i = 0; i < 6; i++) {
        const { error } = await irmao.from('estoque_movimentos').insert(lote(200));
        expect(error).toBeNull();
      }
      // 1200 entradas já gravadas. A conferência é gravada DEPOIS e é o movimento mais recente.
      const { error: errConf } = await irmao.from('estoque_movimentos').insert({ produto_id: p.id, tipo: 'conferencia', quantidade_base: 7 });
      expect(errConf).toBeNull();

      const dados = await buscarDadosEstoque(false, irmao);
      expect(dados.sucesso).toBe(true);
      const movs = dados.movimentos.filter((m) => m.produto_id === p.id);
      expect(movs).toHaveLength(1201);

      const prod = dados.produtos.find((x) => x.id === p.id);
      const calc = calcularSaldoEProjecao(prod, dados.movimentos, dados.sinalizacoes, [], new Date());
      expect(calc.saldo).toBe(7);
    }, 60_000);
  });
});
