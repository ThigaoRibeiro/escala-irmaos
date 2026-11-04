// B1: o selo da navegação e a aba assinam o Realtime ao mesmo tempo.
// Usa o @supabase/supabase-js REAL (sem simular `channel`), porque o defeito só aparece assim:
// com o mesmo nome de canal, a segunda assinatura lança "cannot add postgres_changes callbacks".
import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { assinarRealtimeEstoque } from '../../../src/features/estoque/data/estoqueService.js';

// Porta fechada: nada de rede de verdade; o teste só exercita o registro dos canais.
const cliente = createClient('http://127.0.0.1:9', 'chave-de-teste', {
  auth: { persistSession: false, autoRefreshToken: false }
});

const topicos = () => cliente.getChannels().map((c) => c.topic);

afterAll(async () => {
  await cliente.removeAllChannels();
  cliente.realtime.disconnect();
});

describe('realtimeCanais.test.js - assinaturas simultâneas do estoque', () => {
  it('duas assinaturas em sequência (selo + aba) não lançam erro', () => {
    const selo = assinarRealtimeEstoque(() => {}, cliente);
    let aba;
    expect(() => {
      aba = assinarRealtimeEstoque(() => {}, cliente);
    }).not.toThrow();
    expect(topicos().filter((t) => t.includes('estoque'))).toHaveLength(2);
    selo.unsubscribe();
    aba.unsubscribe();
  });

  it('cancelar uma assinatura não derruba a outra', async () => {
    const aba = assinarRealtimeEstoque(() => {}, cliente);
    const selo = assinarRealtimeEstoque(() => {}, cliente);
    const antes = topicos().filter((t) => t.includes('estoque'));
    expect(antes).toHaveLength(2);

    aba.unsubscribe(); // sai da aba; o selo precisa continuar assinado
    await new Promise((r) => setTimeout(r, 50));
    expect(topicos().filter((t) => t.includes('estoque'))).toHaveLength(1);

    selo.unsubscribe();
  });
});
