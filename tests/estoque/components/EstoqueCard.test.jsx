import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstoqueCard from '../../../src/features/estoque/components/EstoqueCard.jsx';

describe('EstoqueCard.test.jsx - Renderização do card do produto', () => {
  const produtoSemConf = {
    id: 'prod-novo',
    nome: 'Fralda Geriátrica G',
    categoria: 'fraldas_incontinencia',
    unidade_base: 'fralda',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 20,
    modo_consumo: 'taxa'
  };

  const calculoSemConf = {
    temConferencia: false,
    situacao: 'sem_conferencia',
    situacaoLabel: 'Sem conferência',
    situacaoIcon: '⚪',
    saldo: null,
    saldoEstimado: null,
    diasRestantes: null,
    previsaoTerminoFormatada: null
  };

  it('produto sem conferência mostra apenas botão "Fazer primeira conferência" e nenhuma projeção', () => {
    const handleConferir = vi.fn();

    render(
      <EstoqueCard
        produto={produtoSemConf}
        calculo={calculoSemConf}
        onConferir={handleConferir}
      />
    );

    expect(screen.getByText('Fralda Geriátrica G')).toBeDefined();
    expect(screen.getByText('Sem conferência')).toBeDefined();
    const btn = screen.getByRole('button', { name: /Fazer primeira conferência/i });
    expect(btn).toBeDefined();

    // Nenhuma menção a dias restantes ou previsão
    expect(screen.queryByText(/acaba por volta de/i)).toBeNull();
    expect(screen.queryByText(/dias restantes/i)).toBeNull();
  });

  it('produto em situação crítica (🔴) mostra saldo e previsão de término', () => {
    const produtoCritico = {
      id: 'prod-crit',
      nome: 'Shampoo Johnson',
      categoria: 'higiene',
      unidade_base: 'ml',
      embalagem_nome: 'frasco',
      embalagem_quantidade: 400,
      modo_consumo: 'taxa'
    };

    const calculoCritico = {
      temConferencia: true,
      situacao: 'critico',
      situacaoLabel: 'Comprar agora',
      situacaoIcon: '🔴',
      saldo: 40,
      saldoEstimado: 30,
      diasRestantes: 3.0,
      previsaoTerminoFormatada: '18/07'
    };

    render(
      <EstoqueCard
        produto={produtoCritico}
        calculo={calculoCritico}
      />
    );

    expect(screen.getByText('Shampoo Johnson')).toBeDefined();
    expect(screen.getByText('Comprar agora')).toBeDefined();
    expect(screen.getByText(/acaba por volta de/i)).toBeDefined();
    expect(screen.getByText('18/07')).toBeDefined();
    expect(screen.getByText(/3,0 dias/i)).toBeDefined();
  });
});
