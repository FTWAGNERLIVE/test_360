const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

const missingCode = `
  // Pré-análise inteligente local (executada imediatamente ao carregar ou receber os dados)
  const localDiscovery = useMemo(() => {
    return runLocalPreAnalysis(csvHeaders, csvData)
  }, [csvHeaders, csvData])

  // Descoberta Efetiva: combina a IA do servidor (Groq) com a pré-análise local determinística
  const effectiveDiscovery = useMemo(() => {
    if (!smartDiscovery) return localDiscovery
    return {
      insights: smartDiscovery.insights || localDiscovery.insights || [],
      columnMapping: { ...localDiscovery.columnMapping, ...smartDiscovery.columnMapping },
      dashboardConfig: {
        primaryMetric: smartDiscovery.dashboardConfig?.primaryMetric || localDiscovery.dashboardConfig?.primaryMetric || '',
        secondaryMetric: smartDiscovery.dashboardConfig?.secondaryMetric || localDiscovery.dashboardConfig?.secondaryMetric || '',
        primaryCategory: smartDiscovery.dashboardConfig?.primaryCategory || localDiscovery.dashboardConfig?.primaryCategory || '',
        primaryDate: smartDiscovery.dashboardConfig?.primaryDate || localDiscovery.dashboardConfig?.primaryDate || '',
        donutCategory: smartDiscovery.dashboardConfig?.donutCategory || localDiscovery.dashboardConfig?.donutCategory || '',
        radarCategory: smartDiscovery.dashboardConfig?.radarCategory || localDiscovery.dashboardConfig?.radarCategory || '',
        chartTitles: {
          ...localDiscovery.dashboardConfig?.chartTitles,
          ...smartDiscovery.dashboardConfig?.chartTitles
        },
        kpis: smartDiscovery.dashboardConfig?.kpis
      }
    }
  }, [smartDiscovery, localDiscovery])

  const canEditCharts = (effectiveUser && effectiveUser.plan !== 'free') || (effectiveUser && effectiveUser.trialEndDate && getTrialDaysRemaining(new Date(effectiveUser.trialEndDate)) > 0);
  
  const handleEditClick = (chartId: string) => {
    if (!canEditCharts) {
      if (window.confirm('A edição de gráficos é exclusiva para assinantes Premium ou usuários em período de teste. Deseja fazer upgrade agora?')) {
        window.location.href = '/pricing';
      }
      return;
    }
    setEditingChart(chartId);
  };
`;

const target = 'const {';
const useChartDataTarget = 'numericHeaders,';

// Find where `useChartData` is called
const targetIndex = content.indexOf('const {\n    numericHeaders,\n    allCategoryHeaders,');

if (targetIndex !== -1 && !content.includes('const localDiscovery')) {
  content = content.substring(0, targetIndex) + missingCode + '\n  ' + content.substring(targetIndex);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Restored missing code');
} else {
  console.log('Target not found or already restored');
}
