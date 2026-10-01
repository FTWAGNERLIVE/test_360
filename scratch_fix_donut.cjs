const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Update donutInfo to use objects for categoriesList
content = content.replace(
  /const list = top4\.map\(\(\[name, count\]\) => \{\s*const pct = Math\.round\(\(count \/ totalCount\) \* 100\)\s*return `\$\{name\} \(\$\{pct\}%\)`\s*\}\)/,
  `const list = top4.map(([name, count], i) => {\n      const pct = Math.round((count / totalCount) * 100)\n      return { text: \`\${name} (\${pct}%)\`, color: colors[i % colors.length] }\n    })`
);

// Fallback for empty data categoriesList
content = content.replace(
  /categoriesList: \['Sem registros'\]/,
  `categoriesList: [{ text: 'Sem registros', color: '#192a3e' }]`
);

// Update rendering of donut-text-list
content = content.replace(
  /<div className="donut-text-list">\s*\{donutInfo\.categoriesList\.map\(\(item, idx\) => \(\s*<div key=\{idx\} className="list-row">\s*<span className="bullet"><\/span> \{item\}\s*<\/div>\s*\)\)\}\s*<\/div>/,
  `<div className="donut-text-list">\n                    {donutInfo.categoriesList.map((item: any, idx: number) => (\n                      <div key={idx} className="list-row">\n                        <span className="bullet" style={{ backgroundColor: item.color }}></span> {item.text}\n                      </div>\n                    ))}\n                  </div>`
);

// Adjust Pie outerRadius to prevent label cutoff
content = content.replace(
  /innerRadius=\{52\}\s*outerRadius=\{72\}/,
  `innerRadius={45}\n                          outerRadius={60}`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed donut issues');
