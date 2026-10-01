const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Import utilities
const importStatement = `import { cleanNumber, formatValue, parseDate, isIdentityOrNameHeader, isDateHeaderName } from '../utils/dataFormatter';\n`;
content = content.replace(/import '\.\/Dashboard\.css'/, `import './Dashboard.css'\n${importStatement}`);

// Remove cleanNumber function block
content = content.replace(/const cleanNumber = \(\s*val:\s*any\s*\):\s*number => \{[\s\S]*?return Number\(cleaned\)\s*\}/, '');

// Remove formatValue function block
content = content.replace(/const formatValue = \(\s*num:\s*number\s*\) => \{[\s\S]*?return num\.toLocaleString\('pt-BR', \{ maximumFractionDigits: 1 \}\)\s*\}/, '');

// Remove parseDate function block
content = content.replace(/const parseDate = \(\s*dateStr:\s*any\s*\):\s*Date \| null => \{[\s\S]*?return isNaN\(d\.getTime\(\)\) \? null : d\s*\}/, '');

// Remove isIdentityOrNameHeader function block
content = content.replace(/export function isIdentityOrNameHeader\(\s*h:\s*string\s*\):\s*boolean \{[\s\S]*?low\.includes\('descricao'\) \|\| low\.includes\('descrição'\)\s*\)\s*\}/, '');

// Remove isDateHeaderName block inside the component
content = content.replace(/const isDateHeaderName = \(\s*header:\s*string\s*\):\s*boolean => \{[\s\S]*?lower\.includes\('demissão'\) \|\|\s*lower\.includes\('validade'\)\s*\)\s*\}/, '');

// Write back
fs.writeFileSync(p, content, 'utf8');
console.log('Removed functions from Dashboard and added imports');
