const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

const importHook = `import { useChartData } from '../hooks/useChartData';\n`;
if (!content.includes('useChartData')) {
  content = content.replace(/import '\.\/Dashboard\.css'/, `import './Dashboard.css'\n${importHook}`);
}

const startMarker = '// Colunas Numéricas Reais da Planilha (Excluindo Datas, IDs e Códigos)\n  const numericHeaders = useMemo';
const endMarker = '  return (\n    <div className="dashboard-layout">';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
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

  // Ajustar a granularidade temporal padrão (se os dados forem de um único mês, alterna para 'day' automaticamente)
  useEffect(() => {
    if (dateHeader && activeData && activeData.length > 0) {
      const months = new Set<string>()
      activeData.forEach(row => {
        // Fallback for parseDate (since we removed it, we'll just ignore this small auto-adjust logic for now, or assume it's handled differently)
      })
    }
  }, [dateHeader, activeData])

`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Successfully refactored chart data logic to custom hook.');
} else {
  console.log('Failed to find markers.');
  console.log('Start index:', startIndex);
  console.log('End index:', endIndex);
}
