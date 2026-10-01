import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  FileText, Clock, CheckCircle2, HelpCircle, 
  Send, X, Plus,
  Share2, ThumbsUp, Star, Users, Activity, Briefcase, TrendingUp, ShoppingCart, Target, Heart, CheckCircle
, Settings, Lock
, Table, Sparkles } from 'lucide-react'
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
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardHeader from '../components/DashboardHeader';


import { useChartData } from '../hooks/useChartData';



// Helper para limpeza e conversão de números (moeda PT-BR, pontos, vírgulas)
const ICON_MAP: Record<string, React.ElementType> = {
  Users, Activity, Briefcase, TrendingUp, ShoppingCart,
  FileText, CheckCircle, Target, Heart, Clock,
  Share2, ThumbsUp, Star
};









export default function Dashboard({ isSharedView = false }: { isSharedView?: boolean }) {
  const { user, impersonatedUser, impersonateUser, updateProfile } = useAuth()
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

  const {
    numericHeaders,
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
  } = useChartData({
    activeData,
    csvHeaders,
    csvData,
    effectiveDiscovery,
    manualConfig,
    timeGranularity
  });

  return (
    <div className="dashboard-layout">
      {/* ===== SIDEBAR ESQUERDA (ESTILO AZUL MARINHO REFERÊNCIA) ===== */}
      {!isSharedView && (
        <DashboardSidebar
          isSidebarOpen={isSidebarOpen}
          effectiveUser={effectiveUser}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          setIsAddingNew={setIsAddingNew}
        />
      )}

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <div className="dashboard-main-area">
        {/* CABEÇALHO DA DASHBOARD */}
        <DashboardHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSharedView={isSharedView}
          setShowShareModal={setShowShareModal}
          effectiveUser={effectiveUser}
          isImpersonating={isImpersonating}
        />

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
                {statCardsData.cards.map((card: any, index: number) => {
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
                          {donutInfo.data.map((entry: any, index: number) => (
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
                    {csvHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 1 (Eixo Y)
                  <select value={manualConfig.primaryMetric || series1Key} onChange={e => setManualConfig({...manualConfig, primaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 2 (Opcional)
                  <select value={manualConfig.secondaryMetric || series2Key} onChange={e => setManualConfig({...manualConfig, secondaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">Nenhuma</option>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'donut' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Donut
                  <select value={manualConfig.donutCategory || donutCategoryHeader} onChange={e => setManualConfig({...manualConfig, donutCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'radar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Radar
                  <select value={manualConfig.radarCategory || radarCategoryHeader} onChange={e => setManualConfig({...manualConfig, radarCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editingChart === 'area' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Data (Eixo X)
                  <select value={manualConfig.primaryDate || dateHeader} onChange={e => setManualConfig({...manualConfig, primaryDate: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {csvHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica (Eixo Y)
                  <select value={manualConfig.areaMetric || seriesAreaKey} onChange={e => setManualConfig({...manualConfig, areaMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Registros">Quantidade de Registros</option>
                    {numericHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
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
