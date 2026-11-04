/**
 * Camada de dados do Estoque: interações com Supabase e RPCs.
 * Nenhuma autoria vem do cliente (o banco força via triggers).
 * Resiliente à ausência das tabelas (erro 42P01 / PGRST205).
 */

import { getSupabaseClient } from '../../../utils/db.js';

export function isTabelaAusenteError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === '42P01' ||
         code === 'PGRST205' ||
         msg.includes('relation') && msg.includes('does not exist') ||
         msg.includes('could not find the') && msg.includes('schema cache');
}

const TAMANHO_PAGINA = 1000;
const MAX_PAGINAS = 200;

/**
 * Busca TODAS as linhas de uma consulta, página a página.
 * O PostgREST limita cada resposta (max_rows, 1000 por padrão) e corta o excedente em silêncio;
 * como o saldo depende do movimento mais recente, uma única página daria saldo errado.
 * Continua até receber uma página vazia, então funciona mesmo se o servidor limitar abaixo de 1000.
 * `montarQuery` precisa devolver uma consulta nova, com ordenação total (ex.: coluna + id).
 */
async function buscarPaginado(montarQuery) {
  const linhas = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const de = pagina * TAMANHO_PAGINA;
    const { data, error } = await montarQuery().range(de, de + TAMANHO_PAGINA - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: linhas, error: null };
    linhas.push(...data);
  }
  return { data: null, error: new Error('O histórico do estoque é grande demais para ser carregado.') };
}

/**
 * Busca produtos, movimentos, sinalizações e compras assumidas do banco.
 * @param {boolean} [incluirArquivados=false]
 * @returns {Promise<{ sucesso: boolean, tabelasAusentes?: boolean, erro?: string, produtos: Array, movimentos: Array, sinalizacoes: Array, compras: Array }>}
 */
export async function buscarDadosEstoque(incluirArquivados = false, cliente = null) {
  const supabase = cliente || getSupabaseClient();
  if (!supabase) {
    return {
      sucesso: false,
      tabelasAusentes: true,
      erro: 'Supabase client indisponível',
      produtos: [],
      movimentos: [],
      sinalizacoes: [],
      compras: []
    };
  }

  try {
    const [resProdutos, resMovs, resSinais, resCompras] = await Promise.all([
      buscarPaginado(() => {
        let q = supabase.from('estoque_produtos').select('*');
        if (!incluirArquivados) q = q.is('arquivado_em', null);
        return q.order('nome', { ascending: true }).order('id', { ascending: true });
      }),
      buscarPaginado(() => supabase.from('estoque_movimentos').select('*')
        .order('ocorrido_em', { ascending: true }).order('id', { ascending: true })),
      buscarPaginado(() => supabase.from('estoque_sinalizacoes').select('*')
        .order('criado_em', { ascending: true }).order('id', { ascending: true })),
      buscarPaginado(() => supabase.from('estoque_compras').select('*').eq('status', 'assumida')
        .order('assumida_em', { ascending: true }).order('id', { ascending: true }))
    ]);

    // Verifica erro de tabela inexistente
    for (const res of [resProdutos, resMovs, resSinais, resCompras]) {
      if (res.error && isTabelaAusenteError(res.error)) {
        return {
          sucesso: false,
          tabelasAusentes: true,
          erro: 'Tabelas do estoque ainda não configuradas no banco.',
          produtos: [],
          movimentos: [],
          sinalizacoes: [],
          compras: []
        };
      }
    }

    if (resProdutos.error) throw resProdutos.error;
    if (resMovs.error) throw resMovs.error;
    if (resSinais.error) throw resSinais.error;
    if (resCompras.error) throw resCompras.error;

    return {
      sucesso: true,
      produtos: resProdutos.data || [],
      movimentos: resMovs.data || [],
      sinalizacoes: resSinais.data || [],
      compras: resCompras.data || []
    };
  } catch (err) {
    if (isTabelaAusenteError(err)) {
      return {
        sucesso: false,
        tabelasAusentes: true,
        erro: 'Tabelas do estoque ainda não configuradas no banco.',
        produtos: [],
        movimentos: [],
        sinalizacoes: [],
        compras: []
      };
    }
    return {
      sucesso: false,
      tabelasAusentes: false,
      erro: err.message || 'Falha ao buscar dados do estoque',
      produtos: [],
      movimentos: [],
      sinalizacoes: [],
      compras: []
    };
  }
}

