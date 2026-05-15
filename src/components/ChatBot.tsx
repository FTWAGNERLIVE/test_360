import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, User, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isTrialExpired } from '../services/authService'

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
  onboardingData?: any
}

export default function ChatBot({ data, headers, onboardingData }: ChatBotProps) {
  const { user } = useAuth()
  
  // Limite de linhas para o Chat baseado no Plano
  const limitedData = useMemo(() => {
    if (!user || user.role === 'admin' || user.role === 'vendas') return data
    
    // Se for Trial ativo, libera 5000 linhas
    if (user.trialEndDate && !isTrialExpired(new Date(user.trialEndDate))) return data.slice(0, 5000)

    const userPlan = user.plan || 'free'
    const limits = {
      free: 400,
      basic: 5000,
      plus: 50000,
      pro: 200000
    }
    const limit = limits[userPlan] || 60
    return data.slice(0, limit)
  }, [data, user])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá! Sou a Lupa, sua assistente de análise de dados. Analisei seu arquivo CSV com ${limitedData.length} registros e ${headers.length} colunas. Como posso ajudá-lo hoje?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Import dynamic integration
      const { chatWithGroq } = await import('../services/groqService')
      
      // Prepare history for API
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })).slice(1) // Skip first assistant message

      const assistantMessageId = (Date.now() + 1).toString()
      
      // Adiciona uma mensagem vazia para o assistente que será preenchida pelo stream
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }])

      await chatWithGroq(
        currentInput, 
        history, 
        limitedData, 
        headers, 
        onboardingData,
        (fullText) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullText }
              : msg
          ))
        }
      )
      
    } catch (error) {
      console.error('ChatBot Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação com o Lupa AI. Verifique sua conexão ou a chave de API.',
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
          <h3>Lupa</h3>
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
        {isLoading && !messages.find(m => m.role === 'assistant' && m.content === '' && m.id === (messages[messages.length-1]?.role === 'assistant' ? messages[messages.length-1].id : '')) && (
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
