const fs = require('fs');
let code = fs.readFileSync('src/services/groqService.ts', 'utf8');

code = code.replace(
  /export interface DashboardConfig \{[\s\S]*?\};\n\}/,
  `export interface DashboardConfig {
  primaryMetric: string;
  secondaryMetric: string;
  primaryCategory: string;
  donutCategory?: string;
  radarCategory?: string;
  primaryDate: string;
  chartTitles: {
    barChart?: string;
    donutChart?: string;
    areaChart?: string;
    radarChart?: string;
  };
}`
);

code = code.replace(
  'import { analyzeData, DashboardMapping } from "./dataAnalyzer";',
  'import { analyzeData } from "./dataAnalyzer";'
);

fs.writeFileSync('src/services/groqService.ts', code, 'utf8');
console.log('Fixed DashboardConfig in groqService.ts');
