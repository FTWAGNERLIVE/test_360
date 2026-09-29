const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// 1. Inject seriesAreaKey hook right before series2Key
const seriesAreaKeyDef = `  const seriesAreaKey = useMemo(() => {
    if (manualConfig.areaMetric && (csvHeaders.includes(manualConfig.areaMetric) || manualConfig.areaMetric === 'Registros')) return manualConfig.areaMetric;
    return series1Key;
  }, [series1Key, manualConfig.areaMetric, csvHeaders])

`;
if (!d.includes('const seriesAreaKey')) {
  d = d.replace(
    /const series2Key = useMemo/g,
    seriesAreaKeyDef + 'const series2Key = useMemo'
  );
}

// 2. areaChartData dependency array
d = d.replace(
  /series1Key, series2Key, timeGranularity\]\)/g,
  'seriesAreaKey, series2Key, timeGranularity])'
);

// 3. areaChartData variable usage
// Note: In Dashboard.tsx, the areaChartData mapping uses key1 and key2!
// We need to find `const key1 = series1Key` and `const v1 = cleanNumber(row[series1Key])`
// But wait, there is no `const key1 = series1Key` in areaChartData? 
// Let's replace ONLY inside areaChartData!
const areaChartDataRegex = /const areaChartData = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?timeGranularity\]\)/;
d = d.replace(areaChartDataRegex, (match) => {
  let inner = match;
  inner = inner.replace(/cleanNumber\(row\[series1Key\]\)/g, 'cleanNumber(row[seriesAreaKey])');
  inner = inner.replace(/const key1 = series1Key/g, 'const key1 = seriesAreaKey');
  return inner;
});

// 4. Area Chart UI title
d = d.replace(
  /\(manualConfig\.primaryDate \|\| manualConfig\.primaryMetric\) \? `Evolução de \$\{series1Key\}` : \(effectiveDiscovery\?\.dashboardConfig\?\.chartTitles\?\.areaChart \|\| `Evolução de \$\{series1Key\}`\)/g,
  '(manualConfig.primaryDate || manualConfig.areaMetric) ? `Evolução de ${seriesAreaKey}` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.areaChart || `Evolução de ${seriesAreaKey}`)'
);

// 5. Area Chart UI elements
d = d.replace(
  /<span>\{numericHeaders\[0\] \? series1Key : 'Registros'\}<\/span>/g,
  '<span>{numericHeaders[0] ? seriesAreaKey : \'Registros\'}</span>'
);

d = d.replace(
  /<Area type="monotone" dataKey=\{series1Key\}/g,
  '<Area type="monotone" dataKey={seriesAreaKey}'
);

d = d.replace(
  /<Tooltip\s+contentStyle=\{\{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' \}\}\s+itemStyle=\{\{ color: '#fff', fontSize: '12px' \}\}\s+\/>\s+<Area type="monotone" dataKey=\{seriesAreaKey\} fillOpacity=\{1\} fill="url\(#colorOrange\)" stroke="#ff9800" strokeWidth=\{3\} name=\{series1Key\} \/>/g,
  `<Tooltip 
                            contentStyle={{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey={seriesAreaKey} fillOpacity={1} fill="url(#colorOrange)" stroke="#ff9800" strokeWidth={3} name={seriesAreaKey} />`
);

// Wait, the regex above for Tooltip might not match exactly.
// Just replace `name={series1Key}` specifically on the <Area> component if it's there.
d = d.replace(
  /<Area type="monotone" dataKey=\{seriesAreaKey\} fillOpacity=\{1\} fill="url\(#colorOrange\)" stroke="#ff9800" strokeWidth=\{3\} name=\{series1Key\} \/>/g,
  '<Area type="monotone" dataKey={seriesAreaKey} fillOpacity={1} fill="url(#colorOrange)" stroke="#ff9800" strokeWidth={3} name={seriesAreaKey} />'
);

// 6. Modal logic fix for area chart
const modalRegex = /\{editingChart === 'area' && \([\s\S]*?<\/div>\s*\)\}/;
d = d.replace(modalRegex, (match) => {
  let m = match.replace(/manualConfig\.primaryMetric/g, 'manualConfig.areaMetric');
  m = m.replace(/series1Key/g, 'seriesAreaKey');
  return m;
});

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
