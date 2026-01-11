import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Building2, Target, Database, MessageSquare, Clock } from 'lucide-react'
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

export default function Onboarding() {
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    dataSource: '',
    goals: [] as string[],
    specificQuestions: ''
  })
  const [loading, setLoading] = useState(false)

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 4) {
      setStep(step + 1)
      return
    }

    setLoading(true)
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    completeOnboarding(formData)
    navigate('/dashboard')
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

          <div className="form-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={!canProceed() || loading}
            >
              {loading ? 'Processando...' : step === 4 ? 'Finalizar' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
