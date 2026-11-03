/**
 * Funções puras de cálculo de saldo, projeção e situação de estoque.
 * Todas as funções recebem `agora` e são imunes ao fuso horário local.
 */

/**
 * Formata data em pt-BR no fuso de America/Sao_Paulo.
 * @param {Date|string|number} data
 * @param {boolean} [incluirAno=false]
 * @returns {string}
 */
export function formatarDataPtBr(data, incluirAno = false) {
  if (!data) return '';
  const d = data instanceof Date ? data : new Date(data);
  if (isNaN(d.getTime())) return '';

  const opcoes = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    ...(incluirAno ? { year: 'numeric' } : {})
  };

  return new Intl.DateTimeFormat('pt-BR', opcoes).format(d);
}

/**
 * Calcula o consumo diário efetivo do produto, verificando vínculo com a agenda de remédios.
 * O texto da coluna `dose` NUNCA é interpretado.
 *
 * @param {Object} produto
 * @param {Array} medications
 * @returns {{ consumoDiario: number, vinculoOrigem: string, vinculoMudou: boolean, vinculoQuebradoSemManual: boolean }}
 */
export function calcularConsumoDiario(produto, medications = []) {
  const linkedIds = Array.isArray(produto.medicamento_ids) ? produto.medicamento_ids : [];
  const qtdPorAdmin = Number(produto.quantidade_por_administracao);
  const consumoManual = Number(produto.consumo_diario_base);

  // Se tem vínculo configurado com a agenda (IDs + quantidade por administração)
  if (linkedIds.length > 0 && qtdPorAdmin > 0) {
    const existingMeds = (medications || []).filter(med => linkedIds.includes(String(med.id)));

    if (existingMeds.length === linkedIds.length) {
      return {
        consumoDiario: existingMeds.length * qtdPorAdmin,
        vinculoOrigem: `pela agenda (${existingMeds.length} horário${existingMeds.length > 1 ? 's' : ''} × ${qtdPorAdmin} ${produto.unidade_base || 'un'})`,
        vinculoMudou: false,
        vinculoQuebradoSemManual: false
      };
    }

    if (existingMeds.length > 0) {
      return {
        consumoDiario: existingMeds.length * qtdPorAdmin,
        vinculoOrigem: `pela agenda (${existingMeds.length} de ${linkedIds.length} horários restantes)`,
        vinculoMudou: true,
        vinculoQuebradoSemManual: false
      };
    }

    // Vínculo totalmente quebrado (nenhuma linha existe mais na agenda)
    if (consumoManual > 0) {
      return {
        consumoDiario: consumoManual,
        vinculoOrigem: 'manual (vínculo com a agenda mudou)',
        vinculoMudou: true,
        vinculoQuebradoSemManual: false
      };
    }

    return {
      consumoDiario: 0,
      vinculoOrigem: 'vínculo com a agenda quebrado',
      vinculoMudou: true,
      vinculoQuebradoSemManual: true
    };
  }

  // Consumo manual
  if (consumoManual > 0) {
    return {
      consumoDiario: consumoManual,
      vinculoOrigem: 'manual',
      vinculoMudou: false,
      vinculoQuebradoSemManual: false
    };
  }

  return {
    consumoDiario: 0,
    vinculoOrigem: 'não configurado',
    vinculoMudou: false,
    vinculoQuebradoSemManual: false
  };
}

/**
 * Calcula saldo, projeção e situação de um produto.
 *
 * @param {Object} produto
 * @param {Array} [movimentos=[]]
 * @param {Array} [sinalizacoes=[]]
 * @param {Array} [medications=[]]
 * @param {Date|string|number} [agora=new Date()]
 * @returns {Object}
 */
