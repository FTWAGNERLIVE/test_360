const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

const regex = /\{\/\* LINHA 1: GRID DE 4 CARDS ESTATÍSTICOS COM RÓTULOS REAIS DA PLANILHA \*\/\}\s*<div className="stat-cards-row">[\s\S]*?<\/div>\s*\{\/\* LINHA 2: GRÁFICO DE RESULTADO/;

const newJSX = `{/* LINHA 1: GRID DE 4 CARDS ESTATÍSTICOS COM RÓTULOS REAIS DA PLANILHA */}
              <div className="stat-cards-row">
                {statCardsData.cards.map((card, index) => {
                  const IconComp = ICON_MAP[card.icon] || ICON_MAP['Star'];
                  const isNavy = index === 0;
                  return (
                    <div key={index} className={\`stat-card \${isNavy ? 'navy-card' : 'white-card'}\`}>
                      <div className="stat-card-info">
                        <span className="stat-label">{card.label}</span>
                        <h3 className="stat-value">{card.value}</h3>
                      </div>
                      <div className={\`stat-icon-circle \${isNavy ? 'white-circle' : 'orange-light-bg'}\`}>
                        <IconComp size={20} className={isNavy ? 'navy-icon-color' : 'orange-icon-color'} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LINHA 2: GRÁFICO DE RESULTADO`;

if (regex.test(d)) {
  d = d.replace(regex, newJSX);
  fs.writeFileSync(p, d, 'utf8');
  console.log('JSX replaced successfully');
} else {
  console.log('Regex did not match');
}
