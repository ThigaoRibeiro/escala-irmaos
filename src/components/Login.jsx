import React, { useState } from 'react';
import { signIn, signUp } from '../utils/db';
import { Heart, Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, HeartHandshake, CalendarDays, FileText, Sun, Moon, Clock, Check, Pill, Utensils, Zap } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLoginMode) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        if (onLoginSuccess) onLoginSuccess();
      } else {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Tente novamente.');
        }

        const lowerEmail = email.trim().toLowerCase();
        if (!lowerEmail.includes('@') || lowerEmail.endsWith('@lessacare.com')) {
          throw new Error('O cadastro de cuidadoras deve ser feito pelo administrador na aba Configurações.');
        }

        const { error, data } = await signUp(email, password);
        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          setErrorMsg('Este e-mail já está em uso.');
        } else {
          setSuccessMsg('Conta criada com sucesso. Verifique seu e-mail ou faça login agora.');
          setIsLoginMode(true);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Não foi possível entrar. Confira seus dados e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="lc-login-page">
      <div className="lc-login-backdrop" aria-hidden="true" />

      <div className="lc-login-layout">
        <section className="lc-login-auth">
          <div className="card animate-fade lc-login-card">
            <div className="lc-login-brand">
              <div className="lc-login-logo">
                <Heart size={30} fill="currentColor" />
              </div>
              <h1 className="lc-login-title">Lessa Care</h1>
              <p className="lc-login-tagline">Escala e diário de cuidados da família</p>
            </div>

            <div className="lc-login-heading">
              <h2>{isLoginMode ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
              <p>
                {isLoginMode
                  ? 'Entre para acessar a escala e o diário de cuidados.'
                  : 'Preencha os dados abaixo para criar seu acesso ao sistema.'}
              </p>
            </div>

            {errorMsg && (
              <div
                className="info-banner"
                style={{
                  borderColor: 'var(--color-danger)',
                  color: 'var(--color-danger)',
                  backgroundColor: 'var(--color-danger-light)',
                  marginBottom: '20px'
                }}
              >
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                className="info-banner"
                style={{
                  borderColor: 'var(--color-success)',
                  color: 'var(--color-success)',
                  backgroundColor: 'var(--color-success-light)',
                  marginBottom: '20px'
                }}
              >
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="lc-login-form">
              <div className="form-group">
                <label className="form-label lc-login-label">
                  <Mail size={16} /> {isLoginMode ? 'E-mail ou usuário' : 'E-mail'}
                </label>
                <input
                  type={isLoginMode ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control lc-login-input"
                  placeholder={isLoginMode ? 'usuario ou email' : 'seu@email.com'}
                  required
                />
                {isLoginMode && (
                  <span className="lc-login-hint">
                    Cuidadoras podem entrar com o nome curto, como <strong>maria</strong>, ou com o login completo <strong>maria@lessacare.com</strong>.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label lc-login-label">
                  <Lock size={16} /> Senha
                </label>
                <div className="lc-login-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-control lc-login-input"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ width: '100%', paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="lc-login-eye"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLoginMode && (
                <div className="form-group">
                  <label className="form-label lc-login-label">
                    <Lock size={16} /> Confirmar senha
                  </label>
                  <div className="lc-login-password">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-control lc-login-input"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      style={{ width: '100%', paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="lc-login-eye"
                      title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary lc-login-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  isLoginMode ? 'Entrar no Lessa Care' : 'Criar minha conta'
                )}
              </button>
            </form>

            <div className="lc-login-footer">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setErrorMsg('');
                  setSuccessMsg('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="lc-login-switch"
              >
                {isLoginMode ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
              </button>
            </div>

            <p className="lc-login-secure">
              <ShieldCheck size={14} /> Acesso restrito à família e às cuidadoras cadastradas.
            </p>
          </div>
        </section>

        <section className="lc-login-showcase" aria-label="Conheça o Lessa Care">
          <span className="lc-login-eyebrow">
            <HeartHandshake size={14} /> Cuidado em família, organizado
          </span>
          <h2 className="lc-login-headline">
            Quem cuida, quando cuida e como foi o dia. <span>Tudo em um só lugar.</span>
          </h2>
          <p className="lc-login-lead">
            O Lessa Care reúne a escala de plantões, o diário de cuidados e os medicamentos para que família e cuidadoras estejam sempre na mesma página.
          </p>

          <div className="lc-login-mockups" aria-hidden="true">
            <div className="lc-login-mock lc-login-mock-schedule">
              <div className="lc-login-mock-head">
                <CalendarDays size={15} />
                <span>Escala da semana</span>
                <em>Exemplo</em>
              </div>
              <div className="lc-login-mock-rows">
                <div className="lc-login-mock-row">
                  <span className="lc-login-mock-day">Seg</span>
                  <span className="lc-login-pill lc-login-pill-day"><Sun size={12} /> Carla</span>
                  <span className="lc-login-pill lc-login-pill-night"><Moon size={12} /> Bruno</span>
                </div>
                <div className="lc-login-mock-row">
                  <span className="lc-login-mock-day">Ter</span>
                  <span className="lc-login-pill lc-login-pill-day"><Sun size={12} /> Lúcia</span>
                  <span className="lc-login-pill lc-login-pill-open">Turno vago</span>
                </div>
                <div className="lc-login-mock-row">
                  <span className="lc-login-mock-day">Qua</span>
                  <span className="lc-login-pill lc-login-pill-day"><Sun size={12} /> Rafael</span>
                  <span className="lc-login-pill lc-login-pill-night"><Moon size={12} /> Carla</span>
                </div>
              </div>
            </div>

            <div className="lc-login-mock lc-login-mock-diary">
              <div className="lc-login-mock-head">
                <FileText size={15} />
                <span>Diário · Plantão diurno</span>
              </div>
              <div className="lc-login-mock-author">
                <span className="lc-login-avatar">L</span>
                <div>
                  <strong>Lúcia</strong>
                  <small><Clock size={11} /> 07:00 às 19:00</small>
                </div>
              </div>
              <ul className="lc-login-mock-checks">
                <li><Check size={13} /> <Pill size={13} /> Medicação das 08h</li>
                <li><Check size={13} /> <Utensils size={13} /> Almoço completo</li>
              </ul>
              <p className="lc-login-mock-note">“Tarde tranquila, caminhou no jardim e dormiu bem.”</p>
              <div className="lc-login-mock-foot">
                <span><Eye size={12} /> Visto por 3</span>
                <span>❤️ 2</span>
              </div>
            </div>
          </div>

          <ul className="lc-login-features">
            <li>
              <span className="lc-login-feature-icon"><CalendarDays size={18} /></span>
              <div>
                <strong>Escala de plantões</strong>
                <p>Turnos diurno e noturno. Assuma, libere ou troque com um toque e gere o resumo para o WhatsApp.</p>
              </div>
            </li>
            <li>
              <span className="lc-login-feature-icon"><FileText size={18} /></span>
              <div>
                <strong>Diário de cuidados</strong>
                <p>Cada plantão registrado com remédios, alimentação e observações. A família acompanha e reage.</p>
              </div>
            </li>
            <li>
              <span className="lc-login-feature-icon"><Zap size={18} /></span>
              <div>
                <strong>Tudo em tempo real</strong>
                <p>As mudanças aparecem na hora para todos. Funciona no celular e pode ser instalado como app.</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <footer className="lc-login-credit">
        <span>Lessa Care · desenvolvido por</span>
        <a
          href="https://www.linkedin.com/in/thiago-ribeirosilva/"
          target="_blank"
          rel="noopener noreferrer"
          className="lc-login-credit-link"
          title="Thiago Ribeiro no LinkedIn"
        >
          <strong>Thiago Ribeiro</strong>
          <span className="lc-login-linkedin" aria-hidden="true">in</span>
        </a>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes lcLoginFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .lc-login-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px 24px;
        }

        .lc-login-backdrop {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(700px circle at 12% 8%, rgba(20, 184, 166, 0.16), transparent 60%),
            radial-gradient(600px circle at 92% 96%, rgba(20, 184, 166, 0.10), transparent 60%);
        }

        .lc-login-layout {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .lc-login-auth {
          width: 100%;
          max-width: 420px;
        }

        /* ---------- Cartão de login ---------- */

        .lc-login-card {
          width: 100%;
          padding: 36px 32px 24px;
          margin-bottom: 0;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }

        .lc-login-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 28px;
        }

        .lc-login-logo {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          background-color: var(--primary-light);
          border: 1px solid rgba(20, 184, 166, 0.35);
          margin-bottom: 14px;
        }

        .lc-login-title {
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--primary);
        }

        .lc-login-tagline {
          margin-top: 6px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .lc-login-heading {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid var(--border-color);
          margin-bottom: 24px;
        }

        .lc-login-heading h2 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .lc-login-heading p {
          font-size: 0.95rem;
          color: var(--text-muted);
        }

        .lc-login-form {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lc-login-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .lc-login-label svg {
          color: var(--primary);
        }

        .lc-login-input {
          height: 48px;
          padding: 0 14px;
          font-size: 16px;
          background-color: var(--bg-subtle);
          border-radius: 10px;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast);
        }

        .lc-login-input:focus {
          border-color: var(--primary);
          background-color: var(--bg-card);
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.22);
        }

        .lc-login-hint {
          display: block;
          margin-top: 8px;
          font-size: 0.8rem;
          line-height: 1.45;
          color: var(--text-muted);
        }

        .lc-login-hint strong {
          font-weight: 600;
          color: var(--text-primary);
        }

        .lc-login-password {
          position: relative;
          display: flex;
          align-items: center;
        }

        .lc-login-eye {
          position: absolute;
          right: 6px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
        }

        .lc-login-eye:hover {
          color: var(--text-primary);
          background-color: var(--border-color);
        }

        .lc-login-submit {
          width: 100%;
          height: 50px;
          margin-top: 8px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(20, 184, 166, 0.25);
        }

        .lc-login-submit:disabled {
          opacity: 0.75;
          cursor: wait;
          transform: none;
        }

        .lc-login-footer {
          text-align: center;
          margin-top: 16px;
        }

        .lc-login-switch {
          background: none;
          border: none;
          padding: 6px;
          font-size: 0.9rem;
          color: var(--text-muted);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .lc-login-switch:hover {
          color: var(--primary);
        }

        .lc-login-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border-color);
          font-size: 0.78rem;
          color: var(--text-muted);
          text-align: center;
        }

        .lc-login-secure svg {
          flex-shrink: 0;
          color: var(--primary);
        }

        /* ---------- Vitrine ---------- */

        .lc-login-showcase {
          width: 100%;
          max-width: 520px;
        }

        .lc-login-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--primary);
          background-color: var(--primary-light);
          border: 1px solid rgba(20, 184, 166, 0.3);
        }

        .lc-login-headline {
          margin-top: 16px;
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }

        .lc-login-headline span {
          color: var(--primary);
        }

        .lc-login-lead {
          margin-top: 12px;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 46ch;
        }

        .lc-login-mockups {
          position: relative;
          margin-top: 28px;
          display: grid;
          gap: 14px;
        }

        .lc-login-mock {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--shadow-lg);
        }

        .lc-login-mock-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .lc-login-mock-head svg {
          color: var(--primary);
        }

        .lc-login-mock-head em {
          margin-left: auto;
          font-style: normal;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          padding: 2px 8px;
          border-radius: 999px;
          background-color: var(--bg-subtle);
        }

        .lc-login-mock-rows {
          display: grid;
          gap: 8px;
        }

        .lc-login-mock-row {
          display: grid;
          grid-template-columns: 36px 1fr 1fr;
          align-items: center;
          gap: 8px;
        }

        .lc-login-mock-day {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .lc-login-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
        }

        .lc-login-pill-day {
          background-color: rgba(249, 115, 22, 0.12);
          color: var(--text-primary);
        }

        .lc-login-pill-day svg {
          color: #f97316;
        }

        .lc-login-pill-night {
          background-color: rgba(99, 102, 241, 0.14);
          color: var(--text-primary);
        }

        .lc-login-pill-night svg {
          color: #818cf8;
        }

        .lc-login-pill-open {
          justify-content: center;
          border: 1px dashed var(--primary);
          color: var(--primary);
          background-color: transparent;
        }

        .lc-login-mock-author {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .lc-login-mock-author strong {
          display: block;
          font-size: 0.9rem;
        }

        .lc-login-mock-author small {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .lc-login-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: #ffffff;
          background-color: var(--primary);
          flex-shrink: 0;
        }

        .lc-login-mock-checks {
          list-style: none;
          display: grid;
          gap: 6px;
        }

        .lc-login-mock-checks li {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
        }

        .lc-login-mock-checks li svg:first-child {
          color: #ffffff;
          background-color: var(--color-success);
          border-radius: 50%;
          padding: 2px;
          width: 16px;
          height: 16px;
        }

        .lc-login-mock-checks li svg:nth-child(2) {
          color: var(--text-muted);
        }

        .lc-login-mock-note {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-style: italic;
          color: var(--text-muted);
          background-color: var(--bg-subtle);
        }

        .lc-login-mock-foot {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .lc-login-mock-foot span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .lc-login-features {
          list-style: none;
          margin-top: 28px;
          display: grid;
          gap: 18px;
        }

        .lc-login-features li {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .lc-login-feature-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--primary);
          background-color: var(--primary-light);
          border: 1px solid rgba(20, 184, 166, 0.25);
        }

        .lc-login-features strong {
          display: block;
          font-size: 0.95rem;
          margin-bottom: 2px;
        }

        .lc-login-features p {
          font-size: 0.87rem;
          line-height: 1.5;
          color: var(--text-muted);
        }

        /* ---------- Rodapé ---------- */

        .lc-login-credit {
          position: relative;
          z-index: 1;
          margin-top: 36px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
        }

        .lc-login-credit-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
          text-decoration: none;
        }

        .lc-login-credit-link:hover strong {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .lc-login-linkedin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 3px;
          background-color: #0a66c2;
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        /* ---------- Computador: vitrine à esquerda, login à direita ---------- */

        @media (min-width: 960px) {
          .lc-login-page {
            padding: 48px 32px 24px;
          }

          .lc-login-layout {
            flex-direction: row-reverse;
            align-items: center;
            justify-content: space-between;
            gap: 64px;
          }

          .lc-login-auth {
            flex: 0 0 420px;
          }

          .lc-login-showcase {
            flex: 1 1 auto;
            max-width: 560px;
          }

          .lc-login-headline {
            font-size: 2.4rem;
          }

          .lc-login-mockups {
            grid-template-columns: 1fr 1fr;
            align-items: start;
            gap: 16px;
          }

          .lc-login-mock-schedule {
            animation: lcLoginFloat 7s ease-in-out infinite;
          }

          .lc-login-mock-diary {
            margin-top: 28px;
            animation: lcLoginFloat 7s ease-in-out 1.5s infinite;
          }

          .lc-login-features {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }

          .lc-login-features li {
            flex-direction: column;
            gap: 10px;
          }
        }

        @media (max-width: 420px) {
          .lc-login-card {
            padding: 28px 20px 20px;
          }

          .lc-login-title {
            font-size: 1.7rem;
          }

          .lc-login-headline {
            font-size: 1.5rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lc-login-mock-schedule,
          .lc-login-mock-diary {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
