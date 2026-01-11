import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts'
import { TrendingUp, Database, BarChart3 as BarChartIcon } from 'lucide-react'
import './DataVisualization.css'

interface DataVisualizationProps {
  data: any[]
  headers: string[]
}

const COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335']

// Formatação de valores monetários
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Formatação de números grandes
const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

export default function DataVisualization({ data, headers }: DataVisualizationProps) {
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

    data.forEach(row => {
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
  }, [data, headers])

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
      data.forEach(row => {
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
      data.forEach(row => {
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
    return data.slice(0, 10).map((row, index) => {
      const chartRow: any = { index: `#${index + 1}` }
      stats.numericHeaders.slice(0, 3).forEach(header => {
        chartRow[header] = Number(row[header]) || 0
      })
      return chartRow
    })
  }, [data, stats, headers])

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
      data.forEach(row => {
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

    const values = data.map(row => Number(row[firstNumericHeader]) || 0).filter(v => v > 0)
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
  }, [data, stats, headers])

  // Estatísticas resumidas
  const summaryStats = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return null

    return stats.numericHeaders.map(header => {
      const values = data.map(row => Number(row[header]) || 0).filter(v => !isNaN(v) && v > 0)
      if (values.length === 0) return null

      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)

      return { header, avg, max, min, sum, count: values.length }
    }).filter(Boolean)
  }, [data, stats])

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
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total de Registros</p>
            <p className="stat-value">{data.length.toLocaleString()}</p>
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
                  <ComposedChart data={chartData}>
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
                      />
                    ))}
                    {stats.numericHeaders.slice(2, 3).map((header, index) => (
                      <Line 
                        key={header} 
                        type="monotone" 
                        dataKey={header} 
                        stroke={COLORS[2]}
                        name={header}
                        strokeWidth={3}
                        dot={{ fill: COLORS[2], r: 4 }}
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
                  <AreaChart data={chartData}>
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => formatNumber(value)}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
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
                      label={({ name, percent, value }) => 
                        percent > 0.05 ? `${name}\n${(percent * 100).toFixed(1)}%` : ''
                      }
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any, name: any) => [value, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
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
            <h3>Dados (Primeiros 20 registros)</h3>
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
                  {data.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      {headers.map(header => (
                        <td key={header}>{row[header] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
