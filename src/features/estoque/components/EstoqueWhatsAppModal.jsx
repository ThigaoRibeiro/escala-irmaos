import React, { useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { gerarTextoWhatsApp, gerarLinkWhatsApp } from '../domain/whatsapp.js';

export default function EstoqueWhatsAppModal({
  itens = [],
  compras = [],
  userMapping = {},
  caregivers = [],
  onFechar
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = gerarTextoWhatsApp(itens, compras, userMapping, caregivers, new Date());
  const linkWa = gerarLinkWhatsApp(texto);

  const handleCopiar = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      } else {
        // Fallback para seleção de textarea
        const textarea = document.getElementById('est-whatsapp-textarea');
        if (textarea) {
          textarea.select();
          document.execCommand('copy');
          setCopiado(true);
          setTimeout(() => setCopiado(false), 3000);
        }
      }
    } catch (err) {
      console.warn('Falha ao copiar automaticamente:', err);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title">
      <div className="est-modal" style={{ maxWidth: 500 }}>
        <div className="est-modal-header">
          <h2 id="whatsapp-modal-title" className="est-modal-title">
            Mensagem para o WhatsApp
          </h2>
          <button
            type="button"
            className="est-btn est-btn-outline"
            style={{ minHeight: 44, minWidth: 44, padding: 0 }}
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="est-modal-body">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Abre o WhatsApp com a mensagem pronta. Você escolhe o grupo dos irmãos e envia. Não existe envio automático.
          </p>

          <textarea
            id="est-whatsapp-textarea"
            className="est-textarea"
            style={{ height: 220, fontFamily: 'monospace', fontSize: '0.85rem' }}
            value={texto}
            readOnly
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="est-btn est-btn-secondary"
              style={{ flex: 1 }}
              onClick={handleCopiar}
            >
              {copiado ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiado ? 'Mensagem copiada!' : 'Copiar mensagem'}</span>
            </button>

            <a
              href={linkWa}
              target="_blank"
              rel="noopener noreferrer"
              className="est-btn est-btn-primary"
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <ExternalLink size={16} />
              <span>Abrir no WhatsApp</span>
            </a>
          </div>

          <div className="est-modal-footer">
            <button
              type="button"
              className="est-btn est-btn-secondary"
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
