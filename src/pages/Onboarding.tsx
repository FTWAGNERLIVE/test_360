import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Building2, Target, Database, MessageSquare, Clock, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { saveOnboardingData } from '../services/firestoreService'
import './Onboarding.css'

const INDUSTRIES = [
  'E-commerce',
  'Saúde',
  'Financeiro',
  'Educação',
  'Tecnologia',
  'Varejo',
  'Manufatura',
  'Outro'
]

const DATA_SOURCES = [
  'Vendas',
  'Marketing',
  'Operações',
  'Recursos Humanos',
  'Financeiro',
  'Clientes',
  'Outro'
]

const GOALS = [
  'Identificar tendências',
  'Otimizar processos',
  'Aumentar vendas',
  'Reduzir custos',
  'Melhorar experiência do cliente',
  'Tomar decisões estratégicas'
]

// Mapeamento de indústria para modelo CSV
const getModeloCSV = (industry: string): string | null => {
  const mapping: Record<string, string> = {
    'E-commerce': 'ecommerce',
    'Saúde': 'saude',
    'Financeiro': 'financeiro',
    'Educação': 'educacao',
    'Tecnologia': 'vendas',
    'Varejo': 'vendas',
    'Manufatura': 'vendas',
    'Outro': 'outro'
  }
  return mapping[industry] || null
}

const getModeloCSVByDataSource = (dataSource: string): string | null => {
  const mapping: Record<string, string> = {
    'Vendas': 'vendas',
    'Marketing': 'marketing',
    'Recursos Humanos': 'rh',
    'Financeiro': 'financeiro',
    'Clientes': 'ecommerce',
    'Outro': 'outro'
  }
  return mapping[dataSource] || null
}

