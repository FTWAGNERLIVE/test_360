const fs = require('fs');
const groqServicePath = 'c:/Users/creat/Documents/Projeto_test360/src/services/groqService.ts';
let d = fs.readFileSync(groqServicePath, 'utf8');

const targetStr = `        // SANITIZAÇÃO DE EMERGÊNCIA CONTRA ALUCINAÇÃO DA IA
        if (parsed.dashboardConfig) {
          if (parsed.dashboardConfig.primaryMetric && parsed.dashboardConfig.primaryMetric.toLowerCase().includes('idade')) {
            parsed.dashboardConfig.primaryMetric = 'Registros';
          }
          if (parsed.dashboardConfig.kpis && Array.isArray(parsed.dashboardConfig.kpis)) {
            parsed.dashboardConfig.kpis.forEach((kpi: any) => {
              if (kpi.column && kpi.column.toLowerCase().includes('idade')) {
                if (kpi.operation === 'sum') kpi.operation = 'avg';
                if (kpi.icon === 'DollarSign') kpi.icon = 'Users';
              }
            });
          }
        }`;

const sanitizeLogic = `        // SANITIZAÇÃO DE EMERGÊNCIA CONTRA ALUCINAÇÃO DA IA
        if (parsed.dashboardConfig) {
          if (parsed.dashboardConfig.primaryMetric && parsed.dashboardConfig.primaryMetric.toLowerCase().includes('idade')) {
            parsed.dashboardConfig.primaryMetric = 'Registros';
            if (parsed.dashboardConfig.chartTitles) {
               if (parsed.dashboardConfig.chartTitles.barChart) parsed.dashboardConfig.chartTitles.barChart = parsed.dashboardConfig.chartTitles.barChart.replace(/Idade/gi, 'Registros');
               if (parsed.dashboardConfig.chartTitles.areaChart) parsed.dashboardConfig.chartTitles.areaChart = parsed.dashboardConfig.chartTitles.areaChart.replace(/Idade/gi, 'Registros');
            }
          }
          if (parsed.dashboardConfig.kpis && Array.isArray(parsed.dashboardConfig.kpis)) {
            parsed.dashboardConfig.kpis.forEach((kpi: any) => {
              if (kpi.column && kpi.column.toLowerCase().includes('idade')) {
                if (kpi.operation === 'sum') {
                  kpi.operation = 'avg';
                  if (kpi.label) kpi.label = kpi.label.replace(/soma/gi, 'Média').replace(/total/gi, 'Média');
                }
                if (kpi.icon === 'DollarSign') kpi.icon = 'Users';
              }
            });
          }
        }`;

d = d.replace(targetStr, sanitizeLogic);

fs.writeFileSync(groqServicePath, d, 'utf8');
console.log('done');
