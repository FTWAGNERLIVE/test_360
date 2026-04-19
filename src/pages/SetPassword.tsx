import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Key, Shield, CheckCircle, AlertCircle, Sparkles, Search, Eye, EyeOff } from 'lucide-react'
import './Login.css'

export default function SetPassword() {
  const { updatePassword, logout, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
              <div className="input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <div className="input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  minLength={8}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
          line-height: 1.5;
          max-width: 300px;
          margin: 0 auto;
        }
        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-container input {
          width: 100%;
          padding-right: 48px !important;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .input-container input:focus {
          background: #fff;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .password-toggle:hover {
          color: var(--primary);
          background: var(--primary-light);
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
      `}</style>
    </div>
  )
}
