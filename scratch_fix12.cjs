const fs = require('fs');
const dashboardPath = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(dashboardPath, 'utf8');

// 1. Update series1Key and series2Key to allow "Registros"
d = d.replace(
  /if \(manualConfig\.primaryMetric && csvHeaders\.includes\(manualConfig\.primaryMetric\)\)/g,
  "if (manualConfig.primaryMetric && (csvHeaders.includes(manualConfig.primaryMetric) || manualConfig.primaryMetric === 'Registros'))"
);
d = d.replace(
  /if \(manualConfig\.secondaryMetric && csvHeaders\.includes\(manualConfig\.secondaryMetric\)\)/g,
  "if (manualConfig.secondaryMetric && (csvHeaders.includes(manualConfig.secondaryMetric) || manualConfig.secondaryMetric === 'Registros'))"
);

// Fallbacks
d = d.replace(
  /return numericHeaders\[0\] \|\| 'Métrica 1'/g,
  "return numericHeaders[0] || 'Registros'"
);

// 2. Update resultBarData mapping
// Original:
//      if (numericHeaders[0]) {
//        res[series1Key] = Number(item.val1.toFixed(1))
//      } else {
//        res['Registros'] = item.count
//      }
//      if (numericHeaders[1] && series2Key !== series1Key) {
//        res[series2Key] = Number(item.val2.toFixed(1))
//      }
const oldBarMap = `      if (numericHeaders[0]) {
        res[series1Key] = Number(item.val1.toFixed(1))
      } else {
        res['Registros'] = item.count
      }
      if (numericHeaders[1] && series2Key !== series1Key) {
        res[series2Key] = Number(item.val2.toFixed(1))
      }`;

const newBarMap = `      if (series1Key === 'Registros' || !numericHeaders[0]) {
        res[series1Key || 'Registros'] = item.count
      } else {
        res[series1Key] = Number(item.val1.toFixed(1))
      }
      if (series2Key && series2Key !== series1Key && series2Key !== 'Métrica 2') {
        if (series2Key === 'Registros') {
          res[series2Key] = item.count
        } else {
          res[series2Key] = Number(item.val2.toFixed(1))
        }
      }`;

d = d.replace(oldBarMap, newBarMap);

// 3. Update areaChartData mapping
// Original:
//          res[key1] = numericHeaders[0] ? Number(item.val1.toFixed(1)) : item.count
//          if (key2) {
//            res[key2] = Number(item.val2.toFixed(1))
//          }

const oldAreaMap = `          res[key1] = numericHeaders[0] ? Number(item.val1.toFixed(1)) : item.count
          if (key2) {
            res[key2] = Number(item.val2.toFixed(1))
          }`;

const newAreaMap = `          if (key1 === 'Registros' || !numericHeaders[0]) {
            res[key1] = item.count;
          } else {
            res[key1] = Number(item.val1.toFixed(1));
          }
          if (key2 && key2 !== 'Métrica 2') {
            if (key2 === 'Registros') {
              res[key2] = item.count;
            } else {
              res[key2] = Number(item.val2.toFixed(1));
            }
          }`;

d = d.replace(oldAreaMap, newAreaMap);

// 4. Update radarChartData
// Original: [numericHeaders[0] ? series1Key : 'Registros']: Number((item.sum || item.count).toFixed(1)),
d = d.replace(
  /\[numericHeaders\[0\] \? series1Key : 'Registros'\]: Number\(\(item\.sum \|\| item\.count\)\.toFixed\(1\)\)/g,
  "[series1Key === 'Registros' || !numericHeaders[0] ? 'Registros' : series1Key]: series1Key === 'Registros' ? item.count : Number((item.sum || item.count).toFixed(1))"
);

// 5. Update modals to include "Registros" in options
// <select value={manualConfig.primaryMetric || series1Key} ...
d = d.replace(
  /\{numericHeaders\.map\(h => <option key=\{h\} value=\{h\}>\{h\}<\/option>\)\}/g,
  "<option value=\"Registros\">Quantidade de Registros</option>\n                    {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}"
);

fs.writeFileSync(dashboardPath, d, 'utf8');

const groqPath = 'c:/Users/creat/Documents/Projeto_test360/src/services/groqService.ts';
let groqContent = fs.readFileSync(groqPath, 'utf8');
// Teach AI to use 'Registros' if age or sum doesn't make sense
groqContent = groqContent.replace(
  /5\. ORIGINALIDADE: Busque um cruzamento de dados NOVO ou não óbvio, entregue a melhor visão possível!/,
  '5. ORIGINALIDADE: Busque um cruzamento de dados NOVO ou não óbvio, entregue a melhor visão possível!\n6. GRÁFICOS DE EVOLUÇÃO TEMPORAL E BARRAS: Se a métrica numérica for "Idade" ou algo que NÃO faz sentido somar no tempo, NÃO use como primaryMetric. Em vez disso, use EXATAMENTE a string "Registros" no primaryMetric. Assim o gráfico vai contar as linhas em vez de somar valores que não fazem sentido.'
);
fs.writeFileSync(groqPath, groqContent, 'utf8');

console.log('done');
