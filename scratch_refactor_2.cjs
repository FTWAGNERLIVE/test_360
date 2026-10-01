const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Add import for useChartData
const importHook = `import { useChartData } from '../hooks/useChartData';\n`;
content = content.replace(/import '\.\/Dashboard\.css'/, `import './Dashboard.css'\n${importHook}`);

// Remove all useMemo blocks for the chart data in Dashboard.tsx
// It's safer to replace everything from "const numericHeaders = useMemo" up to "return (" right before the UI layout.

// Find start
const startMarker = 'const numericHeaders = useMemo(() => {';
const startIndex = content.indexOf(startMarker);

// Find end (before return)
const endMarker = 'return (\n    <div className="dashboard-layout">';
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
        const parsed = parseDate(row[dateHeader])
        if (parsed && !isNaN(parsed.getTime())) {
          months.add(\`\${parsed.getUTCFullYear()}-\${parsed.getUTCMonth()}\`)
        }
      })
      if (months.size === 1) {
        setTimeGranularity('day')
      } else if (months.size > 12) {
        setTimeGranularity('year')
      }
    }
  }, [dateHeader, activeData])

  `;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  
  fs.writeFileSync(p, content, 'utf8');
  console.log('Successfully refactored chart data logic to custom hook.');
} else {
  console.log('Failed to find markers.');
}
