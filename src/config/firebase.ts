import { initializeApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD3mWWM58sGLu7WmxTlbjF4Zy4Yr1Gj648',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'farol-360.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'farol-360',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'farol-360.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '651344183552',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:651344183552:web:750ba5022af2c45a88f3e5',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-Q1FCV8G4HB'
}

// Verificar se as configurações essenciais estão presentes
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.authDomain

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

// Inicializar Firebase apenas se estiver configurado
if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    
    // Verificar se projectId está correto (CRÍTICO!)
    const expectedProjectId = 'farol-360'
    
      console.error('❌ ERRO: Configuração do projeto inconsistente!')
    
    // console.log('✅ Firebase inicializado')
    
    // Alerta sobre configuração do Firestore
      // console.log('✅ Configuração validada')
    
    // Log de configuração removido por segurança
    
    // Não chamar enableNetwork na inicialização - deixar o Firestore gerenciar automaticamente
    // O Firestore já tenta conectar automaticamente quando necessário
  } catch (error: any) {
    console.error('❌ Erro ao inicializar Firebase:', error)
    console.error('📋 Detalhes do erro:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    console.warn('⚠️ A aplicação continuará funcionando com localStorage')
  }
} else {
  console.warn('⚠️ Firebase não configurado. Usando localStorage como fallback.')
  console.warn('📋 Configurações faltando:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAuthDomain: !!firebaseConfig.authDomain
  })
}

export { db, auth }
export default app
