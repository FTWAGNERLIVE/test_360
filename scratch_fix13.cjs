const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// The original strings we want to replace
const s1KeyOld = `    return numericHeaders[0] || 'Registros'
  }, [effectiveDiscovery, csvHeaders, numericHeaders])`;

const s1KeyNew = `    return numericHeaders[0] || 'Registros'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, manualConfig.primaryMetric])`;

const s2KeyOld = `    return (numericHeaders[1] && numericHeaders[1] !== series1Key) ? numericHeaders[1] : 'Métrica 2'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, series1Key])`;

const s2KeyNew = `    return (numericHeaders[1] && numericHeaders[1] !== series1Key) ? numericHeaders[1] : 'Métrica 2'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, series1Key, manualConfig.secondaryMetric])`;

d = d.replace(s1KeyOld, s1KeyNew);
d = d.replace(s2KeyOld, s2KeyNew);

// Also double check if there's any other hook that missed a manualConfig dependency.
// Like barChartTitle if we made a mistake in fix11.
// Let's verify our fix11 replacement actually worked for chart titles.
// `{(manualConfig.primaryCategory || manualConfig.primaryMetric)` should be present.
if (!d.includes('(manualConfig.primaryCategory || manualConfig.primaryMetric)')) {
  console.log("WARNING: fix11 title replacement failed too!");
}

fs.writeFileSync(dashboardPath, d, 'utf8');
console.log('done');
