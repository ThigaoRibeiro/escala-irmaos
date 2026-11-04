import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './estoque.css';
import { USER_MAPPING } from '../../utils/db.js';
import {
  buscarDadosEstoque,
  criarProduto,
  atualizarProduto,
  arquivarProduto,
  desarquivarProduto,
  registrarConferencia,
  registrarEntrada,
  registrarSaida,
  registrarEstorno,
  registrarSinalizacao,
  assumirCompra,
  desistirCompra,
  concluirCompra,
  assinarRealtimeEstoque
} from './data/estoqueService.js';
import { calcularItens, contarPorSituacao } from './domain/resumo.js';
import { ordenarItensEstoque } from './domain/ordenacao.js';

import EstoqueHeader from './components/EstoqueHeader.jsx';
import EstoqueCard from './components/EstoqueCard.jsx';
import EstoqueConferenciaModal from './components/EstoqueConferenciaModal.jsx';
import EstoqueCompraModal from './components/EstoqueCompraModal.jsx';
import EstoqueSaidaModal from './components/EstoqueSaidaModal.jsx';
import EstoqueHistoricoModal from './components/EstoqueHistoricoModal.jsx';
import EstoqueProdutoModal from './components/EstoqueProdutoModal.jsx';
import EstoqueSugeridosModal from './components/EstoqueSugeridosModal.jsx';
import EstoqueWhatsAppModal from './components/EstoqueWhatsAppModal.jsx';
import EstoqueErrorBoundary from './components/EstoqueErrorBoundary.jsx';

import { AlertCircle, RefreshCw, Sparkles, Plus, AlertTriangle } from 'lucide-react';

