export interface ColumnProfile {
  name: string
  type: 'currency' | 'number' | 'date' | 'category' | 'id' | 'text'
  uniqueCount: number
  totalCount: number
  nullCount: number
  sampleValues: any[]
  maxLength: number
  scoreMetric: number
  scoreDimension: number
  scoreTime: number
}

export interface DashboardMapping {
  primaryMetric: string // Eixo Y Principal
  secondaryMetric: string // Eixo Y Secundário
  primaryCategory: string // Eixo X de Barras
  donutCategory: string // Agrupamento do Donut
  radarCategory: string // Agrupamento do Radar
  primaryDate: string // Linha do Tempo
}

const parseNumber = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[R$\s.]/g, '').replace(',', '.')
  const num = Number(cleaned)
  return isNaN(num) ? null : num
}

const isCurrencyKeyword = (name: string) => {
  const low = name.toLowerCase()
  return (
    low.includes('valor') || low.includes('preço') || low.includes('preco') ||
    low.includes('faturamento') || low.includes('saldo') || low.includes('receita') ||
    low.includes('despesa') || low.includes('lucro') || low.includes('mensalidade') ||
    low.includes('custo') || low.includes('pago') || low.includes('total') || low.includes('vendas')
  )
}

const isDateKeyword = (name: string) => {
  const low = name.toLowerCase()
  return (
    low.includes('data') || low.includes('date') || low.includes('vencimento') ||
    low.includes('realizacao') || low.includes('nascimento') || low.includes('criacao') ||
    low.includes('admissao') || low.includes('validade') || low.includes('período') || low.includes('periodo') ||
    low.includes('mês') || low.includes('mes') || low.includes('ano') || low.includes('dia')
  )
}

const isIdKeyword = (name: string) => {
  const low = name.toLowerCase().trim()
  return (
    low === 'id' || low.includes('id_') || low.endsWith('_id') || low.includes(' id') ||
    low.includes('código') || low.includes('codigo') || low.includes('cpf') ||
    low.includes('cnpj') || low.includes('cep') || low.includes('telef') || low.includes('fone') ||
    low.includes('email') || low.includes('e-mail') || low.includes('matrícula') || low.includes('matricula')
  )
}

export const analyzeData = (headers: string[], data: any[]): { profiles: ColumnProfile[], mapping: DashboardMapping } => {
  const sample = data.slice(0, 150)
  const totalCount = sample.length

  const profiles: ColumnProfile[] = headers.map(header => {
    const rawValues = sample.map(row => row[header])
    const validValues = rawValues.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    const uniqueValues = Array.from(new Set(validValues.map(v => String(v).trim())))
    
    const uniqueCount = uniqueValues.length
    const nullCount = totalCount - validValues.length
    const maxLength = Math.max(...validValues.map(v => String(v).length), 0)

    let type: ColumnProfile['type'] = 'text'

    // 1. Check ID
    if (isIdKeyword(header) || (uniqueCount === totalCount && totalCount > 10)) {
      type = 'id'
    } 
    // 2. Check Date
    else if (isDateKeyword(header)) {
      type = 'date'
    } 
    // 3. Check Numeric / Currency
    else {
      const numericCount = validValues.filter(v => parseNumber(v) !== null).length
      if (numericCount >= validValues.length * 0.8 && validValues.length > 0) {
        type = isCurrencyKeyword(header) ? 'currency' : 'number'
        // Dates hidden as excel serials
        const dateSerialCount = validValues.filter(v => {
          const num = parseNumber(v)
          return num && num > 30000 && num < 70000 && String(v).length <= 5
        }).length
        if (dateSerialCount >= validValues.length * 0.5) {
          type = 'date'
        }
      } 
      // 4. Check Category
      else if (uniqueCount > 0 && uniqueCount <= Math.max(15, totalCount * 0.2) && maxLength < 40) {
        type = 'category'
      }
    }

    // SCORING
    let scoreMetric = 0
    let scoreDimension = 0
    let scoreTime = 0

    if (type === 'currency') scoreMetric = 100
    if (type === 'number') scoreMetric = 50
    if (type === 'id' || type === 'text') scoreMetric = -100

    if (type === 'category') {
      // Perfect category for bars (5 to 15 items)
      if (uniqueCount >= 3 && uniqueCount <= 15) scoreDimension = 100
      // Good category for donut (2 to 5 items)
      else if (uniqueCount >= 2 && uniqueCount <= 5) scoreDimension = 80
      else scoreDimension = 30
    }
    // A string column might be used as dimension if no category found
    if (type === 'text' && uniqueCount <= 30) scoreDimension = 10

    if (type === 'date') {
      scoreTime = 100 - (nullCount / totalCount) * 50 // Penalize nulls
    }

    return {
      name: header,
      type,
      uniqueCount,
      totalCount,
      nullCount,
      sampleValues: uniqueValues.slice(0, 3),
      maxLength,
      scoreMetric,
      scoreDimension,
      scoreTime
    }
  })

  // MAPPING ALGORITHM
  // 1. Primary & Secondary Metrics
  const metricCols = [...profiles].filter(p => p.scoreMetric > 0).sort((a, b) => b.scoreMetric - a.scoreMetric)
  const primaryMetric = metricCols.length > 0 ? metricCols[0].name : ''
  const secondaryMetric = metricCols.length > 1 ? metricCols[1].name : ''

  // 2. Categories
  const dimCols = [...profiles].filter(p => p.scoreDimension > 0).sort((a, b) => b.scoreDimension - a.scoreDimension)
  const primaryCategory = dimCols.length > 0 ? dimCols[0].name : (profiles.find(p => p.type === 'text')?.name || '')
  
  // Donut prefers 2-7 items
  const donutPref = [...dimCols].sort((a, b) => {
    const aIdeal = a.uniqueCount >= 2 && a.uniqueCount <= 7 ? 1 : 0
    const bIdeal = b.uniqueCount >= 2 && b.uniqueCount <= 7 ? 1 : 0
    return bIdeal - aIdeal
  })
  const donutCategory = donutPref.length > 0 ? donutPref[0].name : primaryCategory

  // Radar prefers 3-8 items, ideally different from donut
  const radarPref = dimCols.filter(c => c.name !== donutCategory && c.uniqueCount >= 3 && c.uniqueCount <= 8)
  const radarCategory = radarPref.length > 0 ? radarPref[0].name : primaryCategory

  // 3. Time
  const timeCols = [...profiles].filter(p => p.scoreTime > 0).sort((a, b) => b.scoreTime - a.scoreTime)
  const primaryDate = timeCols.length > 0 ? timeCols[0].name : ''

  return {
    profiles,
    mapping: {
      primaryMetric,
      secondaryMetric,
      primaryCategory,
      donutCategory,
      radarCategory,
      primaryDate
    }
  }
}
