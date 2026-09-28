const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  /const barCategoryHeader = useMemo\(\(\) => \{\s+return allCategoryHeaders\[0\] \|\| .*?\n\s+\}, \[allCategoryHeaders, csvHeaders\]\)/s,
  `const barCategoryHeader = useMemo(() => {
    if (effectiveDiscovery?.dashboardConfig?.primaryCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryCategory)) return effectiveDiscovery.dashboardConfig.primaryCategory;
    return allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery])`
);

code = code.replace(
  /const donutCategoryHeader = useMemo\(\(\) => \{\s+return allCategoryHeaders\[1\] \|\| .*?\n\s+\}, \[allCategoryHeaders, csvHeaders\]\)/s,
  `const donutCategoryHeader = useMemo(() => {
    if (effectiveDiscovery?.dashboardConfig?.donutCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.donutCategory)) return effectiveDiscovery.dashboardConfig.donutCategory;
    return allCategoryHeaders[1] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery])`
);

code = code.replace(
  /const radarCategoryHeader = useMemo\(\(\) => \{\s+return allCategoryHeaders\[2\] \|\| .*?\n\s+\}, \[allCategoryHeaders, csvHeaders\]\)/s,
  `const radarCategoryHeader = useMemo(() => {
    if (effectiveDiscovery?.dashboardConfig?.radarCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.radarCategory)) return effectiveDiscovery.dashboardConfig.radarCategory;
    return allCategoryHeaders[2] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery])`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code, 'utf8');
console.log('Categories updated!');
