/**
 * Função pura para ordenação da lista de estoque.
 * Ordem dos grupos:
 * 1. ⚫ Acabou (`acabou`)
 * 2. 🔴 Comprar agora (`critico`)
 * 3. 🟡 Ficar de olho (`atencao`)
 * 4. ⚪ Sem conferência (`sem_conferencia`)
 * 5. 🟢 Ok (`ok`)
 *
 * Dentro do mesmo grupo: menos dias restantes primeiro; desempate por nome alfabético pt-BR.
 */

const PRIORIDADE_SITUACAO = {
  acabou: 1,
  critico: 2,
  atencao: 3,
  sem_conferencia: 4,
  ok: 5
};

export function obterPrioridadeSituacao(situacao) {
  return PRIORIDADE_SITUACAO[situacao] || 99;
}

/**
 * Ordena a lista de itens calculados de acordo com a urgência.
 *
 * @param {Array<{ produto: Object, calculo: Object }>} itens
 * @returns {Array<{ produto: Object, calculo: Object }>}
 */
export function ordenarItensEstoque(itens) {
  if (!Array.isArray(itens)) return [];

  return [...itens].sort((a, b) => {
    const prioridadeA = obterPrioridadeSituacao(a.calculo?.situacao);
    const prioridadeB = obterPrioridadeSituacao(b.calculo?.situacao);

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    // Mesmo grupo de situação: comparar dias restantes (menor primeiro)
    const diasA = a.calculo?.diasRestantes;
    const diasB = b.calculo?.diasRestantes;

    const temDiasA = typeof diasA === 'number' && isFinite(diasA);
    const temDiasB = typeof diasB === 'number' && isFinite(diasB);

    if (temDiasA && temDiasB) {
      if (Math.abs(diasA - diasB) > 0.0001) {
        return diasA - diasB;
      }
    } else if (temDiasA && !temDiasB) {
      return -1;
    } else if (!temDiasA && temDiasB) {
      return 1;
    }

    // Desempate por nome alfabético pt-BR
    const nomeA = String(a.produto?.nome || '');
    const nomeB = String(b.produto?.nome || '');
    return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
  });
}
