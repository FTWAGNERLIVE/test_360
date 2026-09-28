const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

text = text.replace(
  '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\n      <aside className={`dashboard-sidebar ${isSidebarOpen ? \'open\' : \'\'}`}>',
  '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\n      {!isSharedView && (\n        <aside className={`dashboard-sidebar ${isSidebarOpen ? \'open\' : \'\'}`}>'
);
text = text.replace(
  '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\r\n      <aside className={`dashboard-sidebar ${isSidebarOpen ? \'open\' : \'\'}`}>',
  '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\r\n      {!isSharedView && (\r\n        <aside className={`dashboard-sidebar ${isSidebarOpen ? \'open\' : \'\'}`}>'
);

text = text.replace(
  '          </button>\n        </nav>\n      </aside>\n\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}',
  '          </button>\n        </nav>\n      </aside>\n      )}\n\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}'
);
text = text.replace(
  '          </button>\r\n        </nav>\r\n      </aside>\r\n\r\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}',
  '          </button>\r\n        </nav>\r\n      </aside>\r\n      )}\r\n\r\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}'
);

text = text.replace(
  '        {/* CABEÇALHO DA DASHBOARD */}\n        <header className=\"main-header\">',
  '        {/* CABEÇALHO DA DASHBOARD */}\n        {!isSharedView && (\n          <header className=\"main-header\">'
);
text = text.replace(
  '        {/* CABEÇALHO DA DASHBOARD */}\r\n        <header className=\"main-header\">',
  '        {/* CABEÇALHO DA DASHBOARD */}\r\n        {!isSharedView && (\r\n          <header className=\"main-header\">'
);

text = text.replace(
  '              </div>\n            </div>\n          </div>\n        </header>\n\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}',
  '              </div>\n            </div>\n          </div>\n        </header>\n        )}\n\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}'
);
text = text.replace(
  '              </div>\r\n            </div>\r\n          </div>\r\n        </header>\r\n\r\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}',
  '              </div>\r\n            </div>\r\n          </div>\r\n        </header>\r\n        )}\r\n\r\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}'
);

text = text.replace(
  '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\n        {isImpersonating && (',
  '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\n        {isImpersonating && !isSharedView && ('
);
text = text.replace(
  '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\r\n        {isImpersonating && (',
  '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\r\n        {isImpersonating && !isSharedView && ('
);

text = text.replace(
  '{/* NOTIFICAÇÃO DE TRIAL */}\n        {user?.role === \'user\' && !user?.isPro && (',
  '{/* NOTIFICAÇÃO DE TRIAL */}\n        {user?.role === \'user\' && !user?.isPro && !isSharedView && ('
);
text = text.replace(
  '{/* NOTIFICAÇÃO DE TRIAL */}\r\n        {user?.role === \'user\' && !user?.isPro && (',
  '{/* NOTIFICAÇÃO DE TRIAL */}\r\n        {user?.role === \'user\' && !user?.isPro && !isSharedView && ('
);

fs.writeFileSync('src/pages/Dashboard.tsx', text, 'utf8');
console.log('Fixed file.');
