import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  LogOut, FileText, Sparkles, Clock, CheckCircle2, HelpCircle, 
  Send, X, LayoutDashboard, Plus,
  Home, Share2, ThumbsUp, Star, DollarSign, Menu, Table
} from 'lucide-react'
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

import CSVUploader from '../components/CSVUploader'
import GoogleSheetsImporter from '../components/GoogleSheetsImporter'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import { sendSupportMessage } from '../services/supportService'
import { saveCSVData, listUserFiles, loadFileById, deleteFileById } from '../services/csvService'
import { isTrialExpired, getTrialDaysRemaining } from '../services/authService'
import { getSmartDiscovery, runLocalPreAnalysis } from '../services/groqService'
import './Dashboard.css'

// Helper para limpeza e conversão de números (moeda PT-BR, pontos, vírgulas)
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val
  if (val === null || val === undefined || val === '') return NaN
  const cleaned = String(val).trim().replace(/[R$\s]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return Number(cleaned.replace(',', '.'))
  }
  return Number(cleaned)
}

const formatValue = (num: number) => {
  if (isNaN(num)) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

const parseDate = (dateStr: any): Date | null => {
  if (dateStr === null || dateStr === undefined || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') return null
  
  const num = Number(dateStr);
  if (!isNaN(num) && String(dateStr).trim() !== '') {
    if (num > 1000 && num < 100000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
    if (num > 1000000000000000000) return new Date(num / 1000000);
    if (num > 1000000000000000) return new Date(num / 1000);
    if (num > 1000000000000) return new Date(num);
    if (num > 100000000) return new Date(num * 1000);
  }

  const s = String(dateStr).trim()

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  }

  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let day = Number(parts[0])
      let month = Number(parts[1]) - 1
      let year = Number(parts[2])
      
      if (parts[2].length === 2) year += 2000;
      if (parts[0].length === 4) {
        year = Number(parts[0])
        day = Number(parts[2])
      }
      return new Date(Date.UTC(year, month, day))
    }
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function isIdentityOrNameHeader(h: string): boolean {
  if (!h) return false
  const low = h.toLowerCase().trim()
  return (
    low === 'nome' || low.includes('nome_') || low.endsWith('_nome') || low.includes('nome ') ||
    low === 'colaborador' || low.includes('colaborador_') || low.includes('colaborador ') ||
    low === 'aluno' || low.includes('aluno_') ||
    low === 'cliente' || low.includes('cliente_') ||
    low === 'paciente' || low.includes('paciente_') ||
    low === 'funcionario' || low.includes('funcionário') ||
    low.includes('funcional') || low.includes('matricula') || low.includes('matrícula') ||
    low.includes('cpf') || low.includes('rg') || low.includes('cnpj') ||
    low.includes('email') || low.includes('e-mail') || low.includes('telefone') || low.includes('celular') ||
    low === 'id' || low.includes('id_') || low.endsWith('_id') || low.includes('codigo') || low.includes('código') ||
    low.includes('observacao') || low.includes('observação') || low.includes('descricao') || low.includes('descrição')
  )
}

export default function Dashboard({ isSharedView = false }: { isSharedView?: boolean }) {
  const { user, logout, impersonatedUser, impersonateUser, updateProfile } = useAuth()
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [smartDiscovery, setSmartDiscovery] = useState<any>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSuccess, setSupportSuccess] = useState(false)
  const [loadingCSV, setLoadingCSV] = useState(true)
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [userFiles, setUserFiles] = useState<any[]>([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  
  // Navigation & UI Layout State
  const [activeNav, setActiveNav] = useState<'home' | 'table' | 'file' | 'messages' | 'notification' | 'location' | 'graph'>('home')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [timeGranularity, setTimeGranularity] = useState<'day' | 'month' | 'year'>('month')
  const [filteredDataFromComponent, setFilteredDataFromComponent] = useState<any[] | null>(null)

  // Conjunto de dados ativo para gráficos (reage aos filtros dinamicamente)
  const activeData = useMemo(() => filteredDataFromComponent || csvData, [filteredDataFromComponent, csvData])

  const effectiveUser = impersonatedUser || user
  const isImpersonating = !!impersonatedUser

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    const loadData = async () => {
      if (!effectiveUser?.id) {
        setLoadingCSV(false)
        return
      }

      try {
        const files = await listUserFiles(effectiveUser.id)
        const sortedFiles = [...files].sort((a, b) => {
          const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
          const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
          return dateB - dateA
        })
        setUserFiles(sortedFiles)

        if (sortedFiles.length > 0) {
          setActiveFileId(sortedFiles[0].id)
          const fileData = await loadFileById(sortedFiles[0].id)
          if (fileData) {
            setCsvData(fileData.csvData)
            setCsvHeaders(fileData.csvHeaders)
            setSmartDiscovery(fileData.smartDiscovery)
          } else {
            setIsAddingNew(true)
          }
        } else {
          setIsAddingNew(true)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingCSV(false)
      }
    }

    loadData()
  }, [effectiveUser?.id])

  const handleFileUploaded = async (data: any[], headers: string[], fileName?: string) => {
    const planLimits: Record<string, number> = {
      'free': 1, 'basic': 2, 'plus': 4, 'pro': 8, 'admin': 999
    }
    const userPlan = (user?.plan || 'free').toLowerCase()
    const limit = planLimits[userPlan] || 1
    const userRole = (user?.role || 'user').toLowerCase()
    const isStaff = userRole === 'admin' || userRole === 'vendas' || userPlan === 'admin'
    
    const isReplacing = !isAddingNew && activeFileId !== null

    if (!isReplacing && !isStaff && !isImpersonating && userFiles.length >= limit) {
      alert(`Seu plano (${userPlan.toUpperCase()}) permite até ${limit} planilha(s).`)
      setIsAddingNew(false)
      setLoadingInsights(false)
      return
    }

    setCsvData(data)
    setCsvHeaders(headers)
    setSmartDiscovery(null)
    setLoadingInsights(true)
    setIsAddingNew(false)
    
    try {
      const discovery = await getSmartDiscovery(headers, data, effectiveUser?.onboardingData)
      setSmartDiscovery(discovery)
      
      await saveCSVData(data, headers, fileName, effectiveUser?.id, discovery, isReplacing ? activeFileId! : undefined)
      
      const files = await listUserFiles(effectiveUser?.id)
      const sortedFiles = [...files].sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
        return dateB - dateA
      })
      setUserFiles(sortedFiles)
      if (sortedFiles.length > 0 && !isReplacing) {
        setActiveFileId(sortedFiles[0].id)
      }
    } catch (err) {
      console.error("Erro ao salvar/analisar:", err)
      alert("Erro ao salvar os dados. Verifique sua conexão.")
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleSwitchFile = async (fileId: string) => {
    setIsAddingNew(false)
    if (fileId === activeFileId) return
    try {
      const fileData = await loadFileById(fileId)
      if (fileData) {
        setCsvData(fileData.csvData)
        setCsvHeaders(fileData.csvHeaders)
        setSmartDiscovery(fileData.smartDiscovery)
        setActiveFileId(fileId)
      }
    } catch (err) {
      console.error("Erro ao trocar arquivo:", err)
    }
  }

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation()
    const confirm = window.confirm('Tem certeza que deseja apagar esta planilha?')
    if (!confirm) return

    try {
      await deleteFileById(fileId)
      const updatedFiles = await listUserFiles(effectiveUser?.id)
      
      const sortedFiles = [...updatedFiles].sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
        return dateB - dateA
      })
      
      setUserFiles(sortedFiles)
      
      if (fileId === activeFileId) {
        if (sortedFiles.length > 0) {
          handleSwitchFile(sortedFiles[0].id)
        } else {
          setCsvData([])
          setCsvHeaders([])
          setSmartDiscovery(null)
          setActiveFileId(null)
          setIsAddingNew(true)
        }
      }
    } catch (err) {
      console.error("Erro ao apagar arquivo:", err)
      alert("Erro ao apagar arquivo.")
    }
  }

  const handleAddNewTab = () => {
    const planLimits: Record<string, number> = {
      'free': 1, 'basic': 2, 'plus': 4, 'pro': 8
    }
    const userPlan = user?.plan || 'free'
    const limit = planLimits[userPlan] || 1

    if (userFiles.length >= limit && !isImpersonating) {
      alert(`Seu plano (${userPlan.toUpperCase()}) permite até ${limit} planilha(s). Faça upgrade para adicionar mais!`)
      return
    }

    setCsvData([])
    setCsvHeaders([])
    setSmartDiscovery(null)
    setActiveFileId(null)
    setIsAddingNew(true)
  }

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportSubject.trim() || !supportMessage.trim() || !user) return

    setSupportLoading(true)
    setSupportSuccess(false)

    try {
      await sendSupportMessage(user.id, user.email, user.name, supportSubject, supportMessage)
      setSupportSuccess(true)
      setSupportSubject('')
      setSupportMessage('')
      setTimeout(() => {
        setSupportSuccess(false)
        setShowSupport(false)
      }, 3000)
    } catch (error) {
      console.error('Erro ao enviar mensagem de suporte:', error)
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setSupportLoading(false)
    }
  }

  // =========================================================================
  // PROCESSAMENTO DINÂMICO DOS DADOS DA PLANILHA (SEM HARDCODING)
  // =========================================================================
  
  const isDateHeaderName = (header: string): boolean => {
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

  // Colunas Numéricas Reais da Planilha (Excluindo Datas, IDs e Códigos)
  const numericHeaders = useMemo(() => {
    if (!csvHeaders || !csvData || csvData.length === 0) return []
    return csvHeaders.filter(h => {
      if (isDateHeaderName(h)) return false // Ignorar colunas com nome de data

      const lower = h.toLowerCase()
      if (
        lower.includes('id') ||
        lower.includes('código') ||
        lower.includes('codigo') ||
        lower.includes('cpf') ||
        lower.includes('cep') ||
        lower.includes('fone') ||
        lower.includes('telef')
      ) return false

      const sampleRows = csvData.slice(0, 15)
      
      // Se os valores numéricos são números seriais de data do Excel (entre 30000 e 70000 e com até 5 caracteres)
      const dateSerialCount = sampleRows.filter(r => {
        const val = String(r[h] || '').trim()
        const num = Number(val)
        return !isNaN(num) && num > 30000 && num < 70000 && val.length <= 5
      }).length

      if (dateSerialCount >= 3) return false // É coluna de data serial

      const validCount = sampleRows.filter(r => !isNaN(cleanNumber(r[h]))).length
      return validCount >= 3
    })
  }, [csvHeaders, csvData])

  // Pré-análise inteligente local (executada imediatamente ao carregar ou receber os dados)
  const localDiscovery = useMemo(() => {
    return runLocalPreAnalysis(csvHeaders, csvData)
  }, [csvHeaders, csvData])

  // Descoberta Efetiva: combina a IA do servidor (Groq) com a pré-análise local determinística
  const effectiveDiscovery = useMemo(() => {
    if (!smartDiscovery) return localDiscovery
    return {
      insights: smartDiscovery.insights || localDiscovery.insights || [],
      columnMapping: { ...localDiscovery.columnMapping, ...smartDiscovery.columnMapping },
      dashboardConfig: {
        primaryMetric: smartDiscovery.dashboardConfig?.primaryMetric || localDiscovery.dashboardConfig?.primaryMetric || '',
        secondaryMetric: smartDiscovery.dashboardConfig?.secondaryMetric || localDiscovery.dashboardConfig?.secondaryMetric || '',
        primaryCategory: smartDiscovery.dashboardConfig?.primaryCategory || localDiscovery.dashboardConfig?.primaryCategory || '',
        primaryDate: smartDiscovery.dashboardConfig?.primaryDate || localDiscovery.dashboardConfig?.primaryDate || '',
        chartTitles: {
          ...localDiscovery.dashboardConfig?.chartTitles,
          ...smartDiscovery.dashboardConfig?.chartTitles
        }
      }
    }
  }, [smartDiscovery, localDiscovery])

  // Lista de todas as colunas de categorias válidas da planilha, ordenadas por diversidade e utilidade
  const allCategoryHeaders = useMemo(() => {
    if (!csvHeaders || !activeData || activeData.length === 0) return []

    const candidates = csvHeaders.filter(h => {
      if (isDateHeaderName(h) || isIdentityOrNameHeader(h)) return false
      const sampleVals = activeData.map(r => String(r[h] || '').trim()).filter(Boolean)
      if (sampleVals.length === 0) return false
      const numCount = sampleVals.filter(v => !isNaN(cleanNumber(v))).length
      if (numCount >= sampleVals.length * 0.7) return false // É numérico

      const uniqueCount = new Set(sampleVals).size
      // Categoria válida tem entre 2 e min(40, 85% do total de linhas)
      return uniqueCount >= 2 && uniqueCount <= Math.max(40, Math.ceil(activeData.length * 0.85))
    })

    // Coloca a categoria identificada pela IA no topo se ela existir
    const aiCategory = effectiveDiscovery?.dashboardConfig?.primaryCategory
    if (aiCategory && candidates.includes(aiCategory) && !isIdentityOrNameHeader(aiCategory)) {
      return [aiCategory, ...candidates.filter(c => c !== aiCategory)]
    }

    return candidates
  }, [csvHeaders, activeData, effectiveDiscovery])

  // Categoria 1: Para o Gráfico de Barras
  const barCategoryHeader = useMemo(() => {
    return allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || ''
  }, [allCategoryHeaders, csvHeaders])

  // Categoria 2: Para o Donut Chart (Evita repetir a Categoria 1)
  const donutCategoryHeader = useMemo(() => {
    return allCategoryHeaders[1] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || ''
  }, [allCategoryHeaders, csvHeaders])

  // Categoria 3: Para o Radar Chart (Evita repetir as Categorias 1 e 2)
  const radarCategoryHeader = useMemo(() => {
    return allCategoryHeaders[2] || allCategoryHeaders[1] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || ''
  }, [allCategoryHeaders, csvHeaders])

  // Fallback mantido por compatibilidade
  const categoryHeader = barCategoryHeader

  // Coluna de Data Principal da Planilha (Orientada pela IA)
  const dateHeader = useMemo(() => {
    if (effectiveDiscovery?.dashboardConfig?.primaryDate && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryDate)) {
      return effectiveDiscovery.dashboardConfig.primaryDate
    }
    if (!csvHeaders || !csvData || csvData.length === 0) return ''
    return csvHeaders.find(h => isDateHeaderName(h)) || csvHeaders.find(h => {
      const sampleRows = csvData.slice(0, 10)
      const dateSerialCount = sampleRows.filter(r => {
        const val = String(r[h] || '').trim()
        const num = Number(val)
        return !isNaN(num) && num > 30000 && num < 70000 && val.length <= 5
      }).length
      return dateSerialCount >= 3
    }) || ''
  }, [csvHeaders, csvData, effectiveDiscovery])

  // Nomes dos 2 campos numéricos principais para usar nos gráficos (Orientados pela IA)
  const series1Key = useMemo(() => {
    if (effectiveDiscovery?.dashboardConfig?.primaryMetric && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryMetric)) {
      return effectiveDiscovery.dashboardConfig.primaryMetric
    }
    return numericHeaders[0] || 'Métrica 1'
  }, [effectiveDiscovery, csvHeaders, numericHeaders])

  const series2Key = useMemo(() => {
    if (
      effectiveDiscovery?.dashboardConfig?.secondaryMetric && 
      csvHeaders.includes(effectiveDiscovery.dashboardConfig.secondaryMetric) &&
      effectiveDiscovery.dashboardConfig.secondaryMetric !== series1Key
    ) {
      return effectiveDiscovery.dashboardConfig.secondaryMetric
    }
    return (numericHeaders[1] && numericHeaders[1] !== series1Key) ? numericHeaders[1] : 'Métrica 2'
  }, [effectiveDiscovery, csvHeaders, numericHeaders, series1Key])

  // 1. CARDS DE ESTATÍSTICAS DINÂMICOS
  const statCardsData = useMemo(() => {
    if (activeData.length === 0) {
      return {
        card1Label: 'Total Registros', card1Value: '0',
        card2Label: 'Total Colunas', card2Value: '0',
        card3Label: 'Métrica Principal', card3Value: '0',
        card4Label: 'Status Dados', card4Value: 'Pendente'
      }
    }

    // Card 1: Soma da Métrica 1 ou Total de Registros
    let c1Label = series1Key
    let c1Value = ''
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series1Key]) || 0), 0)
      const isMoney = series1Key.toLowerCase().includes('valor') || series1Key.toLowerCase().includes('preço') || series1Key.toLowerCase().includes('preco') || series1Key.toLowerCase().includes('faturamento') || series1Key.toLowerCase().includes('patrimonio') || series1Key.toLowerCase().includes('saldo')
      c1Value = isMoney ? `R$ ${formatValue(sum1)}` : formatValue(sum1)
    } else {
      c1Label = 'Total Registros'
      c1Value = activeData.length.toLocaleString('pt-BR')
    }

    // Card 2: Soma da Métrica 2 ou Total Registros
    let c2Label = series2Key !== series1Key && numericHeaders[1] ? series2Key : 'Total Registros'
    let c2Value = ''
    if (numericHeaders[1] && series2Key !== series1Key) {
      const sum2 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series2Key]) || 0), 0)
      c2Value = formatValue(sum2)
    } else {
      c2Value = activeData.length.toLocaleString('pt-BR')
    }

    // Card 3: Média da Métrica 1 ou Quantidade de Campos
    let c3Label = numericHeaders[0] ? `Média de ${series1Key}` : 'Total Colunas'
    let c3Value = ''
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series1Key]) || 0), 0)
      const avg1 = sum1 / activeData.length
      c3Value = formatValue(avg1)
    } else {
      c3Value = `${csvHeaders.length}`
    }

    // Card 4: Categoria Principal / Score KPI
    let c4Label = categoryHeader ? `Categorias em ${categoryHeader}` : 'Qualidade'
    let c4Value = ''
    if (categoryHeader) {
      const uniqueCats = new Set(activeData.map(r => String(r[categoryHeader] || '')).filter(Boolean))
      c4Value = `${uniqueCats.size}`
    } else {
      c4Value = '100%'
    }

    return { card1Label: c1Label, card1Value: c1Value, card2Label: c2Label, card2Value: c2Value, card3Label: c3Label, card3Value: c3Value, card4Label: c4Label, card4Value: c4Value }
  }, [activeData, csvHeaders, numericHeaders, series1Key, series2Key, categoryHeader])

  // 2. DADOS DINÂMICOS E AGREGADOS DO BAR CHART (ANÁLISE COMPARATIVA POR CATEGORIA 1)
  const resultBarData = useMemo(() => {
    if (activeData.length === 0) return []

    const groupKey = barCategoryHeader || csvHeaders[0] || ''
    const grouped: Record<string, { val1: number; val2: number; count: number }> = {}

    activeData.forEach(row => {
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

  // 3. DADOS DINÂMICOS DO DONUT CHART & LISTA (PROPORÇÃO DA CATEGORIA 2)
  const donutInfo = useMemo(() => {
    if (activeData.length === 0 || !donutCategoryHeader) {
      return {
        data: [{ name: 'Sem Dados', value: 100, color: '#192a3e' }],
        topPercentage: '0%',
        categoriesList: ['Sem registros']
      }
    }

    const counts: Record<string, number> = {}
    activeData.forEach(row => {
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

    const list = top4.map(([name, count]) => {
      const pct = Math.round((count / totalCount) * 100)
      return `${name} (${pct}%)`
    })

    return {
      data: pieData.length > 0 ? pieData : [{ name: 'Outros', value: 100, color: '#192a3e' }],
      topPercentage: `${topPct}%`,
      categoriesList: list
    }
  }, [activeData, donutCategoryHeader])

  // 4. DADOS DINÂMICOS E CHRONOLÓGICOS DO AREA CHART (SUPORTE A DIAS, MÊS E ANOS)
  const areaChartData = useMemo(() => {
    if (activeData.length === 0) return []

    const key1 = numericHeaders[0] ? series1Key : 'Registros'
    const key2 = numericHeaders[1] && series2Key !== series1Key ? series2Key : null

    // Se encontramos uma coluna de data real
    if (dateHeader) {
      const grouped: Record<string, { displayDate: string; timestamp: number; val1: number; val2: number; count: number }> = {}

      activeData.forEach(row => {
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

            const v1 = cleanNumber(row[series1Key])
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

    // Fallback se não houver datas válidas: agrupar por categoria
    const groupKey = barCategoryHeader || csvHeaders[0] || ''
    if (groupKey) {
      const grouped: Record<string, { val1: number; val2: number; count: number }> = {}
      activeData.forEach(row => {
        const cat = String(row[groupKey] || 'Outros').trim()
        if (!grouped[cat]) grouped[cat] = { val1: 0, val2: 0, count: 0 }
        const v1 = cleanNumber(row[series1Key])
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
  }, [activeData, dateHeader, barCategoryHeader, csvHeaders, numericHeaders, series1Key, series2Key, timeGranularity])

  // Ajustar a granularidade temporal padrão (se os dados forem de um único mês, alterna para 'day' automaticamente)
  useEffect(() => {
    if (dateHeader && activeData && activeData.length > 0) {
      const months = new Set<string>()
      activeData.forEach(row => {
        const parsed = parseDate(row[dateHeader])
        if (parsed && !isNaN(parsed.getTime())) {
          months.add(`${parsed.getUTCFullYear()}-${parsed.getUTCMonth()}`)
        }
      })
      if (months.size === 1) {
        setTimeGranularity('day')
      } else if (months.size > 12) {
        setTimeGranularity('year')
      }
    }
  }, [dateHeader, activeData])

  // 5. DADOS DINÂMICOS DO RADAR CHART (DISTRIBUIÇÃO MULTIDIMENSIONAL POR CATEGORIA 3)
  const radarChartData = useMemo(() => {
    if (activeData.length === 0) return []

    const groupKey = radarCategoryHeader || csvHeaders[0] || ''
    const grouped: Record<string, { count: number; sum: number }> = {}

    activeData.forEach(row => {
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
        [numericHeaders[0] ? series1Key : 'Registros']: Number((item.sum || item.count).toFixed(1)),
        fullMark: maxVal
      }
    })
  }, [activeData, radarCategoryHeader, csvHeaders, numericHeaders, series1Key])

  return (
    <div className="dashboard-layout">
      {/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}
      {!isSharedView && (
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-profile-card">
          <div className="avatar-ring">
            <div className="avatar-inner">
              <span className="avatar-icon">👤</span>
            </div>
          </div>
          <h2 className="sidebar-user-name">
            {effectiveUser?.name ? effectiveUser.name.toUpperCase() : 'USUÁRIO'}
          </h2>
          <p className="sidebar-user-email">
            {effectiveUser?.email || 'usuario@empresa.com'}
          </p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => { setActiveNav('home'); setIsAddingNew(false) }}
          >
            <Home size={18} className="nav-icon" />
            <span>Dashboard</span>
          </button>

          <button 
            className={`nav-btn ${activeNav === 'table' ? 'active' : ''}`}
            onClick={() => { setActiveNav('table'); setIsAddingNew(false) }}
          >
            <Table size={18} className="nav-icon" />
            <span>Tabela de Dados</span>
          </button>
        </nav>
      </aside>
      )}

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <div className="dashboard-main-area">
        {/* CABEÇALHO DA DASHBOARD */}
        {!isSharedView && (
          <header className="main-header">
          <div className="header-title-section">
            <button 
              className="menu-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={22} />
            </button>
            <h1 className="main-title">Dashboard User</h1>
          </div>

          <div className="header-actions-section">
            {user?.role === 'admin' && !isImpersonating && !isSharedView && (
              <button 
                onClick={() => window.location.href = '/admin'} 
                className="back-admin-btn"
              >
                <LayoutDashboard size={16} />
                Admin
              </button>
            )}

            {user?.plan === 'pro' && !isImpersonating && !isSharedView && (
              <button 
                onClick={() => setShowShareModal(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                <Share2 size={16} />
                Compartilhar
              </button>
            )}

            <div className="profile-dropdown-container">
              <button 
                className="profile-trigger-btn" 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="small-avatar">{effectiveUser?.name?.charAt(0).toUpperCase() || 'U'}</div>
                <span className="profile-name-text">{effectiveUser?.name || 'Usuário'}</span>
              </button>
              
              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="profile-header">
                    <strong>{effectiveUser?.name}</strong>
                    <span>{effectiveUser?.email}</span>
                  </div>
                  
                  <div className="profile-plan">
                    <span>Plano:</span>
                    <span className="plan-tag">{user?.plan?.toUpperCase() || 'FREE'}</span>
                  </div>

                  {user?.role === 'user' && (user?.plan === 'free' || !user?.plan) && (
                    <button 
                      onClick={() => window.location.href = '/pricing'} 
                      className="dropdown-upgrade-btn"
                    >
                      <Sparkles size={14} />
                      Fazer Upgrade
                    </button>
                  )}

                  <div className="dropdown-divider"></div>
                  
                  <button onClick={logout} className="dropdown-logout-btn">
                    <LogOut size={16} />
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

        {/* NOTIFICAÇÃO DE IMPERSONAÇÃO */}
        {isImpersonating && !isSharedView && (
          <div className="impersonation-banner">
            <Clock size={16} />
            <span>Visualizando dashboard de: <strong>{effectiveUser?.name}</strong></span>
            <button 
              onClick={async () => {
                await impersonateUser(null)
                window.location.href = '/admin'
              }}
            >
              Voltar ao Admin
            </button>
          </div>
        )}

        {/* NOTIFICAÇÃO DE TRIAL */}
        {user?.role === 'user' && !user?.isPro && !isSharedView && (
          <div className={`trial-banner ${user?.trialEndDate && isTrialExpired(new Date(user.trialEndDate)) ? 'expired' : ''}`}>
            <Clock size={16} />
            <span>
              {user?.trialEndDate && !isTrialExpired(new Date(user.trialEndDate)) 
                ? `Período de teste: ${getTrialDaysRemaining(new Date(user.trialEndDate))} dias restantes` 
                : 'Seu período de teste expirou.'}
            </span>
          </div>
        )}

        {/* BARRA DE ABAS DE PLANILHAS (SE EXISTIREM) */}
        {(userFiles.length > 0 || isAddingNew) && (
          <div className="tabs-bar-wrapper">
            <div className="tabs-list">
              {userFiles.map(file => (
                <div 
                  key={file.id} 
                  className={`tab-pill ${activeFileId === file.id && !isAddingNew ? 'active' : ''}`}
                  onClick={() => handleSwitchFile(file.id)}
                >
                  <FileText size={14} />
                  <span>{file.fileName || 'Planilha'}</span>
                  {!isSharedView && (
                    <button 
                      className="tab-close"
                      onClick={(e) => handleDeleteFile(e, file.id)}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {!isSharedView && (
                <button className="add-tab-pill" onClick={handleAddNewTab}>
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ÁREA DE CONTEÚDO */}
        <div className="dashboard-content-body">
          {(loadingCSV || loadingInsights) ? (
            <div className="loading-state-card">
              <div className="spinner-blue"></div>
              <p>{loadingInsights ? 'Processando dados e gerando insights com IA...' : 'Carregando seus dados...'}</p>
            </div>
          ) : (csvData.length === 0 || isAddingNew) ? (
            isSharedView ? (
              <div className="upload-view-container">
                <div className="upload-box-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <h2 style={{ color: '#1e293b', marginTop: '20px' }}>O Dashboard ainda não possui dados configurados.</h2>
                </div>
              </div>
            ) : (
            /* TELA DE UPLOAD / CONEXÃO DE DADOS */
            <div className="upload-view-container">
              <div className="upload-box-card">
                <div className="upload-box-header">
                  <Sparkles size={28} className="box-sparkle" />
                  <h2>{isAddingNew ? 'Adicionar Nova Planilha' : 'Conecte seus dados'}</h2>
                  <p>Envie um arquivo CSV ou conecte ao Google Sheets para alimentar o Dashboard.</p>
                </div>
                
                <div className="method-selector">
                  <button 
                    className={`method-btn ${importMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setImportMethod('file')}
                  >
                    Arquivo CSV
                  </button>
                  <button 
                    className={`method-btn ${importMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setImportMethod('url')}
                  >
                    Google Sheets
                  </button>
                </div>

                {importMethod === 'file' ? (
                  <CSVUploader 
                    onFileUploaded={handleFileUploaded} 
                    onboardingData={user?.onboardingData}
                  />
                ) : (
                  <GoogleSheetsImporter 
                    onDataLoaded={handleFileUploaded}
                  />
                )}

                {isAddingNew && userFiles.length > 0 && (
                  <button 
                    className="cancel-new-btn"
                    onClick={() => handleSwitchFile(userFiles[0].id)}
                  >
                    Cancelar e Voltar
                  </button>
                )}
              </div>
            </div>
          )) : activeNav === 'table' ? (
            /* VISÃO DEDICADA: TABELA DE DADOS BRUTOS COM FILTROS */
            <div className="dashboard-widgets-wrapper">
              <DataVisualization 
                mode="filters"
                data={csvData} 
                headers={csvHeaders} 
                smartMapping={smartDiscovery?.columnMapping}
                onFilteredDataChange={setFilteredDataFromComponent}
              />
              <DataVisualization 
                mode="table"
                data={csvData} 
                headers={csvHeaders} 
                smartMapping={smartDiscovery?.columnMapping}
              />
            </div>
          ) : (
            /* DASHBOARD COMPLETA COM COLUNAS DINÂMICAS DA PLANILHA E CARD DE FILTROS */
            <div className="dashboard-widgets-wrapper">
              
              {/* CARD DE FILTROS NO TOPO (PERÍODO, COLUNAS, BUSCA E PDF) */}
              <DataVisualization 
                mode="filters"
                data={csvData} 
                headers={csvHeaders} 
                smartMapping={smartDiscovery?.columnMapping}
                onFilteredDataChange={setFilteredDataFromComponent}
              />
              
              {/* LINHA 1: GRID DE 4 CARDS ESTATÍSTICOS COM RÓTULOS REAIS DA PLANILHA */}
              <div className="stat-cards-row">
                {/* CARD 1: COLUNA NUMÉRICA PRINCIPAL */}
                <div className="stat-card navy-card">
                  <div className="stat-card-info">
                    <span className="stat-label">{statCardsData.card1Label}</span>
                    <h3 className="stat-value">{statCardsData.card1Value}</h3>
                  </div>
                  <div className="stat-icon-circle white-circle">
                    <DollarSign size={20} className="navy-icon-color" />
                  </div>
                </div>

                {/* CARD 2: MÉTRICA 2 / REGISTROS */}
                <div className="stat-card white-card">
                  <div className="stat-card-info">
                    <span className="stat-label">{statCardsData.card2Label}</span>
                    <h3 className="stat-value">{statCardsData.card2Value}</h3>
                  </div>
                  <div className="stat-icon-circle orange-light-bg">
                    <Share2 size={20} className="orange-icon-color" />
                  </div>
                </div>

                {/* CARD 3: MÉDIA / COLUNAS */}
                <div className="stat-card white-card">
                  <div className="stat-card-info">
                    <span className="stat-label">{statCardsData.card3Label}</span>
                    <h3 className="stat-value">{statCardsData.card3Value}</h3>
                  </div>
                  <div className="stat-icon-circle orange-light-bg">
                    <ThumbsUp size={20} className="orange-icon-color" />
                  </div>
                </div>

                {/* CARD 4: CATEGORIAS / SCORE */}
                <div className="stat-card white-card">
                  <div className="stat-card-info">
                    <span className="stat-label">{statCardsData.card4Label}</span>
                    <h3 className="stat-value">{statCardsData.card4Value}</h3>
                  </div>
                  <div className="stat-icon-circle orange-light-bg">
                    <Star size={20} className="orange-icon-color" />
                  </div>
                </div>
              </div>

              {/* LINHA 2: GRÁFICO DE RESULTADO (BARRAS COM COLUNAS DA PLANILHA) + DONUT KPI CHART */}
              <div className="charts-middle-row">
                {/* CARD ESQUERDA: RESULT BAR CHART */}
                <div className="widget-card result-chart-card">
                  <div className="widget-header">
                    <h3 className="widget-title">
                      {effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || `Análise Comparativa por ${barCategoryHeader || 'Categoria'}`}
                    </h3>
                  </div>

                  <div className="bar-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={resultBarData} barGap={4}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey={series1Key} fill="#ff9800" radius={[2, 2, 0, 0]} name={series1Key} />
                        <Bar dataKey={series2Key} fill="#192a3e" radius={[2, 2, 0, 0]} name={series2Key} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-legend-row">
                    <div className="legend-item">
                      <span className="legend-box orange-box"></span>
                      <span>{series1Key}</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-box navy-box"></span>
                      <span>{series2Key}</span>
                    </div>
                  </div>
                </div>

                {/* CARD DIREITA: DONUT KPI + LISTA REAL DA PLANILHA */}
                <div className="widget-card donut-chart-card">
                  <div className="widget-header" style={{ marginBottom: '10px' }}>
                    <h3 className="widget-title" style={{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0 }}>
                      {effectiveDiscovery?.dashboardConfig?.chartTitles?.donutChart || `Proporção por ${donutCategoryHeader || 'Categoria'}`}
                    </h3>
                  </div>

                  <div className="donut-wrapper">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={donutInfo.data}
                          innerRadius={52}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {donutInfo.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center-label">
                      <h2>{donutInfo.topPercentage}</h2>
                    </div>
                  </div>

                  <div className="donut-text-list">
                    {donutInfo.categoriesList.map((item, idx) => (
                      <div key={idx} className="list-row">
                        <span className="bullet"></span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LINHA 3: GRÁFICO DE ÁREA (TENDÊNCIA) + WIDGET DE CALENDÁRIO */}
              <div className="charts-bottom-row">
                {/* CARD ESQUERDA: AREA CHART TENDÊNCIA COM DATAS REALMENTE FORMATADAS */}
                <div className="widget-card area-chart-card">
                  <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="widget-title" style={{ fontSize: '15px', fontWeight: 700, color: '#192a3e', margin: 0 }}>
                      {effectiveDiscovery?.dashboardConfig?.chartTitles?.areaChart || `Evolução Temporal (${dateHeader || 'Período'})`}
                    </h3>

                    <div className="area-chart-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* CONTROLES DE GRANULARIDADE TEMPORAL (DIAS, MÊS, ANOS) */}
                      <div className="granularity-toggle-group" style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <button 
                          type="button"
                          onClick={() => setTimeGranularity('day')}
                          style={{
                            padding: '3px 9px',
                            fontSize: '11px',
                            fontWeight: timeGranularity === 'day' ? 700 : 500,
                            color: timeGranularity === 'day' ? '#fff' : '#64748b',
                            backgroundColor: timeGranularity === 'day' ? '#192a3e' : 'transparent',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Dias
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTimeGranularity('month')}
                          style={{
                            padding: '3px 9px',
                            fontSize: '11px',
                            fontWeight: timeGranularity === 'month' ? 700 : 500,
                            color: timeGranularity === 'month' ? '#fff' : '#64748b',
                            backgroundColor: timeGranularity === 'month' ? '#192a3e' : 'transparent',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Mês
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTimeGranularity('year')}
                          style={{
                            padding: '3px 9px',
                            fontSize: '11px',
                            fontWeight: timeGranularity === 'year' ? 700 : 500,
                            color: timeGranularity === 'year' ? '#fff' : '#64748b',
                            backgroundColor: timeGranularity === 'year' ? '#192a3e' : 'transparent',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Anos
                        </button>
                      </div>

                      <div className="area-legend-header" style={{ display: 'flex', gap: '10px' }}>
                        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                          <span className="legend-dot orange-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff9800' }}></span>
                          <span>{numericHeaders[0] ? series1Key : 'Registros'}</span>
                        </div>
                        {numericHeaders[1] && series2Key !== series1Key && (
                          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                            <span className="legend-dot navy-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#192a3e' }}></span>
                            <span>{series2Key}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="area-chart-container">
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={areaChartData}>
                        <defs>
                          <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff9800" stopOpacity={0.05}/>
                          </linearGradient>
                          <linearGradient id="colorNavy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#192a3e" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#192a3e" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={numericHeaders[0] ? series1Key : 'Registros'} 
                          stroke="#ff9800" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorOrange)" 
                          name={numericHeaders[0] ? series1Key : 'Registros'}
                        />
                        {numericHeaders[1] && series2Key !== series1Key && (
                          <Area 
                            type="monotone" 
                            dataKey={series2Key} 
                            stroke="#192a3e" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorNavy)" 
                            name={series2Key}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CARD DIREITA: GRÁFICO DE RADAR MULTIDIMENSIONAL */}
                <div className="widget-card radar-chart-card">
                  <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 className="widget-title" style={{ fontSize: '15px', fontWeight: 700, color: '#192a3e', margin: 0 }}>
                      {effectiveDiscovery?.dashboardConfig?.chartTitles?.radarChart || `Perfil Multidimensional por ${radarCategoryHeader || 'Categoria'}`}
                    </h3>
                  </div>

                  <div className="radar-chart-container" style={{ width: '100%', height: '210px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarChartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar 
                          name={numericHeaders[0] ? series1Key : 'Registros'} 
                          dataKey={numericHeaders[0] ? series1Key : 'Registros'} 
                          stroke="#ff9800" 
                          fill="#ff9800" 
                          fillOpacity={0.5} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* SEÇÃO DA TABELA REMOVIDA DO RODAPÉ INICIAL DA HOME */}
            </div>
          )}
        </div>
      </div>

      {/* CHATBOT E BOTÕES DE SUPORTE */}
      <div className="floating-actions">
        {csvData.length > 0 && (
          <button
            className={`chat-floating-btn ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Dê uma Lupa nos Dados"
          >
            <Sparkles size={24} />
          </button>
        )}

        <button
          className="support-floating-btn"
          onClick={() => setShowSupport(!showSupport)}
          title="Suporte"
        >
          <HelpCircle size={22} />
        </button>
      </div>

      {showShareModal && (
        <div className="support-modal">
          <div className="support-form-card" style={{ maxWidth: '500px' }}>
            <div className="support-form-header">
              <h2>Compartilhar Dashboard</h2>
              <button onClick={() => setShowShareModal(false)} className="close-support-btn">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px' }}>
                Link de compartilhamento para convidados:
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/share/${user?.id}`}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/share/${user?.id}`)
                    setIsCopying(true)
                    setTimeout(() => setIsCopying(false), 2000)
                  }}
                  style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {isCopying ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {user?.pendingAccessRequests && user.pendingAccessRequests.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#fff' }}>Solicitações de Acesso:</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {user.pendingAccessRequests.map((email: string) => (
                    <li key={email} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#334155', borderRadius: '6px', marginBottom: '8px' }}>
                      <span style={{ color: '#f8fafc' }}>{email}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => {
                            if (user && updateProfile) {
                              const newShared = [...(user.sharedWith || []), email]
                              const newPending = user.pendingAccessRequests!.filter(e => e !== email)
                              updateProfile({ sharedWith: newShared, pendingAccessRequests: newPending })
                            }
                          }}
                          style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Autorizar
                        </button>
                        <button 
                          onClick={() => {
                            if (user && updateProfile) {
                              const newPending = user.pendingAccessRequests!.filter(e => e !== email)
                              updateProfile({ pendingAccessRequests: newPending })
                            }
                          }}
                          style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#fff' }}>Usuários com Acesso:</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {user?.sharedWith && user.sharedWith.length > 0 ? (
                  user.sharedWith.map((email: string) => (
                    <li key={email} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
                      <span style={{ color: '#cbd5e1' }}>{email}</span>
                      <button 
                        onClick={() => {
                          if (user && updateProfile) {
                            updateProfile({ sharedWith: user.sharedWith!.filter(e => e !== email) })
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Remover
                      </button>
                    </li>
                  ))
                ) : (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhum usuário convidado ainda.</p>
                )}
              </ul>
            </div>

            <div>
              <form onSubmit={(e) => {
                e.preventDefault()
                if (shareEmail && user && updateProfile) {
                  const currentShared = user.sharedWith || []
                  if (!currentShared.includes(shareEmail)) {
                    updateProfile({ sharedWith: [...currentShared, shareEmail] })
                  }
                  setShareEmail('')
                }
              }} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="email" 
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Email do convidado"
                  required
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                />
                <button type="submit" style={{ padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Adicionar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showChat && csvData.length > 0 && (
        <ChatBot data={csvData} headers={csvHeaders} onboardingData={effectiveUser?.onboardingData} />
      )}

      {showSupport && (
        <div className="support-modal">
          <div className="support-form-card">
            <div className="support-form-header">
              <h2>Enviar Mensagem de Suporte</h2>
              <button
                onClick={() => {
                  setShowSupport(false)
                  setSupportSubject('')
                  setSupportMessage('')
                  setSupportSuccess(false)
                }}
                className="close-support-btn"
              >
                <X size={20} />
              </button>
            </div>

            {supportSuccess ? (
              <div className="support-success">
                <CheckCircle2 size={48} />
                <h3>Mensagem enviada com sucesso!</h3>
                <p>Nossa equipe entrará em contato em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSendSupport} className="support-form">
                <div className="form-group">
                  <label htmlFor="supportSubject">Assunto</label>
                  <input
                    id="supportSubject"
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="Ex: Problema com upload"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supportMessage">Mensagem</label>
                  <textarea
                    id="supportMessage"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Descreva seu problema..."
                    rows={5}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="send-support-btn"
                  disabled={supportLoading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  <Send size={16} />
                  {supportLoading ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
