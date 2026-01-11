import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, Upload, FileText, BarChart3, MessageCircle, Clock } from 'lucide-react'
import CSVUploader from '../components/CSVUploader'
import DataVisualization from '../components/DataVisualization'
import ChatBot from '../components/ChatBot'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)

  const handleFileUploaded = (data: any[], headers: string[]) => {
    setCsvData(data)
    setCsvHeaders(headers)
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
        <div className="dashboard-content">
          {csvData.length === 0 ? (
            <div className="upload-section">
              <div className="upload-card">
                <FileText size={48} className="upload-icon" />
                <h2>Faça upload do seu arquivo CSV</h2>
                <p>Envie seus dados para análise inteligente com IA</p>
                <CSVUploader onFileUploaded={handleFileUploaded} />
              </div>
            </div>
          ) : (
            <>
              <div className="data-section">
                <div className="section-header">
                  <h2>Visualização dos Dados</h2>
                  <button
                    onClick={() => setCsvData([])}
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

        {csvData.length > 0 && (
          <button
            className="chat-toggle"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageCircle size={24} />
            {showChat ? 'Ocultar' : 'Abrir'} Chat
          </button>
        )}

        {showChat && csvData.length > 0 && (
          <ChatBot data={csvData} headers={csvHeaders} />
        )}
      </main>
    </div>
  )
}
