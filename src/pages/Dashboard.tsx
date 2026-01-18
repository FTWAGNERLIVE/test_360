import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, FileText, BarChart3, MessageCircle, Clock, CheckCircle2, HelpCircle, Send, X } from 'lucide-react'
import CSVUploader from '../components/CSVUploader'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import { sendSupportMessage } from '../services/supportService'
import { saveCSVData, loadCSVData, deleteCSVData } from '../services/csvService'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSuccess, setSupportSuccess] = useState(false)
  const [loadingCSV, setLoadingCSV] = useState(true)

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id) {
        setLoadingCSV(false)
        return
      }

      try {
        // Primeiro tentar carregar do Firestore
        try {
          const firestoreData = await loadCSVData()
          if (firestoreData && firestoreData.csvData.length > 0 && firestoreData.csvHeaders.length > 0) {
            console.log('✅ Dados do CSV carregados do Firestore')
            setCsvData(firestoreData.csvData)
            setCsvHeaders(firestoreData.csvHeaders)
            setShowSavedMessage(true)
            setTimeout(() => setShowSavedMessage(false), 5000)
            
            // Sincronizar com localStorage como cache
            localStorage.setItem(`csvData_${user.id}`, JSON.stringify(firestoreData.csvData))
            localStorage.setItem(`csvHeaders_${user.id}`, JSON.stringify(firestoreData.csvHeaders))
            
            setLoadingCSV(false)
            return
          }
        } catch (firestoreError) {
          console.warn('⚠️ Erro ao carregar do Firestore, tentando localStorage:', firestoreError)
        }

        // Fallback: tentar carregar do localStorage
        const savedData = localStorage.getItem(`csvData_${user.id}`)
        const savedHeaders = localStorage.getItem(`csvHeaders_${user.id}`)
        
        if (savedData && savedHeaders) {
          try {
            const parsedData = JSON.parse(savedData)
            const parsedHeaders = JSON.parse(savedHeaders)
            
            if (parsedData.length > 0 && parsedHeaders.length > 0) {
              console.log('✅ Dados do CSV carregados do localStorage')
              setCsvData(parsedData)
              setCsvHeaders(parsedHeaders)
              setShowSavedMessage(true)
              setTimeout(() => setShowSavedMessage(false), 5000)
              
              // Tentar sincronizar com Firestore em background
              try {
                await saveCSVData(parsedData, parsedHeaders)
                console.log('✅ Dados sincronizados com Firestore')
              } catch (syncError) {
                console.warn('⚠️ Erro ao sincronizar com Firestore:', syncError)
              }
            }
          } catch (error) {
            console.error('Erro ao carregar dados salvos:', error)
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
    
    // Salvar dados no localStorage (cache local)
    if (user?.id) {
      localStorage.setItem(`csvData_${user.id}`, JSON.stringify(data))
      localStorage.setItem(`csvHeaders_${user.id}`, JSON.stringify(headers))
    }
    
    // Salvar no Firestore (sincronização entre dispositivos)
    try {
      await saveCSVData(data, headers, fileName, fileContent)
      console.log('✅ Dados do CSV salvos no Firestore com sucesso!')
    } catch (error: any) {
      console.error('❌ Erro ao salvar no Firestore:', error)
      // Não bloquear o usuário se falhar - os dados já estão no localStorage
      console.warn('⚠️ Dados salvos apenas localmente. Tente novamente mais tarde.')
    }
    
    setShowSavedMessage(false)
  }

  const handleClearData = async () => {
    setCsvData([])
    setCsvHeaders([])
    
    // Remover dados salvos do localStorage
    if (user?.id) {
      localStorage.removeItem(`csvData_${user.id}`)
      localStorage.removeItem(`csvHeaders_${user.id}`)
    }
    
    // Remover dados do Firestore
    try {
      await deleteCSVData()
      console.log('✅ Dados do CSV removidos do Firestore')
    } catch (error: any) {
      console.error('❌ Erro ao remover do Firestore:', error)
      // Não bloquear o usuário se falhar
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
          <BarChart3 size={28} />
          <h1>Farol 360</h1>
          <span className="company-name">por Creattive</span>
        </div>
        <div className="header-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={logout} className="logout-button">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {user?.role === 'user' && (
          <div className="test-notice">
            <Clock size={16} />
            <span>Período de teste: 15 dias</span>
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
                <h2>Faça upload do seu arquivo CSV</h2>
                <p>Envie seus dados para análise inteligente com IA</p>
                <CSVUploader 
                  onFileUploaded={handleFileUploaded} 
                  onboardingData={user?.onboardingData}
                />
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
                <DataVisualization data={csvData} headers={csvHeaders} />
              </div>
            </>
          )}
        </div>

        <div className="dashboard-actions">
          {csvData.length > 0 && (
            <button
              className="chat-toggle"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle size={24} />
              {showChat ? 'Ocultar' : 'Abrir'} Chat
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
          <ChatBot data={csvData} headers={csvHeaders} />
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
