// @vitest-environment node
// Estrutura do banco (privilégios, triggers e índices), verificada direto no catálogo do Postgres LOCAL.
// Cada camada de proteção é testada separadamente: se uma falhar, a outra não pode esconder o defeito.
import { describe, it, expect } from 'vitest';
import { DB_TEST_ATIVO, psql, nomeUnico } from './helpers.js';

const suite = DB_TEST_ATIVO ? describe : describe.skip;

const consulta = (sql) => {
  const r = psql(sql);
  if (!r.ok) throw new Error(r.erro);
  return r.saida;
};

suite('Estoque (banco local): estrutura e camadas de proteção', () => {
  describe('privilégios das tabelas (catálogo do Postgres)', () => {
    const privilegios = (papel) =>
      consulta(`select table_name||':'||privilege_type from information_schema.role_table_grants
                where grantee='${papel}' and table_schema='public' and table_name like 'estoque\\_%'
                order by 1`).split('\n').filter(Boolean);

    it('authenticated só tem os privilégios previstos, tabela a tabela', () => {
      expect(privilegios('authenticated')).toEqual([
        'estoque_auditoria:SELECT',
        'estoque_compras:SELECT',
        'estoque_movimentos:INSERT',
        'estoque_movimentos:SELECT',
        'estoque_produtos:INSERT',
        'estoque_produtos:SELECT',
        'estoque_produtos:UPDATE',
        'estoque_sinalizacoes:INSERT',
        'estoque_sinalizacoes:SELECT'
      ]);
    });

    it('anon não tem nenhum privilégio em tabela do estoque', () => {
      expect(privilegios('anon')).toEqual([]);
    });

    it('anon não executa nenhuma função do estoque', () => {
      const r = consulta(`select count(*) from information_schema.role_routine_grants
                          where grantee='anon' and routine_schema='public' and routine_name like 'estoque\\_%'`);
      expect(r).toBe('0');
    });

    it('todas as tabelas do estoque têm RLS ligado', () => {
      const r = consulta(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
                          where n.nspname='public' and c.relname like 'estoque\\_%' and c.relkind='r' and not c.relrowsecurity`);
      expect(r).toBe('0');
    });

    it('nenhuma policy do estoque usa USING/WITH CHECK (true)', () => {
      const r = consulta(`select count(*) from pg_policies where schemaname='public' and tablename like 'estoque\\_%'
                          and (qual = 'true' or with_check = 'true')`);
      expect(r).toBe('0');
    });
  });

  describe('triggers de só-inserção valem até para o dono do banco', () => {
    it('UPDATE e DELETE em movimento são rejeitados pelo trigger', () => {
      const nome = nomeUnico('Produto trigger');
      consulta(`insert into estoque_produtos (nome,categoria,unidade_base,embalagem_nome,embalagem_quantidade,modo_consumo,consumo_diario_base)
                values ('${nome}','higiene','u','u',1,'taxa',1)`);
      consulta(`insert into estoque_movimentos (produto_id,tipo,quantidade_base)
                select id,'conferencia',5 from estoque_produtos where nome='${nome}'`);
      const upd = psql(`update estoque_movimentos set quantidade_base=9 where produto_id=(select id from estoque_produtos where nome='${nome}')`);
      expect(upd.ok).toBe(false);
      expect(upd.erro).toContain('somente insercao');
      const del = psql(`delete from estoque_movimentos where produto_id=(select id from estoque_produtos where nome='${nome}')`);
      expect(del.ok).toBe(false);
      expect(del.erro).toContain('somente insercao');
    });

    it('UPDATE/DELETE em sinalização e auditoria, e DELETE em produto, são rejeitados pelo trigger', () => {
      const nome = nomeUnico('Produto trigger 2');
      consulta(`insert into estoque_produtos (nome,categoria,unidade_base,embalagem_nome,embalagem_quantidade,modo_consumo,consumo_diario_base)
                values ('${nome}','higiene','u','u',1,'taxa',1)`);
      consulta(`insert into estoque_sinalizacoes (produto_id) select id from estoque_produtos where nome='${nome}'`);
      const ids = `(select id from estoque_produtos where nome='${nome}')`;
      expect(psql(`update estoque_sinalizacoes set observacao='x' where produto_id=${ids}`).ok).toBe(false);
      expect(psql(`delete from estoque_sinalizacoes where produto_id=${ids}`).ok).toBe(false);
      expect(psql(`update estoque_auditoria set operacao='UPDATE' where produto_id=${ids}`).ok).toBe(false);
      expect(psql(`delete from estoque_auditoria where produto_id=${ids}`).ok).toBe(false);
      expect(psql(`delete from estoque_produtos where nome='${nome}'`).ok).toBe(false);
    });
  });

  describe('índice único de compra assumida', () => {
    it('duas compras "assumida" do mesmo produto são rejeitadas pelo índice (SQL direto)', () => {
      const nome = nomeUnico('Produto compra');
      consulta(`insert into estoque_produtos (nome,categoria,unidade_base,embalagem_nome,embalagem_quantidade,modo_consumo,consumo_diario_base)
                values ('${nome}','higiene','u','u',1,'taxa',1)`);
      const ids = `(select id from estoque_produtos where nome='${nome}')`;
      consulta(`insert into estoque_compras (produto_id,status) select id,'assumida' from estoque_produtos where nome='${nome}'`);
      const segunda = psql(`insert into estoque_compras (produto_id,status) values (${ids},'assumida')`);
      expect(segunda.ok).toBe(false);
      expect(segunda.erro).toContain('estoque_compras_assumida_unica_idx');
    });
  });

  describe('autoria forçada em todas as tabelas com trigger', () => {
    it('os triggers de autoria e validação existem e estão ativos', () => {
      const r = consulta(`select string_agg(tgname, ',' order by tgname) from pg_trigger
                          where not tgisinternal and tgrelid::regclass::text like 'estoque\\_%'`);
      for (const esperado of [
        'trg_estoque_produtos_autoria',
        'trg_estoque_produtos_auditoria',
        'trg_estoque_movimentos_validar',
        'trg_estoque_sinalizacoes_autoria'
      ]) {
        expect(r).toContain(esperado);
      }
    });
  });
});
