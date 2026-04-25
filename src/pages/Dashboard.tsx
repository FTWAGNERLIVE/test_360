import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, FileText, Search, Sparkles, Clock, CheckCircle2, HelpCircle, Send, X, LayoutDashboard } from 'lucide-react'
import CSVUploader from '../components/CSVUploader'
import GoogleSheetsImporter from '../components/GoogleSheetsImporter'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import { sendSupportMessage } from '../services/supportService'
import { saveCSVData, loadCSVData, deleteCSVData } from '../services/csvService'
import { createPaymentLink } from '../services/paymentService'
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
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSuccess, setSupportSuccess] = useState(false)
  const [loadingCSV, setLoadingCSV] = useState(true)
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const effectiveUser = impersonatedUser || user
  const isImpersonating = !!impersonatedUser

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    const loadSavedData = async () => {
      if (!effectiveUser?.id) {
        setLoadingCSV(false)
        return
      }

      try {
        // Primeiro tentar carregar do Firestore
        try {
          const firestoreData = await loadCSVData(effectiveUser.id)
          if (firestoreData && firestoreData.csvData.length > 0 && firestoreData.csvHeaders.length > 0) {
            // console.log('✅ CSV carregado')
            setCsvData(firestoreData.csvData)
            setCsvHeaders(firestoreData.csvHeaders)
            setShowSavedMessage(true)
            setTimeout(() => setShowSavedMessage(false), 5000)
            
            // Disparar Smart Discovery para dados do Firestore
            setLoadingInsights(true)
            getSmartDiscovery(firestoreData.csvHeaders, firestoreData.csvData, effectiveUser?.onboardingData)
              .then(setSmartDiscovery)
              .catch((err: any) => console.error("Erro no Smart Discovery:", err))
              .finally(() => setLoadingInsights(false))

            // Sincronizar com localStorage como cache (apenas se for o próprio usuário)
            if (!isImpersonating && effectiveUser?.id) {
              localStorage.setItem(`csvData_${effectiveUser.id}`, JSON.stringify(firestoreData.csvData))
              localStorage.setItem(`csvHeaders_${effectiveUser.id}`, JSON.stringify(firestoreData.csvHeaders))
            }
            
            setLoadingCSV(false)
            return
          }
        } catch (firestoreError) {
          console.warn('⚠️ Erro ao carregar do Firestore, tentando localStorage:', firestoreError)
        }

        // Fallback: tentar carregar do localStorage (apenas para o próprio usuário)
        if (!isImpersonating && effectiveUser?.id) {
          const savedData = localStorage.getItem(`csvData_${effectiveUser.id}`)
          const savedHeaders = localStorage.getItem(`csvHeaders_${effectiveUser.id}`)
          
          if (savedData && savedHeaders) {
            try {
              const parsedData = JSON.parse(savedData)
              const parsedHeaders = JSON.parse(savedHeaders)
              
                if (parsedData.length > 0 && parsedHeaders.length > 0) {
                  // console.log('✅ Cache carregado')
                  setCsvData(parsedData)
                  setCsvHeaders(parsedHeaders)
                  setShowSavedMessage(true)
                  setTimeout(() => setShowSavedMessage(false), 5000)
                  
                  // Disparar Smart Discovery para dados carregados
                  setLoadingInsights(true)
                  getSmartDiscovery(parsedHeaders, parsedData, effectiveUser?.onboardingData)
                    .then(setSmartDiscovery)
                    .catch((err: any) => console.error("Erro no Smart Discovery:", err))
                    .finally(() => setLoadingInsights(false))

                  // Tentar sincronizar com Firestore em background
                  try {
                    await saveCSVData(parsedData, parsedHeaders)
                    // console.log('✅ Sincronizado')
                  } catch (syncError) {
                    console.warn('⚠️ Erro ao sincronizar com Firestore:', syncError)
                  }
                }
            } catch (error) {
              console.error('Erro ao carregar dados salvos:', error)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingCSV(false)
      }
    }

    loadSavedData()
  }, [user?.id])

  const handleFileUploaded = async (data: any[], headers: string[], fileName?: string, fileContent?: string) => {
    setCsvData(data)
    setCsvHeaders(headers)
    
    // Salvar dados no localStorage (cache local) - apenas se for o próprio usuário
    if (effectiveUser?.id && !isImpersonating) {
      localStorage.setItem(`csvData_${effectiveUser.id}`, JSON.stringify(data))
      localStorage.setItem(`csvHeaders_${effectiveUser.id}`, JSON.stringify(headers))
    }
    
    // Salvar no Firestore
    try {
      await saveCSVData(data, headers, fileName, fileContent, effectiveUser?.id)
      // console.log('✅ Salvo')
    } catch (error: any) {
      console.error('❌ Erro ao salvar no Firestore:', error)
    }
    
    setShowSavedMessage(false)

    // Iniciar Smart Discovery (Insights Iniciais)
    if (data.length > 0) {
      setLoadingInsights(true)
      try {
        const discovery = await getSmartDiscovery(headers, data, effectiveUser?.onboardingData)
        setSmartDiscovery(discovery)
      } catch (err: any) {
        console.error("Erro no Smart Discovery:", err)
      } finally {
        setLoadingInsights(false)
      }
    }
  }

  const handleClearData = async () => {
    setCsvData([])
    setCsvHeaders([])
    setSmartDiscovery(null)
    
    // Remover dados salvos do localStorage - apenas se for o próprio usuário
    if (effectiveUser?.id && !isImpersonating) {
      localStorage.removeItem(`csvData_${effectiveUser.id}`)
      localStorage.removeItem(`csvHeaders_${effectiveUser.id}`)
    }
    
    // Remover dados do Firestore
    try {
      await deleteCSVData(effectiveUser?.id)
      // console.log('✅ Removido')
    } catch (error: any) {
      console.error('❌ Erro ao remover do Firestore:', error)
    }
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
                    user?.isPro ? (
                      <span className="pro-badge-large">PRO</span>
                    ) : (
                      user?.trialEndDate && !isTrialExpired(new Date(user.trialEndDate)) ? (
                        <span className="trial-badge">Teste Grátis</span>
                      ) : (
                        <span className="base-badge">Base</span>
                      )
                    )
                  ) : (
                    <span className="admin-badge">Admin</span>
                  )}
                </div>

                {user?.role === 'user' && !user?.isPro && (
                  <button 
                    onClick={() => createPaymentLink('pro')} 
                    className="dropdown-upgrade-btn"
                  >
                    <Sparkles size={16} />
                    {user?.trialEndDate && !isTrialExpired(new Date(user.trialEndDate)) ? 'Ativar Plano PRO' : 'Fazer Upgrade para PRO'}
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
        
        {showSavedMessage && (
          <div className="saved-data-notice">
            <CheckCircle2 size={20} />
            <span>Dados carregados automaticamente da sua última sessão</span>
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
          ) : csvData.length === 0 ? (
            <div className="upload-section">
              <div className="upload-card">
                <FileText size={48} className="upload-icon" />
                <h2>Conecte seus dados</h2>
                <p>Escolha como deseja enviar seus dados para análise inteligente</p>
                
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
              </div>
            </div>
          ) : (
            <>
              <div className="data-section">
                <div className="section-header">
                  <h2>Visualização dos Dados</h2>
                  <button
                    onClick={handleClearData}
                    className="btn-secondary"
                  >
                    Carregar Novo Arquivo
                  </button>
                </div>

                {/* Seção de Insights da Lupa */}
                {(loadingInsights || (smartDiscovery && smartDiscovery.insights)) && (
                  <div className="smart-insights-section">
                    <div className="insights-header">
                      <Sparkles size={20} className="sparkle-icon" />
                      <h3>Insights da Lupa</h3>
                      {loadingInsights && <div className="insights-loader"></div>}
                    </div>
                    
                    {loadingInsights ? (
                      <div className="insights-skeleton">
                        <div className="skeleton-item"></div>
                        <div className="skeleton-item"></div>
                        <div className="skeleton-item"></div>
                      </div>
                    ) : (
                      <div className="insights-grid">
                        {smartDiscovery?.insights?.map((insight: string, idx: number) => (
                          <div key={idx} className="insight-card">
                            <div className="insight-number">{idx + 1}</div>
                            <p>{insight}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <DataVisualization 
                  data={csvData} 
                  headers={csvHeaders} 
                  smartMapping={smartDiscovery?.columnMapping}
                />
              </div>
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
            <HelpCircle size={24} />
            {showSupport ? 'Fechar' : 'Suporte'}
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
