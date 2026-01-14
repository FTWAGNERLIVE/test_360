import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Download, User, Building2, Phone, Mail, Calendar, FileText } from 'lucide-react'
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
}

export default function Admin() {
  const { user, logout, getAllOnboardingData } = useAuth()
  const navigate = useNavigate()
  const [onboardingData, setOnboardingData] = useState<OnboardingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    
    const data = getAllOnboardingData()
    setOnboardingData(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
  }, [user, getAllOnboardingData, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
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

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>Painel Administrativo - Farol 360</h1>
            <p>Creattive - Gestão de Usuários</p>
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
              <h3>Total de Usuários</h3>
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
          <button onClick={handleExportCSV} className="export-button">
            <Download size={20} />
            Exportar para CSV
          </button>
        </div>

        <div className="admin-table-container">
          {filteredData.length === 0 ? (
            <div className="empty-state">
              <User size={48} />
              <p>Nenhum dado de onboarding encontrado</p>
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
