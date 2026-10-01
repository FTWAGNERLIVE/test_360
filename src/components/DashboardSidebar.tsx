import React from 'react';
import { Home, Table, DollarSign } from 'lucide-react';

interface DashboardSidebarProps {
  isSidebarOpen: boolean;
  effectiveUser: any;
  activeNav: string;
  setActiveNav: (nav: any) => void;
  setIsAddingNew: (val: boolean) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isSidebarOpen,
  effectiveUser,
  activeNav,
  setActiveNav,
  setIsAddingNew
}) => {
  return (
    <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-profile-card">
        <div className="avatar-ring">
          <div className="avatar-inner">
            <span className="avatar-icon">👤</span>
          </div>
        </div>
        <h2 className="sidebar-user-name">
          {effectiveUser?.name ? effectiveUser.name.toUpperCase() : 'USUÁRIO'}
        </h2>
        <p className="sidebar-user-email">
          {effectiveUser?.email || 'usuario@empresa.com'}
        </p>
      </div>

      <nav className="sidebar-nav">
        <button 
          className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`}
          onClick={() => { setActiveNav('home'); setIsAddingNew(false); }}
        >
          <Home size={18} className="nav-icon" />
          <span>Dashboard</span>
        </button>

        <button 
          className={`nav-btn ${activeNav === 'table' ? 'active' : ''}`}
          onClick={() => { setActiveNav('table'); setIsAddingNew(false); }}
        >
          <Table size={18} className="nav-icon" />
          <span>Tabela de Dados</span>
        </button>

        <button 
          className="nav-btn"
          onClick={() => window.location.href = '/pricing'}
        >
          <DollarSign size={18} className="nav-icon" />
          <span>Assinatura e Pagamentos</span>
        </button>
      </nav>
    </aside>
  );
};

export default DashboardSidebar;
