const fs = require('fs');
const groqServicePath = 'c:/Users/creat/Documents/Projeto_test360/src/services/groqService.ts';
let d = fs.readFileSync(groqServicePath, 'utf8');

// 1. Strengthen the Prompt rules
const oldPromptRules = `5. ORIGINALIDADE: Busque um cruzamento de dados NOVO ou não óbvio, entregue a melhor visão possível!
6. GRÁFICOS DE EVOLUÇÃO TEMPORAL E BARRAS: Se a métrica numérica for "Idade" ou algo que NÃO faz sentido somar no tempo, NÃO use como primaryMetric. Em vez disso, use EXATAMENTE a string "Registros" no primaryMetric. Assim o gráfico vai contar as linhas em vez de somar valores que não fazem sentido.
6. LIMPEZA: NUNCA coloque quebras de linha`;

const newPromptRules = `5. ORIGINALIDADE: Busque um cruzamento de dados NOVO ou não óbvio, entregue a melhor visão possível!
6. GRÁFICOS DE EVOLUÇÃO TEMPORAL E BARRAS (REGRA CRÍTICA ABSOLUTA): NUNCA, EM HIPÓTESE ALGUMA, use "Idade", "Age", "Ano" ou variáveis não somáveis como \`primaryMetric\`. Se a única opção numérica for Idade, você DEVE OBRIGATORIAMENTE definir \`primaryMetric\` como a string exata "Registros".
7. LIMPEZA: NUNCA coloque quebras de linha`;

d = d.replace(oldPromptRules, newPromptRules);

// Also fix the KPI rules
const oldKPIRule = `3. KPIs INTELIGENTES: Você deve sugerir 4 KPIs (Indicadores chave) que façam sentido. REGRA DE OURO: NÃO SOME IDADES. Use 'avg' (média) para idade, avaliações ou métricas não somáveis. Use ícones coerentes (Ex: NÃO use DollarSign para Idade, use 'Users' ou 'Activity'). Para cada KPI, diga o Rótulo, a Coluna (EXATAMENTE como escrita), a operação matemática ('sum', 'avg', 'count', 'count_unique') e um Ícone válido: "DollarSign", "Users", "Activity", "Briefcase", "TrendingUp", "ShoppingCart", "FileText", "CheckCircle", "Target", "Star", "Heart", "Clock".`;

const newKPIRule = `3. KPIs INTELIGENTES: Sugira 4 KPIs. REGRA CRÍTICA DE ÍCONES E CÁLCULOS: NUNCA use "DollarSign" para Idade ou Contagens (use "Users", "Activity" ou "TrendingUp"). NUNCA faça "sum" de Idade (use "avg"). Para cada KPI, informe o Rótulo, a Coluna, a operação matemática ('sum', 'avg', 'count', 'count_unique') e um Ícone válido dentre os listados: "DollarSign", "Users", "Activity", "Briefcase", "TrendingUp", "ShoppingCart", "FileText", "CheckCircle", "Target", "Star", "Heart", "Clock".`;

d = d.replace(oldKPIRule, newKPIRule);

// 2. Add Sanitize function after parsing JSON
const jsonParseTarget = `          if (!json.dashboardConfig) json.dashboardConfig = {};`;

const jsonParseSanitize = `          if (!json.dashboardConfig) json.dashboardConfig = {};
          
          // SANITIZAÇÃO DE EMERGÊNCIA CONTRA ALUCINAÇÃO DA IA
          if (json.dashboardConfig.primaryMetric && json.dashboardConfig.primaryMetric.toLowerCase().includes('idade')) {
            json.dashboardConfig.primaryMetric = 'Registros';
          }
          if (json.dashboardConfig.kpis && Array.isArray(json.dashboardConfig.kpis)) {
            json.dashboardConfig.kpis.forEach((kpi: any) => {
              if (kpi.column && kpi.column.toLowerCase().includes('idade')) {
                if (kpi.operation === 'sum') kpi.operation = 'avg';
                if (kpi.icon === 'DollarSign') kpi.icon = 'Users';
              }
            });
          }`;

d = d.replace(jsonParseTarget, jsonParseSanitize);

fs.writeFileSync(groqServicePath, d, 'utf8');
console.log('done');
