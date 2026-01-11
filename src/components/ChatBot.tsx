import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './ChatBot.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatBotProps {
  data: any[]
  headers: string[]
}

export default function ChatBot({ data, headers }: ChatBotProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá! Sou o Agente 360, seu assistente de análise de dados. Analisei seu arquivo CSV com ${data.length} registros e ${headers.length} colunas. Como posso ajudá-lo hoje?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulação de análise com IA
    await new Promise(resolve => setTimeout(resolve, 1500))

    const lowerMessage = userMessage.toLowerCase()

    // Análises básicas dos dados
    const numericHeaders = headers.filter(header => {
      const sample = data[0]?.[header]
      return !isNaN(Number(sample)) && sample !== '' && sample !== null
    })

    // Respostas contextuais baseadas na mensagem do usuário
    if (lowerMessage.includes('total') || lowerMessage.includes('quantos') || lowerMessage.includes('registros')) {
      return `Seu arquivo contém **${data.length.toLocaleString()}** registros no total.`
    }

    if (lowerMessage.includes('coluna') || lowerMessage.includes('campos')) {
      return `Seu dataset possui **${headers.length}** colunas: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`
    }

    if (lowerMessage.includes('numéric') || lowerMessage.includes('número')) {
      return `Identifiquei **${numericHeaders.length}** colunas numéricas: ${numericHeaders.slice(0, 5).join(', ')}${numericHeaders.length > 5 ? '...' : ''}`
    }

    if (lowerMessage.includes('média') || lowerMessage.includes('médio')) {
      if (numericHeaders.length > 0) {
        const firstNumeric = numericHeaders[0]
        const values = data.map(row => Number(row[firstNumeric])).filter(v => !isNaN(v))
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        return `A média da coluna **${firstNumeric}** é **${avg.toFixed(2)}**`
      }
      return 'Não encontrei colunas numéricas para calcular a média.'
    }

    if (lowerMessage.includes('máximo') || lowerMessage.includes('maior')) {
      if (numericHeaders.length > 0) {
        const firstNumeric = numericHeaders[0]
        const values = data.map(row => Number(row[firstNumeric])).filter(v => !isNaN(v))
        const max = Math.max(...values)
        return `O valor máximo na coluna **${firstNumeric}** é **${max.toLocaleString()}**`
      }
      return 'Não encontrei colunas numéricas para identificar o valor máximo.'
    }

    if (lowerMessage.includes('mínimo') || lowerMessage.includes('menor')) {
      if (numericHeaders.length > 0) {
        const firstNumeric = numericHeaders[0]
        const values = data.map(row => Number(row[firstNumeric])).filter(v => !isNaN(v))
        const min = Math.min(...values)
        return `O valor mínimo na coluna **${firstNumeric}** é **${min.toLocaleString()}**`
      }
      return 'Não encontrei colunas numéricas para identificar o valor mínimo.'
    }

    if (lowerMessage.includes('tendência') || lowerMessage.includes('padrão')) {
      return `Com base na análise dos dados, identifiquei alguns padrões interessantes. Recomendo focar nas colunas numéricas para identificar tendências. Você pode visualizar os gráficos acima para uma análise mais detalhada.`
    }

    if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
      return `Posso ajudá-lo com:\n\n• Informações sobre o total de registros\n• Detalhes sobre as colunas\n• Cálculos estatísticos (média, máximo, mínimo)\n• Identificação de padrões e tendências\n• Análises específicas sobre seus dados\n\nFaça uma pergunta sobre seus dados!`
    }

    // Resposta padrão com contexto
    const onboardingContext = user?.onboardingData
    if (onboardingContext) {
      return `Com base nas informações do seu onboarding (${onboardingContext.industry}), posso ajudar a analisar seus dados de ${onboardingContext.dataSource}. Seus objetivos incluem: ${onboardingContext.goals.join(', ')}. Que tipo de análise você gostaria de fazer?`
    }

    return `Entendi sua pergunta. Com base nos dados carregados, posso ajudá-lo a entender melhor seus dados. Tente perguntar sobre:\n\n• Estatísticas gerais\n• Valores específicos\n• Padrões e tendências\n• Comparações entre colunas\n\nComo posso ajudar mais especificamente?`
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateAIResponse(userMessage.content)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-title">
          <Bot size={24} />
          <h3>Agente 360</h3>
        </div>
        <p className="chatbot-subtitle">Creattive</p>
      </div>

      <div className="chatbot-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < message.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-text loading">
                <Loader size={16} className="spinner-icon" />
                <span>Analisando dados...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua pergunta sobre os dados..."
          rows={1}
          disabled={isLoading}
        />
        <button 
          onClick={handleSend} 
          disabled={!input.trim() || isLoading}
          className="send-button"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
