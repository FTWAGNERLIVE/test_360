import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Database, BarChart3 as BarChartIcon } from 'lucide-react'
import './DataVisualization.css'

interface DataVisualizationProps {
  data: any[]
  headers: string[]
}

const COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335']

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

  const chartData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []

    // Pegar os primeiros 10 registros para o gráfico
    return data.slice(0, 10).map((row, index) => {
      const chartRow: any = { index: `Registro ${index + 1}` }
      stats.numericHeaders.slice(0, 3).forEach(header => {
        chartRow[header] = Number(row[header]) || 0
      })
      return chartRow
    })
  }, [data, stats])

  const pieData = useMemo(() => {
    if (!stats || stats.numericHeaders.length === 0) return []

    const firstNumericHeader = stats.numericHeaders[0]
    if (!firstNumericHeader) return []

    // Agrupar por valores únicos (top 5)
    const valueCounts: Record<string, number> = {}
    data.forEach(row => {
      const value = String(row[firstNumericHeader] || 'Outros')
      valueCounts[value] = (valueCounts[value] || 0) + 1
    })

    return Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
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
                <h3>Gráfico de Barras</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS[5]} opacity={0.2} />
                    <XAxis dataKey="index" stroke={COLORS[5]} />
                    <YAxis stroke={COLORS[5]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    {stats.numericHeaders.slice(0, 3).map((header, index) => (
                      <Bar 
                        key={header} 
                        dataKey={header} 
                        fill={COLORS[index % COLORS.length]}
                        name={header}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartData.length > 0 && (
              <div className="chart-card">
                <h3>Gráfico de Linha</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS[5]} opacity={0.2} />
                    <XAxis dataKey="index" stroke={COLORS[5]} />
                    <YAxis stroke={COLORS[5]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    {stats.numericHeaders.slice(0, 3).map((header, index) => (
                      <Line 
                        key={header} 
                        type="monotone" 
                        dataKey={header} 
                        stroke={COLORS[index % COLORS.length]}
                        name={header}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="chart-card">
                <h3>Distribuição (Top 5)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
