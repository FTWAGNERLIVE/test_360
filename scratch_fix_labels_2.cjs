const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Area Chart Replacement
content = content.replace(
  /<Area\s+type="monotone"\s+dataKey=\{numericHeaders\[0\] \? series1Key : 'Registros'\}\s+stroke="#ff9800"\s+strokeWidth=\{3\}\s+fillOpacity=\{1\}\s+fill="url\(#colorOrange\)"\s+name=\{numericHeaders\[0\] \? series1Key : 'Registros'\}\s*\/>/g,
  `<Area \n                          type="monotone" \n                          dataKey={numericHeaders[0] ? series1Key : 'Registros'} \n                          stroke="#ff9800" \n                          strokeWidth={3} \n                          fillOpacity={1} \n                          fill="url(#colorOrange)" \n                          name={numericHeaders[0] ? series1Key : 'Registros'}\n                        >\n                          <LabelList dataKey={numericHeaders[0] ? series1Key : 'Registros'} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />\n                        </Area>`
);

content = content.replace(
  /<Area\s+type="monotone"\s+dataKey=\{series2Key\}\s+stroke="#192a3e"\s+strokeWidth=\{3\}\s+fillOpacity=\{1\}\s+fill="url\(#colorNavy\)"\s+name=\{series2Key\}\s*\/>/g,
  `<Area \n                            type="monotone" \n                            dataKey={series2Key} \n                            stroke="#192a3e" \n                            strokeWidth={3} \n                            fillOpacity={1} \n                            fill="url(#colorNavy)" \n                            name={series2Key}\n                          >\n                            <LabelList dataKey={series2Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />\n                          </Area>`
);

// Donut Chart Replacement
content = content.replace(
  /dataKey="value"\s+startAngle=\{90\}\s+endAngle=\{-270\}\s*>/g,
  `dataKey="value"\n                          startAngle={90}\n                          endAngle={-270}\n                          label={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}\n                        >`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Done Pie and Area Labels');
