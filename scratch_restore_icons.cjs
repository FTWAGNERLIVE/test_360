const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Re-add imports
content = content.replace(/\} from 'lucide-react'/, ', Table, Sparkles } from \'lucide-react\'');

// Fix occurrences
content = content.replace(/<size=\{14\} \/>\s*Ver SQL Adaptativo/g, '<Table size={14} />\n                  Ver SQL Adaptativo');
content = content.replace(/<size=\{14\} \/>\s*Recriar com IA/g, '<Sparkles size={14} />\n                  Recriar com IA');
content = content.replace(/<size=\{28\} className="box-sparkle" \/>/g, '<Sparkles size={28} className="box-sparkle" />');
content = content.replace(/<size=\{24\} \/>\s*<\/button>\n\s*\)\}/g, '<Sparkles size={24} />\n          </button>\n        )}');
content = content.replace(/<size=\{22\} style=\{\{ color: '#38bdf8' \}\} \/>/g, '<Table size={22} style={{ color: \'#38bdf8\' }} />');

fs.writeFileSync(p, content, 'utf8');
console.log('Restored Table and Sparkles tags');
