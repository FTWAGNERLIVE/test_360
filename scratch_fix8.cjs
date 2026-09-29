const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

// The h3 currently has style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
// We want it to be style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}
// Wait, if width: 100% isn't enough, we could add flex: 1 to the span.
// Let's replace the whole h3 header elements to force width: 100% and space-between.

d = d.replace(
  /<h3 className="widget-title" style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}>\s*<span>\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.barChart/g,
  '<h3 className="widget-title" style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', width: \'100%\' }}>\\n                      <span style={{ flex: 1 }}>{effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart'
);

d = d.replace(
  /<h3 className="widget-title" style=\{\{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}>\s*<span>\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.donutChart/g,
  '<h3 className="widget-title" style={{ fontSize: \'14px\', fontWeight: 700, color: \'#192a3e\', margin: 0, display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', width: \'100%\' }}>\\n                      <span style={{ flex: 1 }}>{effectiveDiscovery?.dashboardConfig?.chartTitles?.donutChart'
);

d = d.replace(
  /<h3 className="widget-title" style=\{\{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}>\s*<span>\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.areaChart/g,
  '<h3 className="widget-title" style={{ fontSize: \'14px\', fontWeight: 700, color: \'#192a3e\', margin: 0, display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', width: \'100%\' }}>\\n                      <span style={{ flex: 1 }}>{effectiveDiscovery?.dashboardConfig?.chartTitles?.areaChart'
);

d = d.replace(
  /<h3 className="widget-title" style=\{\{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}>\s*<span>\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.radarChart/g,
  '<h3 className="widget-title" style={{ fontSize: \'14px\', fontWeight: 700, color: \'#192a3e\', margin: 0, display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', width: \'100%\' }}>\\n                      <span style={{ flex: 1 }}>{effectiveDiscovery?.dashboardConfig?.chartTitles?.radarChart'
);

// Also replace the button styling to ensure it's aligned properly without squishing the text
d = d.replace(
  /<button onClick=\{\(\) => handleEditClick\('([a-z]+)'\)\} style=\{\{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' \}\} title="Editar Gráfico">/g,
  '<button onClick={() => handleEditClick(\'$1\')} style={{ background: \'none\', border: \'none\', cursor: \'pointer\', color: \'#94a3b8\', display: \'flex\', alignItems: \'center\', padding: \'4px\' }} title="Editar Gráfico">'
);

fs.writeFileSync(p, d, 'utf8');
console.log('done');
