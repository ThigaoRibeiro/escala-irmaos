/**
 * Funções puras de conversão e formatação para o módulo de estoque.
 */

export const FRACAO_EMBALAGEM_ABERTA = [
  { label: 'Cheia (100%)', valor: 1 },
  { label: '3/4 (75%)', valor: 0.75 },
  { label: '1/2 (50%)', valor: 0.5 },
  { label: '1/4 (25%)', valor: 0.25 },
  { label: 'Quase vazia (10%)', valor: 0.1 }
];

/**
 * Converte quantidade na unidade base para quantidade em embalagens.
 * @param {number} quantidadeBase
 * @param {number} embalagemQuantidade
 * @returns {number}
 */
export function unidadesParaEmbalagens(quantidadeBase, embalagemQuantidade) {
  const qtd = Number(quantidadeBase) || 0;
  const eq = Number(embalagemQuantidade) || 1;
  if (eq <= 0) return qtd;
  return qtd / eq;
}

/**
 * Converte embalagens fechadas + unidades soltas para o total na unidade base.
 * @param {number|string} embalagens
 * @param {number|string} soltas
 * @param {number|string} embalagemQuantidade
 * @returns {number}
 */
export function embalagensParaUnidades(embalagens, soltas, embalagemQuantidade) {
  const emb = Number(embalagens) || 0;
  const sol = Number(soltas) || 0;
  const eq = Number(embalagemQuantidade) || 1;
  return (emb * eq) + sol;
}

/**
 * Formata um número no padrão pt-BR, com até `casasDecimais` (sem casas se for inteiro).
 * @param {number} valor
 * @param {number} casasDecimais
 * @returns {string}
 */
export function formatarNumeroPtBr(valor, casasDecimais = 1) {
  const num = Number(valor);
  if (isNaN(num)) return '0';
  
  // Arredonda para as casas decimais desejadas
  const fator = Math.pow(10, casasDecimais);
  const arredondado = Math.round(num * fator) / fator;

  return arredondado.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais
  });
}

/**
 * Pluraliza o nome da embalagem de forma simples em pt-BR.
 * @param {string} nome
 * @param {number} quantidade
 * @returns {string}
 */
export function pluralizarEmbalagem(nome, quantidade) {
  if (!nome) return '';
  const qtd = Number(quantidade) || 0;
  if (qtd <= 1) return nome;

  const n = nome.trim();
  if (n.endsWith('s')) return n;
  if (n.endsWith('m')) return n.slice(0, -1) + 'ns';
  if (n.endsWith('r') || n.endsWith('z')) return n + 'es';
  if (n.endsWith('l')) return n.slice(0, -1) + 'is';
  return n + 's';
}

/**
 * Formata a quantidade na unidade base e opcionalmente em embalagens.
 * Exemplo: "45 fraldas (~ 2,3 pacotes)"
 * @param {number} quantidadeBase
 * @param {string} unidadeBase
 * @param {string} [embalagemNome]
 * @param {number} [embalagemQuantidade]
 * @returns {string}
 */
export function formatarQuantidade(quantidadeBase, unidadeBase, embalagemNome, embalagemQuantidade) {
  if (quantidadeBase === null || quantidadeBase === undefined) {
    return `0 ${unidadeBase || 'unidades'}`;
  }

  const baseStr = `${formatarNumeroPtBr(quantidadeBase)} ${unidadeBase || ''}`.trim();
  const eq = Number(embalagemQuantidade);

  if (embalagemNome && eq && eq > 1) {
    const qtdEmb = quantidadeBase / eq;
    const nomeEmbPlural = pluralizarEmbalagem(embalagemNome, qtdEmb);
    return `${baseStr} (~ ${formatarNumeroPtBr(qtdEmb, 1)} ${nomeEmbPlural})`;
  }

  return baseStr;
}
