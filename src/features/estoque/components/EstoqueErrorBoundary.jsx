import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class EstoqueErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[EstoqueErrorBoundary] Erro capturado no módulo Estoque:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="est-container" role="alert">
          <div className="est-banner est-banner-error" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} />
              <strong>Ocorreu um erro ao carregar o módulo de estoque.</strong>
            </div>
            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
              As outras abas do aplicativo continuam funcionando normalmente.
            </p>
            {this.state.error?.message && (
              <pre style={{ margin: '4px 0', fontSize: '0.75rem', opacity: 0.8, overflowX: 'auto' }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              className="est-btn est-btn-outline"
              onClick={this.handleReset}
              style={{ alignSelf: 'flex-start', marginTop: '4px' }}
            >
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
