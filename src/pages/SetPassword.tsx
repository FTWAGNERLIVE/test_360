import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Key, Shield, CheckCircle, AlertCircle, Sparkles, Search } from 'lucide-react'
import './Login.css' // Reutilizando os estilos base do login para consistência

export default function SetPassword() {
  const { updatePassword, logout, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => {
        // Após definir a senha, segue o fluxo normal
        if (user?.onboardingCompleted) {
          navigate('/dashboard')
        } else {
          navigate('/onboarding')
        }
      }, 2000)
    } catch (err: any) {
      console.error('Erro ao definir senha:', err)
      setError(err.message || 'Erro ao definir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <Search size={40} />
            <Sparkles size={24} className="sparkle" />
          </div>
          <h1>Lupa <span className="brand-accent">Analytics AI</span></h1>
          <p className="subtitle">Segurança da Conta</p>
        </div>

        <div className="setup-welcome">
          <div className="icon-badge">
            <Shield size={24} />
          </div>
          <h2>Defina sua senha de acesso</h2>
          <p>Para garantir a segurança dos seus dados, defina uma senha de pelo menos 8 caracteres.</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={48} />
            <h3>Senha configurada!</h3>
            <p>Sua conta está protegida. Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">Nova Senha</label>
              <div className="input-with-icon">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              <Key size={18} />
              {loading ? 'Salvando...' : 'Confirmar Senha'}
            </button>

            <button 
              type="button" 
              onClick={() => logout()} 
              className="btn-secondary" 
              style={{ marginTop: '12px', width: '100%' }}
            >
              Sair e configurar depois
            </button>
          </form>
        )}
      </div>

      <style>{`
        .setup-welcome {
          text-align: center;
          margin-bottom: 32px;
        }
        .icon-badge {
          width: 56px;
          height: 56px;
          background: var(--primary-light);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .setup-welcome h2 {
          font-size: 20px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .setup-welcome p {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .input-with-icon {
          position: relative;
        }
      `}</style>
    </div>
  )
}
