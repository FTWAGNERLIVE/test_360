const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// The line is:
// <select value={manualConfig.areaMetric || seriesAreaKey} onChange={e => setManualConfig({...manualConfig, primaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>

d = d.replace(
  /<select value=\{manualConfig\.areaMetric \|\| seriesAreaKey\} onChange=\{e => setManualConfig\(\{\.\.\.manualConfig, primaryMetric: e\.target\.value\}\)\}/g,
  '<select value={manualConfig.areaMetric || seriesAreaKey} onChange={e => setManualConfig({...manualConfig, areaMetric: e.target.value})}'
);

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
