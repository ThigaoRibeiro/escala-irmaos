import React, { useState } from 'react';
import { signOut, CAREGIVER_STYLE, MEMBERS, updatePassword } from '../utils/db';
import { Heart, LogOut, Key, X, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Navbar({ userProfile }) {
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  const profile = userProfile || {
    name: 'Cuidadora',
    role: 'CAREGIVER',
    color: CAREGIVER_STYLE.color,
    lightColor: CAREGIVER_STYLE.lightColor,
    avatar: CAREGIVER_STYLE.avatar
  };

  const [activeMember, setActiveMember] = useState(() => {
    return localStorage.getItem('escala_active_member') || MEMBERS[0].name;
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentMember = MEMBERS.find((member) => member.name === activeMember) || MEMBERS[0];

  const handleMemberChange = (e) => {
    const name = e.target.value;
    setActiveMember(name);
    localStorage.setItem('escala_active_member', name);
    window.dispatchEvent(new CustomEvent('activeMemberChanged', { detail: name }));
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;

      setSuccessMsg('Senha alterada com sucesso.');
      setNewPassword('');
      setConfirmNewPassword('');

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="header-wrapper">
      <div className="header-container">
        <h1 className="app-title">
          <Heart size={24} fill="currentColor" />
          <span>Lessa Care</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSuperAdmin ? (
            <div className="user-selector">
              <div
                className="avatar-badge"
                style={{
                  borderColor: currentMember.color,
                  backgroundColor: currentMember.lightColor
                }}
              >
                {currentMember.avatar}
              </div>
              <select
                value={activeMember}
                onChange={handleMemberChange}
                className="select-member"
                style={{ borderLeft: `3px solid ${currentMember.color}` }}
              >
                {MEMBERS.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name} {member.avatar}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              className="user-selector"
              style={{
                background: profile.lightColor || 'var(--bg-subtle)',
                padding: '6px 16px',
                borderRadius: '20px',
                border: `1px solid ${profile.color || 'var(--border-color)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{profile.avatar}</span>
              <span style={{ fontWeight: 'bold', color: profile.color || 'var(--text-primary)' }}>{profile.name}</span>
            </div>
          )}

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="btn btn-outline"
            style={{ padding: '6px 12px', border: 'none', color: 'var(--text-muted)' }}
            title="Alterar senha"
          >
            <Key size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '6px 12px', border: 'none', color: 'var(--text-muted)' }}
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="card animate-fade" style={{ maxWidth: '400px', width: '90%', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => {
                setIsPasswordModalOpen(false);
                setErrorMsg('');
                setSuccessMsg('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} className="text-primary" />
              <span>Alterar senha</span>
            </h3>

            {errorMsg && (
              <div className="info-banner" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: '#fef2f2', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="info-banner" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', marginBottom: '16px' }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nova senha</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-control"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar nova senha</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="form-control"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '10px', marginTop: '8px', justifyContent: 'center' }}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar nova senha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
