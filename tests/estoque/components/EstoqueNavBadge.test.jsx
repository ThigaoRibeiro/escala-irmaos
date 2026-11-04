import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EstoqueNavBadge from '../../../src/features/estoque/EstoqueNavBadge.jsx';
import * as estoqueService from '../../../src/features/estoque/data/estoqueService.js';

describe('EstoqueNavBadge.test.jsx - Comportamento do selo de navegação', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('o selo NÃO é renderizado quando não há itens críticos (contagem = 0)', async () => {
    vi.spyOn(estoqueService, 'buscarDadosEstoque').mockResolvedValue({
      sucesso: true,
      produtos: [
        {
          id: 'p-1',
          nome: 'Shampoo',
          unidade_base: 'ml',
          modo_consumo: 'taxa',
          consumo_diario_base: 5,
          dias_critico: 5,
          dias_atencao: 15
        }
      ],
      movimentos: [
        {
          id: 'c-1',
          produto_id: 'p-1',
          tipo: 'conferencia',
          quantidade_base: 500, // 100 dias restantes -> 'ok'
          ocorrido_em: new Date().toISOString()
        }
      ],
      sinalizacoes: [],
      compras: []
    });

    vi.spyOn(estoqueService, 'assinarRealtimeEstoque').mockReturnValue({
      unsubscribe: vi.fn()
    });

    const { container } = render(<EstoqueNavBadge />);

    await waitFor(() => {
      expect(estoqueService.buscarDadosEstoque).toHaveBeenCalled();
    });

    expect(container.querySelector('.est-nav-badge')).toBeNull();
  });

  it('o selo NÃO é renderizado quando as tabelas estão ausentes no banco (42P01 / PGRST205)', async () => {
    vi.spyOn(estoqueService, 'buscarDadosEstoque').mockResolvedValue({
      sucesso: false,
      tabelasAusentes: true,
      produtos: [],
      movimentos: [],
      sinalizacoes: [],
      compras: []
    });

    vi.spyOn(estoqueService, 'assinarRealtimeEstoque').mockReturnValue({
      unsubscribe: vi.fn()
    });

    const { container } = render(<EstoqueNavBadge />);

    await waitFor(() => {
      expect(estoqueService.buscarDadosEstoque).toHaveBeenCalled();
    });

    expect(container.querySelector('.est-nav-badge')).toBeNull();
  });

  it('o selo é renderizado com a contagem de itens críticos (⚪ acabou + 🔴 crítico)', async () => {
    vi.spyOn(estoqueService, 'buscarDadosEstoque').mockResolvedValue({
      sucesso: true,
      produtos: [
        {
          id: 'p-1',
          nome: 'Fralda',
          unidade_base: 'fralda',
          modo_consumo: 'taxa',
          consumo_diario_base: 6,
          dias_critico: 5,
          dias_atencao: 15
        },
        {
          id: 'p-2',
          nome: 'Shampoo',
          unidade_base: 'ml',
          modo_consumo: 'taxa',
          consumo_diario_base: 10,
          dias_critico: 5,
          dias_atencao: 15
        }
      ],
      movimentos: [
        {
          id: 'c-1',
          produto_id: 'p-1',
          tipo: 'conferencia',
          quantidade_base: 0, // acabou (⚪)
          ocorrido_em: new Date().toISOString()
        },
        {
          id: 'c-2',
          produto_id: 'p-2',
          tipo: 'conferencia',
          quantidade_base: 20, // 2 dias restantes <= dias_critico (5) -> critico (🔴)
          ocorrido_em: new Date().toISOString()
        }
      ],
      sinalizacoes: [],
      compras: []
    });

    vi.spyOn(estoqueService, 'assinarRealtimeEstoque').mockReturnValue({
      unsubscribe: vi.fn()
    });

    render(<EstoqueNavBadge />);

    await waitFor(() => {
      const badge = screen.getByTestId('estoque-nav-badge');
      expect(badge).toBeDefined();
      expect(badge.textContent).toBe('2');
    });
  });
});
