import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstoqueErrorBoundary from '../../../src/features/estoque/components/EstoqueErrorBoundary.jsx';

function ComponenteQuebrado({ deveFalhar }) {
  if (deveFalhar) {
    throw new Error('Falha simulada dentro do componente de estoque');
  }
  return <div>Componente renderizado normalmente</div>;
}

describe('EstoqueErrorBoundary.test.jsx - Isolamento de falhas do módulo', () => {
  it('renderiza os filhos normalmente quando não há erro', () => {
    render(
      <EstoqueErrorBoundary>
        <ComponenteQuebrado deveFalhar={false} />
      </EstoqueErrorBoundary>
    );

    expect(screen.getByText('Componente renderizado normalmente')).toBeDefined();
  });

  it('captura erro do módulo e exibe mensagem amigável sem quebrar o resto do app', () => {
    // Silencia o console.error do react durante o teste de boundary
    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <div>
        <header>Abas do App: Escalas | Diário</header>
        <EstoqueErrorBoundary>
          <ComponenteQuebrado deveFalhar={true} />
        </EstoqueErrorBoundary>
      </div>
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(
      screen.getByText('Ocorreu um erro ao carregar o módulo de estoque.')
    ).toBeDefined();
    expect(
      screen.getByText('As outras abas do aplicativo continuam funcionando normalmente.')
    ).toBeDefined();
    expect(screen.getByText('Abas do App: Escalas | Diário')).toBeDefined();

    spyConsole.mockRestore();
  });
});