export function calcularSaldoEProjecao(produto, movimentos = [], sinalizacoes = [], medications = [], agora = new Date()) {
  const agoraDate = agora instanceof Date ? agora : new Date(agora);
  const agoraMs = agoraDate.getTime();

  // 1. Filtrar movimentos do produto e descartar estornos e movimentos estornados
  const prodMovs = (movimentos || []).filter(m => m.produto_id === produto.id);

  const idsEstornados = new Set();
  for (const m of prodMovs) {
    if (m.tipo === 'estorno' && m.estorna_movimento_id) {
      idsEstornados.add(m.estorna_movimento_id);
    }
  }

  const movsValidos = prodMovs.filter(m => m.tipo !== 'estorno' && !idsEstornados.has(m.id));

  // 2. Localizar a âncora: conferência válida mais recente por ocorrido_em (empate: registrado_em)
  const conferencias = movsValidos.filter(m => m.tipo === 'conferencia');

  if (conferencias.length === 0) {
    return {
      produtoId: produto.id,
      temConferencia: false,
      situacao: 'sem_conferencia',
      situacaoLabel: 'Sem conferência',
      situacaoIcon: '⚪',
      saldo: null,
      saldoEstimado: null,
      diasRestantes: null,
      previsaoTermino: null,
      previsaoTerminoFormatada: null,
      ancora: null,
      conferirDeNovo: false,
      sinalizacaoPendente: null,
      consumoDiario: 0,
      vinculoOrigem: 'Sem conferência',
      vinculoMudou: false,
      receitaStatus: null
    };
  }

  conferencias.sort((a, b) => {
    const timeA = new Date(a.ocorrido_em).getTime();
    const timeB = new Date(b.ocorrido_em).getTime();
    if (timeA !== timeB) return timeB - timeA;

    const regA = new Date(a.registrado_em || a.ocorrido_em).getTime();
    const regB = new Date(b.registrado_em || b.ocorrido_em).getTime();
    if (regA !== regB) return regB - regA;

    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  const ancora = conferencias[0];
  const ancoraOcorridoMs = new Date(ancora.ocorrido_em).getTime();
  const ancoraRegistradoMs = new Date(ancora.registrado_em || ancora.ocorrido_em).getTime();

  // 3. Saldo base = ancora.quantidade + soma(entradas após âncora) - soma(saídas após âncora)
  let somaEntradas = 0;
  let somaSaidas = 0;

  for (const m of movsValidos) {
    if (m.tipo === 'conferencia') continue;

    const mOcorridoMs = new Date(m.ocorrido_em).getTime();
    const mRegistradoMs = new Date(m.registrado_em || m.ocorrido_em).getTime();

    // Movimento posterior à âncora
    const isPosterior = mOcorridoMs > ancoraOcorridoMs ||
      (mOcorridoMs === ancoraOcorridoMs && mRegistradoMs > ancoraRegistradoMs);

    if (isPosterior) {
      const qtd = Number(m.quantidade_base) || 0;
      if (m.tipo === 'entrada') {
        somaEntradas += qtd;
      } else if (m.tipo === 'saida') {
        somaSaidas += qtd;
      }
    }
  }

  const saldo = Math.max(0, (Number(ancora.quantidade_base) || 0) + somaEntradas - somaSaidas);

  // 4. Consumo e projeção
  const modoConsumo = produto.modo_consumo || 'taxa';
  const infoConsumo = calcularConsumoDiario(produto, medications);
  const consumoDiario = infoConsumo.consumoDiario;

  let saldoEstimado = saldo;
  let diasRestantes = null;
  let previsaoTermino = null;
  let previsaoTerminoFormatada = null;

  if (modoConsumo === 'taxa') {
    // Dias decorridos desde a âncora (fracionário em ms, imune a timezone)
    const diasDecorridos = Math.max(0, (agoraMs - ancoraOcorridoMs) / 86400000);
    saldoEstimado = Math.max(0, saldo - (consumoDiario * diasDecorridos));

    if (consumoDiario > 0) {
      diasRestantes = saldoEstimado / consumoDiario;
      if (diasRestantes > 0) {
        previsaoTermino = new Date(agoraMs + diasRestantes * 86400000);
        previsaoTerminoFormatada = formatarDataPtBr(previsaoTermino);
      }
    } else {
      diasRestantes = Infinity;
    }
  }

  // 5. Determinação da situação e limiares
  const antecedencia = produto.requer_receita ? (Number(produto.antecedencia_receita_dias) >= 0 ? Number(produto.antecedencia_receita_dias) : 7) : 0;
  const diasCritico = (Number(produto.dias_critico) >= 0 ? Number(produto.dias_critico) : 5) + antecedencia;
  const diasAtencao = (Number(produto.dias_atencao) >= 0 ? Number(produto.dias_atencao) : 15) + antecedencia;

  let situacao = 'ok';
  let situacaoLabel = 'Ok';
  let situacaoIcon = '🟢';

  if (modoConsumo === 'taxa') {
    if (infoConsumo.vinculoQuebradoSemManual) {
      situacao = 'sem_conferencia';
      situacaoLabel = 'Vínculo com a agenda quebrado';
      situacaoIcon = '⚪';
    } else if (saldoEstimado <= 0) {
      situacao = 'acabou';
      situacaoLabel = 'Acabou';
      situacaoIcon = '⚪';
    } else if (diasRestantes <= diasCritico) {
      situacao = 'critico';
      situacaoLabel = 'Comprar agora';
      situacaoIcon = '🔴';
    } else if (diasRestantes <= diasAtencao) {
      situacao = 'atencao';
      situacaoLabel = 'Ficar de olho';
      situacaoIcon = '🟡';
    } else {
      situacao = 'ok';
      situacaoLabel = 'Ok';
      situacaoIcon = '🟢';
    }
  } else {
    // modo minimo
    const minBase = Number(produto.estoque_minimo_base) || 0;
    const atencaoBase = Number(produto.estoque_atencao_base) || minBase;

    if (saldo <= 0) {
      situacao = 'acabou';
      situacaoLabel = 'Acabou';
      situacaoIcon = '⚪';
    } else if (saldo <= minBase) {
      situacao = 'critico';
      situacaoLabel = 'Comprar agora';
      situacaoIcon = '🔴';
    } else if (saldo <= atencaoBase) {
      situacao = 'atencao';
      situacaoLabel = 'Ficar de olho';
      situacaoIcon = '🟡';
    } else {
      situacao = 'ok';
      situacaoLabel = 'Ok';
      situacaoIcon = '🟢';
    }
  }

  // 6. Verificar sinalização pendente
  // Pendente se criada após a última conferência ou entrada
  let ultimoMovConferidoOuEntradaMs = ancoraOcorridoMs;
  for (const m of movsValidos) {
    if (m.tipo === 'conferencia' || m.tipo === 'entrada') {
      const t = new Date(m.ocorrido_em).getTime();
      if (t > ultimoMovConferidoOuEntradaMs) {
        ultimoMovConferidoOuEntradaMs = t;
      }
    }
  }

  const prodSinais = (sinalizacoes || []).filter(s => s.produto_id === produto.id);
  const sinaisPendentes = prodSinais.filter(s => {
    const t = new Date(s.criado_em).getTime();
    return t > ultimoMovConferidoOuEntradaMs;
  });

  let sinalizacaoPendente = null;
  if (sinaisPendentes.length > 0) {
    sinaisPendentes.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    sinalizacaoPendente = sinaisPendentes[0];

    // Sinalização pendente eleva situação para pelo menos 🟡 Ficar de olho
    if (situacao === 'ok') {
      situacao = 'atencao';
      situacaoLabel = 'Ficar de olho (sinalizado)';
      situacaoIcon = '🟡';
    }
  }

  // 7. Conferência antiga (modo taxa > 30 dias)
  const conferirDeNovo = modoConsumo === 'taxa' && ((agoraMs - ancoraOcorridoMs) / 86400000 > 30);

  // 8. Receita status
  let receitaStatus = null;
  if (produto.requer_receita) {
    if (produto.receita_validade) {
      const validadeMs = new Date(produto.receita_validade + 'T23:59:59.999Z').getTime();
      if (validadeMs < agoraMs) {
        receitaStatus = { tipo: 'vencida', texto: 'Receita vencida' };
      } else {
        const diasAteValidade = Math.ceil((validadeMs - agoraMs) / 86400000);
        const diasRef = Number(produto.dias_atencao) || 15;
        if (diasAteValidade <= diasRef) {
          receitaStatus = {
            tipo: 'vencendo',
            texto: `Receita vence em ${diasAteValidade} dia${diasAteValidade > 1 ? 's' : ''}`,
            dias: diasAteValidade
          };
        }
      }
    }
  }

  return {
    produtoId: produto.id,
    temConferencia: true,
    situacao,
    situacaoLabel,
    situacaoIcon,
    saldo,
    saldoEstimado,
    diasRestantes,
    previsaoTermino,
    previsaoTerminoFormatada,
    ancora,
    conferirDeNovo,
    sinalizacaoPendente,
    consumoDiario,
    vinculoOrigem: infoConsumo.vinculoOrigem,
    vinculoMudou: infoConsumo.vinculoMudou,
    receitaStatus
  };
}
