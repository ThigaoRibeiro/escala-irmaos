import React from 'react';

/**
 * Barreira de erro do carregamento do módulo Estoque.
 *
 * É importada de forma ESTÁTICA pelo App (fica no chunk principal, é minúscula) porque o
 * EstoqueErrorBoundary vive dentro do chunk carregado sob demanda e não protege o próprio
 * carregamento: se o chunk falhar (rede ruim, ou PWA com arquivo antigo logo após um deploy),
 * o erro subiria até a raiz e deixaria o app inteiro em branco.
 *
 * modo="selo": falhou, some em silêncio.
 * modo="aba": mostra uma mensagem local; as outras abas continuam funcionando.
 */
export default class EstoqueLazyBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(error) {
    console.error('[Estoque] Falha ao carregar o módulo:', error);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    if (this.props.modo !== 'aba') return null;

    return (
      <div className="card" role="alert">
        <h3 className="card-title">Não foi possível abrir o Estoque</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          As outras abas continuam funcionando. Verifique a conexão e recarregue a página.
        </p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
      </div>
    );
  }
}
