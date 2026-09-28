const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "primaryDate: smartDiscovery.dashboardConfig?.primaryDate || localDiscovery.dashboardConfig?.primaryDate || '',",
  "primaryDate: smartDiscovery.dashboardConfig?.primaryDate || localDiscovery.dashboardConfig?.primaryDate || '',\n          donutCategory: smartDiscovery.dashboardConfig?.donutCategory || localDiscovery.dashboardConfig?.donutCategory || '',\n          radarCategory: smartDiscovery.dashboardConfig?.radarCategory || localDiscovery.dashboardConfig?.radarCategory || '',"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code, 'utf8');
console.log('Fixed effectiveDiscovery in Dashboard.tsx');
