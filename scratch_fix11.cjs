const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// 1. Fix dependencies for series1Key and series2Key
d = d.replace(
  /const series1Key = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveDiscovery, csvHeaders, numericHeaders\]\)/,
  (match) => match.replace('], [effectiveDiscovery, csvHeaders, numericHeaders])', '], [effectiveDiscovery, csvHeaders, numericHeaders, manualConfig.primaryMetric])')
);

d = d.replace(
  /const series2Key = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveDiscovery, csvHeaders, numericHeaders, series1Key\]\)/,
  (match) => match.replace('], [effectiveDiscovery, csvHeaders, numericHeaders, series1Key])', '], [effectiveDiscovery, csvHeaders, numericHeaders, series1Key, manualConfig.secondaryMetric])')
);

// 2. Clear manualConfig when "Recriar com IA" is clicked
// Look for `setLoadingInsights(true);` inside `handleRecreateWithAI`
d = d.replace(
  /setLoadingInsights\(true\);/,
  'setLoadingInsights(true);\n    setManualConfig({}); // CLEAR MANUAL CONFIG ON RECREATE'
);

// 3. Fix the chart title to respect manual override if present
// Look for: `<span>{effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\`}</span>`
d = d.replace(
  /<span>\{effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.barChart \|\| `Análise Comparativa por \$\{barCategoryHeader \|\| 'Categoria'\}`\}<\/span>/,
  `<span>{(manualConfig.primaryCategory || manualConfig.primaryMetric) ? \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\`)}</span>`
);

// For donutChart:
d = d.replace(
  /<span style=\{\{ flex: 1 \}\}>\{effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.barChart \|\| `Análise Comparativa por \$\{barCategoryHeader \|\| 'Categoria'\}`\}<\/span>/,
  `<span style={{ flex: 1 }}>{(manualConfig.primaryCategory || manualConfig.primaryMetric) ? \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\`)}</span>`
);

d = d.replace(
  /<span style=\{\{ flex: 1 \}\}>\{effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.donutChart \|\| `Proporção por \$\{donutCategoryHeader \|\| 'Categoria'\}`\}<\/span>/,
  `<span style={{ flex: 1 }}>{(manualConfig.donutCategory) ? \`Proporção por \${donutCategoryHeader || 'Categoria'}\` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.donutChart || \`Proporção por \${donutCategoryHeader || 'Categoria'}\`)}</span>`
);

d = d.replace(
  /<span style=\{\{ flex: 1 \}\}>\{effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.areaChart \|\| `Evolução de \$\{series1Key\}`\}<\/span>/,
  `<span style={{ flex: 1 }}>{(manualConfig.primaryDate || manualConfig.primaryMetric) ? \`Evolução de \${series1Key}\` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.areaChart || \`Evolução de \${series1Key}\`)}</span>`
);

d = d.replace(
  /<span style=\{\{ flex: 1 \}\}>\{effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.radarChart \|\| `Perfil por \$\{radarCategoryHeader \|\| 'Categoria'\}`\}<\/span>/,
  `<span style={{ flex: 1 }}>{(manualConfig.radarCategory) ? \`Perfil por \${radarCategoryHeader || 'Categoria'}\` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.radarChart || \`Perfil por \${radarCategoryHeader || 'Categoria'}\`)}</span>`
);

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
