import React, { useState, useEffect } from 'react';
import { buscarDadosEstoque, assinarRealtimeEstoque } from './data/estoqueService.js';
import { calcularSaldoEProjecao } from './domain/saldo.js';

export default function EstoqueNavBadge() {
  const [contagemUrgente, setContagemUrgente] = useState(0);

  useEffect(() => {
    let montado = true;

    async function atualizarContagem() {
      try {
        const res = await buscarDadosEstoque(false);
        if (!montado) return;
        if (!res.sucesso || res.tabelasAusentes) {
          setContagemUrgente(0);
          return;
        }

        const { produtos = [], movimentos = [], sinalizacoes = [] } = res;
        const agora = new Date();
        let urgentes = 0;

        for (const prod of produtos) {
          const calc = calcularSaldoEProjecao(prod, movimentos, sinalizacoes, [], agora);
          if (calc.situacao === 'acabou' || calc.situacao === 'critico') {
            urgentes++;
          }
        }

        setContagemUrgente(urgentes);
      } catch {
        if (montado) setContagemUrgente(0);
      }
    }

    atualizarContagem();
    const sub = assinarRealtimeEstoque(() => {
      atualizarContagem();
    });

    return () => {
      montado = false;
      if (sub && sub.unsubscribe) sub.unsubscribe();
    };
  }, []);

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
