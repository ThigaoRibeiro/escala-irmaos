/**
 * Catálogo de itens sugeridos para primeiro abastecimento da lista de estoque.
 * Editável pelo usuário antes de salvar; não é seed fixo de banco.
 */

export const ITENS_SUGERIDOS = [
  {
    nome: 'Fralda geriátrica G',
    categoria: 'fraldas_incontinencia',
    unidade_base: 'fralda',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 20,
    modo_consumo: 'taxa',
    consumo_diario_base: 6,
    dias_atencao: 15,
    dias_critico: 5,
    observacoes: 'Tamanho G'
  },
  {
    nome: 'Roupa íntima descartável (Pants)',
    categoria: 'fraldas_incontinencia',
    unidade_base: 'unidade',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 16,
    modo_consumo: 'taxa',
    consumo_diario_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Lenço umedecido',
    categoria: 'higiene',
    unidade_base: 'lenço',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 50,
    modo_consumo: 'taxa',
    consumo_diario_base: 10,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Lençol / forro descartável',
    categoria: 'fraldas_incontinencia',
    unidade_base: 'unidade',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 10,
    modo_consumo: 'taxa',
    consumo_diario_base: 1,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Creme preventivo de assaduras',
    categoria: 'cuidados_pele',
    unidade_base: 'g',
    embalagem_nome: 'tubo',
    embalagem_quantidade: 100,
    modo_consumo: 'taxa',
    consumo_diario_base: 5,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Hidratante corporal',
    categoria: 'cuidados_pele',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 400,
    modo_consumo: 'taxa',
    consumo_diario_base: 15,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Luvas descartáveis M',
    categoria: 'higiene',
    unidade_base: 'luva',
    embalagem_nome: 'caixa',
    embalagem_quantidade: 100,
    modo_consumo: 'taxa',
    consumo_diario_base: 10,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Sabonete líquido',
    categoria: 'higiene',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 500,
    modo_consumo: 'taxa',
    consumo_diario_base: 20,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Shampoo',
    categoria: 'higiene',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 400,
    modo_consumo: 'taxa',
    consumo_diario_base: 10,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Condicionador',
    categoria: 'higiene',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 400,
    modo_consumo: 'taxa',
    consumo_diario_base: 10,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Creme dental',
    categoria: 'higiene',
    unidade_base: 'tubo',
    embalagem_nome: 'tubo',
    embalagem_quantidade: 1,
    modo_consumo: 'minimo',
    estoque_minimo_base: 1,
    estoque_atencao_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Escova de dentes',
    categoria: 'higiene',
    unidade_base: 'unidade',
    embalagem_nome: 'unidade',
    embalagem_quantidade: 1,
    modo_consumo: 'minimo',
    estoque_minimo_base: 1,
    estoque_atencao_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Enxaguante bucal sem álcool',
    categoria: 'higiene',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 500,
    modo_consumo: 'taxa',
    consumo_diario_base: 20,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Desodorante',
    categoria: 'higiene',
    unidade_base: 'frasco',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 1,
    modo_consumo: 'minimo',
    estoque_minimo_base: 1,
    estoque_atencao_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Algodão',
    categoria: 'cuidados_pele',
    unidade_base: 'pacote',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 1,
    modo_consumo: 'minimo',
    estoque_minimo_base: 1,
    estoque_atencao_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Gaze esterilizada',
    categoria: 'curativos',
    unidade_base: 'pacote',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 10,
    modo_consumo: 'minimo',
    estoque_minimo_base: 5,
    estoque_atencao_base: 10,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Soro fisiológico 0,9%',
    categoria: 'curativos',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 500,
    modo_consumo: 'minimo',
    estoque_minimo_base: 500,
    estoque_atencao_base: 1000,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Álcool 70%',
    categoria: 'limpeza',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 1000,
    modo_consumo: 'minimo',
    estoque_minimo_base: 500,
    estoque_atencao_base: 1000,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Cotonete (hastes flexíveis)',
    categoria: 'higiene',
    unidade_base: 'haste',
    embalagem_nome: 'caixa',
    embalagem_quantidade: 75,
    modo_consumo: 'minimo',
    estoque_minimo_base: 30,
    estoque_atencao_base: 75,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Papel higiênico',
    categoria: 'higiene',
    unidade_base: 'rolo',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 12,
    modo_consumo: 'taxa',
    consumo_diario_base: 1,
    dias_atencao: 15,
    dias_critico: 5
  },
  {
    nome: 'Sacos de lixo 30L',
    categoria: 'limpeza',
    unidade_base: 'saco',
    embalagem_nome: 'rolo',
    embalagem_quantidade: 30,
    modo_consumo: 'taxa',
    consumo_diario_base: 2,
    dias_atencao: 15,
    dias_critico: 5
  }
];

/**
 * Cria lista de produtos sugeridos a partir da agenda de remédios existente.
 * Agrupa medicamentos pelo nome para produtos não cadastrados ainda.
 *
 * @param {Array} medications
 * @param {Array} [produtosExistentes=[]]
 * @returns {Array}
 */
export function criarItensSugeridosDaAgenda(medications = [], produtosExistentes = []) {
  if (!Array.isArray(medications) || medications.length === 0) return [];

  const nomesCadastrados = new Set(
    (produtosExistentes || []).map(p => String(p.nome || '').trim().toLowerCase())
  );

  // Agrupa remédios por nome normalizado
  const grupos = new Map();
  for (const med of medications) {
    if (!med.name) continue;
    const nomeLimpo = med.name.trim();
    const chave = nomeLimpo.toLowerCase();

    if (nomesCadastrados.has(chave)) continue;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        nome: nomeLimpo,
        medicationIds: []
      });
    }

    grupos.get(chave).medicationIds.push(String(med.id));
  }

  const sugeridos = [];
  for (const [, item] of grupos) {
    sugeridos.push({
      nome: item.nome,
      categoria: 'medicamentos',
      unidade_base: 'comprimido',
      embalagem_nome: 'caixa',
      embalagem_quantidade: 30,
      modo_consumo: 'taxa',
      medicamento_ids: item.medicationIds,
      quantidade_por_administracao: 1,
      requer_receita: false,
      antecedencia_receita_dias: 7,
      dias_atencao: 15,
      dias_critico: 5
    });
  }

  return sugeridos;
}
