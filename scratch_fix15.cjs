const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// Use regex to replace the dependency arrays to ignore whitespace issues

d = d.replace(
  /\}, \[effectiveDiscovery, csvHeaders, numericHeaders\]\)/g,
  "}, [effectiveDiscovery, csvHeaders, numericHeaders, manualConfig.primaryMetric])"
);

d = d.replace(
  /\}, \[effectiveDiscovery, csvHeaders, numericHeaders, series1Key\]\)/g,
  "}, [effectiveDiscovery, csvHeaders, numericHeaders, series1Key, manualConfig.secondaryMetric])"
);

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
