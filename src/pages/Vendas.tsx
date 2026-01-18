import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Download, User, Building2, Phone, Mail, Calendar, FileText, RefreshCw } from 'lucide-react'
import { getAllOnboardingData as getFirestoreData, updateClientStatus, ClientStatus } from '../services/firestoreService'
import './Admin.css'

interface OnboardingRecord {
  userId: string
  email: string
  timestamp: string
  companyName: string
  industry: string
  dataSource: string
  goals: string[]
  specificQuestions: string
  contact: string
  status?: ClientStatus
  id?: string
}

export default function Vendas() {
  const { user, logout, getAllOnboardingData } = useAuth()
  const navigate = useNavigate()
  const [onboardingData, setOnboardingData] = useState<OnboardingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const loadData = async () => {
    if (!user || user.role !== 'vendas') {
      navigate('/login')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Tentar buscar do Firebase primeiro
      try {
        const firestoreData = await getFirestoreData()
        if (firestoreData && firestoreData.length > 0) {
          const formattedData = firestoreData.map(item => ({
            ...item,
            timestamp: item.timestamp instanceof Date 
              ? item.timestamp.toISOString() 
              : typeof item.timestamp === 'string' 
                ? item.timestamp 
                : new Date().toISOString()
          }))
          setOnboardingData(formattedData.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ))
          setLoading(false)
          return
        }
      } catch (firebaseError) {
        console.error('Erro ao carregar dados:', firebaseError)
        // Tentar buscar do contexto como fallback
        try {
          const contextData = await getAllOnboardingData()
          setOnboardingData(contextData.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ))
        } catch (err) {
          console.error('Erro ao buscar dados do contexto:', err)
          setError('Erro ao carregar dados. Tente novamente.')
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleStatusChange = async (onboardingId: string, newStatus: ClientStatus) => {
    if (!onboardingId) {
      alert('ID do registro não encontrado')
      return
    }

    setUpdatingStatus(onboardingId)
    try {
      await updateClientStatus(onboardingId, newStatus)
      
      // Atualizar estado local
      setOnboardingData(prev => prev.map(item => 
        item.id === onboardingId ? { ...item, status: newStatus } : item
      ))
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err)
      alert(err.message || 'Erro ao atualizar status. Tente novamente.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Email', 'Nome da Empresa', 'Setor', 'Fonte de Dados', 'Objetivos', 'Perguntas Específicas', 'Telefone']
    const rows = filteredData.map(record => [
      new Date(record.timestamp).toLocaleString('pt-BR'),
      record.email,
      record.companyName,
      record.industry,
      record.dataSource,
      record.goals.join('; '),
      record.specificQuestions,
      record.contact
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `farol360-usuarios-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredData = onboardingData.filter(record =>
    record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.industry.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role !== 'vendas') {
    return null
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>Painel de Vendas - Farol 360</h1>
            <p>Creattive - Gestão de Clientes</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-stats">
          <div className="stat-card">
            <User size={24} />
            <div>
              <h3>Total de Clientes</h3>
              <p>{onboardingData.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <Building2 size={24} />
            <div>
              <h3>Empresas Cadastradas</h3>
              <p>{new Set(onboardingData.map(r => r.companyName)).size}</p>
            </div>
          </div>
        </div>

        <div className="admin-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por email, empresa ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="action-buttons">
            <button onClick={loadData} className="refresh-button" disabled={loading}>
              <RefreshCw size={20} className={loading ? 'spinning' : ''} />
              Atualizar
            </button>
            <button onClick={handleExportCSV} className="export-button">
              <Download size={20} />
              Exportar para CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="admin-table-container">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={48} className="spinning" />
              <p>Carregando dados...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="empty-state">
              <User size={48} />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Email</th>
                  <th>Empresa</th>
                  <th>Setor</th>
                  <th>Fonte de Dados</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Objetivos</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((record, index) => (
                  <tr key={`${record.userId}-${index}`}>
                    <td>
                      <div className="table-cell">
                        <Calendar size={14} />
                        {new Date(record.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell">
                        <Mail size={14} />
                        {record.email}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell">
                        <Building2 size={14} />
                        {record.companyName}
                      </div>
                    </td>
                    <td>{record.industry}</td>
                    <td>{record.dataSource}</td>
                    <td>
                      <div className="table-cell">
                        <Phone size={14} />
                        {record.contact}
                      </div>
                    </td>
                    <td>
                      <select
                        value={record.status || 'pendente'}
                        onChange={(e) => handleStatusChange(record.id || '', e.target.value as ClientStatus)}
                        disabled={updatingStatus === record.id || !record.id}
                        className="status-select"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontSize: '14px',
                          cursor: updatingStatus === record.id ? 'wait' : 'pointer',
                          opacity: updatingStatus === record.id ? 0.6 : 1
                        }}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_atendimento">Em Atendimento</option>
                        <option value="proposta_enviada">Proposta Enviada</option>
                        <option value="fechado">Fechado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      {updatingStatus === record.id && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Atualizando...</span>
                      )}
                    </td>
                    <td>
                      <div className="goals-list">
                        {record.goals.map((goal, i) => (
                          <span key={i} className="goal-tag">{goal}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {record.specificQuestions && (
                        <div className="details-cell" title={record.specificQuestions}>
                          <FileText size={14} />
                          <span>Ver</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
