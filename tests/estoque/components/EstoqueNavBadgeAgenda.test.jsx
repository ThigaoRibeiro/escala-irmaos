import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EstoqueNavBadge from '../../../src/features/estoque/EstoqueNavBadge.jsx';
import * as estoqueService from '../../../src/features/estoque/data/estoqueService.js';

// A2: o selo usa a agenda de remédios (prop `medications`) como a aba.
describe('EstoqueNavBadgeAgenda.test.jsx - selo considera a agenda de remédios (A2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(estoqueService, 'assinarRealtimeEstoque').mockReturnValue({ unsubscribe: vi.fn() });
    vi.spyOn(estoqueService, 'buscarDadosEstoque').mockResolvedValue({
      sucesso: true,
      produtos: [{
        id: 'p-agenda', nome: 'Memantina', unidade_base: 'comprimido', embalagem_nome: 'caixa', embalagem_quantidade: 30,
        modo_consumo: 'taxa', medicamento_ids: ['1', '2'], quantidade_por_administracao: 1, dias_critico: 5, dias_atencao: 15
      }],
      movimentos: [{ id: 'c1', produto_id: 'p-agenda', tipo: 'conferencia', quantidade_base: 8, ocorrido_em: new Date().toISOString() }],
      sinalizacoes: [],
      compras: []
    });
  });

  it('remédio vinculado à agenda entra na contagem (2/dia, saldo 8 = 4 dias = crítico)', async () => {
    const medications = [
      { id: '1', time: '08:00', name: 'Memantina', dose: '1 comp' },
      { id: '2', time: '20:00', name: 'Memantina', dose: '1 comp' }
    ];
    render(<EstoqueNavBadge medications={medications} />);
    const selo = await screen.findByTestId('estoque-nav-badge');
    expect(selo.textContent).toBe('1');
  });

  it('sem a agenda (vínculo quebrado) o item não conta como crítico', async () => {
    render(<EstoqueNavBadge medications={[]} />);
    await waitFor(() => expect(estoqueService.buscarDadosEstoque).toHaveBeenCalled());
    expect(screen.queryByTestId('estoque-nav-badge')).toBeNull();
  });
});
