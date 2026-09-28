const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const replacement = `<nav className="sidebar-nav">
          <button 
            className={\`nav-btn \${activeNav === 'home' ? 'active' : ''}\`}
            onClick={() => { setActiveNav('home'); setIsAddingNew(false) }}
          >
            <Home size={18} className="nav-icon" />
            <span>Dashboard</span>
          </button>

          <button 
            className={\`nav-btn \${activeNav === 'table' ? 'active' : ''}\`}
            onClick={() => { setActiveNav('table'); setIsAddingNew(false) }}
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
        </nav>`;

code = code.replace(/<nav className="sidebar-nav">[\s\S]*?<\/nav>/, replacement);

fs.writeFileSync('src/pages/Dashboard.tsx', code, 'utf8');
console.log('Added pricing button to sidebar');