export default function Onboarding() {
  const { completeOnboarding, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    dataSource: '',
    goals: [] as string[],
    specificQuestions: '',
    contact: ''
  })
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }))
  }

  const handleDownloadModelo = () => {
    const modelo = formData.industry 
      ? getModeloCSV(formData.industry) 
      : formData.dataSource 
        ? getModeloCSVByDataSource(formData.dataSource)
        : 'outro'
    
    if (modelo) {
      const link = document.createElement('a')
      link.href = `/modelos/${modelo}.csv`
      link.download = `modelo-${modelo}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 4) {
      setStep(step + 1)
      return
    }

    setLoading(true)
    setSaveError('')
    setSaveSuccess(false)
    
    try {
      if (user) {
        // Executar salvamento e atualização em paralelo para melhor performance
        const onboardingData = {
          ...formData,
          userId: user.id,
          email: user.email
        }

        // Executar salvamento primeiro (mais crítico)
        try {
          await saveOnboardingData(onboardingData)
          console.log('✅ Dados de onboarding salvos com sucesso')
        } catch (saveError: any) {
          console.error('❌ Erro ao salvar dados de onboarding:', saveError)
          throw saveError // Re-throw para ser capturado pelo catch externo
        }
        
        // Depois atualizar o status do usuário (menos crítico, pode falhar sem bloquear)
        try {
          await completeOnboarding(formData)
        } catch (updateError) {
          console.warn('⚠️ Erro ao atualizar status do usuário (não crítico):', updateError)
          // Não bloquear se falhar - os dados já foram salvos
        }
        
        setSaveSuccess(true)
        // Navegar imediatamente após salvar (sem delay desnecessário)
        navigate('/dashboard')
      } else {
        // Se não houver usuário, apenas navegar
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar onboarding:', {
        error,
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      })
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao salvar dados. '
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        errorMessage += 'Verifique as regras do Firestore ou se você está autenticado.'
      } else if (error?.message?.includes('indisponível') || error?.code === 'unavailable') {
        errorMessage += 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.'
      } else if (error?.message?.includes('Firebase não está configurado')) {
        errorMessage += 'Firebase não está configurado. Verifique as variáveis de ambiente.'
      } else if (error?.message) {
        errorMessage += error.message
      } else {
        errorMessage += 'Tente novamente ou entre em contato com o suporte.'
      }
      
      setSaveError(errorMessage)
      setLoading(false)
      
      // NÃO navegar se houver erro - deixar o usuário tentar novamente
      // O usuário pode clicar em "Salvar dados" novamente
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.companyName.trim() !== '' && formData.industry !== ''
      case 2:
        return formData.dataSource !== ''
      case 3:
        return formData.goals.length > 0
      case 4:
        return true
      default:
        return false
    }
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        <div className="onboarding-header">
          <h1>Bem-vindo ao Farol 360!</h1>
          <p>Preencha este formulário para personalizar sua análise</p>
          <div className="test-info">
            <Clock size={14} />
            <span>Período de teste: 15 dias</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {step === 1 && (
            <div className="form-step">
              <div className="step-icon">
                <Building2 size={32} />
              </div>
              <h2>Informações da Empresa</h2>
              <div className="form-group">
                <label htmlFor="companyName">Nome da Empresa</label>
                <input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Ex: Minha Empresa Ltda"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="industry">Setor/Indústria</label>
                <select
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  required
                >
                  <option value="">Selecione um setor</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
                {formData.industry && (
                  <button
                    type="button"
                    onClick={handleDownloadModelo}
                    className="download-modelo-btn"
                  >
                    <Download size={16} />
                    Baixar modelo CSV para {formData.industry}
                  </button>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="contact">Seu Telefone</label>
                <input
                  id="contact"
                  type="tel"
                  value={formData.contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="step-icon">
                <Database size={32} />
              </div>
              <h2>Fonte de Dados</h2>
              <div className="form-group">
                <label>Qual tipo de dados você vai analisar?</label>
                <div className="radio-group">
                  {DATA_SOURCES.map(source => (
                    <label key={source} className="radio-option">
                      <input
                        type="radio"
                        name="dataSource"
                        value={source}
                        checked={formData.dataSource === source}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataSource: e.target.value }))}
                      />
                      <span>{source}</span>
                    </label>
                  ))}
                </div>
                {formData.dataSource && !formData.industry && (
                  <button
                    type="button"
                    onClick={handleDownloadModelo}
                    className="download-modelo-btn"
                  >
                    <Download size={16} />
                    Baixar modelo CSV para {formData.dataSource}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <div className="step-icon">
                <Target size={32} />
              </div>
              <h2>Objetivos da Análise</h2>
              <div className="form-group">
                <label>Selecione seus objetivos (múltipla escolha)</label>
                <div className="checkbox-group">
                  {GOALS.map(goal => (
                    <label key={goal} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={formData.goals.includes(goal)}
                        onChange={() => handleGoalToggle(goal)}
                      />
                      <span>{goal}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <div className="step-icon">
                <MessageSquare size={32} />
              </div>
              <h2>Perguntas Específicas</h2>
              <div className="form-group">
                <label htmlFor="specificQuestions">
                  Há alguma pergunta específica que você gostaria que a IA responda sobre seus dados?
                </label>
                <textarea
                  id="specificQuestions"
                  value={formData.specificQuestions}
                  onChange={(e) => setFormData(prev => ({ ...prev, specificQuestions: e.target.value }))}
                  placeholder="Ex: Quais são os produtos mais vendidos? Qual é o melhor horário para campanhas de marketing?"
                  rows={5}
                />
              </div>
            </div>
          )}

          {saveError && (
            <div className="save-error-message">
              <AlertCircle size={18} />
              <span>{saveError}</span>
            </div>
          )}
          
          {saveSuccess && (
            <div className="save-success-message">
              <CheckCircle size={18} />
              <span>Dados salvos com sucesso!</span>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
                disabled={loading}
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={!canProceed() || loading}
            >
              {loading ? 'Salvando dados...' : step === 4 ? 'Finalizar' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
