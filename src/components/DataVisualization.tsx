import { useMemo, useState, useEffect, useRef } from 'react'
import { Bar, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts'
import { TrendingUp, Database, BarChart3 as BarChartIcon, X, Mail, Filter, ChevronDown } from 'lucide-react'
import './DataVisualization.css'

interface DataVisualizationProps {
  data: any[]
  headers: string[]
}

const COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335']

// Formatação de números grandes
const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

export default function DataVisualization({ data, headers }: DataVisualizationProps) {
  // Identificar colunas mais relevantes para filtros
  const filterableHeaders = useMemo(() => {
    const relevant: string[] = []
    
    // Procurar por colunas de categoria, tipo, status
    const categoryHeaders = headers.filter(h => 
      h.toLowerCase().includes('categoria') || 
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('tipo') ||
      h.toLowerCase().includes('status') ||
      h.toLowerCase().includes('região') ||
      h.toLowerCase().includes('regiao') ||
      h.toLowerCase().includes('setor') ||
      h.toLowerCase().includes('departamento')
    )
    
    // Procurar por colunas de data
    const dateHeaders = headers.filter(h => 
      h.toLowerCase().includes('data') || 
      h.toLowerCase().includes('date')
    )
    
    relevant.push(...categoryHeaders.slice(0, 1))
    relevant.push(...dateHeaders.slice(0, 1))
    
    // Se não encontrou, pegar as primeiras 2 colunas não numéricas
    if (relevant.length < 2) {
      const nonNumeric = headers.filter(h => {
        const sample = data[0]?.[h]
        return isNaN(Number(sample)) && sample !== '' && sample !== null
      })
      relevant.push(...nonNumeric.slice(0, 2 - relevant.length))
    }
    
    return relevant.slice(0, 2)
  }, [headers, data])

  const [filter1, setFilter1] = useState<string>(filterableHeaders[0] || '')
  const [filter2, setFilter2] = useState<string>(filterableHeaders[1] || '')
  const [filter1Value, setFilter1Value] = useState<string>('')
  const [filter2Value, setFilter2Value] = useState<string>('')
  const [openFilter1, setOpenFilter1] = useState(false)
  const [openFilter2, setOpenFilter2] = useState(false)
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
    
    return result
  }, [data, filter1, filter1Value, filter2, filter2Value])

  const clearFilters = () => {
    setFilter1(filterableHeaders[0] || '')
    setFilter2(filterableHeaders[1] || '')
    setFilter1Value('')
    setFilter2Value('')
  }
  
  const stats = useMemo(() => {
    if (data.length === 0) return null

    const numericHeaders = headers.filter(header => {
      const sample = data[0]?.[header]
      return !isNaN(Number(sample)) && sample !== '' && sample !== null
    })

    const statsMap: Record<string, { sum: number; count: number; min: number; max: number }> = {}

    numericHeaders.forEach(header => {
      statsMap[header] = {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity
      }
    })

    filteredData.forEach(row => {
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
  }, [filteredData, headers])

  // Dados para gráfico de barras/linhas melhorado
  const chartData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []

    // Se houver coluna de data, agrupar por data
    const dateHeader = headers.find(h => 
      h.toLowerCase().includes('data') || 
      h.toLowerCase().includes('date') ||
      h.toLowerCase().includes('dia')
    )

    if (dateHeader) {
      const grouped: Record<string, any> = {}
      filteredData.forEach(row => {
        const date = row[dateHeader] || 'Sem data'
        if (!grouped[date]) {
          grouped[date] = { date, ...stats.numericHeaders.reduce((acc, h) => ({ ...acc, [h]: 0 }), {}) }
        }
        stats.numericHeaders.forEach(header => {
          grouped[date][header] = (grouped[date][header] || 0) + (Number(row[header]) || 0)
        })
      })
      return Object.values(grouped).slice(0, 15)
    }

    // Se houver coluna de categoria, agrupar por categoria
    const categoryHeader = headers.find(h => 
      h.toLowerCase().includes('categoria') || 
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('tipo') ||
      h.toLowerCase().includes('setor')
    )

    if (categoryHeader) {
      const grouped: Record<string, any> = {}
      filteredData.forEach(row => {
        const category = row[categoryHeader] || 'Outros'
        if (!grouped[category]) {
          grouped[category] = { category, ...stats.numericHeaders.reduce((acc, h) => ({ ...acc, [h]: 0 }), {}) }
        }
        stats.numericHeaders.forEach(header => {
          grouped[category][header] = (grouped[category][header] || 0) + (Number(row[header]) || 0)
        })
      })
      return Object.values(grouped).slice(0, 10)
    }

    // Caso padrão: primeiros registros
    return filteredData.slice(0, 10).map((row, index) => {
      const chartRow: any = { index: `#${index + 1}` }
      stats.numericHeaders.slice(0, 3).forEach(header => {
        chartRow[header] = Number(row[header]) || 0
      })
      return chartRow
    })
  }, [filteredData, data, stats, headers])

  // Dados para gráfico de pizza melhorado
  const pieData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []

    // Tentar encontrar coluna de categoria primeiro
    const categoryHeader = headers.find(h => 
      h.toLowerCase().includes('categoria') || 
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('tipo') ||
      h.toLowerCase().includes('status') ||
      h.toLowerCase().includes('região') ||
      h.toLowerCase().includes('regiao')
    )

    if (categoryHeader) {
      const categoryCounts: Record<string, number> = {}
      filteredData.forEach(row => {
        const category = String(row[categoryHeader] || 'Outros')
        categoryCounts[category] = (categoryCounts[category] || 0) + 1
      })

      return Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }))
    }

    // Se não houver categoria, usar primeira coluna numérica agregada
    const firstNumericHeader = stats.numericHeaders[0]
    if (!firstNumericHeader) return []

    // Agrupar por faixas de valores
    const ranges: Record<string, number> = {
      'Muito Baixo': 0,
      'Baixo': 0,
      'Médio': 0,
      'Alto': 0,
      'Muito Alto': 0
    }

    const values = filteredData.map(row => Number(row[firstNumericHeader]) || 0).filter(v => v > 0)
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
  }, [filteredData, stats, headers])

  // Estatísticas resumidas
  const summaryStats = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return null

    return stats.numericHeaders.map(header => {
      const values = filteredData.map(row => Number(row[header]) || 0).filter(v => !isNaN(v) && v > 0)
      if (values.length === 0) return null

      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)

      return { header, avg, max, min, sum, count: values.length }
    }).filter(Boolean)
  }, [filteredData, stats])

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
                          const sample = data[0]?.[h]
                          return isNaN(Number(sample)) && sample !== '' && sample !== null
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
                          const sample = data[0]?.[h]
                          return isNaN(Number(sample)) && sample !== '' && sample !== null
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

            {(filter1Value || filter2Value) && (
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
          <div className="charts-section">
            {chartData.length > 0 && (
              <div className="chart-card">
                <h3>Análise Comparativa</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dadce0" opacity={0.3} />
                    <XAxis 
                      dataKey={chartData[0]?.date ? 'date' : chartData[0]?.category ? 'category' : 'index'} 
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

            {chartData.length > 0 && (
              <div className="chart-card">
                <h3>Tendência Temporal</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData} style={{ cursor: 'pointer' }}>
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
                      dataKey={chartData[0]?.date ? 'date' : chartData[0]?.category ? 'category' : 'index'} 
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
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name}\n${(percent * 100).toFixed(1)}%` : ''
                      }
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
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
            <h3>Dados ({filteredData.length > 20 ? 'Primeiros 20 registros' : `${filteredData.length} registros`})</h3>
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
                  {filteredData.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      {headers.map(header => (
                        <td key={header}>{row[header] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length > 20 && (
              <div className="table-limit-notice">
                <Mail size={16} />
                <span>Se deseja que seja lido mais do que 20 linhas, entre em contato com nosso time de vendas</span>
                <a 
                  href="https://www.linkedin.com/company/creattive-tecnologia/posts/?feedView=all" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="contact-link"
                >
                  Contatar Time de Vendas
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
