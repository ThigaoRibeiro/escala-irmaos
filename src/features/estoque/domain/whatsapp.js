/**
 * Funções puras para formatação de mensagem e link do WhatsApp.
 * Nenhuma promessa de envio automático; formata texto e gera link wa.me.
 */

import { formatarQuantidade } from './conversoes.js';
import { formatarDataPtBr } from './saldo.js';

/**
 * Retorna o nome amigável do comprador a partir de seu e-mail.
 * @param {string} email
 * @param {Object} [userMapping={}]
 * @param {Array} [caregivers=[]]
 * @returns {string}
 */
export function obterNomeUsuario(email, userMapping = {}, caregivers = []) {
  if (!email) return 'Alguém';
  const cleanEmail = email.toLowerCase().trim();

  // Verifica mapeamento da família (USER_MAPPING)
  if (userMapping && userMapping[cleanEmail]?.name) {
    return userMapping[cleanEmail].name;
  }

  // Verifica cuidadoras
  if (Array.isArray(caregivers)) {
    const cg = caregivers.find(c => c.email && c.email.toLowerCase() === cleanEmail);
    if (cg?.name) return cg.name;
  }

  return cleanEmail.split('@')[0];
}

/**
 * Gera o texto pronto para WhatsApp com base nos itens calculados e compras assumidas.
 *
 * @param {Array<{ produto: Object, calculo: Object }>} itens
 * @param {Array<Object>} [compras=[]] Compras ativas/assumidas
 * @param {Object} [userMapping={}]
 * @param {Array} [caregivers=[]]
 * @param {Date|string|number} [agora=new Date()]
 * @returns {string}
 */
export function gerarTextoWhatsApp(itens = [], compras = [], userMapping = {}, caregivers = [], agora = new Date()) {
  const agoraDate = agora instanceof Date ? agora : new Date(agora);
  const dataCabecalho = formatarDataPtBr(agoraDate);

  // Mapa de compra assumida por produto_id
  const comprasAssumidasMap = new Map();
  for (const c of compras || []) {
    if (c.status === 'assumida' && c.produto_id) {
      comprasAssumidasMap.set(c.produto_id, c);
    }
  }

  const itensAcabou = [];
  const itensCritico = [];
  const itensAtencao = [];
  let totalSemConferencia = 0;

  for (const item of itens) {
    const sit = item.calculo?.situacao;
    if (sit === 'acabou') {
      itensAcabou.push(item);
    } else if (sit === 'critico') {
      itensCritico.push(item);
    } else if (sit === 'atencao') {
      itensAtencao.push(item);
    } else if (sit === 'sem_conferencia') {
      totalSemConferencia++;
    }
  }

  const blocos = [];
  blocos.push(`📦 Estoque da mãe – ${dataCabecalho}`);

  function formatarLinhaProduto(item) {
    const prod = item.produto;
    const calc = item.calculo;
    const compra = comprasAssumidasMap.get(prod.id);

    if (compra) {
      const comprador = obterNomeUsuario(compra.assumida_por_email, userMapping, caregivers);
      return `• ${prod.nome} – 🙋‍♂️ ${comprador} vai comprar`;
    }

    // Avisado por alguém, mas ainda sem a primeira conferência: não há saldo nem previsão.
    if (calc.temConferencia === false) {
      return `• ${prod.nome} – sem conferência`;
    }

    const qtdStr = formatarQuantidade(
      calc.saldoEstimado ?? calc.saldo,
      prod.unidade_base,
      prod.embalagem_nome,
      prod.embalagem_quantidade
    );

    if (calc.previsaoTerminoFormatada) {
      return `• ${prod.nome} – ${qtdStr}, acaba ~${calc.previsaoTerminoFormatada}`;
    }

    return `• ${prod.nome} – ${qtdStr}`;
  }

  if (itensAcabou.length > 0) {
    const linhas = itensAcabou.map(formatarLinhaProduto);
    blocos.push(`⚫ Acabou\n${linhas.join('\n')}`);
  }

  if (itensCritico.length > 0) {
    const linhas = itensCritico.map(formatarLinhaProduto);
    blocos.push(`🔴 Comprar agora\n${linhas.join('\n')}`);
  }

  if (itensAtencao.length > 0) {
    const linhas = itensAtencao.map(formatarLinhaProduto);
    blocos.push(`🟡 Ficar de olho (pesquisar preço)\n${linhas.join('\n')}`);
  }

  if (totalSemConferencia > 0) {
    const plural = totalSemConferencia > 1 ? 'itens sem conferência' : 'item sem conferência';
    blocos.push(`⚪ ${totalSemConferencia} ${plural}`);
  }

  return blocos.join('\n\n');
}

/**
 * Gera URL para abrir o WhatsApp com mensagem codificada.
 * @param {string} texto
 * @returns {string}
 */
export function gerarLinkWhatsApp(texto) {
  if (!texto) return 'https://wa.me/';
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
