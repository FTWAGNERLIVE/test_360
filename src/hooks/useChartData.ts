import { useMemo } from 'react';
import { cleanNumber, formatValue, parseDate, isDateHeaderName, isIdentityOrNameHeader } from '../utils/dataFormatter';
import { DollarSign, Users, Activity, Briefcase, TrendingUp, ShoppingCart, FileText, CheckCircle, Target, Heart, Clock, Share2, ThumbsUp, Star } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  DollarSign, Users, Activity, Briefcase, TrendingUp, ShoppingCart,
  FileText, CheckCircle, Target, Heart, Clock,
  Share2, ThumbsUp, Star
};

export function useChartData({
  activeData,
  csvHeaders,
  csvData,
  effectiveDiscovery,
  manualConfig,
  timeGranularity
}: any) {
  const numericHeaders = useMemo(() => {
    if (!csvHeaders || !csvData || csvData.length === 0) return []
    return csvHeaders.filter((h: any) => {
      if (isDateHeaderName(h)) return false

      const lower = h.toLowerCase()
      if (
        lower.includes('id') || lower.includes('código') || lower.includes('codigo') ||
        lower.includes('cpf') || lower.includes('cep') || lower.includes('fone') || lower.includes('telef')
      ) return false

      const sampleRows = csvData.slice(0, 15)
      
      const dateSerialCount = sampleRows.filter((r: any) => {
        const val = String(r[h] || '').trim()
        const num = Number(val)
        return !isNaN(num) && num > 30000 && num < 70000 && val.length <= 5
      }).length

      if (dateSerialCount >= 3) return false

      const validCount = sampleRows.filter((r: any) => !isNaN(cleanNumber(r[h]))).length
      return validCount >= 3
    })
  }, [csvHeaders, csvData])

  const allCategoryHeaders = useMemo(() => {
    if (!csvHeaders || !activeData || activeData.length === 0) return []

    const candidates = csvHeaders.filter((h: any) => {
      if (isDateHeaderName(h) || isIdentityOrNameHeader(h)) return false
      const sampleVals = activeData.map((r: any) => String(r[h] || '').trim()).filter(Boolean)
      if (sampleVals.length === 0) return false
      const numCount = sampleVals.filter((v: any) => !isNaN(cleanNumber(v))).length
      if (numCount >= sampleVals.length * 0.7) return false

      const uniqueCount = new Set(sampleVals).size
      return uniqueCount >= 2 && uniqueCount <= Math.max(40, Math.ceil(activeData.length * 0.85))
    })

    const aiCategory = effectiveDiscovery?.dashboardConfig?.primaryCategory
    if (aiCategory && candidates.includes(aiCategory) && !isIdentityOrNameHeader(aiCategory)) {
      return [aiCategory, ...candidates.filter((c: any) => c !== aiCategory)]
    }

    return candidates
  }, [csvHeaders, activeData, effectiveDiscovery])

  const barCategoryHeader = useMemo(() => {
    if (manualConfig.primaryCategory && csvHeaders.includes(manualConfig.primaryCategory)) return manualConfig.primaryCategory;
    if (effectiveDiscovery?.dashboardConfig?.primaryCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryCategory)) return effectiveDiscovery.dashboardConfig.primaryCategory;
    return allCategoryHeaders[0] || csvHeaders.find((h: any) => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.primaryCategory])

  const donutCategoryHeader = useMemo(() => {
    if (manualConfig.donutCategory && csvHeaders.includes(manualConfig.donutCategory)) return manualConfig.donutCategory;
    if (effectiveDiscovery?.dashboardConfig?.donutCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.donutCategory)) return effectiveDiscovery.dashboardConfig.donutCategory;
    return allCategoryHeaders[1] || allCategoryHeaders[0] || csvHeaders.find((h: any) => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.donutCategory])

  const radarCategoryHeader = useMemo(() => {
    if (manualConfig.radarCategory && csvHeaders.includes(manualConfig.radarCategory)) return manualConfig.radarCategory;
    if (effectiveDiscovery?.dashboardConfig?.radarCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.radarCategory)) return effectiveDiscovery.dashboardConfig.radarCategory;
    return allCategoryHeaders[2] || allCategoryHeaders[0] || csvHeaders.find((h: any) => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.radarCategory])

  const dateHeader = useMemo(() => {
    if (manualConfig.primaryDate && csvHeaders.includes(manualConfig.primaryDate)) return manualConfig.primaryDate;
    if (effectiveDiscovery?.dashboardConfig?.primaryDate && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryDate)) {
      return effectiveDiscovery.dashboardConfig.primaryDate
    }
    if (!csvHeaders || !csvData || csvData.length === 0) return ''
    return csvHeaders.find((h: any) => isDateHeaderName(h)) || csvHeaders.find((h: any) => {
      const sampleRows = csvData.slice(0, 10)
      const dateSerialCount = sampleRows.filter((r: any) => {
        const val = String(r[h] || '').trim()
        const num = Number(val)
        return !isNaN(num) && num > 30000 && num < 70000 && val.length <= 5
      }).length
      return dateSerialCount >= 3
    }) || ''
  }, [csvHeaders, csvData, effectiveDiscovery, manualConfig.primaryDate])

  const series1Key = useMemo(() => {
    if (manualConfig.primaryMetric && (csvHeaders.includes(manualConfig.primaryMetric) || manualConfig.primaryMetric === 'Registros')) return manualConfig.primaryMetric;
    if (effectiveDiscovery?.dashboardConfig?.primaryMetric && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryMetric)) {
      return effectiveDiscovery.dashboardConfig.primaryMetric
    }
    return numericHeaders[0] || 'Registros'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, manualConfig.primaryMetric])

  const seriesAreaKey = useMemo(() => {
    if (manualConfig.areaMetric && (csvHeaders.includes(manualConfig.areaMetric) || manualConfig.areaMetric === 'Registros')) return manualConfig.areaMetric;
    return series1Key;
  }, [series1Key, manualConfig.areaMetric, csvHeaders])

  const series2Key = useMemo(() => {
    if (manualConfig.secondaryMetric === '') return ''; 
    if (manualConfig.secondaryMetric && (csvHeaders.includes(manualConfig.secondaryMetric) || manualConfig.secondaryMetric === 'Registros')) return manualConfig.secondaryMetric;
    if (
      effectiveDiscovery?.dashboardConfig?.secondaryMetric && 
      csvHeaders.includes(effectiveDiscovery.dashboardConfig.secondaryMetric) &&
      effectiveDiscovery.dashboardConfig.secondaryMetric !== series1Key
    ) {
      return effectiveDiscovery.dashboardConfig.secondaryMetric
    }
    return (numericHeaders[1] && numericHeaders[1] !== series1Key) ? numericHeaders[1] : 'Métrica 2'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, series1Key, manualConfig.secondaryMetric])

  const statCardsData = useMemo(() => {
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

    const aiKpis = (effectiveDiscovery?.dashboardConfig as any)?.kpis;
    if (aiKpis && Array.isArray(aiKpis) && aiKpis.length >= 4) {
      const computedCards = aiKpis.slice(0, 4).map((kpi: any) => {
        let val = 0;
        let txtVal = '';
        if (kpi.operation === 'count_unique') {
          const unique = new Set(activeData.map((r: any) => String(r[kpi.column] || '')).filter(Boolean));
          val = unique.size;
          txtVal = val.toLocaleString('pt-BR');
        } else if (kpi.operation === 'count') {
          val = activeData.length;
          txtVal = val.toLocaleString('pt-BR');
        } else if (kpi.operation === 'sum' || kpi.operation === 'avg') {
          const sum = activeData.reduce((acc: number, r: any) => acc + (cleanNumber(r[kpi.column]) || 0), 0);
          val = kpi.operation === 'avg' ? (activeData.length ? sum / activeData.length : 0) : sum;
          const isMoney = kpi.column.toLowerCase().includes('valor') || kpi.column.toLowerCase().includes('preço') || kpi.column.toLowerCase().includes('preco');
          txtVal = isMoney ? `R$ ${formatValue(val)}` : formatValue(val);
        }
        return { label: kpi.label, value: txtVal, icon: ICON_MAP[kpi.icon] ? kpi.icon : 'Star' };
      });
      return { cards: computedCards };
    }

    let c1Label = series1Key;
    let c1Value = '';
    const isMoney1 = series1Key.toLowerCase().includes('valor') || series1Key.toLowerCase().includes('preço') || series1Key.toLowerCase().includes('preco') || series1Key.toLowerCase().includes('faturamento') || series1Key.toLowerCase().includes('mensalidade');
    const isGradeOrScore = series1Key.toLowerCase().includes('nota') || series1Key.toLowerCase().includes('media') || series1Key.toLowerCase().includes('média') || series1Key.toLowerCase().includes('frequencia') || series1Key.toLowerCase().includes('frequência') || series1Key.toLowerCase().includes('score') || series1Key.toLowerCase().includes('rating');

    if (numericHeaders[0]) {
      const validVals = activeData.map((r: any) => cleanNumber(r[series1Key])).filter((v: number) => !isNaN(v));
      if (isGradeOrScore && validVals.length > 0) {
        const avg = validVals.reduce((a: number, b: number) => a + b, 0) / validVals.length;
        c1Label = `Média de ${series1Key}`;
        c1Value = formatValue(avg);
      } else {
        const sum1 = validVals.reduce((acc: number, v: number) => acc + v, 0);
        c1Value = isMoney1 ? `R$ ${formatValue(sum1)}` : formatValue(sum1);
      }
    } else {
      c1Label = 'Total Registros';
      c1Value = activeData.length.toLocaleString('pt-BR');
    }

    let c2Label = series2Key !== series1Key && numericHeaders[1] ? series2Key : 'Total Registros';
    let c2Value = '';
    if (numericHeaders[1] && series2Key !== series1Key) {
      const sum2 = activeData.reduce((acc: number, r: any) => acc + (cleanNumber(r[series2Key]) || 0), 0);
      c2Value = formatValue(sum2);
    } else {
      c2Value = activeData.length.toLocaleString('pt-BR');
    }

    let c3Label = numericHeaders[0] ? `Total ${series1Key}` : 'Total Colunas';
    let c3Value = '';
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc: number, r: any) => acc + (cleanNumber(r[series1Key]) || 0), 0);
      c3Value = formatValue(sum1);
    } else {
      c3Value = `${csvHeaders.length}`;
    }

    let c4Label = barCategoryHeader ? `Categorias em ${barCategoryHeader}` : 'Qualidade';
    let c4Value = '';
    if (barCategoryHeader) {
      const uniqueCats = new Set(activeData.map((r: any) => String(r[barCategoryHeader] || '')).filter(Boolean));
      c4Value = `${uniqueCats.size}`;
    } else {
      c4Value = '100%';
    }

    const c1Icon = isMoney1 ? 'DollarSign' : (series1Key.toLowerCase().includes('aluno') ? 'Users' : 'Activity');

    return { 
      cards: [
        { label: c1Label, value: c1Value, icon: c1Icon },
        { label: c2Label, value: c2Value, icon: 'Share2' },
        { label: c3Label, value: c3Value, icon: 'ThumbsUp' },
        { label: c4Label, value: c4Value, icon: 'Star' }
      ]
    };
  }, [activeData, numericHeaders, series1Key, series2Key, barCategoryHeader, csvHeaders.length, effectiveDiscovery])

  const resultBarData = useMemo(() => {
    if (activeData.length === 0) return []

    const groupKey = barCategoryHeader || csvHeaders[0] || ''
    const grouped: Record<string, { val1: number; val2: number; count: number }> = {}

    activeData.forEach((row: any) => {
      const catVal = String(row[groupKey] || 'Outros').trim()
      if (!grouped[catVal]) grouped[catVal] = { val1: 0, val2: 0, count: 0 }
      const v1 = cleanNumber(row[series1Key])
      const v2 = cleanNumber(row[series2Key])
      if (!isNaN(v1)) grouped[catVal].val1 += Math.abs(v1)
      if (!isNaN(v2)) grouped[catVal].val2 += Math.abs(v2)
      grouped[catVal].count += 1
    })

    const sorted = Object.entries(grouped).sort(([, a], [, b]) => (b.val1 || b.count) - (a.val1 || a.count))
    const topSample = sorted.slice(0, 8)

    return topSample.map(([catVal, item]) => {
      const name = catVal.length > 12 ? catVal.substring(0, 10) + '...' : catVal
      const res: any = { name }
      if (numericHeaders[0]) {
        res[series1Key] = Number(item.val1.toFixed(1))
      } else {
        res['Registros'] = item.count
      }
      if (numericHeaders[1] && series2Key !== series1Key) {
        res[series2Key] = Number(item.val2.toFixed(1))
      }
      return res
    })
  }, [activeData, barCategoryHeader, csvHeaders, numericHeaders, series1Key, series2Key])

  const donutInfo = useMemo(() => {
    if (activeData.length === 0 || !donutCategoryHeader) {
      return {
        data: [{ name: 'Sem Dados', value: 100, color: '#192a3e' }],
        topPercentage: '0%',
        categoriesList: [{ text: 'Sem registros', color: '#192a3e' }]
      }
    }

    const counts: Record<string, number> = {}
    activeData.forEach((row: any) => {
      const val = String(row[donutCategoryHeader] || 'Outros').trim()
      if (val) counts[val] = (counts[val] || 0) + 1
    })

    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
    const top4 = sorted.slice(0, 4)
    const totalCount = activeData.length
    const topVal = top4[0]?.[1] || 0
    const topPct = totalCount > 0 ? Math.round((topVal / totalCount) * 100) : 0

    const colors = ['#ff9800', '#192a3e', '#6366f1', '#f58220']
    const pieData = top4.map(([name, count], i) => ({
      name,
      value: count,
      color: colors[i % colors.length]
    }))

    const list = top4.map(([name, count], i) => {
      const pct = Math.round((count / totalCount) * 100)
      return { text: `${name} (${pct}%)`, color: colors[i % colors.length] }
    })

    return {
      data: pieData.length > 0 ? pieData : [{ name: 'Outros', value: 100, color: '#192a3e' }],
      topPercentage: `${topPct}%`,
      categoriesList: list
    }
  }, [activeData, donutCategoryHeader])

  const areaChartData = useMemo(() => {
    if (activeData.length === 0) return []

    const key1 = numericHeaders[0] ? series1Key : 'Registros'
    const key2 = numericHeaders[1] && series2Key !== series1Key ? series2Key : null

    if (dateHeader) {
      const grouped: Record<string, { displayDate: string; timestamp: number; val1: number; val2: number; count: number }> = {}

      activeData.forEach((row: any) => {
        const rawDate = row[dateHeader]
        const parsed = parseDate(rawDate)
        if (parsed && !isNaN(parsed.getTime())) {
          const year = parsed.getUTCFullYear()
          if (year >= 1950 && year <= 2100) {
            const monthNum = parsed.getUTCMonth() + 1
            const month = String(monthNum).padStart(2, '0')
            const dayNum = parsed.getUTCDate()
            const day = String(dayNum).padStart(2, '0')

            let dateKey = `${year}-${month}`
            let displayDate = `${month}/${String(year).slice(-2)}`
            let timestamp = new Date(Date.UTC(year, monthNum - 1, 1)).getTime()

            if (timeGranularity === 'day') {
              dateKey = `${year}-${month}-${day}`
              displayDate = `${day}/${month}`
              timestamp = parsed.getTime()
            } else if (timeGranularity === 'year') {
              dateKey = `${year}`
              displayDate = `${year}`
              timestamp = new Date(Date.UTC(year, 0, 1)).getTime()
            }

            if (!grouped[dateKey]) {
              grouped[dateKey] = { displayDate, timestamp, val1: 0, val2: 0, count: 0 }
            }

            const v1 = cleanNumber(row[seriesAreaKey])
            const v2 = cleanNumber(row[series2Key])
            if (!isNaN(v1)) grouped[dateKey].val1 += Math.abs(v1)
            if (!isNaN(v2)) grouped[dateKey].val2 += Math.abs(v2)
            grouped[dateKey].count += 1
          }
        }
      })

      const sortedEntries = Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp)

      if (sortedEntries.length > 0) {
        return sortedEntries.map(item => {
          const res: any = { name: item.displayDate }
          res[key1] = numericHeaders[0] ? Number(item.val1.toFixed(1)) : item.count
          if (key2) {
            res[key2] = Number(item.val2.toFixed(1))
          }
          return res
        })
      }
    }

    const groupKey = barCategoryHeader || csvHeaders[0] || ''
    if (groupKey) {
      const grouped: Record<string, { val1: number; val2: number; count: number }> = {}
      activeData.forEach((row: any) => {
        const cat = String(row[groupKey] || 'Outros').trim()
        if (!grouped[cat]) grouped[cat] = { val1: 0, val2: 0, count: 0 }
        const v1 = cleanNumber(row[seriesAreaKey])
        const v2 = cleanNumber(row[series2Key])
        if (!isNaN(v1)) grouped[cat].val1 += Math.abs(v1)
        if (!isNaN(v2)) grouped[cat].val2 += Math.abs(v2)
        grouped[cat].count += 1
      })

      return Object.entries(grouped).slice(0, 10).map(([catName, item]) => {
        const shortName = catName.length > 10 ? catName.substring(0, 8) + '..' : catName
        const res: any = { name: shortName }
        res[key1] = numericHeaders[0] ? Number(item.val1.toFixed(1)) : item.count
        if (key2) {
          res[key2] = Number(item.val2.toFixed(1))
        }
        return res
      })
    }

    return []
  }, [activeData, dateHeader, barCategoryHeader, csvHeaders, numericHeaders, seriesAreaKey, series2Key, timeGranularity])

  const radarChartData = useMemo(() => {
    if (activeData.length === 0) return []

    const groupKey = radarCategoryHeader || csvHeaders[0] || ''
    const grouped: Record<string, { count: number; sum: number }> = {}

    activeData.forEach((row: any) => {
      const cat = String(row[groupKey] || 'Outros').trim()
      if (!grouped[cat]) grouped[cat] = { count: 0, sum: 0 }
      grouped[cat].count += 1
      const val = cleanNumber(row[series1Key])
      if (!isNaN(val)) grouped[cat].sum += Math.abs(val)
    })

    const sorted = Object.entries(grouped).sort(([, a], [, b]) => (b.sum || b.count) - (a.sum || a.count))
    const top6 = sorted.slice(0, 6)

    const maxVal = Math.max(...top6.map(([, item]) => item.sum || item.count), 1)

    return top6.map(([catName, item]) => {
      const shortName = catName.length > 12 ? catName.substring(0, 10) + '..' : catName
      return {
        subject: shortName,
        [series1Key === 'Registros' || !numericHeaders[0] ? 'Registros' : series1Key]: series1Key === 'Registros' ? item.count : Number((item.sum || item.count).toFixed(1)),
        fullMark: maxVal
      }
    })
  }, [activeData, radarCategoryHeader, csvHeaders, numericHeaders, series1Key])

  return {
    numericHeaders,
    allCategoryHeaders,
    barCategoryHeader,
    donutCategoryHeader,
    radarCategoryHeader,
    dateHeader,
    series1Key,
    seriesAreaKey,
    series2Key,
    statCardsData,
    resultBarData,
    donutInfo,
    areaChartData,
    radarChartData
  };
}
