import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Tratamento de erro global para erros do Firestore
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('FIRESTORE') || 
      event.error?.message?.includes('INTERNAL ASSERTION')) {
    console.warn('Erro interno do Firestore capturado (não crítico):', event.error)
    event.preventDefault() // Previne que o erro quebre a aplicação
    return true
  }
})

// Tratamento de erros não capturados
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('FIRESTORE') || 
      event.reason?.message?.includes('INTERNAL ASSERTION')) {
    console.warn('Promise rejeitada do Firestore (não crítico):', event.reason)
    event.preventDefault() // Previne que o erro quebre a aplicação
    return true
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
