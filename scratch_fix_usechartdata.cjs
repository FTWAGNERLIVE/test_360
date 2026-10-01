const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'hooks', 'useChartData.ts');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$\{/g, '${');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed escaped backticks in useChartData');
