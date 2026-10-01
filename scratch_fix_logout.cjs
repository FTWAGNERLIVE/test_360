const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/user, logout, impersonatedUser/g, 'user, impersonatedUser');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed unused logout');
