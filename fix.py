import codecs

with codecs.open('src/pages/Dashboard.tsx', 'r', 'utf-8') as f:
    text = f.read()

text = text.replace(
    '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\n      <aside className={dashboard-sidebar }>',
    '{/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}\n      {!isSharedView && (\n        <aside className={dashboard-sidebar }>'
)

text = text.replace(
    '          </button>\n        </nav>\n      </aside>\n\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}',
    '          </button>\n        </nav>\n      </aside>\n      )}\n\n      {/* ===== CONTEÚDO PRINCIPAL ===== */}'
)

text = text.replace(
    '        {/* CABEÇALHO DA DASHBOARD */}\n        <header className="main-header">',
    '        {/* CABEÇALHO DA DASHBOARD */}\n        {!isSharedView && (\n          <header className="main-header">'
)

text = text.replace(
    '              </div>\n            </div>\n          </div>\n        </header>\n\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}',
    '              </div>\n            </div>\n          </div>\n        </header>\n        )}\n\n        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}'
)

text = text.replace(
    '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\n        {isImpersonating && (',
    '{/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}\n        {isImpersonating && !isSharedView && ('
)

text = text.replace(
    '{/* NOTIFICAÇÃO DE TRIAL */}\n        {user?.role === \'user\' && !user?.isPro && (',
    '{/* NOTIFICAÇÃO DE TRIAL */}\n        {user?.role === \'user\' && !user?.isPro && !isSharedView && ('
)

with codecs.open('src/pages/Dashboard.tsx', 'w', 'utf-8') as f:
    f.write(text)

print("Done")