export function EstoqueTabContent({
  medications = [],
  caregivers = [],
  currentUserEmail = ''
}) {
  const [produtos, setProdutos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [sinalizacoes, setSinalizacoes] = useState([]);
  const [compras, setCompras] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [tabelasAusentes, setTabelasAusentes] = useState(false);
  const [erro, setErro] = useState('');
  const [avisoRealtime, setAvisoRealtime] = useState('');

  // Filtros
  const [filtroSituacao, setFiltroSituacao] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  // Modais ativos
  const [modalConferenciaProd, setModalConferenciaProd] = useState(null);
  const [modalCompraProd, setModalCompraProd] = useState(null);
  const [modalCompraAssumida, setModalCompraAssumida] = useState(null);
  const [modalSaidaProd, setModalSaidaProd] = useState(null);
  const [modalHistoricoProd, setModalHistoricoProd] = useState(null);
  const [modalEditandoProd, setModalEditandoProd] = useState(null);
  const [modalNovoProdAberto, setModalNovoProdAberto] = useState(false);
  const [modalSugeridosAberto, setModalSugeridosAberto] = useState(false);
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false);

  const carregarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    setErro('');

    try {
      const res = await buscarDadosEstoque(mostrarArquivados);
      if (res.tabelasAusentes) {
        setTabelasAusentes(true);
        setCarregando(false);
        return;
      }

      if (!res.sucesso) {
        setErro(res.erro || 'Falha ao carregar dados do estoque.');
        setCarregando(false);
        return;
      }

      setTabelasAusentes(false);
      setProdutos(res.produtos);
      setMovimentos(res.movimentos);
      setSinalizacoes(res.sinalizacoes);
      setCompras(res.compras);
    } catch (err) {
      setErro(err.message || 'Erro inesperado.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, [mostrarArquivados]);

  useEffect(() => {
    carregarDados();

    const sub = assinarRealtimeEstoque((tipo) => {
      setAvisoRealtime(`Atualizações em tempo real detectadas (${tipo})...`);
      setTimeout(() => setAvisoRealtime(''), 4000);
      carregarDados(true);
    });

    return () => {
      if (sub && sub.unsubscribe) sub.unsubscribe();
    };
  }, [carregarDados]);

  // Cálculos puros para cada produto
  const itensCalculados = useMemo(
    () => calcularItens(produtos, movimentos, sinalizacoes, medications, new Date()),
    [produtos, movimentos, sinalizacoes, medications]
  );

  // Mapa de compras assumidas por produto_id
  const comprasAssumidasMap = useMemo(() => {
    const mapa = new Map();
    for (const c of compras) {
      if (c.status === 'assumida' && c.produto_id) {
        mapa.set(c.produto_id, c);
      }
    }
    return mapa;
  }, [compras]);

  // Contagem para o header
  const contadores = useMemo(() => contarPorSituacao(itensCalculados), [itensCalculados]);

  // Filtragem
  const itensFiltrados = useMemo(() => {
    let lista = itensCalculados;

    // Filtro por situação
    if (filtroSituacao) {
      lista = lista.filter(item => item.calculo?.situacao === filtroSituacao);
    }

    // Filtro por categoria
    if (categoriaSelecionada && categoriaSelecionada !== 'todas') {
      lista = lista.filter(item => item.produto?.categoria === categoriaSelecionada);
    }

    // Filtro por busca
    if (termoBusca.trim()) {
      const termo = termoBusca.trim().toLowerCase();
      lista = lista.filter(item => {
        const nome = String(item.produto?.nome || '').toLowerCase();
        const marca = String(item.produto?.marca_preferida || '').toLowerCase();
        const obs = String(item.produto?.observacoes || '').toLowerCase();
        return nome.includes(termo) || marca.includes(termo) || obs.includes(termo);
      });
    }

    // Ordenação por urgência
    return ordenarItensEstoque(lista);
  }, [itensCalculados, filtroSituacao, categoriaSelecionada, termoBusca]);

  // Handlers de Ações
  const handleAssumirCompra = async (produto) => {
    try {
      setErro('');
      await assumirCompra(produto.id);
      await carregarDados(true);
    } catch (err) {
      alert(err.message || 'Não foi possível assumir a compra.');
    }
  };

  const handleDesistirCompra = async (compra) => {
    if (window.confirm('Tem certeza que deseja desistir da compra deste item?')) {
      try {
        setErro('');
        await desistirCompra(compra.id);
        await carregarDados(true);
      } catch (err) {
        alert(err.message || 'Erro ao desistir da compra.');
      }
    }
  };

  const handleSinalizar = async (produto) => {
    const obs = window.prompt(`Registrar aviso de que "${produto.nome}" está acabando:\n\nObservação opcional (ex: restam poucos pacotes no armário):`);
    if (obs !== null) {
      try {
        setErro('');
        await registrarSinalizacao(produto.id, obs);
        await carregarDados(true);
      } catch (err) {
        alert(err.message || 'Erro ao registrar sinalização.');
      }
    }
  };

  const handleAdicionarLoteSugeridos = async (itensSugeridos) => {
    for (const item of itensSugeridos) {
      await criarProduto(item);
    }
    await carregarDados(true);
  };

  // 1. Caso as tabelas não existam no banco
  if (tabelasAusentes) {
    return (
      <div className="est-container" data-testid="estoque-tabelas-ausentes">
        <div className="est-banner est-banner-unavailable">
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>
              Estoque ainda não configurado
            </strong>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              As tabelas de controle de estoque ainda não foram aplicadas ao banco de dados.
              As outras abas da aplicação (Escalas, Diário e Configurações) continuam funcionando normalmente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Estado de carregamento
  if (carregando) {
    return (
      <div className="est-container" style={{ textAlign: 'center', padding: '60px 0' }} data-testid="estoque-loading">
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Carregando estoque da casa...
        </div>
      </div>
    );
  }

  return (
    <div className="est-container" data-testid="estoque-tab-container">
      {avisoRealtime && (
        <div className="est-banner est-banner-warning" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          {avisoRealtime}
        </div>
      )}

      {erro && (
        <div className="est-banner est-banner-error" role="alert">
          <AlertTriangle size={18} />
          <span>{erro}</span>
          <button
            type="button"
            className="est-btn est-btn-outline"
            style={{ minHeight: 44, fontSize: '0.75rem', marginLeft: 'auto' }}
            onClick={() => carregarDados()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <EstoqueHeader
        contadores={contadores}
        filtroSituacao={filtroSituacao}
        onFiltrarSituacao={setFiltroSituacao}
        termoBusca={termoBusca}
        onMudarBusca={setTermoBusca}
        categoriaSelecionada={categoriaSelecionada}
        onMudarCategoria={setCategoriaSelecionada}
        mostrarArquivados={mostrarArquivados}
        onToggleArquivados={() => setMostrarArquivados(prev => !prev)}
        onAbrirNovoItem={() => setModalNovoProdAberto(true)}
        onAbrirSugeridos={() => setModalSugeridosAberto(true)}
        onAbrirWhatsApp={() => setModalWhatsAppAberto(true)}
      />

      {/* Lista de Itens */}
      {itensFiltrados.length === 0 ? (
        produtos.length === 0 ? (
          // Estado vazio geral
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginTop: 16
          }} data-testid="estoque-vazio">
            <Sparkles size={36} style={{ color: 'var(--primary)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>
              Nenhum item cadastrado no estoque ainda
            </h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Adicione os itens essenciais de higiene, cuidados e remédios para começar a acompanhar o estoque da casa.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="est-btn est-btn-primary"
                onClick={() => setModalSugeridosAberto(true)}
              >
                <Sparkles size={16} />
                <span>Adicionar itens sugeridos</span>
              </button>
              <button
                type="button"
                className="est-btn est-btn-secondary"
                onClick={() => setModalNovoProdAberto(true)}
              >
                <Plus size={16} />
                <span>Cadastrar item avulso</span>
              </button>
            </div>
          </div>
        ) : (
          // Estado vazio por filtro de busca
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Nenhum produto encontrado com os filtros selecionados.
          </div>
        )
      ) : (
        <div className="est-lista-cards" data-testid="estoque-lista-cards">
          {itensFiltrados.map(({ produto, calculo }) => (
            <EstoqueCard
              key={produto.id}
              produto={produto}
              calculo={calculo}
              compraAssumida={comprasAssumidasMap.get(produto.id)}
              currentUserEmail={currentUserEmail}
              userMapping={USER_MAPPING}
              caregivers={caregivers}
              onConferir={(p) => setModalConferenciaProd(p)}
              onComprar={(p) => {
                setModalCompraAssumida(null);
                setModalCompraProd(p);
              }}
              onConcluirCompra={(p, compra) => {
                setModalCompraAssumida(compra);
                setModalCompraProd(p);
              }}
              onAssumirCompra={handleAssumirCompra}
              onDesistirCompra={handleDesistirCompra}
              onSinalizar={handleSinalizar}
              onSaida={(p) => setModalSaidaProd({ produto: p, saldo: calculo.saldoEstimado ?? calculo.saldo ?? 0 })}
              onHistorico={(p) => setModalHistoricoProd(p)}
              onEditar={(p) => setModalEditandoProd(p)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {modalConferenciaProd && (
        <EstoqueConferenciaModal
          produto={modalConferenciaProd}
          onConfirmar={async (id, qtd, obs) => {
            await registrarConferencia(id, qtd, obs);
            await carregarDados(true);
          }}
          onFechar={() => setModalConferenciaProd(null)}
        />
      )}

      {modalCompraProd && (
        <EstoqueCompraModal
          produto={modalCompraProd}
          compraAssumida={modalCompraAssumida}
          onConfirmarEntrada={async (id, qtd, motivo, obs, val, loc) => {
            await registrarEntrada(id, qtd, motivo, obs, val, loc);
            await carregarDados(true);
          }}
          onConcluirCompra={async (compraId, qtd, val, loc) => {
            await concluirCompra(compraId, qtd, val, loc);
            await carregarDados(true);
          }}
          onFechar={() => {
            setModalCompraProd(null);
            setModalCompraAssumida(null);
          }}
        />
      )}

      {modalSaidaProd && (
        <EstoqueSaidaModal
          produto={modalSaidaProd.produto}
          saldoAtual={modalSaidaProd.saldo}
          onConfirmarSaida={async (id, qtd, motivo, obs) => {
            await registrarSaida(id, qtd, motivo, obs);
            await carregarDados(true);
          }}
          onFechar={() => setModalSaidaProd(null)}
        />
      )}

      {modalHistoricoProd && (
        <EstoqueHistoricoModal
          produto={modalHistoricoProd}
          movimentos={movimentos.filter(m => m.produto_id === modalHistoricoProd.id)}
          userMapping={USER_MAPPING}
          caregivers={caregivers}
          onEstornar={async (movId, prodId, motivo) => {
            await registrarEstorno(movId, prodId, motivo);
            await carregarDados(true);
          }}
          onFechar={() => setModalHistoricoProd(null)}
        />
      )}

      {modalEditandoProd && (
        <EstoqueProdutoModal
          produto={modalEditandoProd}
          medications={medications}
          onSalvar={async (dados, id) => {
            await atualizarProduto(id, dados);
            await carregarDados(true);
          }}
          onArquivar={async (id) => {
            await arquivarProduto(id);
            await carregarDados(true);
          }}
          onDesarquivar={async (id) => {
            await desarquivarProduto(id);
            await carregarDados(true);
          }}
          onFechar={() => setModalEditandoProd(null)}
        />
      )}

      {modalNovoProdAberto && (
        <EstoqueProdutoModal
          medications={medications}
          onSalvar={async (dados) => {
            await criarProduto(dados);
            await carregarDados(true);
          }}
          onFechar={() => setModalNovoProdAberto(false)}
        />
      )}

      {modalSugeridosAberto && (
        <EstoqueSugeridosModal
          produtosExistentes={produtos}
          medications={medications}
          onAdicionarLote={handleAdicionarLoteSugeridos}
          onFechar={() => setModalSugeridosAberto(false)}
        />
      )}

      {modalWhatsAppAberto && (
        <EstoqueWhatsAppModal
          itens={itensCalculados}
          compras={compras}
          userMapping={USER_MAPPING}
          caregivers={caregivers}
          onFechar={() => setModalWhatsAppAberto(false)}
        />
      )}
    </div>
  );
}

export default function EstoqueTab(props) {
  return (
    <EstoqueErrorBoundary>
      <EstoqueTabContent {...props} />
    </EstoqueErrorBoundary>
  );
}
