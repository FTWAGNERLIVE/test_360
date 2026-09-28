import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { requestDashboardAccess } from '../services/authService'
import Dashboard from './Dashboard'

export default function SharedDashboard() {
  const { clientId } = useParams<{ clientId: string }>()
  const { user, impersonateUser, isLoading } = useAuth()
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    if (isLoading || !user || !clientId) return

    let isMounted = true
    const setup = async () => {
      try {
        await impersonateUser(clientId)
        if (isMounted) setReady(true)
      } catch (err) {
        console.error(err)
        if (isMounted) setError('Você não tem acesso a este dashboard ou o link é inválido.')
      }
    }
    setup()

    return () => {
      isMounted = false
      impersonateUser(null)
    }
  }, [clientId, user, isLoading, impersonateUser])

  if (isLoading) return <div className="loading-screen">Carregando...</div>
  if (!user) return <Navigate to={`/login?invite=${clientId}`} replace />

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2>{error}</h2>
        {!requestSent ? (
          <button 
            onClick={async () => {
              if (clientId && user) {
                try {
                  await requestDashboardAccess(clientId, user.email)
                  setRequestSent(true)
                } catch (e) {
                  alert('Erro ao solicitar acesso. O proprietário pode ter restrito as solicitações.')
                  console.error(e)
                }
              }
            }}
            style={{ marginTop: 20, padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Solicitar Acesso
          </button>
        ) : (
          <p style={{ marginTop: 20, color: '#10b981' }}>Solicitação enviada com sucesso! Aguarde a aprovação.</p>
        )}
      </div>
    )
  }

  if (!ready) {
    return <div className="loading-screen">Preparando dashboard...</div>
  }

  return <Dashboard isSharedView={true} />
}
