const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  /<Pie\s+data=\{donutInfo\.data\}\s+innerRadius=\{45\}\s+outerRadius=\{60\}\s+paddingAngle=\{2\}\s+dataKey="value"\s+startAngle=\{90\}\s+endAngle=\{-270\}\s+label=\{\{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' \}\}\s*>/g,
  `<Pie
                          data={donutInfo.data}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return percent > 0.05 ? (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                                {\`\${(percent * 100).toFixed(0)}%\`}
                              </text>
                            ) : null;
                          }}
                        >`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed pie label');
