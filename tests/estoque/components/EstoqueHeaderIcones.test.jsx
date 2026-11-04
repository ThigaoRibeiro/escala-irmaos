import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstoqueHeader from '../../../src/features/estoque/components/EstoqueHeader.jsx';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';
import { gerarTextoWhatsApp } from '../../../src/features/estoque/domain/whatsapp.js';

// A4: "Acabou" é ⚫ em todo lugar; ⚪ é só "sem conferência".
describe('EstoqueHeaderIcones.test.jsx - ícone de "Acabou" (A4)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  it('o chip "Acabou" do cabeçalho mostra ⚫ e o chip "Sem conf." mostra ⚪', () => {
    render(
      <EstoqueHeader
        contadores={{ acabou: 2, critico: 0, atencao: 0, sem_conferencia: 3, ok: 0 }}
        filtroSituacao={null}
        onFiltrarSituacao={() => {}}
        termoBusca=""
        onMudarBusca={() => {}}
        categoriaSelecionada="todas"
        onMudarCategoria={() => {}}
        mostrarArquivados={false}
        onToggleArquivados={() => {}}
        onAbrirNovoItem={() => {}}
        onAbrirSugeridos={() => {}}
        onAbrirWhatsApp={() => {}}
      />
    );
    const acabou = screen.getByText('Acabou').closest('button');
    const semConf = screen.getByText('Sem conf.').closest('button');
    expect(acabou.textContent).toContain('⚫');
    expect(acabou.textContent).not.toContain('⚪');
    expect(semConf.textContent).toContain('⚪');
  });

  it('saldo estimado zerado (modo taxa) tem ícone ⚫', () => {
    const produto = { id: 'p', nome: 'X', unidade_base: 'u', modo_consumo: 'taxa', consumo_diario_base: 10 };
    const antigo = new Date('2026-07-10T12:00:00Z').toISOString();
    const movimentos = [{ id: 'c', produto_id: 'p', tipo: 'conferencia', quantidade_base: 5, ocorrido_em: antigo }];
    const res = calcularSaldoEProjecao(produto, movimentos, [], [], agora);
    expect(res.situacao).toBe('acabou');
    expect(res.situacaoIcon).toBe('⚫');
  });

  it('a mensagem do WhatsApp usa ⚫ para "Acabou"', () => {
    const produto = { id: 'p', nome: 'X', unidade_base: 'u', embalagem_nome: 'cx', embalagem_quantidade: 10 };
    const itens = [{ produto, calculo: { situacao: 'acabou', saldo: 0, saldoEstimado: 0 } }];
    const texto = gerarTextoWhatsApp(itens, [], {}, [], agora);
    expect(texto).toContain('⚫ Acabou');
    expect(texto).not.toContain('⚪ Acabou');
  });
});
