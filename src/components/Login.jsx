import React, { useState } from 'react';
import { signIn, signUp, verifyCaregiverLogin } from '../utils/db';
import { Heart, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';

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
        // Verifica se o login inserido é de cuidadora (não contém @ ou termina com @lessacare.com)
        const lowerEmail = email.trim().toLowerCase();
        const isCaregiver = !lowerEmail.includes('@') || lowerEmail.endsWith('@lessacare.com');

        if (isCaregiver) {
          const { caregiver, error } = await verifyCaregiverLogin(email, password);
          if (error) throw error;
          if (onLoginSuccess) onLoginSuccess();
        } else {
          // Login de irmão (admin)
          const { error } = await signIn(email, password);
          if (error) throw error;
          if (onLoginSuccess) onLoginSuccess();
        }
      } else {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Tente novamente.');
        }

        const lowerEmail = email.trim().toLowerCase();
        if (!lowerEmail.includes('@') || lowerEmail.endsWith('@lessacare.com')) {
          throw new Error('O cadastro de cuidadoras deve ser feito pelo Administrador na aba de Configurações.');
        }
        
        const { error, data } = await signUp(email, password);
        if (error) throw error;
        
        // Em muitos casos o Supabase exige confirmação de email,
        // dependendo da configuração. Vamos avisar o usuário.
        if (data?.user?.identities?.length === 0) {
           setErrorMsg('Este e-mail já está em uso.');
        } else {
           setSuccessMsg('Conta criada! Verifique seu e-mail ou faça login agora.');
           setIsLoginMode(true);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'var(--bg-default)'
    }}>
      <div className="card animate-fade" style={{ maxWidth: '400px', width: '100%', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 className="app-title" style={{ justifyContent: 'center', color: 'var(--primary)', fontSize: '2rem' }}>
            <Heart size={32} fill="currentColor" />
            <span>Lessa Care</span>
          </h1>
          <h2 style={{ fontSize: '1.2rem', marginTop: '16px', marginBottom: '8px' }}>
            {isLoginMode ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isLoginMode ? 'Faça login para acessar a escala e o diário de cuidados.' : 'Preencha os dados abaixo para se cadastrar no sistema.'}
          </p>
        </div>

        {errorMsg && (
          <div className="info-banner" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: '#fef2f2', marginBottom: '20px' }}>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="info-banner" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', marginBottom: '20px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} /> {isLoginMode ? 'E-mail ou Usuário' : 'E-mail'}
            </label>
            <input
              type={isLoginMode ? "text" : "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder={isLoginMode ? "usuario ou email" : "seu@email.com"}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} /> Senha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
                minLength={6}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Confirmar Senha
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '12px', marginTop: '8px', justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : (isLoginMode ? 'Entrar no Lessa Care' : 'Criar minha conta')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button" 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg('');
              setSuccessMsg('');
              setPassword('');
              setConfirmPassword('');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontSize: '0.9rem', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLoginMode ? 'Ainda não tem conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </div>
      
      {/* Inline styles for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
