import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  LogOut, FileText, Sparkles, Clock, CheckCircle2, HelpCircle, 
  Send, X, LayoutDashboard, Plus,
  Home, Share2, ThumbsUp, Star, DollarSign, Menu, Table
, Users, Activity, Briefcase, TrendingUp, ShoppingCart, Target, Heart, CheckCircle
, Settings, Lock
} from 'lucide-react'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList,
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
import { processAdaptiveSqlPipeline } from '../services/adaptiveSqlService'
import './Dashboard.css'

// Helper para limpeza e conversão de números (moeda PT-BR, pontos, vírgulas)
const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign, Users, Activity, Briefcase, TrendingUp, ShoppingCart,
  FileText, CheckCircle, Target, Heart, Clock,
  Share2, ThumbsUp, Star
};

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
  const [manualConfig, setManualConfig] = useState<any>({})
  const [editingChart, setEditingChart] = useState<string | null>(null)
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
  const [adaptiveSqlQuery, setAdaptiveSqlQuery] = useState<string>('')
  const [showSqlModal, setShowSqlModal] = useState(false)
  
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
            const sqlResult = processAdaptiveSqlPipeline(fileData.csvHeaders, fileData.csvData, effectiveUser?.onboardingData)
            setCsvData(sqlResult.cleanData)
            setCsvHeaders(sqlResult.cleanHeaders)
            setAdaptiveSqlQuery(sqlResult.sqlQuery)
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

    const sqlResult = processAdaptiveSqlPipeline(headers, data, effectiveUser?.onboardingData)
    const cleanHeaders = sqlResult.cleanHeaders
    const cleanData = sqlResult.cleanData
    setAdaptiveSqlQuery(sqlResult.sqlQuery)
    setCsvData(cleanData)
    setCsvHeaders(cleanHeaders)
    setSmartDiscovery(null)
    setLoadingInsights(true)
    setIsAddingNew(false)
    
    try {
      const discovery = await getSmartDiscovery(cleanHeaders, cleanData, effectiveUser?.onboardingData)
      setSmartDiscovery(discovery)
      
      await saveCSVData(cleanData, cleanHeaders, fileName, effectiveUser?.id, discovery, isReplacing ? activeFileId! : undefined)
      
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
        const sqlResult = processAdaptiveSqlPipeline(fileData.csvHeaders, fileData.csvData, effectiveUser?.onboardingData)
        const cleanHeaders = sqlResult.cleanHeaders
        const cleanData = sqlResult.cleanData
        setAdaptiveSqlQuery(sqlResult.sqlQuery)
        setCsvData(cleanData)
        setCsvHeaders(cleanHeaders)
        setSmartDiscovery(fileData.smartDiscovery)
        setActiveFileId(fileId)
      }
    } catch (err) {
      console.error("Erro ao trocar arquivo:", err)
    }
  }

  const handleRecreateWithAI = async () => {
    if (!activeFileId || csvData.length === 0) return;
    
    setLoadingInsights(true);
    setManualConfig({}); // CLEAR MANUAL CONFIG ON RECREATE
    // Removemos o setSmartDiscovery(null) aqui para não piscar os gráficos antes da hora, ou deixamos para dar feedback de loading.
    // O loadingInsights = true já vai mostrar o spinner "Processando dados..."
    try {
      const discovery = await getSmartDiscovery(csvHeaders, csvData, effectiveUser?.onboardingData);
      setSmartDiscovery(discovery);
      
      const fileRecord = userFiles.find(f => f.id === activeFileId);
      if (fileRecord) {
        await saveCSVData(
          csvData, 
          csvHeaders, 
          fileRecord.fileName, 
          activeFileId, 
          discovery, 
          effectiveUser?.id
        );
      }
    } catch (err) {
      console.error("Erro ao recriar dashboard com IA:", err);
      alert("Erro ao recriar dashboard com IA. Verifique sua conexão.");
    } finally {
      setLoadingInsights(false);
    }
  };


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
  
  const canEditCharts = (effectiveUser && effectiveUser.plan !== 'free') || (effectiveUser && effectiveUser.trialEndDate && getTrialDaysRemaining(new Date(effectiveUser.trialEndDate)) > 0);
  
  const handleEditClick = (chartId: string) => {
    if (!canEditCharts) {
      if (window.confirm('A edição de gráficos é exclusiva para assinantes Premium ou usuários em período de teste. Deseja fazer upgrade agora?')) {
        window.location.href = '/pricing';
      }
      return;
    }
    setEditingChart(chartId);
  };

  
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
          donutCategory: smartDiscovery.dashboardConfig?.donutCategory || localDiscovery.dashboardConfig?.donutCategory || '',
          radarCategory: smartDiscovery.dashboardConfig?.radarCategory || localDiscovery.dashboardConfig?.radarCategory || '',
        chartTitles: {
          ...localDiscovery.dashboardConfig?.chartTitles,
          ...smartDiscovery.dashboardConfig?.chartTitles
        },
        kpis: smartDiscovery.dashboardConfig?.kpis
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
    if (manualConfig.primaryCategory && csvHeaders.includes(manualConfig.primaryCategory)) return manualConfig.primaryCategory;
    if (effectiveDiscovery?.dashboardConfig?.primaryCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.primaryCategory)) return effectiveDiscovery.dashboardConfig.primaryCategory;
    return allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.primaryCategory])

  // Categoria 2: Para o Donut Chart (Evita repetir a Categoria 1)
  const donutCategoryHeader = useMemo(() => {
    if (manualConfig.donutCategory && csvHeaders.includes(manualConfig.donutCategory)) return manualConfig.donutCategory;
    if (effectiveDiscovery?.dashboardConfig?.donutCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.donutCategory)) return effectiveDiscovery.dashboardConfig.donutCategory;
    return allCategoryHeaders[1] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.donutCategory])

  // Categoria 3: Para o Radar Chart (Evita repetir as Categorias 1 e 2)
  const radarCategoryHeader = useMemo(() => {
    if (manualConfig.radarCategory && csvHeaders.includes(manualConfig.radarCategory)) return manualConfig.radarCategory;
    if (effectiveDiscovery?.dashboardConfig?.radarCategory && csvHeaders.includes(effectiveDiscovery.dashboardConfig.radarCategory)) return effectiveDiscovery.dashboardConfig.radarCategory;
    return allCategoryHeaders[2] || allCategoryHeaders[0] || csvHeaders.find(h => !isDateHeaderName(h) && !isIdentityOrNameHeader(h)) || csvHeaders[0] || '';
  }, [allCategoryHeaders, csvHeaders, effectiveDiscovery, manualConfig.radarCategory])

  // Fallback mantido por compatibilidade
  const categoryHeader = barCategoryHeader

  // Coluna de Data Principal da Planilha (Orientada pela IA)
  const dateHeader = useMemo(() => {
    if (manualConfig.primaryDate && csvHeaders.includes(manualConfig.primaryDate)) return manualConfig.primaryDate;
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
  }, [csvHeaders, csvData, effectiveDiscovery, manualConfig.primaryDate])

  // Nomes dos 2 campos numéricos principais para usar nos gráficos (Orientados pela IA)
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
    if (manualConfig.secondaryMetric === '') return ''; // Usuário escolheu "Nenhuma" explicitamente
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

  // 1. CARDS DE ESTATÍSTICAS DINÂMICOS
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

    const aiKpis = (effectiveDiscovery.dashboardConfig as any)?.kpis;
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
          txtVal = isMoney ? `R$ ${formatValue(val)}` : formatValue(val);
        }
        return { label: kpi.label, value: txtVal, icon: ICON_MAP[kpi.icon] ? kpi.icon : 'Star' };
      });
      return { cards: computedCards };
    }

    // Default Fallback logic
    let c1Label = series1Key;
    let c1Value = '';
    const isMoney1 = series1Key.toLowerCase().includes('valor') || series1Key.toLowerCase().includes('preço') || series1Key.toLowerCase().includes('preco') || series1Key.toLowerCase().includes('faturamento') || series1Key.toLowerCase().includes('mensalidade');
    const isGradeOrScore = series1Key.toLowerCase().includes('nota') || series1Key.toLowerCase().includes('media') || series1Key.toLowerCase().includes('média') || series1Key.toLowerCase().includes('frequencia') || series1Key.toLowerCase().includes('frequência') || series1Key.toLowerCase().includes('score') || series1Key.toLowerCase().includes('rating');

    if (numericHeaders[0]) {
      const validVals = activeData.map(r => cleanNumber(r[series1Key])).filter(v => !isNaN(v));
      if (isGradeOrScore && validVals.length > 0) {
        const avg = validVals.reduce((a, b) => a + b, 0) / validVals.length;
        c1Label = `Média de ${series1Key}`;
        c1Value = formatValue(avg);
      } else {
        const sum1 = validVals.reduce((acc, v) => acc + v, 0);
        c1Value = isMoney1 ? `R$ ${formatValue(sum1)}` : formatValue(sum1);
      }
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

    let c3Label = numericHeaders[0] ? `Total ${series1Key}` : 'Total Colunas';
    let c3Value = '';
    if (numericHeaders[0]) {
      const sum1 = activeData.reduce((acc, r) => acc + (cleanNumber(r[series1Key]) || 0), 0);
      c3Value = formatValue(sum1);
    } else {
      c3Value = `${csvHeaders.length}`;
    }

    let c4Label = categoryHeader ? `Categorias em ${categoryHeader}` : 'Qualidade';
    let c4Value = '';
    if (categoryHeader) {
      const uniqueCats = new Set(activeData.map(r => String(r[categoryHeader] || '')).filter(Boolean));
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
  }, [activeData, numericHeaders, series1Key, series2Key, categoryHeader, csvHeaders.length, effectiveDiscovery])

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
        categoriesList: [{ text: 'Sem registros', color: '#192a3e' }]
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

    // Fallback se não houver datas válidas: agrupar por categoria
    const groupKey = barCategoryHeader || csvHeaders[0] || ''
    if (groupKey) {
      const grouped: Record<string, { val1: number; val2: number; count: number }> = {}
      activeData.forEach(row => {
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
        [series1Key === 'Registros' || !numericHeaders[0] ? 'Registros' : series1Key]: series1Key === 'Registros' ? item.count : Number((item.sum || item.count).toFixed(1)),
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

          <button 
            className="nav-btn"
            onClick={() => window.location.href = '/pricing'}
          >
            <DollarSign size={18} className="nav-icon" />
            <span>Assinatura e Pagamentos</span>
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
          <div className="tabs-bar-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {/* NOVO BOTÃO DE RECRIAR COM IA E VER SQL ADAPTATIVO */}
            {!isSharedView && activeFileId && !isAddingNew && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setShowSqlModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#1e293b',
                    color: '#38bdf8', border: '1px solid #334155', padding: '6px 14px',
                    borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Ver a Query SQL Adaptativa gerada dinamicamente pelo sistema para esta planilha"
                >
                  <Table size={14} />
                  Ver SQL Adaptativo
                </button>

                <button 
                  onClick={handleRecreateWithAI}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(to right, #f59e0b, #ea580c)',
                    color: '#fff', border: 'none', padding: '6px 14px',
                    borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Pedir para a IA analisar os dados e recriar os gráficos"
                >
                  <Sparkles size={14} />
                  Recriar com IA
                </button>
              </div>
            )}

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
                {statCardsData.cards.map((card, index) => {
                  const IconComp = ICON_MAP[card.icon] || ICON_MAP['Star'];
                  const isNavy = index === 0;
                  return (
                    <div key={index} className={`stat-card ${isNavy ? 'navy-card' : 'white-card'}`}>
                      <div className="stat-card-info">
                        <span className="stat-label">{card.label}</span>
                        <h3 className="stat-value">{card.value}</h3>
                      </div>
                      <div className={`stat-icon-circle ${isNavy ? 'white-circle' : 'orange-light-bg'}`}>
                        <IconComp size={20} className={isNavy ? 'navy-icon-color' : 'orange-icon-color'} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LINHA 2: GRÁFICO DE RESULTADO (BARRAS COM COLUNAS DA PLANILHA) + DONUT KPI CHART */}
              <div className="charts-middle-row">
                {/* CARD ESQUERDA: RESULT BAR CHART */}
                <div className="widget-card result-chart-card">
                  <div className="widget-header">
                    <h3 className="widget-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}><span style={{ flex: 1 }}>{(manualConfig.primaryCategory || manualConfig.primaryMetric) ? `Análise Comparativa por ${barCategoryHeader || 'Categoria'}` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || `Análise Comparativa por ${barCategoryHeader || 'Categoria'}`)}</span>
                      <button onClick={() => handleEditClick('bar')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>
                  </div>

                  <div className="bar-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={resultBarData} barGap={4} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#192a3e', borderRadius: '8px', color: '#fff', border: 'none' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey={series1Key} fill="#ff9800" radius={[2, 2, 0, 0]} name={series1Key}>
                          <LabelList dataKey={series1Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                        </Bar>
                        {series2Key && series2Key !== 'Métrica 2' && (
                          <Bar dataKey={series2Key} fill="#192a3e" radius={[2, 2, 0, 0]} name={series2Key}>
                            <LabelList dataKey={series2Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                          </Bar>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-legend-row">
                    <div className="legend-item">
                      <span className="legend-box orange-box"></span>
                      <span>{series1Key}</span>
                    </div>
                    {series2Key && series2Key !== 'Métrica 2' && (
                      <div className="legend-item">
                        <span className="legend-box navy-box"></span>
                        <span>{series2Key}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD DIREITA: DONUT KPI + LISTA REAL DA PLANILHA */}
                <div className="widget-card donut-chart-card">
                  <div className="widget-header" style={{ marginBottom: '10px' }}>
                    <h3 className="widget-title" style={{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}><span style={{ flex: 1 }}>{(manualConfig.donutCategory) ? `Proporção por ${donutCategoryHeader || 'Categoria'}` : (effectiveDiscovery?.dashboardConfig?.chartTitles?.donutChart || `Proporção por ${donutCategoryHeader || 'Categoria'}`)}</span>
                      <button onClick={() => handleEditClick('donut')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>
                  </div>

                  <div className="donut-wrapper">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={donutInfo.data}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return percent > 0.05 ? (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            ) : null;
                          }}
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
                    {donutInfo.categoriesList.map((item: any, idx: number) => (
                      <div key={idx} className="list-row">
                        <span className="bullet" style={{ backgroundColor: item.color }}></span> {item.text}
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
                          <span>{numericHeaders[0] ? seriesAreaKey : 'Registros'}</span>
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
                      <AreaChart data={areaChartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
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
                        >
                          <LabelList dataKey={numericHeaders[0] ? series1Key : 'Registros'} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                        </Area>
                        {numericHeaders[1] && series2Key !== series1Key && (
                          <Area 
                            type="monotone" 
                            dataKey={series2Key} 
                            stroke="#192a3e" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorNavy)" 
                            name={series2Key}
                          >
                            <LabelList dataKey={series2Key} position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                          </Area>
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

      {/* Modal de Edição de Gráficos */}
      {editingChart && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#192a3e' }}>Editar Gráfico</h2>
            
            {editingChart === 'bar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria (Eixo X)
                  <select value={manualConfig.primaryCategory || barCategoryHeader} onChange={e => setManualConfig({...manualConfig, primaryCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 1 (Eixo Y)
                  <select value={manualConfig.primaryMetric || series1Key} onChange={e => setManualConfig({...manualConfig, primaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 2 (Opcional)
                  <select value={manualConfig.secondaryMetric || series2Key} onChange={e => setManualConfig({...manualConfig, secondaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">Nenhuma</option>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'donut' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Donut
                  <select value={manualConfig.donutCategory || donutCategoryHeader} onChange={e => setManualConfig({...manualConfig, donutCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'radar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Radar
                  <select value={manualConfig.radarCategory || radarCategoryHeader} onChange={e => setManualConfig({...manualConfig, radarCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'area' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Data (Eixo X)
                  <select value={manualConfig.primaryDate || dateHeader} onChange={e => setManualConfig({...manualConfig, primaryDate: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica (Eixo Y)
                  <select value={manualConfig.areaMetric || seriesAreaKey} onChange={e => setManualConfig({...manualConfig, areaMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setEditingChart(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ff9800', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Pronto</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXIBIÇÃO DA QUERY SQL ADAPTATIVA */}
      {showSqlModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#0f172a', color: '#f8fafc', width: '90%', maxWidth: '800px',
            maxHeight: '85vh', borderRadius: '16px', padding: '24px',
            border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Table size={22} style={{ color: '#38bdf8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Query SQL Adaptativa Gerada pelo Sistema</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Esta View SQL é construída dinamicamente com base nas regras de tratamento do cliente.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#020617', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <pre style={{ margin: 0, fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '13px', color: '#38bdf8', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {adaptiveSqlQuery || '-- Nenhuma Query SQL gerada para esta planilha.'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(adaptiveSqlQuery);
                  alert('Query SQL copiada para a área de transferência!');
                }}
                style={{
                  background: '#1e293b', color: '#f8fafc', border: '1px solid #334155',
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                }}
              >
                Copiar SQL
              </button>
              <button 
                onClick={() => setShowSqlModal(false)}
                style={{
                  background: '#0284c7', color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