/**
 * Cria um novo produto no estoque.
 * @param {Object} produto
 */
export async function criarProduto(produto) {
  const supabase = getSupabaseClient();
  const dados = {
    nome: produto.nome.trim(),
    categoria: produto.categoria,
    marca_preferida: produto.marca_preferida?.trim() || null,
    observacoes: produto.observacoes?.trim() || null,
    unidade_base: produto.unidade_base.trim(),
    embalagem_nome: produto.embalagem_nome.trim(),
    embalagem_quantidade: Number(produto.embalagem_quantidade),
    modo_consumo: produto.modo_consumo || 'taxa',
    consumo_diario_base: produto.consumo_diario_base ? Number(produto.consumo_diario_base) : null,
    estoque_minimo_base: produto.estoque_minimo_base ? Number(produto.estoque_minimo_base) : null,
    estoque_atencao_base: produto.estoque_atencao_base ? Number(produto.estoque_atencao_base) : null,
    dias_atencao: Number(produto.dias_atencao) || 15,
    dias_critico: Number(produto.dias_critico) || 5,
    requer_receita: Boolean(produto.requer_receita),
    antecedencia_receita_dias: Number(produto.antecedencia_receita_dias) || 0,
    receita_validade: produto.receita_validade || null,
    medicamento_ids: Array.isArray(produto.medicamento_ids) ? produto.medicamento_ids : [],
    quantidade_por_administracao: produto.quantidade_por_administracao ? Number(produto.quantidade_por_administracao) : null
  };

  const { data, error } = await supabase
    .from('estoque_produtos')
    .insert([dados])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um produto existente.
 * @param {string} id
 * @param {Object} produto
 */
export async function atualizarProduto(id, produto) {
  const supabase = getSupabaseClient();
  const dados = {
    nome: produto.nome.trim(),
    categoria: produto.categoria,
    marca_preferida: produto.marca_preferida?.trim() || null,
    observacoes: produto.observacoes?.trim() || null,
    unidade_base: produto.unidade_base.trim(),
    embalagem_nome: produto.embalagem_nome.trim(),
    embalagem_quantidade: Number(produto.embalagem_quantidade),
    modo_consumo: produto.modo_consumo || 'taxa',
    consumo_diario_base: produto.consumo_diario_base ? Number(produto.consumo_diario_base) : null,
    estoque_minimo_base: produto.estoque_minimo_base ? Number(produto.estoque_minimo_base) : null,
    estoque_atencao_base: produto.estoque_atencao_base ? Number(produto.estoque_atencao_base) : null,
    dias_atencao: Number(produto.dias_atencao) || 15,
    dias_critico: Number(produto.dias_critico) || 5,
    requer_receita: Boolean(produto.requer_receita),
    antecedencia_receita_dias: Number(produto.antecedencia_receita_dias) || 0,
    receita_validade: produto.receita_validade || null,
    medicamento_ids: Array.isArray(produto.medicamento_ids) ? produto.medicamento_ids : [],
    quantidade_por_administracao: produto.quantidade_por_administracao ? Number(produto.quantidade_por_administracao) : null
  };

  const { data, error } = await supabase
    .from('estoque_produtos')
    .update(dados)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Arquiva um produto.
 * @param {string} id
 */
export async function arquivarProduto(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_produtos')
    .update({ arquivado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Desarquiva um produto.
 * @param {string} id
 */
export async function desarquivarProduto(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_produtos')
    .update({ arquivado_em: null })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra conferência física do produto.
 * @param {string} produtoId
 * @param {number} quantidadeBase
 * @param {string} [observacao]
 */
export async function registrarConferencia(produtoId, quantidadeBase, observacao = '') {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_movimentos')
    .insert([{
      produto_id: produtoId,
      tipo: 'conferencia',
      quantidade_base: Number(quantidadeBase),
      observacao: observacao?.trim() || null,
      origem: 'aba_estoque'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra entrada (compra, doação, etc.).
 * @param {string} produtoId
 * @param {number} quantidadeBase
 * @param {string} motivo
 * @param {string} [observacao]
 * @param {number|null} [valorPago]
 * @param {string|null} [localCompra]
 */
export async function registrarEntrada(produtoId, quantidadeBase, motivo = 'compra', observacao = '', valorPago = null, localCompra = null) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_movimentos')
    .insert([{
      produto_id: produtoId,
      tipo: 'entrada',
      quantidade_base: Number(quantidadeBase),
      motivo,
      observacao: observacao?.trim() || null,
      valor_pago: valorPago ? Number(valorPago) : null,
      local_compra: localCompra?.trim() || null,
      origem: 'aba_estoque'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra saída (uso no modo mínimo, perda, vencimento).
 * @param {string} produtoId
 * @param {number} quantidadeBase
 * @param {string} motivo
 * @param {string} [observacao]
 */
export async function registrarSaida(produtoId, quantidadeBase, motivo = 'uso', observacao = '') {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_movimentos')
    .insert([{
      produto_id: produtoId,
      tipo: 'saida',
      quantidade_base: Number(quantidadeBase),
      motivo,
      observacao: observacao?.trim() || null,
      origem: 'aba_estoque'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra estorno de um movimento anterior (com motivo obrigatório).
 * @param {string} movimentoId
 * @param {string} produtoId
 * @param {string} motivo
 */
export async function registrarEstorno(movimentoId, produtoId, motivo) {
  if (!motivo || !motivo.trim()) {
    throw new Error('Motivo do estorno é obrigatório');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_movimentos')
    .insert([{
      produto_id: produtoId,
      tipo: 'estorno',
      estorna_movimento_id: movimentoId,
      motivo: motivo.trim(),
      observacao: motivo.trim(),
      origem: 'aba_estoque'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra sinalização "está acabando".
 * @param {string} produtoId
 * @param {string} [observacao]
 */
export async function registrarSinalizacao(produtoId, observacao = '') {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estoque_sinalizacoes')
    .insert([{
      produto_id: produtoId,
      observacao: observacao?.trim() || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assume uma compra via RPC ("Eu compro").
 * @param {string} produtoId
 */
export async function assumirCompra(produtoId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('estoque_assumir_compra', {
    p_produto: produtoId
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('já foi assumida') || msg.includes('unique') || error.code === '23505') {
      throw new Error('Outro irmão já assumiu a compra deste item.');
    }
    throw error;
  }
  return data;
}

/**
 * Desiste de uma compra assumida.
 * @param {string} compraId
 */
export async function desistirCompra(compraId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('estoque_desistir_compra', {
    p_compra: compraId
  });

  if (error) throw error;
  return data;
}

/**
 * Conclui uma compra de forma atômica (insere movimento de entrada e finaliza a compra).
 * @param {string} compraId
 * @param {number} quantidadeBase
 * @param {number|null} valorPago
 * @param {string|null} local
 */
export async function concluirCompra(compraId, quantidadeBase, valorPago = null, local = null) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('estoque_concluir_compra', {
    p_compra: compraId,
    p_quantidade_base: Number(quantidadeBase),
    p_valor_pago: valorPago ? Number(valorPago) : null,
    p_local: local?.trim() || null
  });

  if (error) throw error;
  return data;
}

/**
 * Configura canal de Realtime dedicado para o estoque.
 * @param {Function} onMudanca
 * @returns {{ unsubscribe: Function }}
 */
export function assinarRealtimeEstoque(onMudanca, cliente = null) {
  const supabase = cliente || getSupabaseClient();
  if (!supabase || !supabase.channel) {
    return { unsubscribe: () => {} };
  }

  // Nome ÚNICO por assinatura: o selo da navegação e a aba assinam ao mesmo tempo. O supabase-js
  // devolve o canal já existente quando o nome repete, e adicionar callbacks depois do subscribe()
  // lança erro. Cada assinatura também remove só o próprio canal.
  const canal = supabase
    .channel(`estoque_rt_${novoIdCanal()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, () => onMudanca('produtos'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_movimentos' }, () => onMudanca('movimentos'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_sinalizacoes' }, () => onMudanca('sinalizacoes'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_compras' }, () => onMudanca('compras'))
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(canal);
    }
  };
}

function novoIdCanal() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
