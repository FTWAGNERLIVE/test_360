const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(
  /\{/\\* ===== SIDEBAR ESQUERDA.*===== \\*\}[\S\s]*?<aside className={.*?dashboard-sidebar.*?}>/,
  `{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}
      '{!isSharedView && (
      <aside className={\`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}\`}>`
);

content = content.replace(
  /<\/nav>\s*<\/aside>\s*\{/\\* ===== CONTEÚDO PRINCIPAL ===== \\*\}/,
  `</nav>
      </aside>
      )}

      {/* ===== CONTEÚDO PRINCIPAL ===== */}`
);

content = content.replace(
  /\{/\\* CABEǇALHO DA DASHBOARD \\*\}\s*<header className="main-header">/,
  `{/* CABEÇALHO DA DASHBOARD */}
        {!isSharedView && (
        <header className="main-header">`
);

content = content.replace(
  /<\/div>\s*<\/div>\s*<\/header>\s*\{/\\* NOTIFICAÇÃO DEIMPERSONAÇÃO \\*\}/,
  `</div>
          </div>
        </header>
        )}

        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}`
);

content = content.replace(
  /\{/\\* NOTIFICAÇÃO DEIMPERSONAÇÃO \\*\}\s*\{isImpersonating && \(/,
  `{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}
        {isImpersonating && !isSharedView && (`
);

content = content.replace(
  /\{/\\* NOTIFICAÇÃO DE TRIAL \\*\}\s*\{user\?\.role === 'user' && !user\?\.isPro && \(/,
  `{/* NOTIFICAÇÃO DE TRIAL */}
        {user?.role === 'user' && !user?.isPro && !isSharedView && (`
);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
console.log('Done!');