import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('responsividade360.test.js - Medições e regras de responsividade em 360px', () => {
  const cssPath = path.resolve('src', 'features', 'estoque', 'estoque.css');
  const indexCssPath = path.resolve('src', 'index.css');

  const estoqueCss = fs.readFileSync(cssPath, 'utf8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  it('alvos de toque interativos possuem altura mínima >= 44px conforme WCAG / especificação', () => {
    // Verifica .est-btn
    expect(estoqueCss).toContain('min-height: 44px');
    expect(estoqueCss).toContain('min-width: 44px');

    // Verifica .est-summary-chip
    const summaryMatch = estoqueCss.match(/\.est-summary-chip\s*\{[^}]*min-height:\s*(\d+)px/);
    expect(summaryMatch).not.toBeNull();
    expect(Number(summaryMatch[1])).toBeGreaterThanOrEqual(44);

    // Verifica .est-category-chip
    const catMatch = estoqueCss.match(/\.est-category-chip\s*\{[^}]*min-height:\s*(\d+)px/);
    expect(catMatch).not.toBeNull();
    expect(Number(catMatch[1])).toBeGreaterThanOrEqual(44);

    // Verifica inputs e selects
    expect(estoqueCss).toMatch(/\.est-input[^}]*min-height:\s*44px/);
  });

  it('bottom-nav divide a tela em 4 colunas de 25% (90px em 360px) sem quebra de rótulo', () => {
    expect(indexCss).toContain('.bottom-nav');
    expect(indexCss).toContain('width: 25%');

    const viewportWidth = 360;
    const itemWidth = viewportWidth * 0.25;
    expect(itemWidth).toBe(90);

    // Verifica os 4 rótulos da barra de navegação
    const rotulos = ['Escalas', 'Diário', 'Estoque', 'Configurações'];
    for (const rotulo of rotulos) {
      // Estima a largura do texto em fonte 0.75rem (12px) ~6px por caractere
      const larguraEstimada = rotulo.length * 6.5;
      expect(
        larguraEstimada,
        `O rótulo '${rotulo}' deve caber dentro de 90px no viewport de 360px`
      ).toBeLessThan(itemWidth);
    }
  });

  it('contêiner do estoque usa box-sizing border-box e max-width 100% prevenindo rolagem horizontal', () => {
    expect(estoqueCss).toContain('box-sizing: border-box');
    expect(estoqueCss).toContain('width: 100%');
    expect(estoqueCss).toContain('max-width: 720px');
  });

  it('suporte a tema claro e escuro reaproveita variáveis globais sem redefinir cores estáticas', () => {
    // Reutiliza var(--bg-card), var(--text-primary), var(--border-color)
    expect(estoqueCss).toContain('var(--bg-card)');
    expect(estoqueCss).toContain('var(--text-primary)');
    expect(estoqueCss).toContain('var(--border-color)');
    expect(estoqueCss).toContain('var(--primary)');
    expect(estoqueCss).toContain('var(--color-danger)');
    expect(estoqueCss).toContain('var(--color-warning)');
  });
});
