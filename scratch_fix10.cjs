const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// 1. Fix \n literal in the JSX files
dashboardContent = dashboardContent.replace(/\\n\s*<span/g, '<span');

// 2. Hide Métrica 2 if it's fallback
// Around line 1184-1185: <Bar dataKey={series2Key} fill="#192a3e" radius={[2, 2, 0, 0]} name={series2Key} />
dashboardContent = dashboardContent.replace(
  /<Bar dataKey=\{series2Key\} fill="#192a3e" radius=\{\[2, 2, 0, 0\]\} name=\{series2Key\} \/>/,
  '{series2Key && series2Key !== \'Métrica 2\' && <Bar dataKey={series2Key} fill="#192a3e" radius={[2, 2, 0, 0]} name={series2Key} />}'
);

dashboardContent = dashboardContent.replace(
  /<div className="legend-item">\s*<span className="legend-box navy-box"><\/span>\s*<span>\{series2Key\}<\/span>\s*<\/div>/,
  '{series2Key && series2Key !== \'Métrica 2\' && (\n                      <div className="legend-item">\n                        <span className="legend-box navy-box"></span>\n                        <span>{series2Key}</span>\n                      </div>\n                    )}'
);

fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');

const groqPath = 'c:/Users/creat/Documents/Projeto_test360/src/services/groqService.ts';
let groqContent = fs.readFileSync(groqPath, 'utf8');

// Update prompt and temperature
const oldPromptInstruction = `3. KPIs INTELIGENTES: Atualmente o sistema faz somas idiotas (como somar idades). Eu quero que você sugira 4 KPIs (Indicadores chave). Para cada KPI, diga o Rótulo, a Coluna (EXATAMENTE como escrita), a operação matemática ('sum' para soma, 'avg' para média, 'count' para contar linhas, 'count_unique' para contar únicos) e um Ícone. Ícones válidos: "DollarSign", "Users", "Activity", "Briefcase", "TrendingUp", "ShoppingCart", "FileText", "CheckCircle", "Target", "Star", "Heart", "Clock".
4. INSIGHTS: Criar 2 a 3 Insights curtos sugerindo o que o usuário deve procurar focar nesses gráficos.`;

const newPromptInstruction = `3. KPIs INTELIGENTES: Você deve sugerir 4 KPIs (Indicadores chave) que façam sentido. REGRA DE OURO: NÃO SOME IDADES. Use 'avg' (média) para idade, avaliações ou métricas não somáveis. Use ícones coerentes (Ex: NÃO use DollarSign para Idade, use 'Users' ou 'Activity'). Para cada KPI, diga o Rótulo, a Coluna (EXATAMENTE como escrita), a operação matemática ('sum', 'avg', 'count', 'count_unique') e um Ícone válido: "DollarSign", "Users", "Activity", "Briefcase", "TrendingUp", "ShoppingCart", "FileText", "CheckCircle", "Target", "Star", "Heart", "Clock".
4. INSIGHTS: Criar 2 a 3 Insights curtos sugerindo o que focar nesses gráficos.
5. ORIGINALIDADE: Busque um cruzamento de dados NOVO ou não óbvio, entregue a melhor visão possível!
6. LIMPEZA: NUNCA coloque quebras de linha ("\\n") nos títulos dos gráficos. Formate-os em uma única linha simples.`;

groqContent = groqContent.replace(oldPromptInstruction, newPromptInstruction);

// Update temperature
groqContent = groqContent.replace(/temperature: 0\.1/, 'temperature: 0.7');

// Pass seed/random in getSmartDiscovery call or prompt so it changes every time
groqContent = groqContent.replace(
  /\[LUPA ANALYTICS - DASHBOARD INTELIGENTE\]/,
  '[LUPA ANALYTICS - DASHBOARD INTELIGENTE]\nSEED DE ALEATORIEDADE (Ignore, apenas para forçar geração não-cacheada): ${Math.random()}'
);

fs.writeFileSync(groqPath, groqContent, 'utf8');
console.log('done');
