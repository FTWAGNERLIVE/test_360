const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Fix BarChart margin
content = content.replace(
  /<BarChart data=\{resultBarData\} barGap=\{4\}>/g,
  `<BarChart data={resultBarData} barGap={4} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>`
);

// Fix AreaChart margin
content = content.replace(
  /<AreaChart data=\{areaChartData\}>/g,
  `<AreaChart data={areaChartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed margins for charts');
