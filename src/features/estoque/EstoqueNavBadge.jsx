import React, { useState, useEffect, useMemo } from 'react';
import { buscarDadosEstoque, assinarRealtimeEstoque } from './data/estoqueService.js';
import { calcularItens, contarPorSituacao, contarUrgentes } from './domain/resumo.js';

const SEM_DADOS = { produtos: [], movimentos: [], sinalizacoes: [] };

/**
 * Selo da aba Estoque: quantidade de itens ⚫ acabou + 🔴 comprar agora.
 * Usa a mesma contagem do cabeçalho da aba (domain/resumo.js), inclusive a agenda de remédios.
 * Qualquer falha (ou tabelas ausentes) resulta em nenhum selo; nunca derruba a navegação.
 */
export default function EstoqueNavBadge({ medications = [] }) {
  const [dados, setDados] = useState(SEM_DADOS);

  useEffect(() => {
    let montado = true;

    async function atualizar() {
      try {
        const res = await buscarDadosEstoque(false);
        if (!montado) return;
        if (!res.sucesso || res.tabelasAusentes) {
          setDados(SEM_DADOS);
          return;
        }
        setDados({
          produtos: res.produtos || [],
          movimentos: res.movimentos || [],
          sinalizacoes: res.sinalizacoes || []
        });
      } catch {
        if (montado) setDados(SEM_DADOS);
      }
    }

    atualizar();
    const sub = assinarRealtimeEstoque(() => {
      atualizar();
    });

    return () => {
      montado = false;
      if (sub && sub.unsubscribe) sub.unsubscribe();
    };
  }, []);

  const contagemUrgente = useMemo(() => {
    const itens = calcularItens(dados.produtos, dados.movimentos, dados.sinalizacoes, medications, new Date());
    return contarUrgentes(contarPorSituacao(itens));
  }, [dados, medications]);

  if (!contagemUrgente || contagemUrgente <= 0) {
    return null;
  }

  return (
    <span
      className="est-nav-badge"
      aria-label={`${contagemUrgente} itens críticos no estoque`}
      data-testid="estoque-nav-badge"
    >
      {contagemUrgente > 99 ? '99+' : contagemUrgente}
    </span>
  );
}
