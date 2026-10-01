const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Remove unused import
content = content.replace(/import \{ cleanNumber, formatValue, parseDate, isIdentityOrNameHeader, isDateHeaderName \} from '\.\.\/utils\/dataFormatter';\n/g, '');

// Remove unused allCategoryHeaders destructuring
content = content.replace(/\s*allCategoryHeaders,\n/g, '\n');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed warnings in Dashboard.tsx');
