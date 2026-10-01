const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

const importHook = `import { useChartData } from '../hooks/useChartData';\n`;
if (!content.includes('useChartData')) {
  content = content.replace(/import '\.\/Dashboard\.css'/, `import './Dashboard.css'\n${importHook}`);
}

const startRegex = /\/\/ Colunas Numéricas Reais da Planilha[\s\S]*?const numericHeaders = useMemo/;
const endRegex = /return \(\s*<div className="dashboard-layout">/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  const endIndex = endMatch.index;

  const replacement = `
  const {
    numericHeaders,
    allCategoryHeaders,
    barCategoryHeader,
    donutCategoryHeader,
    radarCategoryHeader,
    dateHeader,
    series1Key,
    seriesAreaKey,
    series2Key,
    statCardsData,
    resultBarData,
    donutInfo,
    areaChartData,
    radarChartData
  } = useChartData({
    activeData,
    csvHeaders,
    csvData,
    effectiveDiscovery,
    manualConfig,
    timeGranularity
  });

  `;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Successfully refactored chart data logic to custom hook.');
} else {
  console.log('Failed to find markers with regex.');
  console.log('startMatch:', !!startMatch);
  console.log('endMatch:', !!endMatch);
}
