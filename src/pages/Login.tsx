import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Sparkles } from 'lucide-react'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const { user, login, loginWithGoogle, createAccount, resetPassword, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirecionar automaticamente quando o usuário fizer login
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (user.role === 'vendas') {
        navigate('/vendas', { replace: true })
      } else if (user.onboardingCompleted) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [user, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, password)
      if (!success) {
        setError('Credenciais inválidas')
        setLoading(false)
      }
      // O redirecionamento será feito automaticamente pelo useEffect quando o user for atualizado
    } catch (err: any) {
      console.error('Erro no login:', err)
      // Exibir mensagem de erro mais específica
      const errorMessage = err.message || 'Erro ao fazer login. Verifique suas credenciais e tente novamente.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const success = await loginWithGoogle()
      if (!success) {
        setError('Erro ao fazer login com Google')
        setLoading(false)
      }
      // O redirecionamento será feito automaticamente pelo useEffect quando o user for atualizado
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google. Tente novamente.')
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError('')
    setResetSuccess(false)

    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
      setTimeout(() => {
        setShowResetPassword(false)
        setResetEmail('')
        setResetSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação. Verifique se o email está correto.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSignUpLoading(true)
    setSignUpSuccess(false)

    // Validações
    if (!signUpName.trim()) {
      setError('Por favor, informe seu nome')
      setSignUpLoading(false)
      return
    }

    if (signUpPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setSignUpLoading(false)
      return
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('As senhas não coincidem')
      setSignUpLoading(false)
      return
    }

    try {
      await createAccount(signUpEmail, signUpPassword, signUpName)
      setSignUpSuccess(true)
      setTimeout(() => {
        setShowSignUp(false)
        setSignUpName('')
        setSignUpEmail('')
        setSignUpPassword('')
        setSignUpConfirmPassword('')
        setSignUpSuccess(false)
        // O redirecionamento será feito automaticamente pelo useEffect quando o user for atualizado
      }, 2000)
    } catch (err: any) {
      console.error('Erro completo ao criar conta:', err)
      
      // Tratar erros específicos do Firebase
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está cadastrado. Tente fazer login.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido. Verifique o formato do email.')
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Use uma senha mais forte.')
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Operação não permitida. Entre em contato com o suporte.')
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado. Entre em contato com o suporte.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique sua internet e tente novamente.')
      } else if (err.message?.includes('Permissão negada')) {
        setError('Erro de permissão. Entre em contato com o suporte.')
      } else if (err.message?.includes('Firestore')) {
        setError('Erro ao salvar dados. Tente novamente em alguns instantes.')
      } else {
        // Mostrar mensagem de erro mais amigável
        const errorMessage = err.message || 'Erro ao criar conta. Tente novamente.'
        setError(errorMessage)
      }
      setSignUpLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <BarChart3 size={40} />
            <Sparkles size={24} className="sparkle" />
          </div>
          <h1>Farol 360</h1>
          <p className="subtitle">Creattive - Análise Inteligente de Dados</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="google-login-button"
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20454Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65454 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.29 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65454 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          <div className="login-actions">
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="forgot-password-link"
            >
              Esqueceu sua senha?
            </button>
          </div>
        </form>

        <div className="signup-section">
          <p className="signup-text">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => setShowSignUp(true)}
              className="signup-link"
            >
              Criar conta
            </button>
          </p>
        </div>

        {showResetPassword && (
          <div className="reset-password-modal">
            <div className="reset-password-card">
              <h2>Recuperar Senha</h2>
              <p>Digite seu email para receber um link de recuperação</p>
              
              {resetSuccess ? (
                <div className="success-message">
                  <p>Email enviado com sucesso! Verifique sua caixa de entrada.</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label htmlFor="resetEmail">Email</label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  
                  {error && <div className="error-message">{error}</div>}
                  
                  <div className="reset-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(false)
                        setResetEmail('')
                        setError('')
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="login-button" disabled={resetLoading}>
                      {resetLoading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {showSignUp && (
          <div className="reset-password-modal">
            <div className="reset-password-card">
              <h2>Criar Conta</h2>
              <p>Preencha os dados para criar sua conta</p>
              
              {signUpSuccess ? (
                <div className="success-message">
                  <p>Conta criada com sucesso! Redirecionando...</p>
                </div>
              ) : (
                <form onSubmit={handleSignUp}>
                  <div className="form-group">
                    <label htmlFor="signUpName">Nome</label>
                    <input
                      id="signUpName"
                      type="text"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="signUpEmail">Email</label>
                    <input
                      id="signUpEmail"
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="signUpPassword">Senha</label>
                    <input
                      id="signUpPassword"
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="signUpConfirmPassword">Confirmar Senha</label>
                    <input
                      id="signUpConfirmPassword"
                      type="password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  {error && <div className="error-message">{error}</div>}
                  
                  <div className="reset-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignUp(false)
                        setSignUpName('')
                        setSignUpEmail('')
                        setSignUpPassword('')
                        setSignUpConfirmPassword('')
                        setError('')
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="login-button" disabled={signUpLoading}>
                      {signUpLoading ? 'Criando...' : 'Criar Conta'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="login-footer">
          <p className="beta-notice">
            🚀 Este é um teste beta com período de 15 dias. Faça login para começar sua análise gratuita.
          </p>
        </div>
      </div>
    </div>
  )
}
