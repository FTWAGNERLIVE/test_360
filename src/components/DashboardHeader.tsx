import React, { useState } from 'react';
import { Menu, LayoutDashboard, Share2, Sparkles, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  isSharedView: boolean;
  setShowShareModal: (val: boolean) => void;
  effectiveUser: any;
  isImpersonating: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isSharedView,
  setShowShareModal,
  effectiveUser,
  isImpersonating
}) => {
  const { user, logout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  if (isSharedView) return null;

  return (
    <header className="main-header">
      <div className="header-title-section">
        <button 
          className="menu-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={22} />
        </button>
        <h1 className="main-title">Dashboard User</h1>
      </div>

      <div className="header-actions-section">
        {user?.role === 'admin' && !isImpersonating && !isSharedView && (
          <button 
            onClick={() => window.location.href = '/admin'} 
            className="back-admin-btn"
          >
            <LayoutDashboard size={16} />
            Admin
          </button>
        )}

        {user?.plan === 'pro' && !isImpersonating && !isSharedView && (
          <button 
            onClick={() => setShowShareModal(true)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            <Share2 size={16} />
            Compartilhar
          </button>
        )}

        <div className="profile-dropdown-container">
          <button 
            className="profile-trigger-btn" 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="small-avatar">{effectiveUser?.name?.charAt(0).toUpperCase() || 'U'}</div>
            <span className="profile-name-text">{effectiveUser?.name || 'Usuário'}</span>
          </button>
          
          {showProfileDropdown && (
            <div className="profile-dropdown-menu">
              <div className="profile-header">
                <strong>{effectiveUser?.name}</strong>
                <span>{effectiveUser?.email}</span>
              </div>
              
              <div className="profile-plan">
                <span>Plano:</span>
                <span className="plan-tag">{user?.plan?.toUpperCase() || 'FREE'}</span>
              </div>

              {user?.role === 'user' && (user?.plan === 'free' || !user?.plan) && (
                <button 
                  onClick={() => window.location.href = '/pricing'} 
                  className="dropdown-upgrade-btn"
                >
                  <Sparkles size={14} />
                  Fazer Upgrade
                </button>
              )}

              <div className="dropdown-divider"></div>
              
              <button onClick={logout} className="dropdown-logout-btn">
                <LogOut size={16} />
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
