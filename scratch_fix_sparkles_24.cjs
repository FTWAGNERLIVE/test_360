const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/<size=\{24\} \/>/g, '<Sparkles size={24} />');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed Sparkles 24');
