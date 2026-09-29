const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

const regex = /const statCardsData = useMemo\(\(\) => \{[\s\S]*?return \{ card1Label: c1Label, card1Value: c1Value, card2Label: c2Label, card2Value: c2Value, card3Label: c3Label, card3Value: c3Value, card4Label: c4Label, card4Value: c4Value \}\s*\}, \[[^\]]+\]\)/;

const newCode = `const statCardsData = useMemo(() => {
    if (activeData.length === 0) {
      return {
        cards: [
          { label: 'Total Registros', value: '0', icon: 'FileText' },
          { label: 'Total Colunas', value: '0', icon: 'Share2' },
          { label: 'Métrica Principal', value: '0', icon: 'DollarSign' },
          { label: 'Status Dados', value: 'Pendente', icon: 'CheckCircle' }
        ]
      }
    }

    const aiKpis = effectiveDiscovery.dashboardConfig?.kpis;
    if (aiKpis && Array.isArray(aiKpis) && aiKpis.length >= 4) {
      const computedCards = aiKpis.slice(0, 4).map(kpi => {
        let val = 0;
        let txtVal = '';
        if (kpi.operation === 'count_unique') {
          const unique = new Set(activeData.map(r => String(r[kpi.column] || '')).filter(Boolean));
          val = unique.size;
          txtVal = val.toLocaleString('pt-BR');
        } else if (kpi.operation === 'count') {
          val = activeData.length;
          txtVal = val.toLocaleString('pt-BR');
        } else if (kpi.operation === 'sum' || kpi.operation === 'avg') {
          const sum = activeData.reduce((acc, r) => acc + (cleanNumber(r[kpi.column]) || 0), 0);
          val = kpi.operation === 'avg' ? (activeData.length ? sum / activeData.length : 0) : sum;
          const isMoney = kpi.column.toLowerCase().includes('valor') || kpi.column.toLowerCase().includes('preço') || kpi.column.toLowerCase().includes('preco');
          txtVal = isMoney ? \`R$ \${formatValue(val)}\` : formatValue(val);
        }
        return { label: kpi.label, value: txtVal, icon: ICON_MAP[kpi.icon] ? kpi.icon : 'Star' };
      });
      return { cards: computedCards };
    }

    // Default Fallback logic
    let c1Label = series1Key;
    let c1Value = '';
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series1Key]) || 0), 0);
      const isMoney = series1Key.toLowerCase().includes('valor') || series1Key.toLowerCase().includes('preço') || series1Key.toLowerCase().includes('preco');
      c1Value = isMoney ? \`R$ \${formatValue(sum1)}\` : formatValue(sum1);
    } else {
      c1Label = 'Total Registros';
      c1Value = activeData.length.toLocaleString('pt-BR');
    }

    let c2Label = series2Key !== series1Key && numericHeaders[1] ? series2Key : 'Total Registros';
    let c2Value = '';
    if (numericHeaders[1] && series2Key !== series1Key) {
      const sum2 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series2Key]) || 0), 0);
      c2Value = formatValue(sum2);
    } else {
      c2Value = activeData.length.toLocaleString('pt-BR');
    }

    let c3Label = numericHeaders[0] ? \`Média de \${series1Key}\` : 'Total Colunas';
    let c3Value = '';
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series1Key]) || 0), 0);
      const avg1 = sum1 / activeData.length;
      c3Value = formatValue(avg1);
    } else {
      c3Value = \`\${csvHeaders.length}\`;
    }

    let c4Label = categoryHeader ? \`Categorias em \${categoryHeader}\` : 'Qualidade';
    let c4Value = '';
    if (categoryHeader) {
      const uniqueCats = new Set(activeData.map(r => String(r[categoryHeader] || '')).filter(Boolean));
      c4Value = \`\${uniqueCats.size}\`;
    } else {
      c4Value = '100%';
    }

    return { 
      cards: [
        { label: c1Label, value: c1Value, icon: 'DollarSign' },
        { label: c2Label, value: c2Value, icon: 'Share2' },
        { label: c3Label, value: c3Value, icon: 'ThumbsUp' },
        { label: c4Label, value: c4Value, icon: 'Star' }
      ]
    };
  }, [activeData, numericHeaders, series1Key, series2Key, categoryHeader, csvHeaders.length, effectiveDiscovery])`;

if (regex.test(d)) {
  d = d.replace(regex, newCode);
  fs.writeFileSync(p, d, 'utf8');
  console.log('Cards logic replaced successfully');
} else {
  console.log('Regex did not match');
}
