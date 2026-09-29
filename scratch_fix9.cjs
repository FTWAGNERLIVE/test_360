const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

// The dependencies of the various useMemos need to have manualConfig.xxx added to them

// barCategoryHeader
d = d.replace(
  /const barCategoryHeader = useMemo\(\(\) => \{[\s\S]*?\}, \[allCategoryHeaders, csvHeaders, effectiveDiscovery\]\)/,
  (match) => match.replace('], [allCategoryHeaders, csvHeaders, effectiveDiscovery])', '], [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.primaryCategory])')
);

// donutCategoryHeader
d = d.replace(
  /const donutCategoryHeader = useMemo\(\(\) => \{[\s\S]*?\}, \[allCategoryHeaders, csvHeaders, effectiveDiscovery\]\)/,
  (match) => match.replace('], [allCategoryHeaders, csvHeaders, effectiveDiscovery])', '], [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.donutCategory])')
);

// radarCategoryHeader
d = d.replace(
  /const radarCategoryHeader = useMemo\(\(\) => \{[\s\S]*?\}, \[allCategoryHeaders, csvHeaders, effectiveDiscovery\]\)/,
  (match) => match.replace('], [allCategoryHeaders, csvHeaders, effectiveDiscovery])', '], [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.radarCategory])')
);

// dateHeader
d = d.replace(
  /const dateHeader = useMemo\(\(\) => \{[\s\S]*?\}, \[csvHeaders, csvData, effectiveDiscovery\]\)/,
  (match) => match.replace('], [csvHeaders, csvData, effectiveDiscovery])', '], [csvHeaders, csvData, effectiveDiscovery, manualConfig.primaryDate])')
);

// series1Key
d = d.replace(
  /const series1Key = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveDiscovery, csvHeaders, numericHeaders\]\)/,
  (match) => match.replace('], [effectiveDiscovery, csvHeaders, numericHeaders])', '], [effectiveDiscovery, csvHeaders, numericHeaders, manualConfig.primaryMetric])')
);

// series2Key
d = d.replace(
  /const series2Key = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveDiscovery, csvHeaders, numericHeaders, series1Key\]\)/,
  (match) => match.replace('], [effectiveDiscovery, csvHeaders, numericHeaders, series1Key])', '], [effectiveDiscovery, csvHeaders, numericHeaders, series1Key, manualConfig.secondaryMetric])')
);

fs.writeFileSync(p, d, 'utf8');
console.log('done');
