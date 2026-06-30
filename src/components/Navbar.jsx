import React, { useState } from 'react';
import { signOut, CAREGIVER_STYLE, MEMBERS } from '../utils/db';
import { Heart, LogOut } from 'lucide-react';

export default function Navbar({ userProfile }) {
  // Check if it's an admin (SUPERADMIN or ADMIN)
  const isAdmin = userProfile?.role === 'SUPERADMIN' || userProfile?.role === 'ADMIN';

  // If not admin, fallback to caregiver static profile
  const profile = userProfile || {
    name: 'Cuidadora',
    role: 'CAREGIVER',
    color: CAREGIVER_STYLE.color,
    lightColor: CAREGIVER_STYLE.lightColor,
    avatar: CAREGIVER_STYLE.avatar
  };

  // State for the selected member in the dropdown
  const [activeMember, setActiveMember] = useState(() => {
    return localStorage.getItem('escala_active_member') || MEMBERS[0].name;
  });

  const currentMember = MEMBERS.find(m => m.name === activeMember) || MEMBERS[0];

  const handleMemberChange = (e) => {
    const name = e.target.value;
    setActiveMember(name);
    localStorage.setItem('escala_active_member', name);
    // Reload to apply the new active member across the app since it's now driven by local state if we want to impersonate
    // Wait, the app needs to know about activeMember!
    // Since App.jsx no longer holds activeMember state for admins, the impersonation needs to be communicated up.
    // If we just use localStorage and reload, it's easier. Or we can just emit an event.
    window.dispatchEvent(new CustomEvent('activeMemberChanged', { detail: name }));
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
          {isAdmin ? (
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
                {MEMBERS.map(member => (
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
