const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Fix implicit any for `h` and `entry` and `index`
content = content.replace(/\(h\) =>/g, '(h: string) =>');
content = content.replace(/\(h =>/g, '(h: string) =>');
content = content.replace(/entry, index/g, 'entry: any, index: number');
content = content.replace(/card, index/g, 'card: any, index: number');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed implicit any types');
