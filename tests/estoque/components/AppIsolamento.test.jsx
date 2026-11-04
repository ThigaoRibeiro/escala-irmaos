// B2: se o módulo Estoque falhar ao CARREGAR (chunk indisponível), o resto do app tem que continuar
// funcionando. Renderiza o App de verdade; só a camada de dados e os dois chunks do estoque são
// simulados (os chunks rejeitam a importação, como numa falha de rede).
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/utils/db', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getSession: vi.fn(async () => ({ data: { session: { user: { email: 'thiagor21@gmail.com' } } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    getShifts: vi.fn(async () => ({})),
    getDailyLogs: vi.fn(async () => ({})),
    getDailyLogReceipts: vi.fn(async () => ({})),
    getCaregivers: vi.fn(async () => []),
    getMedications: vi.fn(async () => []),
    subscribeToRealtimeChanges: vi.fn(() => () => {})
  };
});

vi.mock('../../../src/features/estoque/EstoqueTab', () => {
  throw new Error('Failed to fetch dynamically imported module: EstoqueTab');
});
vi.mock('../../../src/features/estoque/EstoqueNavBadge', () => {
  throw new Error('Failed to fetch dynamically imported module: EstoqueNavBadge');
});

import App from '../../../src/App.jsx';

describe('AppIsolamento.test.jsx - falha de carregamento do estoque não derruba o app', () => {
  it('com os dois chunks do estoque indisponíveis, Escalas e Diário continuam funcionando', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    // O app inteiro continua de pé (barra de navegação presente), mesmo com o selo falhando.
    const botaoEstoque = await screen.findByRole('button', { name: /Estoque/ });
    expect(screen.getByRole('button', { name: /Escalas/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Diário/ })).toBeTruthy();

    // A aba Estoque mostra uma mensagem local, sem derrubar nada.
    fireEvent.click(botaoEstoque);
    expect(await screen.findByText('Não foi possível abrir o Estoque')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Escalas/ })).toBeTruthy();

    // E as outras abas seguem funcionando.
    fireEvent.click(screen.getByRole('button', { name: /Diário/ }));
    await waitFor(() => {
      expect(screen.queryByText('Não foi possível abrir o Estoque')).toBeNull();
    });
    expect(screen.getByRole('button', { name: /Estoque/ })).toBeTruthy();
  });
});
