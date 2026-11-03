import { describe, it, expect } from 'vitest';
import { gerarTextoWhatsApp, gerarLinkWhatsApp } from '../../../src/features/estoque/domain/whatsapp.js';

describe('whatsapp.test.js - Formatação de mensagem para WhatsApp', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  const userMapping = {
    'thiagor21@gmail.com': { name: 'Thiago' },
    'deividylan@gmail.com': { name: 'David' }
  };

  const caregivers = [
    { email: 'maria@cuidadora.com', name: 'Maria' }
  ];

  it('formata snapshot completo da mensagem conforme padrão da especificação', () => {
    const itens = [
      {
        produto: {
          id: 'p-1',
          nome: 'Fralda Geriátrica G',
          unidade_base: 'fraldas',
          embalagem_nome: 'pacote',
          embalagem_quantidade: 20
        },
        calculo: {
          situacao: 'critico',
          saldoEstimado: 45,
          previsaoTerminoFormatada: '20/07'
        }
      },
      {
        produto: {
          id: 'p-2',
          nome: 'Shampoo Johnson',
          unidade_base: 'ml',
          embalagem_nome: 'frasco',
          embalagem_quantidade: 400
        },
        calculo: {
          situacao: 'acabou',
          saldoEstimado: 0
        }
      },
      {
        produto: {
          id: 'p-3',
          nome: 'Curativo Gaze',
          unidade_base: 'pacotes',
          embalagem_nome: 'pacote',
          embalagem_quantidade: 1
        },
        calculo: {
          situacao: 'atencao',
          saldoEstimado: 3,
          previsaoTerminoFormatada: '28/07'
        }
      },
      {
        produto: { id: 'p-4', nome: 'Sabonete' },
        calculo: { situacao: 'sem_conferencia' }
      },
      {
        produto: { id: 'p-5', nome: 'Algodão' },
        calculo: { situacao: 'sem_conferencia' }
      },
      {
        produto: { id: 'p-6', nome: 'Álcool 70%' },
        calculo: { situacao: 'ok', saldoEstimado: 100 }
      }
    ];

    const compras = [
      {
        id: 'c-1',
        produto_id: 'p-2',
        status: 'assumida',
        assumida_por_email: 'thiagor21@gmail.com'
      }
    ];

    const texto = gerarTextoWhatsApp(itens, compras, userMapping, caregivers, agora);

    expect(texto).toContain('📦 Estoque da mãe – 15/07');
    expect(texto).toContain('⚪ Acabou\n• Shampoo Johnson – 🙋‍♂️ Thiago vai comprar');
    expect(texto).toContain('🔴 Comprar agora\n• Fralda Geriátrica G – 45 fraldas (~ 2,3 pacotes), acaba ~20/07');
    expect(texto).toContain('🟡 Ficar de olho (pesquisar preço)\n• Curativo Gaze – 3 pacotes, acaba ~28/07');
    expect(texto).toContain('⚪ 2 itens sem conferência');
    // Itens confortáveis (🟢 ok) NUNCA entram na mensagem
    expect(texto).not.toContain('Álcool 70%');
  });

  it('omite seções vazias na mensagem', () => {
    // Apenas 1 item crítico
    const itens = [
      {
        produto: { id: 'p-1', nome: 'Fralda', unidade_base: 'fraldas', embalagem_nome: 'pct', embalagem_quantidade: 1 },
        calculo: { situacao: 'critico', saldoEstimado: 5 }
      }
    ];

    const texto = gerarTextoWhatsApp(itens, [], userMapping, caregivers, agora);
    expect(texto).toContain('🔴 Comprar agora');
    expect(texto).not.toContain('⚪ Acabou');
    expect(texto).not.toContain('🟡 Ficar de olho');
    expect(texto).not.toContain('sem conferência');
  });

  it('gerarLinkWhatsApp gera link codificado com encodeURIComponent', () => {
    const texto = '📦 Estoque da mãe – 15/07\n\n🔴 Comprar agora';
    const link = gerarLinkWhatsApp(texto);
    expect(link).toContain('https://wa.me/?text=');
    expect(link).toContain(encodeURIComponent(texto));
  });
});
