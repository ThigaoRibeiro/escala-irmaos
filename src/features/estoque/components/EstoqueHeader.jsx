import React from 'react';
import { Plus, Sparkles, MessageCircle, Search, Archive } from 'lucide-react';

const CATEGORIAS_LISTA = [
  { id: 'todas', label: 'Todas' },
  { id: 'fraldas_incontinencia', label: 'Fraldas' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'cuidados_pele', label: 'Pele' },
  { id: 'curativos', label: 'Curativos' },
  { id: 'medicamentos', label: 'Medicamentos' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'outros', label: 'Outros' }
];

export default function EstoqueHeader({
  contadores,
  filtroSituacao,
  onFiltrarSituacao,
  termoBusca,
  onMudarBusca,
  categoriaSelecionada,
  onMudarCategoria,
  mostrarArquivados,
  onToggleArquivados,
  onAbrirNovoItem,
  onAbrirSugeridos,
  onAbrirWhatsApp
}) {
  return (
    <header className="est-header">
      <div className="est-header-top">
        <div className="est-title-area">
          <h1 className="est-title">Estoque da Mãe</h1>
        </div>
        <div className="est-actions-top">
          <button
            type="button"
            className="est-btn est-btn-secondary"
            onClick={onAbrirWhatsApp}
            title="Copiar ou enviar resumo pelo WhatsApp"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            className="est-btn est-btn-secondary"
            onClick={onAbrirSugeridos}
            title="Itens sugeridos para a casa ou da agenda"
          >
            <Sparkles size={16} />
            <span>Sugeridos</span>
          </button>
          <button
            type="button"
            className="est-btn est-btn-primary"
            onClick={onAbrirNovoItem}
            title="Cadastrar novo produto"
          >
            <Plus size={16} />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Grid de Resumo / Filtros Rápidos */}
      <div className="est-summary-grid" role="region" aria-label="Resumo por situação">
        <button
          type="button"
          className={`est-summary-chip ${filtroSituacao === 'acabou' ? 'est-summary-chip-active' : ''}`}
          onClick={() => onFiltrarSituacao(filtroSituacao === 'acabou' ? null : 'acabou')}
          title="Filtrar itens que acabaram"
        >
          <div className="est-summary-icon-count">
            <span>⚫</span>
            <span>{contadores.acabou || 0}</span>
          </div>
          <span className="est-summary-label">Acabou</span>
        </button>

        <button
          type="button"
          className={`est-summary-chip ${filtroSituacao === 'critico' ? 'est-summary-chip-active' : ''}`}
          onClick={() => onFiltrarSituacao(filtroSituacao === 'critico' ? null : 'critico')}
          title="Filtrar itens para comprar agora"
        >
          <div className="est-summary-icon-count">
            <span>🔴</span>
            <span>{contadores.critico || 0}</span>
          </div>
          <span className="est-summary-label">Comprar</span>
        </button>

        <button
          type="button"
          className={`est-summary-chip ${filtroSituacao === 'atencao' ? 'est-summary-chip-active' : ''}`}
          onClick={() => onFiltrarSituacao(filtroSituacao === 'atencao' ? null : 'atencao')}
          title="Filtrar itens para pesquisar preço"
        >
          <div className="est-summary-icon-count">
            <span>🟡</span>
            <span>{contadores.atencao || 0}</span>
          </div>
          <span className="est-summary-label">De olho</span>
        </button>

        <button
          type="button"
          className={`est-summary-chip ${filtroSituacao === 'sem_conferencia' ? 'est-summary-chip-active' : ''}`}
          onClick={() => onFiltrarSituacao(filtroSituacao === 'sem_conferencia' ? null : 'sem_conferencia')}
          title="Filtrar itens sem conferência registrada"
        >
          <div className="est-summary-icon-count">
            <span>⚪</span>
            <span>{contadores.sem_conferencia || 0}</span>
          </div>
          <span className="est-summary-label">Sem conf.</span>
        </button>

        <button
          type="button"
          className={`est-summary-chip ${filtroSituacao === 'ok' ? 'est-summary-chip-active' : ''}`}
          onClick={() => onFiltrarSituacao(filtroSituacao === 'ok' ? null : 'ok')}
          title="Filtrar itens confortáveis"
        >
          <div className="est-summary-icon-count">
            <span>🟢</span>
            <span>{contadores.ok || 0}</span>
          </div>
          <span className="est-summary-label">Ok</span>
        </button>
      </div>

      {/* Busca e Categorias */}
      <div className="est-filters-row">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
          <input
            type="search"
            className="est-search-input"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por nome, marca ou observação..."
            value={termoBusca}
            onChange={(e) => onMudarBusca(e.target.value)}
          />
        </div>

        <div className="est-category-chips">
          {CATEGORIAS_LISTA.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`est-category-chip ${categoriaSelecionada === cat.id ? 'est-category-chip-active' : ''}`}
              onClick={() => onMudarCategoria(cat.id)}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            className={`est-category-chip ${mostrarArquivados ? 'est-category-chip-active' : ''}`}
            onClick={onToggleArquivados}
            title="Alternar exibição de itens arquivados"
          >
            <Archive size={14} style={{ marginRight: 4 }} />
            Arquivados
          </button>
        </div>
      </div>
    </header>
  );
}
