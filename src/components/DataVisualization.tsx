import { useMemo, useState, useEffect, useRef } from 'react'
import { Database, X, Mail, Filter, ChevronDown, ChevronUp, Search, FileDown, Lock, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useAuth } from '../context/AuthContext'
import { isTrialExpired } from '../services/authService'
import './DataVisualization.css'

interface DataVisualizationProps {
  data: any[]
  headers: string[]
  smartMapping?: Record<string, string>
  insightsComponent?: React.ReactNode
  mode?: 'full' | 'filters' | 'table'
  onFilteredDataChange?: (filteredData: any[]) => void
}

const parseDate = (dateStr: any): Date | null => {
  if (dateStr === null || dateStr === undefined || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') return null
  
  // 1. Tratar Números (Timestamps, Excel Serial Dates, Nanosegundos)
  const num = Number(dateStr);
  if (!isNaN(num) && String(dateStr).trim() !== '') {
    // Excel Serial Date Number (dias desde 1900): Geralmente entre 1.000 e 100.000 (ex: 46233)
    if (num > 1000 && num < 100000) {
      // Ajuste Excel: data base 30/12/1899 (25569 em Unix epoch)
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
    
    // Nanosegundos (19 dígitos+): dividimos por 1.000.000 -> ms
    if (num > 1000000000000000000) return new Date(num / 1000000);
    // Microsegundos (16 dígitos+): dividimos por 1.000 -> ms
    if (num > 1000000000000000) return new Date(num / 1000);
    // Milisegundos (13 dígitos): padrão JS
    if (num > 1000000000000) return new Date(num);
    // Segundos (10 dígitos): Unix timestamp
    if (num > 100000000) return new Date(num * 1000);
  }

  const s = String(dateStr).trim()

  // 2. Formato ISO ou similar: 2024-01-01...
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  }

  // 3. Formato PT-BR ou US: 01/01/2024
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let day = Number(parts[0])
      let month = Number(parts[1]) - 1
      let year = Number(parts[2])
      
      if (parts[2].length === 2) year += 2000;
      if (parts[0].length === 4) { // YYYY/MM/DD
        year = Number(parts[0])
        day = Number(parts[2])
      }
      return new Date(Date.UTC(year, month, day))
    }
  }

  // 4. Fallback Date.parse
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

const isDateHeader = (header: string): boolean => {
  if (!header) return false
  const lower = header.toLowerCase()
  return (
    lower.includes('data') ||
    lower.includes('date') ||
    lower.includes('vencimento') ||
    lower.includes('realizacao') ||
    lower.includes('realização') ||
    lower.includes('nascimento') ||
    lower.includes('matricula') ||
    lower.includes('matrícula') ||
    lower.includes('criacao') ||
    lower.includes('criação') ||
    lower.includes('admissao') ||
    lower.includes('admissão') ||
    lower.includes('demissao') ||
    lower.includes('demissão') ||
    lower.includes('validade')
  )
}

const formatDateDisplay = (val: any): string => {
  if (val === null || val === undefined || val === '' || val === '-') return '-'
  
  const parsed = parseDate(val)
  if (parsed && !isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear()
    if (year >= 1950 && year <= 2100) {
      const day = String(parsed.getUTCDate()).padStart(2, '0')
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
      return `${day}/${month}/${year}`
    }
  }
  return String(val)
}

