import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Download, User, Building2, Phone, Mail, Calendar, FileText, RefreshCw, Key, Clock, AlertTriangle, CheckCircle, MessageSquare, Users, Shield, Eye, XCircle, UserPlus, Database } from 'lucide-react'
import { getAllOnboardingData as getFirestoreData, ClientStatus } from '../services/firestoreService'
import { getAllSupportMessages, updateSupportMessageStatus, SupportMessage } from '../services/supportService'
import { createAccount, updateUserData } from '../services/authService'
import { executeMigration, isFirebaseReady, isMigrationCompleted } from '../services/migrationService'
import { db } from '../config/firebase'
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

interface UserAccount {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendas' | 'user'
  onboardingCompleted: boolean
  trialEndDate?: Date
  createdAt?: Date
}

export default function Admin() {
  const { user, logout, getAllOnboardingData, getAllUsers, resetUserPassword, isTrialExpired, getTrialDaysRemaining } = useAuth()
  const navigate = useNavigate()
  const [onboardingData, setOnboardingData] = useState<OnboardingRecord[]>([])
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'onboarding' | 'accounts' | 'support'>('onboarding')
  const [resetPasswordLoading, setResetPasswordLoading] = useState<string | null>(null)
  const [updateRoleLoading, setUpdateRoleLoading] = useState<string | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null)
  const [supportSearchTerm, setSupportSearchTerm] = useState('')
  const [showCreateVendas, setShowCreateVendas] = useState(false)
  const [newVendasEmail, setNewVendasEmail] = useState('')
  const [newVendasName, setNewVendasName] = useState('')
  const [newVendasPassword, setNewVendasPassword] = useState('')
  const [createVendasLoading, setCreateVendasLoading] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [createAdminLoading, setCreateAdminLoading] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<{
    completed: boolean
    firebaseReady: boolean
    message: string
  } | null>(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  const loadData = async () => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }

    // Se for admin temporário (sem Firebase), mostrar mensagem
    if (user.id.startsWith('temp-admin-')) {
      setError('⚠️ Modo temporário: Você está logado como admin sem Firebase. Algumas funcionalidades podem estar limitadas.')
    }

    setLoading(true)
    setError('')
    
    try {
      // Carregar dados de onboarding
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
        } else {
          // Tentar buscar do contexto
          const contextData = await getAllOnboardingData()
          setOnboardingData(contextData.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ))
        }
      } catch (firebaseError) {
        console.error('Erro ao carregar dados de onboarding:', firebaseError)
        // Tentar buscar do contexto como fallback
        try {
          const contextData = await getAllOnboardingData()
          setOnboardingData(contextData.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ))
        } catch (err) {
          console.error('Erro ao buscar dados do contexto:', err)
        }
      }

      // Carregar contas de usuários
      try {
        console.log('🔄 Carregando contas de usuários...')
        const users = await getAllUsers()
        console.log(`✅ ${users.length} contas carregadas com sucesso`)
        setUserAccounts(users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          onboardingCompleted: u.onboardingCompleted,
          trialEndDate: u.trialEndDate,
          createdAt: u.createdAt || (u.trialEndDate ? new Date(u.trialEndDate.getTime() - 15 * 24 * 60 * 60 * 1000) : undefined)
        })))
      } catch (err: any) {
        console.error('❌ Erro ao carregar usuários:', err)
        setError(`Erro ao carregar contas: ${err.message || 'Erro desconhecido'}`)
      }

      // Carregar mensagens de suporte
      try {
        const messages = await getAllSupportMessages()
        setSupportMessages(messages)
      } catch (err) {
        console.error('Erro ao carregar mensagens de suporte:', err)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setResetPasswordLoading(userId)
    try {
      await resetUserPassword(userId)
      alert('Email de recuperação de senha enviado com sucesso!')
    } catch (err: any) {
      alert(err.message || 'Erro ao resetar senha')
    } finally {
      setResetPasswordLoading(null)
    }
  }

  const handleUpdateRole = async (userId: string, currentRole: string, newRole: 'admin' | 'vendas' | 'user') => {
    if (currentRole === newRole) {
      return
    }

    if (!confirm(`Tem certeza que deseja alterar o perfil deste usuário para ${newRole === 'admin' ? 'Administrador' : newRole === 'vendas' ? 'Vendas' : 'Cliente'}?`)) {
      return
    }

    setUpdateRoleLoading(userId)
    try {
      // Calcular nova data de trial se necessário
      const updateData: any = { role: newRole }
      
      if (newRole === 'admin' || newRole === 'vendas') {
        // Admin e vendas não têm trial - definir para 10 anos
        const trialEndDate = new Date()
        trialEndDate.setFullYear(trialEndDate.getFullYear() + 10)
        updateData.trialEndDate = trialEndDate
        updateData.onboardingCompleted = true // Admin e vendas não precisam de onboarding
      } else if (currentRole === 'admin' || currentRole === 'vendas') {
        // Se estava como admin/vendas e está virando user, definir trial de 15 dias
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 15)
        updateData.trialEndDate = trialEndDate
      }

      await updateUserData(userId, updateData)
      alert(`Perfil atualizado para ${newRole === 'admin' ? 'Administrador' : newRole === 'vendas' ? 'Vendas' : 'Cliente'} com sucesso!`)
      // Recarregar dados
      await loadData()
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err)
      alert(err.message || 'Erro ao atualizar perfil do usuário')
    } finally {
      setUpdateRoleLoading(null)
    }
  }

  const handleUpdateMessageStatus = async (messageId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    try {
      await updateSupportMessageStatus(messageId, status, undefined, user?.email)
      // Recarregar mensagens
      const messages = await getAllSupportMessages()
      setSupportMessages(messages)
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(messages.find(m => m.id === messageId) || null)
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert('Erro ao atualizar status da mensagem')
    }
  }

  const handleCreateVendas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVendasEmail || !newVendasPassword || !newVendasName) {
      alert('Preencha todos os campos')
      return
    }

    // Validar senha mínima
    if (newVendasPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setCreateVendasLoading(true)
    try {
      await createAccount(newVendasEmail, newVendasPassword, newVendasName, 'vendas')
      alert('Conta de vendas criada com sucesso!')
      setNewVendasEmail('')
      setNewVendasName('')
      setNewVendasPassword('')
      setShowCreateVendas(false)
      // Recarregar dados
      await loadData()
    } catch (err: any) {
      console.error('Erro ao criar conta de vendas:', err)
      alert(err.message || 'Erro ao criar conta de vendas')
    } finally {
      setCreateVendasLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      alert('Preencha todos os campos')
      return
    }

    // Validar senha mínima
    if (newAdminPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setCreateAdminLoading(true)
    try {
      await createAccount(newAdminEmail, newAdminPassword, newAdminName, 'admin')
      alert('Conta de administrador criada com sucesso!')
      setNewAdminEmail('')
      setNewAdminName('')
      setNewAdminPassword('')
      setShowCreateAdmin(false)
      // Recarregar dados
      await loadData()
    } catch (err: any) {
      console.error('Erro ao criar conta de admin:', err)
      alert(err.message || 'Erro ao criar conta de administrador')
    } finally {
      setCreateAdminLoading(false)
    }
  }

  const filteredSupportMessages = supportMessages.filter(msg =>
    msg.userEmail.toLowerCase().includes(supportSearchTerm.toLowerCase()) ||
    msg.userName.toLowerCase().includes(supportSearchTerm.toLowerCase()) ||
    msg.subject.toLowerCase().includes(supportSearchTerm.toLowerCase()) ||
    msg.message.toLowerCase().includes(supportSearchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="status-badge status-active"><CheckCircle size={12} /> Resolvido</span>
      case 'in_progress':
        return <span className="status-badge status-pending"><Clock size={12} /> Em Andamento</span>
      default:
        return <span className="status-badge status-pending"><AlertTriangle size={12} /> Pendente</span>
    }
  }

  const getClientStatusBadge = (status: ClientStatus = 'pendente') => {
    const statusConfig = {
      pendente: { icon: Clock, label: 'Pendente', className: 'status-pending' },
      em_atendimento: { icon: Clock, label: 'Em Atendimento', className: 'status-active' },
      proposta_enviada: { icon: FileText, label: 'Proposta Enviada', className: 'status-active' },
      fechado: { icon: CheckCircle, label: 'Fechado', className: 'status-active' },
      cancelado: { icon: XCircle, label: 'Cancelado', className: 'status-pending' }
    }

    const config = statusConfig[status] || statusConfig.pendente
    const Icon = config.icon

    return (
      <span className={`status-badge ${config.className}`}>
        <Icon size={12} />
        {config.label}
      </span>
    )
  }

  useEffect(() => {
    loadData()
    checkMigrationStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const checkMigrationStatus = async () => {
    const firebaseReady = await isFirebaseReady()
    const completed = isMigrationCompleted()
    setMigrationStatus({
      completed,
      firebaseReady: !!firebaseReady && !!db,
      message: completed 
        ? 'Migração já foi concluída. Dados locais foram removidos.' 
        : firebaseReady && db
          ? 'Firebase está configurado. Clique para migrar dados locais.'
          : 'Firebase não está configurado. Dados estão sendo salvos localmente.'
    })
  }

  const handleExecuteMigration = async () => {
    if (!confirm('Tem certeza que deseja migrar os dados locais para o Firebase? Após a migração, os dados locais serão removidos.')) {
      return
    }

    setMigrationLoading(true)
    try {
      const result = await executeMigration()
      if (result.success) {
        alert(`Migração concluída com sucesso!\n\n${result.message}\n\nDados locais foram removidos.`)
        await checkMigrationStatus()
        await loadData() // Recarregar dados do Firebase
      } else {
        alert(`Erro na migração: ${result.message}`)
      }
    } catch (error: any) {
      alert(`Erro ao executar migração: ${error.message}`)
    } finally {
      setMigrationLoading(false)
    }
  }

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
        {migrationStatus && !migrationStatus.completed && migrationStatus.firebaseReady && (
          <div className="migration-banner">
            <Database size={20} />
            <div className="migration-info">
              <strong>Migração Disponível</strong>
              <span>{migrationStatus.message}</span>
            </div>
            <button
              onClick={handleExecuteMigration}
              className="migration-btn"
              disabled={migrationLoading}
            >
              {migrationLoading ? 'Migrando...' : 'Migrar para Firebase'}
            </button>
          </div>
        )}

        <div className="admin-tabs">
          <button 
            className={activeTab === 'onboarding' ? 'tab-active' : ''}
            onClick={() => setActiveTab('onboarding')}
          >
            <FileText size={18} />
            Onboarding
          </button>
          <button 
            className={activeTab === 'accounts' ? 'tab-active' : ''}
            onClick={() => setActiveTab('accounts')}
          >
            <Users size={18} />
            Contas
          </button>
          <button 
            className={activeTab === 'support' ? 'tab-active' : ''}
            onClick={() => setActiveTab('support')}
          >
            <MessageSquare size={18} />
            Suporte
          </button>
        </div>

        {activeTab === 'accounts' && (
          <div className="create-accounts-section">
            <div className="create-accounts-buttons">
              <button
                onClick={() => {
                  setShowCreateAdmin(!showCreateAdmin)
                  setShowCreateVendas(false)
                }}
                className="create-admin-btn"
              >
                <Shield size={18} />
                {showCreateAdmin ? 'Cancelar' : 'Criar Conta Admin'}
              </button>
              <button
                onClick={() => {
                  setShowCreateVendas(!showCreateVendas)
                  setShowCreateAdmin(false)
                }}
                className="create-vendas-btn"
              >
                <UserPlus size={18} />
                {showCreateVendas ? 'Cancelar' : 'Criar Conta de Vendas'}
              </button>
            </div>

            {showCreateAdmin && (
              <div className="create-vendas-form">
                <h3>Criar Nova Conta de Administrador</h3>
                <form onSubmit={handleCreateAdmin}>
                  <div className="form-group">
                    <label htmlFor="adminName">Nome</label>
                    <input
                      id="adminName"
                      type="text"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Nome do administrador"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="adminEmail">Email</label>
                    <input
                      id="adminEmail"
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="admin@creattive.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="adminPassword">Senha</label>
                    <input
                      id="adminPassword"
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Senha temporária"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    className="create-account-btn"
                    disabled={createAdminLoading}
                  >
                    {createAdminLoading ? 'Criando...' : 'Criar Conta Admin'}
                  </button>
                </form>
              </div>
            )}

            {showCreateVendas && (
              <div className="create-vendas-form">
                <h3>Criar Nova Conta de Vendas</h3>
                <form onSubmit={handleCreateVendas}>
                  <div className="form-group">
                    <label htmlFor="vendasName">Nome</label>
                    <input
                      id="vendasName"
                      type="text"
                      value={newVendasName}
                      onChange={(e) => setNewVendasName(e.target.value)}
                      placeholder="Nome do vendedor"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendasEmail">Email</label>
                    <input
                      id="vendasEmail"
                      type="email"
                      value={newVendasEmail}
                      onChange={(e) => setNewVendasEmail(e.target.value)}
                      placeholder="vendas@creattive.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vendasPassword">Senha</label>
                    <input
                      id="vendasPassword"
                      type="password"
                      value={newVendasPassword}
                      onChange={(e) => setNewVendasPassword(e.target.value)}
                      placeholder="Senha temporária"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    className="create-account-btn"
                    disabled={createVendasLoading}
                  >
                    {createVendasLoading ? 'Criando...' : 'Criar Conta'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

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
          <div className="stat-card">
            <Users size={24} />
            <div>
              <h3>Contas Ativas</h3>
              <p>{userAccounts.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <AlertTriangle size={24} />
            <div>
              <h3>Trial Expirado</h3>
              <p>{userAccounts.filter(u => u.role === 'user' && u.trialEndDate && isTrialExpired(u.trialEndDate)).length}</p>
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

        {activeTab === 'onboarding' && (
          <div className="admin-table-container">
            {loading ? (
              <div className="empty-state">
                <RefreshCw size={48} className="spinning" />
                <p>Carregando dados...</p>
              </div>
            ) : filteredData.length === 0 ? (
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
                      {getClientStatusBadge(record.status || 'pendente')}
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
        )}

        {activeTab === 'accounts' && (
          <div className="admin-table-container">
            {loading ? (
              <div className="empty-state">
                <RefreshCw size={48} className="spinning" />
                <p>Carregando contas...</p>
              </div>
            ) : userAccounts.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Nenhuma conta encontrada</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nome</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Trial</th>
                    <th>Dias Restantes</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {userAccounts
                    .filter(acc => 
                      acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      acc.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((account) => {
                      const expired = account.trialEndDate ? isTrialExpired(account.trialEndDate) : false
                      const daysRemaining = account.trialEndDate ? getTrialDaysRemaining(account.trialEndDate) : 0
                      
                      return (
                        <tr key={account.id}>
                          <td>
                            <div className="table-cell">
                              <Mail size={14} />
                              {account.email}
                            </div>
                          </td>
                          <td>{account.name}</td>
                          <td>
                            <span className={`role-badge role-${account.role}`}>
                              {account.role === 'admin' && <Shield size={12} />}
                              {account.role === 'vendas' && <User size={12} />}
                              {account.role === 'user' && <User size={12} />}
                              {account.role === 'admin' ? 'Admin' : account.role === 'vendas' ? 'Vendas' : 'Cliente'}
                            </span>
                          </td>
                          <td>
                            {account.onboardingCompleted ? (
                              <span className="status-badge status-active">
                                <CheckCircle size={12} />
                                Completo
                              </span>
                            ) : (
                              <span className="status-badge status-pending">
                                <Clock size={12} />
                                Pendente
                              </span>
                            )}
                          </td>
                          <td>
                            {account.role === 'admin' || account.role === 'vendas' ? (
                              <span>-</span>
                            ) : account.trialEndDate ? (
                              <span className={expired ? 'trial-expired' : 'trial-active'}>
                                {new Date(account.trialEndDate).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td>
                            {account.role === 'admin' || account.role === 'vendas' ? (
                              <span>-</span>
                            ) : account.trialEndDate ? (
                              <span className={expired ? 'trial-expired' : daysRemaining <= 3 ? 'trial-warning' : 'trial-active'}>
                                {expired ? (
                                  <>
                                    <AlertTriangle size={12} />
                                    Expirado
                                  </>
                                ) : (
                                  <>
                                    <Clock size={12} />
                                    {daysRemaining} dias
                                  </>
                                )}
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td>
                            <div className="account-actions">
                              {account.role !== 'admin' && (
                                <button
                                  onClick={() => handleUpdateRole(account.id, account.role, 'admin')}
                                  className="update-role-btn admin-role-btn"
                                  disabled={updateRoleLoading === account.id}
                                  title="Tornar Administrador"
                                >
                                  <Shield size={14} />
                                  {updateRoleLoading === account.id ? 'Atualizando...' : 'Tornar Admin'}
                                </button>
                              )}
                              {account.role !== 'vendas' && account.role !== 'admin' && (
                                <button
                                  onClick={() => handleUpdateRole(account.id, account.role, 'vendas')}
                                  className="update-role-btn vendas-role-btn"
                                  disabled={updateRoleLoading === account.id}
                                  title="Tornar Vendas"
                                >
                                  <User size={14} />
                                  {updateRoleLoading === account.id ? 'Atualizando...' : 'Tornar Vendas'}
                                </button>
                              )}
                              <button
                                onClick={() => handleResetPassword(account.id)}
                                className="reset-password-btn"
                                disabled={resetPasswordLoading === account.id}
                                title="Enviar email de recuperação de senha"
                              >
                                <Key size={14} />
                                {resetPasswordLoading === account.id ? 'Enviando...' : 'Resetar Senha'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="support-section">
            <div className="support-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar mensagens por email, nome ou assunto..."
                  value={supportSearchTerm}
                  onChange={(e) => setSupportSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={loadData} className="refresh-button" disabled={loading}>
                <RefreshCw size={20} className={loading ? 'spinning' : ''} />
                Atualizar
              </button>
            </div>

            <div className="support-stats">
              <div className="stat-card">
                <MessageSquare size={24} />
                <div>
                  <h3>Total de Mensagens</h3>
                  <p>{supportMessages.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <AlertTriangle size={24} />
                <div>
                  <h3>Pendentes</h3>
                  <p>{supportMessages.filter(m => m.status === 'pending').length}</p>
                </div>
              </div>
              <div className="stat-card">
                <Clock size={24} />
                <div>
                  <h3>Em Andamento</h3>
                  <p>{supportMessages.filter(m => m.status === 'in_progress').length}</p>
                </div>
              </div>
              <div className="stat-card">
                <CheckCircle size={24} />
                <div>
                  <h3>Resolvidas</h3>
                  <p>{supportMessages.filter(m => m.status === 'resolved').length}</p>
                </div>
              </div>
            </div>

            {selectedMessage ? (
              <div className="support-message-detail">
                <div className="message-detail-header">
                  <button onClick={() => setSelectedMessage(null)} className="close-detail-btn">
                    <XCircle size={20} />
                    Voltar
                  </button>
                </div>
                <div className="message-detail-content">
                  <div className="message-info">
                    <div className="info-row">
                      <strong>De:</strong> {selectedMessage.userName} ({selectedMessage.userEmail})
                    </div>
                    <div className="info-row">
                      <strong>Assunto:</strong> {selectedMessage.subject}
                    </div>
                    <div className="info-row">
                      <strong>Data:</strong> {new Date(selectedMessage.timestamp).toLocaleString('pt-BR')}
                    </div>
                    <div className="info-row">
                      <strong>Status:</strong> {getStatusBadge(selectedMessage.status)}
                    </div>
                  </div>
                  <div className="message-body">
                    <h3>Mensagem:</h3>
                    <p>{selectedMessage.message}</p>
                  </div>
                  {selectedMessage.adminResponse && (
                    <div className="admin-response">
                      <h3>Resposta do Admin:</h3>
                      <p>{selectedMessage.adminResponse}</p>
                      {selectedMessage.respondedBy && (
                        <small>Respondido por: {selectedMessage.respondedBy}</small>
                      )}
                    </div>
                  )}
                  <div className="message-actions">
                    <button
                      onClick={() => handleResetPassword(selectedMessage.userId)}
                      className="reset-password-btn"
                      disabled={resetPasswordLoading === selectedMessage.userId}
                      title="Enviar email de recuperação de senha para o cliente"
                    >
                      <Key size={16} />
                      {resetPasswordLoading === selectedMessage.userId ? 'Enviando...' : 'Resetar Senha do Cliente'}
                    </button>
                    {selectedMessage.status !== 'in_progress' && (
                      <button
                        onClick={() => handleUpdateMessageStatus(selectedMessage.id!, 'in_progress')}
                        className="status-btn in-progress-btn"
                      >
                        <Clock size={16} />
                        Marcar como Em Andamento
                      </button>
                    )}
                    {selectedMessage.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateMessageStatus(selectedMessage.id!, 'resolved')}
                        className="status-btn resolved-btn"
                      >
                        <CheckCircle size={16} />
                        Marcar como Resolvido
                      </button>
                    )}
                    {selectedMessage.status !== 'pending' && (
                      <button
                        onClick={() => handleUpdateMessageStatus(selectedMessage.id!, 'pending')}
                        className="status-btn pending-btn"
                      >
                        <AlertTriangle size={16} />
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="support-messages-list">
                {loading ? (
                  <div className="empty-state">
                    <RefreshCw size={48} className="spinning" />
                    <p>Carregando mensagens...</p>
                  </div>
                ) : filteredSupportMessages.length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare size={48} />
                    <p>Nenhuma mensagem de suporte encontrada</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>Email</th>
                        <th>Assunto</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSupportMessages.map((msg) => (
                        <tr key={msg.id}>
                          <td>
                            <div className="table-cell">
                              <Calendar size={14} />
                              {new Date(msg.timestamp).toLocaleString('pt-BR')}
                            </div>
                          </td>
                          <td>{msg.userName}</td>
                          <td>
                            <div className="table-cell">
                              <Mail size={14} />
                              {msg.userEmail}
                            </div>
                          </td>
                          <td>{msg.subject}</td>
                          <td>{getStatusBadge(msg.status)}</td>
                          <td>
                            <button
                              onClick={() => setSelectedMessage(msg)}
                              className="view-message-btn"
                            >
                              <Eye size={14} />
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
