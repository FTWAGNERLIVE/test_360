import { useNavigate } from 'react-router-dom'
import { Check, X, Sparkles, Zap, Shield, Crown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Pricing.css'

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  color: string;
  icon: JSX.Element;
  popular?: boolean;
  checkoutUrl?: string;
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Grátis',
    price: '0',
    description: 'Para quem está começando a explorar seus dados.',
    features: [
      { text: 'Até 400 linhas por análise', included: true },
      { text: 'Chat com Lupa limitado', included: true },
      { text: '1 planilha salva', included: true },
      { text: 'Insights básicos (1)', included: true },
      { text: 'Suporte Básico', included: true },
      { text: 'Suporte Refinado', included: false },
    ],
    color: '#64748b',
    icon: <Zap size={24} />
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: '29,90',
    description: 'Essencial para pequenas análises recorrentes.',
    features: [
      { text: 'Até 5.000 linhas por análise', included: true },
      { text: 'Até 20 perguntas/mês', included: true },
      { text: '2 planilhas salvas', included: true },
      { text: '2 insights gerados pela IA', included: true },
      { text: 'Suporte via Email', included: true },
      { text: 'Suporte Refinado', included: false },
    ],
    color: '#3b82f6',
    icon: <Shield size={24} />,
    popular: true,
    checkoutUrl: 'https://mpago.la/2YMTwuF'
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: '69,90',
    description: 'Ideal para profissionais que precisam de mais poder.',
    features: [
      { text: 'Até 50.000 linhas por análise', included: true },
      { text: 'Até 100 perguntas/mês', included: true },
      { text: '4 planilhas salvas', included: true },
      { text: '3 insights gerados pela IA', included: true },
      { text: 'Suporte Refinado Prioritário', included: true },
    ],
    color: '#8b5cf6',
    icon: <Sparkles size={24} />,
    checkoutUrl: 'https://mpago.la/2awWQQD'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '149,90',
    description: 'O poder máximo da Lupa para grandes volumes.',
    features: [
      { text: '200.000+ linhas por análise', included: true },
      { text: 'Perguntas ilimitadas', included: true },
      { text: '8 planilhas salvas', included: true },
      { text: '6 insights gerados pela IA', included: true },
      { text: 'Relatório em PDF Profissional', included: true },
      { text: 'Suporte Refinado VIP e Personalizado', included: true },
    ],
    color: '#10b981',
    icon: <Crown size={24} />,
    checkoutUrl: 'https://mpago.la/18Ze9k6'
  }
}

export default function Pricing() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (planId === 'free') {
      await updateProfile({ plan: 'free', isPro: false })
      navigate('/dashboard')
      return
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    
    if (plan.checkoutUrl) {
      alert(`Redirecionando para o Checkout do Mercado Pago (Plano ${plan.name})...`);
      window.open(plan.checkoutUrl, '_blank');
    }

    // NOTA: O código abaixo foi comentado para evitar assinaturas gratuitas.
    /*
    const confirm = window.confirm(`Deseja assinar o plano ${PLANS[planId as keyof typeof PLANS].name}?`)
    if (confirm) {
      await updateProfile({ plan: planId as any, isPro: true })
      alert('Plano assinado com sucesso!')
      navigate('/dashboard')
    }
    */
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Voltar
        </button>
        <h1>Escolha o plano ideal para sua <span>Estratégia</span></h1>
        <p>Analise dados com o poder da IA e transforme informações em resultados.</p>
      </div>

      <div className="plans-grid">
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${plan.popular ? 'popular' : ''} ${user?.plan === plan.id ? 'current' : ''}`}
            style={{ '--plan-color': plan.color } as any}
          >
            {plan.popular && <div className="popular-tag">Mais Escolhido</div>}

            <div className="plan-icon" style={{ color: plan.color }}>
              {plan.icon}
            </div>

            <h2 className="plan-name">{plan.name}</h2>
            <p className="plan-description">{plan.description}</p>

            <div className="plan-price">
              <span className="currency">R$</span>
              <span className="amount">{plan.price}</span>
              <span className="period">/mês</span>
            </div>

            <button
              className={`select-plan-btn ${user?.plan === plan.id ? 'current' : ''}`}
              onClick={() => handleSelectPlan(plan.id)}
              disabled={user?.plan === plan.id}
            >
              {user?.plan === plan.id ? 'Plano Atual' : 'Começar Agora'}
            </button>

            <div className="plan-features">
              <h3>O que está incluso:</h3>
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index} className={feature.included ? 'included' : 'not-included'}>
                    {feature.included ? (
                      <Check size={18} className="feature-icon check" />
                    ) : (
                      <X size={18} className="feature-icon x" />
                    )}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <p>Dúvidas sobre os planos? <a href="#">Fale com nosso consultor</a></p>
      </div>
    </div>
  )
}