const formatTableCell = (val: any, header: string): string => {
  if (val === null || val === undefined || val === '') return '-'
  
  if (isDateHeader(header)) {
    return formatDateDisplay(val)
  }
  
  const num = Number(val)
  if (!isNaN(num) && num > 30000 && num < 70000 && String(val).trim().length <= 5) {
    const parsed = parseDate(val)
    if (parsed && !isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear()
      if (year >= 1990 && year <= 2100) {
        const day = String(parsed.getUTCDate()).padStart(2, '0')
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
        return `${day}/${month}/${year}`
      }
    }
  }

  return String(val)
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

export default function DataVisualization({
  data,
  headers,
  smartMapping,
  insightsComponent,
  mode = 'full',
  onFilteredDataChange
}: DataVisualizationProps) {
  const { user } = useAuth()

  // Lógica de Limite baseada no Plano
  const rowLimit = useMemo(() => {
    if (!user || user.role === 'admin' || user.role === 'vendas') return 1000000
    
    // Se for Trial ativo, libera 5000 linhas (equivalente ao Basic)
    if (user.trialEndDate && !isTrialExpired(new Date(user.trialEndDate))) return 5000

    const userPlan = user.plan || 'free'
    const limits = {
      free: 400,
      basic: 5000,
      plus: 50000,
      pro: 200000
    }
    return limits[userPlan] || 60
  }, [user])

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

    // Se não encontrou, pegar as primeiras 2 colunas não numéricas que não sejam data
    if (relevant.length < 2) {
      const nonNumeric = headers.filter(h => {
        if (h === dateHeader || h === categoryHeader) return false;
        const validRow = data.find(r => r[h] !== null && r[h] !== undefined && r[h] !== '')
        const sample = validRow ? validRow[h] : undefined
        return sample !== undefined && isNaN(cleanNumber(sample))
      })
      relevant.push(...nonNumeric.slice(0, 2 - relevant.length))
    }

    return relevant.slice(0, 2)
  }, [categoryHeader, dateHeader, headers, data])

  const [filter1, setFilter1] = useState<string>(filterableHeaders[0] || '')
  const [filter2, setFilter2] = useState<string>(filterableHeaders[1] || '')
  const [filter1Value, setFilter1Value] = useState<string[]>([])
  const [filter2Value, setFilter2Value] = useState<string[]>([])
  const [filter1Search, setFilter1Search] = useState('')
  const [filter2Search, setFilter2Search] = useState('')
  const [openFilter1, setOpenFilter1] = useState(false)
  const [openFilter2, setOpenFilter2] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string; preset: string }>({ start: '', end: '', preset: 'all' })
  const [rowsPerPage, setRowsPerPage] = useState<number>(20)
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(true)
  const filter1Ref = useRef<HTMLDivElement>(null)
  const filter2Ref = useRef<HTMLDivElement>(null)

  const exportToCSV = () => {
    if (!data || data.length === 0) return
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'tabela_de_dados.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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

  // Resetar busca interna ao fechar o filtro
  useEffect(() => {
    if (!openFilter1) setFilter1Search('')
    if (!openFilter2) setFilter2Search('')
  }, [openFilter1, openFilter2])

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

    if (filter1 && filter1Value.length > 0) {
      if (filter1Value.includes('Outros')) {
        const counts: Record<string, number> = {}
        data.forEach(row => {
          const val = String(row[filter1] || '')
          counts[val] = (counts[val] || 0) + 1
        })
        const topValues = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name]) => name)

        result = result.filter(row => {
          const val = String(row[filter1] || '')
          return filter1Value.includes(val) || (filter1Value.includes('Outros') && !topValues.includes(val))
        })
      } else {
        result = result.filter(row => filter1Value.includes(String(row[filter1] || '')))
      }
    }

    if (filter2 && filter2Value.length > 0) {
      if (filter2Value.includes('Outros')) {
        const counts: Record<string, number> = {}
        data.forEach(row => {
          const val = String(row[filter2] || '')
          counts[val] = (counts[val] || 0) + 1
        })
        const topValues = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name]) => name)

        result = result.filter(row => {
          const val = String(row[filter2] || '')
          return filter2Value.includes(val) || (filter2Value.includes('Outros') && !topValues.includes(val))
        })
      } else {
        result = result.filter(row => filter2Value.includes(String(row[filter2] || '')))
      }
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

  // Notificar componente pai (Dashboard) sempre que os dados filtrados mudarem
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData)
    }
  }, [filteredData, onFilteredDataChange])

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
    setFilter1Value([])
    setFilter2Value([])
    setDateRange({ preset: 'all', start: '', end: '' })
    setSearchTerm('')
  }

  const exportToPDF = async () => {
    if (user?.plan !== 'pro' && user?.role !== 'admin' && user?.role !== 'vendas') {
      alert('Esta funcionalidade está disponível apenas no plano PRO.');
      return;
    }

    const element = document.getElementById('dashboard-report-content');
    if (!element) return;

    // Feedback visual
    const btn = document.getElementById('export-pdf-btn');
    const originalContent = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<span>Gerando PDF...</span>';
      btn.style.opacity = '0.5';
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Background dark para a página inteira
      pdf.setFillColor(15, 23, 42); // #0f172a
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Faixa de cabeçalho profissional
      pdf.setFillColor(30, 41, 59); // #1e293b
      pdf.rect(0, 0, pdfWidth, 40, 'F');
      
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Lupa Analytics AI', 15, 20);
      
      pdf.setFontSize(14);
      pdf.setTextColor(66, 133, 244);
      pdf.text('Relatório Executivo de Dados', 15, 30);
      
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184); // #94a3b8
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pdfWidth - 15, 20, { align: 'right' });
      pdf.text(`Usuário: ${user?.name || 'Assinante Lupa'}`, pdfWidth - 15, 28, { align: 'right' });
      
      // Adicionar a imagem do dashboard abaixo do cabeçalho
      pdf.addImage(imgData, 'PNG', 10, 50, imgWidth, imgHeight);
      pdf.save(`relatorio-lupa-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      if (btn && originalContent) {
        btn.innerHTML = originalContent;
        btn.style.opacity = '1';
      }
    }
  };

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
      {/* CARD UNIFICADO DE FILTROS */}
      {(mode === 'full' || mode === 'filters') && (
        <div className="filters-unified-card">
          {/* LINHA 1: SELETOR DE PERÍODO */}
          <div className="date-filter-row">
            <div className="date-filter-label">
              <strong>PERÍODO:</strong>
            </div>
            <div className="date-presets">
              <button
                className={`preset-pill-btn ${dateRange.preset === 'all' ? 'active' : ''}`}
                onClick={() => setDateRange({ preset: 'all', start: '', end: '' })}
              >
                Todos
              </button>
              <button
                className={`preset-pill-btn ${dateRange.preset === 'thisMonth' ? 'active' : ''}`}
                onClick={() => handlePresetChange('thisMonth')}
              >
                Mês Atual
              </button>
              <button
                className={`preset-pill-btn ${dateRange.preset === 'thisYear' ? 'active' : ''}`}
                onClick={() => handlePresetChange('thisYear')}
              >
                Ano Atual
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

          {/* LINHA 2: CONTROLES DE FILTRO POR COLUNA, BUSCA E BOTÃO PDF */}
          <div className="filters-controls-row">
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
                  {filter1Value.length > 0 && (
                    <span className="filter-value">
                      : {filter1Value.length === 1 ? formatTableCell(filter1Value[0], filter1) : `${filter1Value.length} selecionados`}
                    </span>
                  )}
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
                          setFilter1Value([])
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
                        <div className="filter-search-input">
                          <Search size={14} />
                          <input 
                            type="text" 
                            placeholder="Buscar valor..." 
                            value={filter1Search}
                            onChange={(e) => setFilter1Search(e.target.value)}
                          />
                        </div>
                        <div className="filter-actions">
                          <button 
                            className="filter-action-btn"
                            onClick={() => setFilter1Value(getFilterValues(filter1))}
                          >
                            Selecionar Todos
                          </button>
                          <button 
                            className="filter-action-btn"
                            onClick={() => setFilter1Value([])}
                          >
                            Limpar
                          </button>
                        </div>
                        <label>Selecione o(s) valor(es):</label>
                        <div className="filter-values-list">
                          {getFilterValues(filter1)
                            .filter(val => val.toLowerCase().includes(filter1Search.toLowerCase()))
                            .map(value => (
                              <label key={value} className="filter-checkbox-item">
                                <input 
                                  type="checkbox" 
                                  checked={filter1Value.includes(value)}
                                  onChange={() => {
                                    if (filter1Value.includes(value)) {
                                      setFilter1Value(filter1Value.filter(v => v !== value))
                                    } else {
                                      setFilter1Value([...filter1Value, value])
                                    }
                                  }}
                                />
                                <span>{formatTableCell(value, filter1)}</span>
                              </label>
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
                  {filter2Value.length > 0 && (
                    <span className="filter-value">
                      : {filter2Value.length === 1 ? formatTableCell(filter2Value[0], filter2) : `${filter2Value.length} selecionados`}
                    </span>
                  )}
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
                          setFilter2Value([])
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
                        <div className="filter-search-input">
                          <Search size={14} />
                          <input 
                            type="text" 
                            placeholder="Buscar valor..." 
                            value={filter2Search}
                            onChange={(e) => setFilter2Search(e.target.value)}
                          />
                        </div>
                        <div className="filter-actions">
                          <button 
                            className="filter-action-btn"
                            onClick={() => setFilter2Value(getFilterValues(filter2))}
                          >
                            Selecionar Todos
                          </button>
                          <button 
                            className="filter-action-btn"
                            onClick={() => setFilter2Value([])}
                          >
                            Limpar
                          </button>
                        </div>
                        <label>Selecione o(s) valor(es):</label>
                        <div className="filter-values-list">
                          {getFilterValues(filter2)
                            .filter(val => val.toLowerCase().includes(filter2Search.toLowerCase()))
                            .map(value => (
                              <label key={value} className="filter-checkbox-item">
                                <input 
                                  type="checkbox" 
                                  checked={filter2Value.includes(value)}
                                  onChange={() => {
                                    if (filter2Value.includes(value)) {
                                      setFilter2Value(filter2Value.filter(v => v !== value))
                                    } else {
                                      setFilter2Value([...filter2Value, value])
                                    }
                                  }}
                                />
                                <span>{formatTableCell(value, filter2)}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="search-filter-box">
              <input
                type="text"
                placeholder="Buscar dados..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {(filter1Value.length > 0 || filter2Value.length > 0 || dateRange.start || dateRange.end || searchTerm) && (
              <button onClick={clearFilters} className="clear-filters-btn">
                <X size={16} />
                Limpar
              </button>
            )}

            <button
              id="export-pdf-btn"
              onClick={exportToPDF}
              className={`export-pdf-btn ${(user?.plan === 'pro' || user?.role === 'admin' || user?.role === 'vendas') ? 'active' : 'locked'}`}
              title={(user?.plan === 'pro' || user?.role === 'admin' || user?.role === 'vendas') ? "Exportar Relatório Completo em PDF" : "Disponível apenas no plano PRO"}
            >
              {(user?.plan === 'pro' || user?.role === 'admin' || user?.role === 'vendas') ? (
                <>
                  <FileDown size={16} />
                  <span>Baixar PDF</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>PDF (PRO)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TABELA DE DADOS BRUTOS E INSIGHTS */}
      {(mode === 'full' || mode === 'table') && (
        <>
          {insightsComponent}

          <div className="data-table-section" id="dashboard-report-content" style={{ marginTop: '20px' }}>
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: 0 }}>
                Tabela de Dados ({filteredData.length} {filteredData.length === 1 ? 'registro' : 'registros'})
              </h3>

              <div className="table-header-options" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* SELETOR DE QUANTIDADE DE LINHAS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                  <span>Exibir:</span>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#1e293b', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={999999}>Todas as linhas</option>
                  </select>
                </div>

                {/* BOTÃO EXPORTAR CSV */}
                <button 
                  type="button" 
                  onClick={exportToCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 600, color: '#192a3e', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Download size={14} />
                  <span>Baixar CSV</span>
                </button>

                {/* BOTÃO MOSTRAR / OCULTAR TABELA */}
                <button 
                  type="button" 
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#192a3e', fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {isTableExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{isTableExpanded ? 'Ocultar Tabela' : 'Mostrar Tabela'}</span>
                </button>
              </div>
            </div>

            {isTableExpanded && (
              <>
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
                      {filteredData.slice(0, Math.min(rowsPerPage, rowLimit)).map((row, index) => (
                        <tr key={index}>
                          {headers.map(header => (
                            <td key={header}>{formatTableCell(row[header], header)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > rowLimit && (
                  <div className="table-limit-notice">
                    <Mail size={16} />
                    <span>Se deseja analisar mais de {rowLimit} linhas, faça o upgrade do seu plano.</span>
                    <a
                      href="/pricing"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/pricing';
                      }}
                      className="contact-link"
                    >
                      Ver Planos e Upgrade
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
