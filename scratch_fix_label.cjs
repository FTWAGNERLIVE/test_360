const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  /import \{\s*BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, \s*PieChart/g,
  "import {\n  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList,\n  PieChart"
);

content = content.replace(
  /<Bar dataKey=\{series1Key\} fill="#ff9800" radius=\{\[2, 2, 0, 0\]\} name=\{series1Key\} \/>/g,
  `<Bar dataKey={series1Key} fill="#ff9800" radius={[2, 2, 0, 0]} name={series1Key}>\n                          <LabelList dataKey={series1Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />\n                        </Bar>`
);

content = content.replace(
  /\{series2Key && series2Key !== 'Métrica 2' && <Bar dataKey=\{series2Key\} fill="#192a3e" radius=\{\[2, 2, 0, 0\]\} name=\{series2Key\} \/>\}/g,
  `{series2Key && series2Key !== 'Métrica 2' && (\n                          <Bar dataKey={series2Key} fill="#192a3e" radius={[2, 2, 0, 0]} name={series2Key}>\n                            <LabelList dataKey={series2Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />\n                          </Bar>\n                        )}`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Done');
