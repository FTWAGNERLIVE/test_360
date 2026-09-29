const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

const s2KeyOld = `const series2Key = useMemo(() => {
    if (manualConfig.secondaryMetric && (csvHeaders.includes(manualConfig.secondaryMetric) || manualConfig.secondaryMetric === 'Registros')) return manualConfig.secondaryMetric;`;

const s2KeyNew = `const series2Key = useMemo(() => {
    if (manualConfig.secondaryMetric === '') return ''; // Usuário escolheu "Nenhuma" explicitamente
    if (manualConfig.secondaryMetric && (csvHeaders.includes(manualConfig.secondaryMetric) || manualConfig.secondaryMetric === 'Registros')) return manualConfig.secondaryMetric;`;

d = d.replace(s2KeyOld, s2KeyNew);

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
