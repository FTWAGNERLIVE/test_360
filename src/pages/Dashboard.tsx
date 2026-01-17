import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, FileText, BarChart3, MessageCircle, Clock, CheckCircle2, HelpCircle, Send, X } from 'lucide-react'
import CSVUploader from '../components/CSVUploader'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import { sendSupportMessage } from '../services/supportService'
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

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    if (user?.id) {
      const savedData = localStorage.getItem(`csvData_${user.id}`)
      const savedHeaders = localStorage.getItem(`csvHeaders_${user.id}`)
      
      if (savedData && savedHeaders) {
        try {
          const parsedData = JSON.parse(savedData)
          const parsedHeaders = JSON.parse(savedHeaders)
          
          if (parsedData.length > 0 && parsedHeaders.length > 0) {
            setCsvData(parsedData)
            setCsvHeaders(parsedHeaders)
            setShowSavedMessage(true)
            
            // Ocultar mensagem após 5 segundos
            setTimeout(() => setShowSavedMessage(false), 5000)
          }
        } catch (error) {
          console.error('Erro ao carregar dados salvos:', error)
        }
      }
    }
  }, [user?.id])

  const handleFileUploaded = (data: any[], headers: string[]) => {
    setCsvData(data)
    setCsvHeaders(headers)
    
    // Salvar dados no localStorage
    if (user?.id) {
      localStorage.setItem(`csvData_${user.id}`, JSON.stringify(data))
      localStorage.setItem(`csvHeaders_${user.id}`, JSON.stringify(headers))
    }
    
    setShowSavedMessage(false)
  }

  const handleClearData = () => {
    setCsvData([])
    setCsvHeaders([])
    
    // Remover dados salvos
    if (user?.id) {
      localStorage.removeItem(`csvData_${user.id}`)
      localStorage.removeItem(`csvHeaders_${user.id}`)
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
        <div className="test-notice">
          <Clock size={16} />
          <span>Período de teste: 15 dias</span>
        </div>
        
        {showSavedMessage && (
          <div className="saved-data-notice">
            <CheckCircle2 size={20} />
            <span>Dados carregados automaticamente da sua última sessão</span>
          </div>
        )}
        
        <div className="dashboard-content">
          {csvData.length === 0 ? (
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
