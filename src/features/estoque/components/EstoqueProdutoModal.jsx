import React, { useState } from 'react';
import { X, Save, Archive, RotateCcw } from 'lucide-react';

export default function EstoqueProdutoModal({
  produto = null,
  medications = [],
  onSalvar,
  onArquivar,
  onDesarquivar,
  onFechar
}) {
  const isEdicao = Boolean(produto?.id);

  const [nome, setNome] = useState(produto?.nome || '');
  const [categoria, setCategoria] = useState(produto?.categoria || 'higiene');
  const [marcaPreferida, setMarcaPreferida] = useState(produto?.marca_preferida || '');
  const [observacoes, setObservacoes] = useState(produto?.observacoes || '');
  const [unidadeBase, setUnidadeBase] = useState(produto?.unidade_base || 'unidade');
  const [embalagemNome, setEmbalagemNome] = useState(produto?.embalagem_nome || 'pacote');
  const [embalagemQuantidade, setEmbalagemQuantidade] = useState(produto?.embalagem_quantidade || '1');

  const [modoConsumo, setModoConsumo] = useState(produto?.modo_consumo || 'taxa');
  const [consumoDiarioBase, setConsumoDiarioBase] = useState(produto?.consumo_diario_base || '');
  const [estoqueMinimoBase, setEstoqueMinimoBase] = useState(produto?.estoque_minimo_base || '');
  const [estoqueAtencaoBase, setEstoqueAtencaoBase] = useState(produto?.estoque_atencao_base || '');

  const [diasCritico, setDiasCritico] = useState(produto?.dias_critico ?? 5);
  const [diasAtencao, setDiasAtencao] = useState(produto?.dias_atencao ?? 15);

  const [requerReceita, setRequerReceita] = useState(produto?.requer_receita || false);
  const [antecedenciaReceitaDias, setAntecedenciaReceitaDias] = useState(produto?.antecedencia_receita_dias ?? 7);
  const [receitaValidade, setReceitaValidade] = useState(produto?.receita_validade || '');

  // Vínculo com agenda
  const [medicamentoIds, setMedicamentoIds] = useState(produto?.medicamento_ids || []);
  const [qtdPorAdmin, setQtdPorAdmin] = useState(produto?.quantidade_por_administracao || '1');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleToggleMedId = (idStr) => {
    setMedicamentoIds((prev) => {
      if (prev.includes(idStr)) {
        return prev.filter(x => x !== idStr);
      }
      return [...prev, idStr];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) {
      setErro('O nome do produto é obrigatório.');
      return;
    }

    const eqNum = Number(embalagemQuantidade);
    if (!eqNum || eqNum <= 0) {
      setErro('A quantidade por embalagem deve ser maior que zero.');
      return;
    }

    const criticoNum = Number(diasCritico);
    const atencaoNum = Number(diasAtencao);
    if (criticoNum < 0 || atencaoNum <= criticoNum) {
      setErro('Os dias de alerta crítico devem ser menores que os dias de atenção (ex: 5 e 15).');
      return;
    }

    if (modoConsumo === 'taxa') {
      const temVinculoAgenda = medicamentoIds.length > 0 && Number(qtdPorAdmin) > 0;
      const consumoManual = Number(consumoDiarioBase);

      if (!temVinculoAgenda && (!consumoManual || consumoManual <= 0)) {
        setErro('No modo taxa de uso contínuo, configure o consumo diário manual ou vincule aos horários da agenda.');
        return;
      }
    } else {
      const minNum = Number(estoqueMinimoBase);
      const atenNum = Number(estoqueAtencaoBase);
      if (isNaN(minNum) || isNaN(atenNum) || minNum < 0) {
        setErro('No modo mínimo, informe o estoque mínimo e atenção válidos.');
        return;
      }
      if (atenNum < minNum) {
        setErro('O estoque de atenção deve ser maior ou igual ao estoque mínimo.');
        return;
      }
    }

    const dados = {
      nome: nome.trim(),
      categoria,
      marca_preferida: marcaPreferida.trim() || null,
      observacoes: observacoes.trim() || null,
      unidade_base: unidadeBase.trim(),
      embalagem_nome: embalagemNome.trim(),
      embalagem_quantidade: eqNum,
      modo_consumo: modoConsumo,
      consumo_diario_base: modoConsumo === 'taxa' && consumoDiarioBase ? Number(consumoDiarioBase) : null,
      estoque_minimo_base: modoConsumo === 'minimo' ? Number(estoqueMinimoBase) : null,
      estoque_atencao_base: modoConsumo === 'minimo' ? Number(estoqueAtencaoBase) : null,
      dias_critico: criticoNum,
      dias_atencao: atencaoNum,
      requer_receita: Boolean(requerReceita),
      antecedencia_receita_dias: requerReceita ? (Number(antecedenciaReceitaDias) || 7) : 0,
      receita_validade: requerReceita && receitaValidade ? receitaValidade : null,
      medicamento_ids: modoConsumo === 'taxa' && medicamentoIds.length > 0 ? medicamentoIds : [],
      quantidade_por_administracao: modoConsumo === 'taxa' && medicamentoIds.length > 0 ? Number(qtdPorAdmin) : null
    };

    try {
      setSalvando(true);
      await onSalvar(dados, produto?.id);
      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar produto.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="produto-modal-title">
      <div className="est-modal" style={{ maxWidth: 540 }}>
        <div className="est-modal-header">
          <h2 id="produto-modal-title" className="est-modal-title">
            {isEdicao ? `Editar: ${produto.nome}` : 'Cadastrar novo produto'}
          </h2>
          <button
            type="button"
            className="est-btn est-btn-outline"
            style={{ minHeight: 36, minWidth: 36, padding: 0 }}
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="est-modal-body">
          {erro && (
            <div className="est-banner est-banner-error" role="alert">
              {erro}
            </div>
          )}

          <div className="est-form-group">
            <label className="est-label">Nome do produto *</label>
            <input
              type="text"
              className="est-input"
              placeholder="Ex: Fralda Geriátrica G, Shampoo Johnson"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="est-input-row">
            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Categoria *</label>
              <select
                className="est-select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="fraldas_incontinencia">Fraldas e incontinência</option>
                <option value="higiene">Higiene</option>
                <option value="cuidados_pele">Cuidados com a pele</option>
                <option value="curativos">Curativos</option>
                <option value="medicamentos">Medicamentos</option>
                <option value="limpeza">Limpeza</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Marca preferida (opcional)</label>
              <input
                type="text"
                className="est-input"
                placeholder="Ex: Tena, Johnson, Pampers"
                value={marcaPreferida}
                onChange={(e) => setMarcaPreferida(e.target.value)}
              />
            </div>
          </div>

          <div className="est-input-row">
            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Unidade base de contagem *</label>
              <input
                type="text"
                className="est-input"
                placeholder="Ex: fralda, comprimido, ml"
                value={unidadeBase}
                onChange={(e) => setUnidadeBase(e.target.value)}
                required
              />
              <span className="est-help-text">O que se conta e consome</span>
            </div>

            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Nome da embalagem *</label>
              <input
                type="text"
                className="est-input"
                placeholder="Ex: pacote, caixa, frasco"
                value={embalagemNome}
                onChange={(e) => setEmbalagemNome(e.target.value)}
                required
              />
            </div>

            <div className="est-form-group" style={{ width: 110 }}>
              <label className="est-label">Qtd por emb. *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                className="est-input"
                value={embalagemQuantidade}
                onChange={(e) => setEmbalagemQuantidade(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="est-form-group">
            <label className="est-label">Modo de consumo:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`est-btn ${modoConsumo === 'taxa' ? 'est-btn-primary' : 'est-btn-outline'}`}
                style={{ flex: 1 }}
                onClick={() => setModoConsumo('taxa')}
              >
                Uso contínuo (taxa diária)
              </button>
              <button
                type="button"
                className={`est-btn ${modoConsumo === 'minimo' ? 'est-btn-primary' : 'est-btn-outline'}`}
                style={{ flex: 1 }}
                onClick={() => setModoConsumo('minimo')}
              >
                Uso eventual (estoque mínimo)
              </button>
            </div>
          </div>

          {modoConsumo === 'taxa' ? (
            <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div className="est-form-group">
                <label className="est-label">Consumo diário manual:</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="est-input"
                  placeholder="Ex: 6 fraldas por dia"
                  value={consumoDiarioBase}
                  onChange={(e) => setConsumoDiarioBase(e.target.value)}
                />
                <span className="est-help-text">Usado se não houver vínculo com a agenda ou como fallback</span>
              </div>

              {medications.length > 0 && (
                <div className="est-form-group" style={{ marginTop: 10 }}>
                  <label className="est-label">Vincular a horários da agenda de remédios:</label>
                  <span className="est-help-text">
                    O sistema multiplica o nº de horários marcados pela quantidade por administração:
                  </span>
                  <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 6, marginTop: 4 }}>
                    {medications.map(med => (
                      <label key={med.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '3px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={medicamentoIds.includes(String(med.id))}
                          onChange={() => handleToggleMedId(String(med.id))}
                        />
                        <span><strong>{med.time}</strong> – {med.name}</span>
                      </label>
                    ))}
                  </div>

                  {medicamentoIds.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <label className="est-label" style={{ fontSize: '0.75rem' }}>
                        Quantidade por administração ({unidadeBase}):
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        className="est-input"
                        style={{ minHeight: 36 }}
                        value={qtdPorAdmin}
                        onChange={(e) => setQtdPorAdmin(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div className="est-input-row">
                <div className="est-form-group" style={{ flex: 1 }}>
                  <label className="est-label">Estoque mínimo ({unidadeBase}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="est-input"
                    placeholder="Ex: 1"
                    value={estoqueMinimoBase}
                    onChange={(e) => setEstoqueMinimoBase(e.target.value)}
                    required
                  />
                  <span className="est-help-text">Abaixo disso = 🔴 Comprar</span>
                </div>
                <div className="est-form-group" style={{ flex: 1 }}>
                  <label className="est-label">Estoque atenção ({unidadeBase}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="est-input"
                    placeholder="Ex: 2"
                    value={estoqueAtencaoBase}
                    onChange={(e) => setEstoqueAtencaoBase(e.target.value)}
                    required
                  />
                  <span className="est-help-text">Abaixo disso = 🟡 Ficar de olho</span>
                </div>
              </div>
            </div>
          )}

          <div className="est-input-row">
            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Dias para alerta crítico (🔴)</label>
              <input
                type="number"
                min="0"
                className="est-input"
                value={diasCritico}
                onChange={(e) => setDiasCritico(e.target.value)}
              />
            </div>
            <div className="est-form-group" style={{ flex: 1 }}>
              <label className="est-label">Dias para alerta de atenção (🟡)</label>
              <input
                type="number"
                min="1"
                className="est-input"
                value={diasAtencao}
                onChange={(e) => setDiasAtencao(e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: 10, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={requerReceita}
                onChange={(e) => setRequerReceita(e.target.checked)}
              />
              Requer receita médica
            </label>

            {requerReceita && (
              <div className="est-input-row" style={{ marginTop: 8 }}>
                <div className="est-form-group" style={{ flex: 1 }}>
                  <label className="est-label">Antecedência receita (dias):</label>
                  <input
                    type="number"
                    min="0"
                    className="est-input"
                    value={antecedenciaReceitaDias}
                    onChange={(e) => setAntecedenciaReceitaDias(e.target.value)}
                  />
                </div>
                <div className="est-form-group" style={{ flex: 1 }}>
                  <label className="est-label">Validade da receita:</label>
                  <input
                    type="date"
                    className="est-input"
                    value={receitaValidade}
                    onChange={(e) => setReceitaValidade(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="est-form-group">
            <label className="est-label">Observações:</label>
            <textarea
              className="est-textarea"
              placeholder="Ex: tamanho G, guardar no armário do quarto"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {isEdicao && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {produto.arquivado_em ? 'Este item está arquivado.' : 'Item ativo no catálogo.'}
              </span>
              {produto.arquivado_em ? (
                <button
                  type="button"
                  className="est-btn est-btn-outline"
                  onClick={async () => {
                    await onDesarquivar(produto.id);
                    onFechar();
                  }}
                >
                  <RotateCcw size={14} />
                  Desarquivar produto
                </button>
              ) : (
                <button
                  type="button"
                  className="est-btn est-btn-danger"
                  style={{ minHeight: 36, fontSize: '0.75rem' }}
                  onClick={async () => {
                    if (window.confirm(`Deseja arquivar "${produto.nome}"? Ele não aparecerá na lista ativa.`)) {
                      await onArquivar(produto.id);
                      onFechar();
                    }
                  }}
                >
                  <Archive size={14} />
                  Arquivar produto
                </button>
              )}
            </div>
          )}

          <div className="est-modal-footer">
            <button
              type="button"
              className="est-btn est-btn-secondary"
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="est-btn est-btn-primary"
              disabled={salvando}
            >
              <Save size={16} />
              <span>{salvando ? 'Salvando...' : 'Salvar produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
