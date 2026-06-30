import React from 'react';
import { signOut, CAREGIVER_STYLE } from '../utils/db';
import { Heart, LogOut } from 'lucide-react';

export default function Navbar({ userProfile }) {
  // Se não tem userProfile, é uma cuidadora
  const profile = userProfile || {
    name: 'Cuidadora',
    role: 'CAREGIVER',
    color: CAREGIVER_STYLE.color,
    lightColor: CAREGIVER_STYLE.lightColor,
    avatar: CAREGIVER_STYLE.avatar
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="header-wrapper">
      <div className="header-container">
        <h1 className="app-title">
          <Heart size={24} fill="currentColor" />
          <span>Lessa Care</span>
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
    </div>
  );
}
