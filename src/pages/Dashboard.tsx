import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, FileText, Search, Sparkles, Clock, CheckCircle2, HelpCircle, Send, X, LayoutDashboard, Plus } from 'lucide-react'
import CSVUploader from '../components/CSVUploader'
import GoogleSheetsImporter from '../components/GoogleSheetsImporter'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import { sendSupportMessage } from '../services/supportService'
import { saveCSVData, deleteCSVData, listUserFiles, loadFileById } from '../services/csvService'
import { isTrialExpired, getTrialDaysRemaining } from '../services/authService'
import { getSmartDiscovery } from '../services/groqService'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout, impersonatedUser, impersonateUser } = useAuth()
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
        // Ordenar por data (mais recente primeiro) no cliente para evitar necessidade de índice no Firestore
        const sortedFiles = [...files].sort((a, b) => {
          const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
          const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
          return dateB - dateA
        })
        setUserFiles(sortedFiles)

        if (sortedFiles.length > 0) {
          setActiveFileId(sortedFiles[0].id)
          const fileData = await loadFileById(files[0].id)
          if (fileData) {
            setCsvData(fileData.csvData)
            setCsvHeaders(fileData.csvHeaders)
            setSmartDiscovery(fileData.smartDiscovery)
          } else {
            // Se falhou ao carregar o arquivo específico, tenta resetar
            setIsAddingNew(true)
          }
        } else {
          // Se não tem nenhum arquivo, força o modo de adição
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
    // Verificar limite de arquivos do plano
    const planLimits: Record<string, number> = {
      'free': 1,
      'basic': 2,
      'plus': 4,
      'pro': 8
    }
    
    const userPlan = user?.plan || 'free'
    const limit = planLimits[userPlan] || 1
    
    // Se não estivermos criando uma aba nova (isAddingNew = false), 
    // significa que estamos substituindo os dados da aba atual (activeFileId).
    const isReplacing = !isAddingNew && activeFileId !== null;

    if (!isReplacing && userFiles.length >= limit && !isImpersonating) {
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
      
      // Passar o activeFileId se for uma substituição
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
      await deleteCSVData(fileId)
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
      'free': 1,
      'basic': 2,
      'plus': 4,
      'pro': 8
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
    if (!supportSubject.trim() || !supportMessage.trim() || !user) {
      return
    }

    setSupportLoading(true)
    setSupportSuccess(false)

    try {
      await sendSupportMessage(
        user.id,
        user.email,
        user.name,
        supportSubject,
        supportMessage
      )
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-wrapper">
            <Search size={28} className="logo-icon" />
            <Sparkles size={14} className="logo-sparkle" />
          </div>
          <h1>Lupa <span className="brand-accent">Analytics AI</span></h1>
        </div>
        <div className="header-right">
          {user?.role === 'admin' && !isImpersonating && (
            <button 
              onClick={() => window.location.href = '/admin'} 
              className="back-admin-header-btn"
              title="Voltar ao Painel Administrativo"
            >
              <LayoutDashboard size={20} />
              Voltar ao Admin
            </button>
          )}

          <div className="profile-dropdown-container">
            <button 
              className="profile-trigger" 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="user-avatar">{effectiveUser?.name?.charAt(0).toUpperCase()}</div>
              <span className="user-name">{effectiveUser?.name}</span>
            </button>
            
            {showProfileDropdown && (
              <div className="profile-dropdown-menu">
                <div className="profile-header">
                  <strong>{effectiveUser?.name}</strong>
                  <span>{effectiveUser?.email}</span>
                </div>
                
                <div className="profile-plan">
                  <span>Plano Atual:</span>
                  {user?.role === 'user' ? (
                    <span className={`plan-badge ${user?.plan || 'free'}`}>
                      {user?.plan?.toUpperCase() || 'GRÁTIS'}
                    </span>
                  ) : (
                    <span className="admin-badge">Admin</span>
                  )}
                </div>

                {user?.role === 'user' && user?.plan !== 'pro' && (
                  <button 
                    onClick={() => window.location.href = '/pricing'} 
                    className="dropdown-upgrade-btn"
                  >
                    <Sparkles size={16} />
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

      {isImpersonating && (
        <div className="impersonation-banner">
          <div className="banner-content">
            <div className="banner-text">
              <Clock size={18} />
              <span>Você está visualizando o dashboard de: <strong>{effectiveUser?.name}</strong> ({effectiveUser?.email})</span>
            </div>
            <button 
              className="back-to-admin-btn"
              onClick={async () => {
                await impersonateUser(null)
                // Redirecionar para admin será automático pelo App.tsx ou podemos navegar
                window.location.href = '/admin'
              }}
            >
              Voltar ao Admin
            </button>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        {user?.role === 'user' && !user?.isPro && (
          <div className={`test-notice ${user?.trialEndDate && isTrialExpired(new Date(user.trialEndDate)) ? 'expired' : ''}`}>
            <Clock size={16} />
            <span>
              {user?.trialEndDate && !isTrialExpired(new Date(user.trialEndDate)) 
                ? `Você está no período de teste: ${getTrialDaysRemaining(new Date(user.trialEndDate))} dias restantes` 
                : 'Seu período de teste expirou. Você está no plano Base limitado.'}
            </span>
          </div>
        )}
        
        
        <div className="dashboard-content">
          {loadingCSV ? (
            <div className="upload-section">
              <div className="upload-card">
                <div className="spinner"></div>
                <p>Carregando seus dados...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de Abas Estilo Navegador */}
              {(userFiles.length > 0 || isAddingNew) && (
                <div className="dashboard-tabs-container">
                  <div className="tabs-scroll">
                    {userFiles.map(file => (
                      <div 
                        key={file.id} 
                        className={`file-tab-item ${activeFileId === file.id && !isAddingNew ? 'active' : ''}`}
                        onClick={() => handleSwitchFile(file.id)}
                      >
                        <FileText size={14} className="tab-icon" />
                        <span>{file.fileName || 'Planilha sem nome'}</span>
                        <button 
                          className="tab-close-btn"
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          title="Remover planilha"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    
                    {/* Botão de Adicionar Nova Aba (+) */}
                    {(() => {
                      const planLimits: Record<string, number> = {
                        'free': 1, 'basic': 2, 'plus': 4, 'pro': 8
                      }
                      const plan = user?.plan || 'free'
                      const limit = planLimits[plan] || 1
                      const atLimit = userFiles.length >= limit
                      
                      if (plan === 'free' && atLimit && !isImpersonating) {
                        return (
                          <button 
                            className="add-tab-btn faded"
                            onClick={() => alert("O plano FREE permite apenas 1 aba. Faça upgrade para adicionar mais!")}
                            title="Limite do plano FREE atingido"
                          >
                            <Plus size={18} />
                          </button>
                        )
                      }

                      if (userFiles.length < limit || isImpersonating) {
                        return (
                          <button 
                            className={`add-tab-btn ${isAddingNew ? 'active' : ''}`}
                            onClick={handleAddNewTab}
                            title="Adicionar nova análise"
                          >
                            <Plus size={18} />
                          </button>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              )}

              {/* Conteúdo da Aba (Upload ou Visualização) */}
              {(csvData.length === 0 || isAddingNew) ? (
                <div className="upload-section">
                  <div className="upload-card">
                    <div className="upload-header">
                      <Sparkles size={32} className="upload-sparkle" />
                      <h2>{isAddingNew ? 'Adicionar Nova Planilha' : 'Conecte seus dados'}</h2>
                      <p>Sua IA está pronta para analisar mais um dataset.</p>
                    </div>
                    
                    <div className="import-method-tabs">
                      <button 
                        className={`method-tab ${importMethod === 'file' ? 'active' : ''}`}
                        onClick={() => setImportMethod('file')}
                      >
                        Arquivo CSV
                      </button>
                      <button 
                        className={`method-tab ${importMethod === 'url' ? 'active' : ''}`}
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
                        className="cancel-upload-btn"
                        onClick={() => handleSwitchFile(userFiles[0].id)}
                      >
                        Cancelar e Voltar
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="data-section">
                  {loadingInsights ? (
                    <div className="processing-data-loader">
                      <div className="spinner-large"></div>
                      <h2>Fase de Análise Profunda...</h2>
                      <p>Nossa IA está lendo uma amostra expandida (10 registros) para garantir 100% de precisão.</p>
                      <div className="loading-steps">
                        <span>✓ Leitura de Dados</span>
                        <span className="active">○ Análise Estrutural</span>
                        <span>○ Montagem Inteligente</span>
                      </div>
                    </div>
                  ) : (
                    <div className="visualization-container-fade">
                      <DataVisualization 
                        data={csvData} 
                        headers={csvHeaders} 
                        smartMapping={smartDiscovery?.columnMapping}
                        insightsComponent={
                          smartDiscovery && smartDiscovery.insights ? (
                            <div className="smart-insights-section" style={{ marginTop: '24px' }}>
                              <div className="insights-header">
                                <Sparkles size={20} className="sparkle-icon" />
                                <h3>Insights da Lupa</h3>
                              </div>
                              <div className="insights-grid">
                                {smartDiscovery.insights.slice(0, 
                                  user?.role === 'admin' || user?.role === 'vendas' ? 10 :
                                  (user?.plan === 'pro' ? 6 :
                                   user?.plan === 'plus' ? 3 :
                                   user?.plan === 'basic' ? 2 : 1)
                                ).map((insight: string, idx: number) => (
                                  <div key={idx} className="insight-card">
                                    <div className="insight-number">{idx + 1}</div>
                                    <p>{insight}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="dashboard-actions">
          {csvData.length > 0 && (
            <button
              className={`chat-toggle ${showChat ? 'active' : ''}`}
              onClick={() => setShowChat(!showChat)}
            >
              <div className="chat-toggle-icon">
                <Search size={24} />
              </div>
              <span className="chat-toggle-text">
                {showChat ? 'Ocultar Chat' : 'Converse com a Lupa'}
              </span>
            </button>
          )}

          <button
            className="support-toggle"
            onClick={() => setShowSupport(!showSupport)}
          >
            <div className="support-toggle-icon">
              <HelpCircle size={24} />
            </div>
            <span className="support-toggle-text">
              {showSupport ? 'Fechar' : 'Suporte'}
            </span>
          </button>
        </div>

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
                      placeholder="Ex: Problema com upload de arquivo"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="supportMessage">Mensagem</label>
                    <textarea
                      id="supportMessage"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Descreva seu problema ou dúvida..."
                      rows={6}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="send-support-btn"
                    disabled={supportLoading || !supportSubject.trim() || !supportMessage.trim()}
                  >
                    <Send size={18} />
                    {supportLoading ? 'Enviando...' : 'Enviar Mensagem'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
