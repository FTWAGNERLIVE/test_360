import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Verificar se as variáveis de ambiente essenciais estão presentes
const isFirebaseConfigured = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID

let app: FirebaseApp
let db: Firestore
let auth: Auth

// Inicializar Firebase apenas se estiver configurado
if (isFirebaseConfigured) {
  try {
    if (getApps().length > 0) {
      app = getApp()
    } else {
      app = initializeApp(firebaseConfig)
    }
    db = getFirestore(app)
    auth = getAuth(app)
    
    // Configuração validada com sucesso
  } catch (error) {
    console.error('❌ Erro ao inicializar o Firebase:', error)
  }
} else {
  console.warn('⚠️ Firebase não configurado. Verifique as variáveis de ambiente no Vercel.')
}

export { app, db, auth, isFirebaseConfigured }
