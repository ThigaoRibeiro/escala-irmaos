import React from 'react';
import { MEMBERS, signOut } from '../utils/db';
import { Heart, LogOut } from 'lucide-react';

export default function Navbar({ activeMember, setActiveMember }) {
  const currentMember = MEMBERS.find(m => m.name === activeMember) || MEMBERS[0];

  const handleMemberChange = (e) => {
    const name = e.target.value;
    setActiveMember(name);
    localStorage.setItem('escala_active_member', name);
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
