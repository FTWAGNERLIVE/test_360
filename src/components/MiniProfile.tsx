import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Edit2, Check, X } from 'lucide-react'
import './MiniProfile.css'

export default function MiniProfile() {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(user?.name || '')
  }, [user])

  if (!user) return null

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user.email ? user.email[0].toUpperCase() : '?')

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await updateProfile({ name: name.trim() })
      setEditing(false)
    } catch (e: any) {
      console.error('MiniProfile: erro ao salvar', e)
      setError('Erro ao salvar o nome')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mini-profile">
      <div className="mini-avatar" aria-hidden>
        {initials}
      </div>

      <div className="mini-info">
        {editing ? (
          <input
            className="mini-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            aria-label="Nome"
          />
        ) : (
          <>
            <div className="mini-name">{user.name}</div>
            <div className="mini-email">{user.email}</div>
          </>
        )}
      </div>

      <div className="mini-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="mini-btn mini-save"
              onClick={handleSave}
              disabled={loading}
              aria-label="Salvar"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="mini-btn mini-cancel"
              onClick={() => { setEditing(false); setName(user.name) }}
              aria-label="Cancelar"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mini-btn mini-edit"
            onClick={() => setEditing(true)}
            aria-label="Editar"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>

      {error && <div className="mini-error">{error}</div>}
    </div>
  )
}
