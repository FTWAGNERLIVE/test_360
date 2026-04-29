
import { useMemo, useState, useEffect, useRef } from 'react'
import { Bar, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts'
import { TrendingUp, Database, BarChart3 as BarChartIcon, X, Mail, Filter, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isTrialExpired } from '../services/authService'
import './DataVisualization.css'

interface DataVisualizationProps {
  data: any[]
  headers: string[]
  smartMapping?: Record<string, string>
}

const COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335']

// Formatação de números grandes
const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

const parseDate = (dateStr: string) => {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null
  const s = String(dateStr).trim()
  
  // Formato ISO ou similar: 2024-01-01...
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parts = s.split('T')[0].split('-')
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2].substring(0, 2)))
  }
  
  // Formato PT-BR: 01/01/2024
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      }
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      }
    }
  }

  // Tentar Date.parse nativo
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Limpeza de valores numéricos que podem vir formatados (R$ 1.000,50)
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val
  if (val === null || val === undefined || val === '') return NaN
  const cleaned = String(val).trim()
    .replace(/[R$\s]/g, '')
  
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return Number(cleaned.replace(',', '.'))
  }
  return Number(cleaned)
}

export default function DataVisualization({ data, headers, smartMapping }: DataVisualizationProps) {
  const { user } = useAuth()
  
  // Lógica de Limite: PRO, Admin ou Trial Ativo (15 dias) não têm limites. Base tem 60 linhas.
  const hasFullAccess = useMemo(() => {
    if (!user || user.role === 'admin' || user.role === 'vendas') return true
    if (user.isPro) return true
    if (user.trialEndDate && !isTrialExpired(new Date(user.trialEndDate))) return true
    return false
  }, [user])

  const rowLimit = hasFullAccess ? 1000000 : 60

  // Extract specific headers explicitly so we can use them in the charts for cross-filtering
  const dateHeader = useMemo(() => {
    // 1. Prioridade: O que a IA detectou
    if (smartMapping) {
      const detected = Object.entries(smartMapping).find(([, type]) => type === 'date')
      if (detected) return detected[0]
    }

    // 2. Fallback: Busca manual por palavras-chave
    return headers.find(h => {
      const low = h.toLowerCase()
      return low.includes('data') || low.includes('date') || low.includes('dia') || low.includes('mês') || low.includes('mes') || low.includes('ano')
    })
  }, [headers, smartMapping])

  const categoryHeader = useMemo(() => {
    // 1. Prioridade: O que a IA detectou
    if (smartMapping) {
      const detected = Object.entries(smartMapping).find(([, type]) => type === 'category')
      if (detected) return detected[0]
    }

    // 2. Fallback: Busca manual
    return headers.find(h => 
      h.toLowerCase().includes('categoria') || 
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('tipo') ||
      h.toLowerCase().includes('status') ||
      h.toLowerCase().includes('região') ||
      h.toLowerCase().includes('regiao') ||
      h.toLowerCase().includes('setor') ||
      h.toLowerCase().includes('departamento')
    )
  }, [headers, smartMapping])

  // Identificar colunas mais relevantes para filtros
  const filterableHeaders = useMemo(() => {
    const relevant: string[] = []
    
    if (categoryHeader) relevant.push(categoryHeader)
    if (dateHeader) relevant.push(dateHeader)
    
    // Se não encontrou, pegar as primeiras 2 colunas não numéricas
    if (relevant.length < 2) {
      const nonNumeric = headers.filter(h => {
        const validRow = data.find(r => r[h] !== null && r[h] !== undefined && r[h] !== '')
        const sample = validRow ? validRow[h] : undefined
        return sample !== undefined && isNaN(cleanNumber(sample)) && !relevant.includes(h)
      })
      relevant.push(...nonNumeric.slice(0, 2 - relevant.length))
    }
    
    return relevant.slice(0, 2)
  }, [categoryHeader, dateHeader, headers, data])

  const [filter1, setFilter1] = useState<string>(filterableHeaders[0] || '')
  const [filter2, setFilter2] = useState<string>(filterableHeaders[1] || '')
  const [filter1Value, setFilter1Value] = useState<string>('')
  const [filter2Value, setFilter2Value] = useState<string>('')
  const [openFilter1, setOpenFilter1] = useState(false)
  const [openFilter2, setOpenFilter2] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string; preset: string }>({ start: '', end: '', preset: 'all' })
  const filter1Ref = useRef<HTMLDivElement>(null)
  const filter2Ref = useRef<HTMLDivElement>(null)

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filter1Ref.current && !filter1Ref.current.contains(event.target as Node)) {
        setOpenFilter1(false)
      }
      if (filter2Ref.current && !filter2Ref.current.contains(event.target as Node)) {
        setOpenFilter2(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Obter valores únicos para cada filtro
  const getFilterValues = (header: string): string[] => {
    if (!header) return []
    const values = new Set<string>()
    data.forEach(row => {
      const value = String(row[header] || '')
      if (value) values.add(value)
    })
    return Array.from(values).sort()
  }

  // Aplicar filtros aos dados
  const filteredData = useMemo(() => {
    let result = [...data]
    
    if (filter1 && filter1Value) {
      result = result.filter(row => String(row[filter1]) === filter1Value)
    }
    
    if (filter2 && filter2Value) {
      result = result.filter(row => String(row[filter2]) === filter2Value)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(row => 
        headers.some(h => String(row[h] || '').toLowerCase().includes(term))
      )
    }

    if (dateHeader && (dateRange.start || dateRange.end)) {
      result = result.filter(row => {
        const rowDate = parseDate(String(row[dateHeader]))
        if (!rowDate) return false
        
        if (dateRange.start) {
          const startD = new Date(dateRange.start)
          if (rowDate < startD) return false
        }
        if (dateRange.end) {
          const endD = new Date(dateRange.end)
          endD.setHours(23, 59, 59, 999)
          if (rowDate > endD) return false
        }
        return true
      })
    }
    
    return result
  }, [data, filter1, filter1Value, filter2, filter2Value, dateRange, dateHeader, searchTerm, headers])

  // Dados limitados conforme o plano (Base: 60, Trial/PRO: sem limite)
  const limitedData = useMemo(() => {
    return filteredData.slice(0, rowLimit)
  }, [filteredData, rowLimit])

  const handlePresetChange = (preset: string) => {
    const today = new Date()
    let start = ''
    let end = ''
    
    if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (preset === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
      end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]
    }
    
    setDateRange({ preset, start, end })
  }

  const clearFilters = () => {
    setFilter1(filterableHeaders[0] || '')
    setFilter2(filterableHeaders[1] || '')
    setFilter1Value('')
    setFilter2Value('')
    setDateRange({ preset: 'all', start: '', end: '' })
    setSearchTerm('')
  }

  const handleChartClick = (entry: any, type: 'date' | 'category' | 'pie') => {
    if (!entry) return
    
    let chartValue = ''
    let chartHeader = ''
    
    if (type === 'pie') {
      chartValue = String(entry.name || '')
      chartHeader = categoryHeader || filterableHeaders[0] || ''
    } else if (type === 'date') {
      chartValue = String(entry.activeLabel || entry.activePayload?.[0]?.payload?.date || entry.date || '')
      chartHeader = dateHeader || filterableHeaders[0] || ''
    } else if (type === 'category') {
      chartValue = String(entry.activeLabel || entry.activePayload?.[0]?.payload?.category || entry.category || '')
      chartHeader = categoryHeader || filterableHeaders[0] || ''
    } else {
      chartValue = String(entry.activeLabel || '')
      chartHeader = dateHeader || categoryHeader || filterableHeaders[0] || ''
    }

    if (!chartHeader || !chartValue || chartValue === 'undefined' || chartValue === 'null') return;

    if (type === 'pie' && chartValue === 'Outros') {
      return
    }
    
    if (filter1 === chartHeader && filter1Value === chartValue) {
      setFilter1Value('')
    } else if (filter2 === chartHeader && filter2Value === chartValue) {
      setFilter2Value('')
    } else {
      setFilter1(chartHeader)
      setFilter1Value(chartValue)
    }
  }
  
  const stats = useMemo(() => {
    if (limitedData.length === 0) return null

    let numericHeaders = headers.filter(header => {
      // Ignorar colunas se a IA mapeou como ignore
      if (smartMapping && smartMapping[header] === 'ignore') return false;
      const validRow = limitedData.find(row => row[header] !== null && row[header] !== undefined && row[header] !== '')
      const sample = validRow ? validRow[header] : undefined
      return sample !== undefined && !isNaN(cleanNumber(sample))
    })

    // Se tivermos colunas de Valor/Débito/Crédito, removemos Saldo dos gráficos para não somar acumulados
    const hasTransactionValues = numericHeaders.some(h => {
      const lower = h.toLowerCase();
      return lower.includes('valor') || lower.includes('débito') || lower.includes('crédito') || lower.includes('debito') || lower.includes('credito');
    });
    
    if (hasTransactionValues) {
      numericHeaders = numericHeaders.filter(h => !h.toLowerCase().includes('saldo'));
    }

    const statsMap: Record<string, { sum: number; count: number; min: number; max: number }> = {}

    numericHeaders.forEach(header => {
      statsMap[header] = {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity
      }
    })

    limitedData.forEach(row => {
      numericHeaders.forEach(header => {
        const value = Number(row[header])
        if (!isNaN(value)) {
          statsMap[header].sum += value
          statsMap[header].count += 1
          statsMap[header].min = Math.min(statsMap[header].min, value)
          statsMap[header].max = Math.max(statsMap[header].max, value)
        }
      })
    })

    return { numericHeaders, statsMap }
  }, [limitedData, headers])

  // Dados para gráfico temporal (AreaChart)
  const trendData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0 || !dateHeader) return []

    const grouped: Record<string, any> = {}
    limitedData.forEach(row => {
      const rawDate = row[dateHeader]
      const parsedDate = parseDate(String(rawDate))
      
      if (!parsedDate) return

      // Chave de agrupamento normalizada YYYY-MM-DD
      const dateKey = parsedDate.toISOString().split('T')[0]
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          date: parsedDate.toLocaleDateString('pt-BR'),
          sortKey: parsedDate.getTime(),
          ...stats.numericHeaders.reduce((acc, h) => ({ ...acc, [h]: 0 }), {}) 
        }
      }
      
      stats.numericHeaders.forEach(header => {
        grouped[dateKey][header] = (grouped[dateKey][header] || 0) + cleanNumber(row[header])
      })
    })
    
    return Object.values(grouped)
      .sort((a: any, b: any) => a.sortKey - b.sortKey)
      .slice(0, 30) // Mostra até 30 pontos no tempo
  }, [limitedData, stats, dateHeader])

  // Dados para gráfico de barras/linhas comparativo (ComposedChart)
  const categoryData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []

    if (categoryHeader) {
      const grouped: Record<string, any> = {}
      limitedData.forEach(row => {
        const category = row[categoryHeader] || 'Outros'
        if (!grouped[category]) {
          grouped[category] = { category, ...stats.numericHeaders.reduce((acc, h) => ({ ...acc, [h]: 0 }), {}) }
        }
        stats.numericHeaders.forEach(header => {
          grouped[category][header] = (grouped[category][header] || 0) + (Number(row[header]) || 0)
        })
      })
      
      const firstNum = stats.numericHeaders[0]
      const sortedValues = Object.values(grouped).sort((a, b) => (b[firstNum] || 0) - (a[firstNum] || 0))
      
      if (sortedValues.length > 4) {
        const top4 = sortedValues.slice(0, 4)
        const others = sortedValues.slice(4)
        
        const othersEntry: any = { category: 'Outros' }
        stats.numericHeaders.forEach(header => {
          othersEntry[header] = others.reduce((sum, item) => sum + (item[header] || 0), 0)
        })
        
        return [...top4, othersEntry]
      }
      
      return sortedValues
    }

    // Caso padrão: primeiros registros se não tiver categoria
    return filteredData.slice(0, 10).map((row, index) => {
      const chartRow: any = { index: `#${index + 1}` }
      stats.numericHeaders.slice(0, 3).forEach(header => {
        chartRow[header] = Number(row[header]) || 0
      })
      return chartRow
    })
  }, [limitedData, stats, categoryHeader])

  // Dados para gráfico de pizza melhorado
  const pieData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []
    const firstNumericHeader = stats.numericHeaders[0]

    // Tentar encontrar coluna de categoria primeiro
    if (categoryHeader) {
      const categorySums: Record<string, number> = {}
      limitedData.forEach(row => {
        const category = String(row[categoryHeader] || 'Outros')
        const val = Number(row[firstNumericHeader]) || 0
        categorySums[category] = (categorySums[category] || 0) + val
      })

      const sortedEntries = Object.entries(categorySums).sort(([, a], [, b]) => b - a)
      
      if (sortedEntries.length > 4) {
        const top4 = sortedEntries.slice(0, 4)
        const others = sortedEntries.slice(4)
        
        let othersSum = 0
        others.forEach(([, val]) => {
          othersSum += val
        })
        
        const finalData = top4.map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        
        if (othersSum > 0) {
          const index = finalData.findIndex(item => item.name === 'Outros')
          if (index >= 0) {
            finalData[index].value = Number((finalData[index].value + othersSum).toFixed(2))
          } else {
            finalData.push({ name: 'Outros', value: Number(othersSum.toFixed(2)) })
          }
        }
        return finalData
      }

      return sortedEntries.map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    }

    // Se não houver categoria, usar primeira coluna numérica agregada já declarada
    if (!firstNumericHeader) return []

    // Agrupar por faixas de valores
    const ranges: Record<string, number> = {
      'Muito Baixo': 0,
      'Baixo': 0,
      'Médio': 0,
      'Alto': 0,
      'Muito Alto': 0
    }

    const values = limitedData.map(row => Number(row[firstNumericHeader]) || 0).filter(v => v > 0)
    if (values.length === 0) return []

    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min

    values.forEach(value => {
      const ratio = (value - min) / range
      if (ratio < 0.2) ranges['Muito Baixo']++
      else if (ratio < 0.4) ranges['Baixo']++
      else if (ratio < 0.6) ranges['Médio']++
      else if (ratio < 0.8) ranges['Alto']++
      else ranges['Muito Alto']++
    })

    return Object.entries(ranges)
      .filter(([, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))
  }, [limitedData, stats, headers])

  // Estatísticas resumidas
  const summaryStats = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return null

    return stats.numericHeaders.map(header => {
      const values = limitedData.map(row => Number(row[header]) || 0).filter(v => !isNaN(v) && v > 0)
      if (values.length === 0) return null

      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)

      return { header, avg, max, min, sum, count: values.length }
    }).filter(Boolean)
  }, [limitedData, stats])

  if (data.length === 0) {
    return (
      <div className="no-data">
        <Database size={48} />
        <p>Nenhum dado disponível para visualização</p>
      </div>
    )
  }

  return (
    <div className="data-visualization">
      {dateHeader && (
        <div className="filters-section" style={{marginBottom: '0'}}>
          <div className="date-filter-container">
            <div className="date-filter-label">
              <strong>Período:</strong>
            </div>
            <div className="date-presets">
              <button 
                className={`filter-button preset-btn ${dateRange.preset === 'all' ? 'active' : ''}`} 
                onClick={() => setDateRange({ preset: 'all', start: '', end: '' })}
              >
                Todos
              </button>
              <button 
                className={`filter-button preset-btn ${dateRange.preset === 'thisMonth' ? 'active' : ''}`} 
                onClick={() => handlePresetChange('thisMonth')}
              >
                Este Mês
              </button>
              <button 
                className={`filter-button preset-btn ${dateRange.preset === 'thisYear' ? 'active' : ''}`} 
                onClick={() => handlePresetChange('thisYear')}
              >
                Este Ano
              </button>
            </div>
            <div className="date-custom-range">
              <label>
                De: 
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={e => setDateRange(prev => ({ ...prev, preset: 'custom', start: e.target.value }))} 
                />
              </label>
              <label>
                Até: 
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={e => setDateRange(prev => ({ ...prev, preset: 'custom', end: e.target.value }))} 
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {filterableHeaders.length > 0 && (
        <div className="filters-section">
          <div className="filters-container">
            {filterableHeaders[0] && (
              <div className="filter-dropdown" ref={filter1Ref}>
                <button
                  className="filter-button"
                  onClick={() => {
                    setOpenFilter1(!openFilter1)
                    setOpenFilter2(false)
                  }}
                >
                  <Filter size={16} />
                  <span>{filter1 || filterableHeaders[0] || 'Filtro 1'}</span>
                  {filter1Value && <span className="filter-value">: {filter1Value}</span>}
                  <ChevronDown size={16} className={openFilter1 ? 'open' : ''} />
                </button>
                {openFilter1 && (
                  <div className="filter-options">
                    <div className="filter-header-select">
                      <label>Selecione a coluna:</label>
                      <select
                        value={filter1}
                        onChange={(e) => {
                          setFilter1(e.target.value)
                          setFilter1Value('')
                        }}
                      >
                        <option value="">Selecione uma coluna</option>
                        {headers.filter(h => {
                          const validRow = data.find(r => r[h] !== null && r[h] !== undefined && r[h] !== '')
                          const sample = validRow ? validRow[h] : undefined
                          return sample !== undefined && isNaN(cleanNumber(sample))
                        }).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {filter1 && (
                      <div className="filter-values">
                        <label>Selecione o valor:</label>
                        <div className="filter-values-list">
                          <button
                            className={filter1Value === '' ? 'active' : ''}
                            onClick={() => setFilter1Value('')}
                          >
                            Todos
                          </button>
                          {getFilterValues(filter1).map(value => (
                            <button
                              key={value}
                              className={filter1Value === value ? 'active' : ''}
                              onClick={() => setFilter1Value(value)}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {filterableHeaders[1] && (
              <div className="filter-dropdown" ref={filter2Ref}>
                <button
                  className="filter-button"
                  onClick={() => {
                    setOpenFilter2(!openFilter2)
                    setOpenFilter1(false)
                  }}
                >
                  <Filter size={16} />
                  <span>{filter2 || filterableHeaders[1] || 'Filtro 2'}</span>
                  {filter2Value && <span className="filter-value">: {filter2Value}</span>}
                  <ChevronDown size={16} className={openFilter2 ? 'open' : ''} />
                </button>
                {openFilter2 && (
                  <div className="filter-options">
                    <div className="filter-header-select">
                      <label>Selecione a coluna:</label>
                      <select
                        value={filter2}
                        onChange={(e) => {
                          setFilter2(e.target.value)
                          setFilter2Value('')
                        }}
                      >
                        <option value="">Selecione uma coluna</option>
                        {headers.filter(h => {
                          const validRow = data.find(r => r[h] !== null && r[h] !== undefined && r[h] !== '')
                          const sample = validRow ? validRow[h] : undefined
                          return sample !== undefined && isNaN(cleanNumber(sample))
                        }).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {filter2 && (
                      <div className="filter-values">
                        <label>Selecione o valor:</label>
                        <div className="filter-values-list">
                          <button
                            className={filter2Value === '' ? 'active' : ''}
                            onClick={() => setFilter2Value('')}
                          >
                            Todos
                          </button>
                          {getFilterValues(filter2).map(value => (
                            <button
                              key={value}
                              className={filter2Value === value ? 'active' : ''}
                              onClick={() => setFilter2Value(value)}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="search-filter" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
              <input 
                type="text" 
                placeholder="Buscar dados..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
            </div>

            {(filter1Value || filter2Value || dateRange.start || dateRange.end || searchTerm) && (
              <button onClick={clearFilters} className="clear-filters-btn">
                <X size={16} />
                Limpar
              </button>
            )}
          </div>
          <div className="filter-support-notice">
            <Mail size={12} />
            <span>Precisa de mais filtros? <a href="https://www.linkedin.com/company/creattive-tecnologia/posts/?feedView=all" target="_blank" rel="noopener noreferrer">Fale com nosso time de vendas</a></span>
          </div>
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total de Registros</p>
            <p className="stat-value">{filteredData.length.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <BarChartIcon size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Colunas</p>
            <p className="stat-value">{headers.length}</p>
          </div>
        </div>

        {stats && stats.numericHeaders.length > 0 && (
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Colunas Numéricas</p>
              <p className="stat-value">{stats.numericHeaders.length}</p>
            </div>
          </div>
        )}
      </div>

      {stats && stats.numericHeaders.length > 0 && (
        <>
          <div className="charts-info-banner">
            <Filter size={16} />
            <span><strong>Dica:</strong> Você pode clicar nos elementos ou legendas dos gráficos para aplicar filtros diretamente aos dados.</span>
          </div>
          <div className="charts-section">
            {categoryData.length > 0 && (
              <div className="chart-card">
                <h3>Análise Comparativa {categoryHeader ? `por ${categoryHeader}` : ''}</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={categoryData} style={{ cursor: 'pointer' }} onClick={(e) => handleChartClick(e, categoryData[0]?.category ? 'category' : 'date')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dadce0" opacity={0.3} />
                    <XAxis 
                      dataKey={categoryData[0]?.category ? 'category' : 'index'} 
                      stroke="#5f6368"
                      tick={{ fill: '#5f6368', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis 
                      stroke="#5f6368"
                      tick={{ fill: '#5f6368', fontSize: 12 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => formatNumber(value)}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    {stats.numericHeaders.slice(0, 2).map((header, index) => (
                      <Bar 
                        key={header} 
                        dataKey={header} 
                        fill={COLORS[index % COLORS.length]}
                        name={header}
                        radius={[4, 4, 0, 0]}
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      />
                    ))}
                    {stats.numericHeaders.slice(2, 3).map((header) => (
                      <Line 
                        key={header} 
                        type="monotone" 
                        dataKey={header} 
                        stroke={COLORS[2]}
                        name={header}
                        strokeWidth={3}
                        dot={{ fill: COLORS[2], r: 4, cursor: 'pointer' }}
                        activeDot={{ r: 6, fill: COLORS[2], stroke: '#fff', strokeWidth: 2 }}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {trendData.length > 0 && (
              <div className="chart-card">
                <h3>Tendência Temporal</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={trendData} style={{ cursor: 'pointer' }} onClick={(e) => handleChartClick(e, 'date')}>
                    <defs>
                      {stats.numericHeaders.slice(0, 3).map((header, index) => (
                        <linearGradient key={header} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dadce0" opacity={0.3} />
                    <XAxis 
                      dataKey="date"
                      stroke="#5f6368"
                      tick={{ fill: '#5f6368', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#5f6368"
                      tick={{ fill: '#5f6368', fontSize: 12 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px'
                      }}
                      formatter={(value: any, name: any) => [formatNumber(value), name]}
                      labelFormatter={(label) => {
                        const dateHeader = headers.find(h => h.toLowerCase().includes('data') || h.toLowerCase().includes('date'))
                        const categoryHeader = headers.find(h => h.toLowerCase().includes('categoria') || h.toLowerCase().includes('category'))
                        if (dateHeader || categoryHeader) {
                          return `${dateHeader || categoryHeader}: ${label}`
                        }
                        return `Período: ${label}`
                      }}
                      cursor={{ stroke: '#4285F4', strokeWidth: 2, strokeDasharray: '5 5' }}
                      animationDuration={200}
                      separator=": "
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                      iconType="circle"
                    />
                    {stats.numericHeaders.slice(0, 3).map((header, index) => (
                      <Area 
                        key={header} 
                        type="monotone" 
                        dataKey={header} 
                        stroke={COLORS[index % COLORS.length]}
                        fill={`url(#color${index})`}
                        name={header}
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                        activeDot={{ r: 5, fill: COLORS[index % COLORS.length], stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="chart-card">
                <h3>Distribuição</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (percent < 0.05) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
                            {`${(percent * 100).toFixed(1)}%`}
                          </text>
                        );
                      }}
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                      onClick={(entry) => handleChartClick(entry, 'pie')}
                      style={{ cursor: 'pointer' }}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      formatter={(value: any, name: any) => [`${value} (${((value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`, name]}
                      labelStyle={{ fontWeight: 600 }}
                      animationDuration={200}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ cursor: 'pointer' }}
                      onClick={(e: any) => {
                        // O payload da legenda no recharts passa o nome no campo "value"
                        if (e && e.value) {
                          handleChartClick({ name: e.value }, 'pie')
                        }
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {summaryStats && summaryStats.length > 0 && (
            <div className="summary-stats">
              <h3>Estatísticas Resumidas</h3>
              <div className="summary-grid">
                {summaryStats.map((stat: any) => (
                  <div key={stat.header} className="summary-card">
                    <h4>{stat.header}</h4>
                    <div className="summary-values">
                      <div className="summary-item">
                        <span className="label">Média:</span>
                        <span className="value">{formatNumber(stat.avg)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Máximo:</span>
                        <span className="value">{formatNumber(stat.max)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Mínimo:</span>
                        <span className="value">{formatNumber(stat.min)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Total:</span>
                        <span className="value">{formatNumber(stat.sum)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="data-table-section">
            <h3>Dados ({filteredData.length > rowLimit ? `Primeiros ${rowLimit} registros` : `${filteredData.length} registros`})</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, rowLimit).map((row, index) => (
                    <tr key={index}>
                      {headers.map(header => (
                        <td key={header}>{row[header] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length > rowLimit && (
              <div className="table-limit-notice">
                <Mail size={16} />
                <span>Se deseja que seja lido mais do que {rowLimit} linhas, faça o upgrade para o plano PRO.</span>
                <a 
                  href="#upgrade" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('.profile-dropdown-container')?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                  }}
                  className="contact-link"
                >
                  Upgrade para PRO
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {(!stats || stats.numericHeaders.length === 0) && (
        <div className="no-numeric-data">
          <p>⚠️ Nenhuma coluna numérica encontrada para visualização gráfica.</p>
          <p>Os dados foram carregados com sucesso, mas não há valores numéricos para exibir em gráficos.</p>
        </div>
      )}
    </div>
  )
}
