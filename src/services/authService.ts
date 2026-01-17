import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, Timestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

export interface UserData {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendas' | 'user'
  onboardingCompleted: boolean
  createdAt: Date
  trialEndDate: Date
  onboardingData?: any
}

const USERS_COLLECTION = 'users'
const TRIAL_DAYS = 15

/**
 * Criar conta de usuário
 */
export async function createAccount(email: string, password: string, name: string, role: 'admin' | 'vendas' | 'user' = 'user'): Promise<UserData> {
  if (!auth || !db) {
    throw new Error('Firebase não está configurado')
  }

  // Calcular data de término do trial (apenas para usuários normais)
  const trialEndDate = new Date()
  if (role === 'user') {
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS)
  } else {
    // Admin e vendas não têm trial
    trialEndDate.setFullYear(trialEndDate.getFullYear() + 10)
  }

  // Criar usuário no Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const firebaseUser = userCredential.user

  // Criar documento do usuário no Firestore
  const userData: Omit<UserData, 'id'> = {
    email: firebaseUser.email!,
    name: name || email.split('@')[0],
    role: role,
    onboardingCompleted: role !== 'user', // Admin e vendas não precisam de onboarding
    createdAt: new Date(),
    trialEndDate
  }

  await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
    ...userData,
    createdAt: Timestamp.now(),
    trialEndDate: Timestamp.fromDate(trialEndDate)
  })

  // Enviar email de verificação
  if (firebaseUser.email) {
    await sendEmailVerification(firebaseUser)
  }

  return {
    id: firebaseUser.uid,
    ...userData
  }
}

/**
 * Fazer login
 */
export async function login(email: string, password: string): Promise<UserData> {
  // Fallback temporário para admin sem Firebase
  const ADMIN_CREDENTIALS = {
    email: 'admin@creattive.com',
    password: 'admin123'
  }

  // Verificar credenciais admin hardcoded primeiro
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    const trialEndDate = new Date()
    trialEndDate.setFullYear(trialEndDate.getFullYear() + 10) // 10 anos para admin
    
    return {
      id: 'temp-admin-' + Date.now(),
      email: ADMIN_CREDENTIALS.email,
      name: 'Administrador',
      role: 'admin',
      onboardingCompleted: true,
      createdAt: new Date(),
      trialEndDate,
      onboardingData: undefined
    }
  }

  // Se não for admin hardcoded, tentar Firebase
  if (!auth || !db) {
    throw new Error('Firebase não está configurado')
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const firebaseUser = userCredential.user

  // Buscar dados do usuário no Firestore
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid))
  
  if (!userDoc.exists()) {
    throw new Error('Dados do usuário não encontrados')
  }

  const userData = userDoc.data()
  const trialEndDate = userData.trialEndDate?.toDate() || new Date()
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    name: userData.name || email.split('@')[0],
    role: userData.role || 'user',
    onboardingCompleted: userData.onboardingCompleted || false,
    createdAt: userData.createdAt?.toDate() || new Date(),
    trialEndDate,
    onboardingData: userData.onboardingData
  }
}

/**
 * Fazer login com Google
 */
export async function loginWithGoogle(): Promise<UserData> {
  if (!auth || !db) {
    throw new Error('Firebase não está configurado')
  }

  // Não chamar enableNetwork aqui - pode causar conflitos de estado
  // O Firestore gerencia a conexão automaticamente

  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  const firebaseUser = result.user

  // Tentar buscar dados do usuário com retry
  let userDoc = null
  let retries = 3
  
  while (retries > 0) {
    try {
      userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid))
      break
    } catch (error: any) {
      retries--
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn(`Firestore offline. Tentativas restantes: ${retries}`)
        if (retries > 0) {
          // Aguardar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000))
          // Não chamar enableNetwork - pode causar conflitos de estado
        } else {
          // Se não conseguir buscar e for novo usuário, criar dados temporários
          const trialEndDate = new Date()
          trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS)
          
          const tempUserData: UserData = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            role: 'user',
            onboardingCompleted: false,
            createdAt: new Date(),
            trialEndDate
          }
          
          // Tentar criar o documento (pode falhar se estiver offline, mas o usuário pode continuar)
          setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
            ...tempUserData,
            createdAt: Timestamp.now(),
            trialEndDate: Timestamp.fromDate(trialEndDate)
          }).catch((e) => {
            console.warn('Não foi possível salvar dados do usuário (offline):', e)
          })
          
          return tempUserData
        }
      } else {
        throw error
      }
    }
  }
  
  if (userDoc && userDoc.exists()) {
    // Usuário existente - retornar dados
    const userData = userDoc.data()
    const trialEndDate = userData.trialEndDate?.toDate() || new Date()
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: userData.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      role: userData.role || 'user',
      onboardingCompleted: userData.onboardingCompleted || false,
      createdAt: userData.createdAt?.toDate() || new Date(),
      trialEndDate,
      onboardingData: userData.onboardingData
    }
  } else {
    // Novo usuário - criar documento no Firestore
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS)

    const newUserData: Omit<UserData, 'id'> = {
      email: firebaseUser.email!,
      name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      role: 'user',
      onboardingCompleted: false,
      createdAt: new Date(),
      trialEndDate
    }

    try {
      await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
        ...newUserData,
        createdAt: Timestamp.now(),
        trialEndDate: Timestamp.fromDate(trialEndDate)
      })
    } catch (error: any) {
      console.warn('Não foi possível salvar dados do usuário (pode estar offline):', error)
      // Continuar mesmo se não conseguir salvar, o Firestore tentará sincronizar depois
    }

    return {
      id: firebaseUser.uid,
      ...newUserData
    }
  }
}

/**
 * Recuperar senha
 */
export async function resetPassword(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase não está configurado')
  }

  await sendPasswordResetEmail(auth, email)
}

/**
 * Resetar senha de um usuário (admin/vendas)
 */
export async function resetUserPassword(userId: string): Promise<void> {
  if (!auth || !db) {
    throw new Error('Firebase não está configurado')
  }

  // Buscar email do usuário
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId))
  if (!userDoc.exists()) {
    throw new Error('Usuário não encontrado')
  }

  const userData = userDoc.data()
  const email = userData.email

  // Enviar email de reset de senha
  await sendPasswordResetEmail(auth, email)
}

/**
 * Fazer logout
 */
export async function logout(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase não está configurado')
  }

  await signOut(auth)
}

/**
 * Observar mudanças no estado de autenticação
 */
export function onAuthStateChange(callback: (user: UserData | null) => void): () => void {
  if (!auth || !db) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser || !db) {
      callback(null)
      return
    }

    try {
      // Não chamar enableNetwork - o Firestore gerencia a conexão automaticamente

      let userDoc = null
      let retries = 2
      
      while (retries > 0) {
        try {
          userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid))
          break
        } catch (error: any) {
          retries--
          if ((error.code === 'unavailable' || error.message?.includes('offline')) && retries > 0) {
            // Aguardar um pouco e tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500))
            // Não chamar enableNetwork - pode causar conflitos
          } else {
            // Se não conseguir buscar, retornar dados básicos do Firebase Auth
            console.warn('Não foi possível buscar dados do Firestore, usando dados básicos:', error)
            const trialEndDate = new Date()
            trialEndDate.setDate(trialEndDate.getDate() + 15)
            
            callback({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              role: 'user',
              onboardingCompleted: false,
              createdAt: new Date(),
              trialEndDate
            })
            return
          }
        }
      }

      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data()
        const trialEndDate = userData.trialEndDate?.toDate() || new Date()
        
        callback({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userData.name || firebaseUser.email!.split('@')[0],
          role: userData.role || 'user',
          onboardingCompleted: userData.onboardingCompleted || false,
          createdAt: userData.createdAt?.toDate() || new Date(),
          trialEndDate,
          onboardingData: userData.onboardingData
        })
      } else {
        callback(null)
      }
    } catch (error: any) {
      // Se der erro mas tiver dados do Firebase Auth, usar dados básicos
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn('Firestore offline, usando dados básicos do Firebase Auth')
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 15)
        
        callback({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: 'user',
          onboardingCompleted: false,
          createdAt: new Date(),
          trialEndDate
        })
      } else {
        console.error('Erro ao buscar dados do usuário:', error)
        callback(null)
      }
    }
  })
}

/**
 * Buscar todos os usuários (admin/vendas)
 */
export async function getAllUsers(): Promise<UserData[]> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION))
  const users: UserData[] = []

  usersSnapshot.forEach((doc) => {
    const data = doc.data()
    users.push({
      id: doc.id,
      email: data.email,
      name: data.name,
      role: data.role || 'user',
      onboardingCompleted: data.onboardingCompleted || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      trialEndDate: data.trialEndDate?.toDate() || new Date(),
      onboardingData: data.onboardingData
    })
  })

  return users
}

/**
 * Atualizar dados do usuário
 */
export async function updateUserData(userId: string, data: Partial<UserData>): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  const updateData: any = {}
  if (data.onboardingCompleted !== undefined) updateData.onboardingCompleted = data.onboardingCompleted
  if (data.onboardingData !== undefined) updateData.onboardingData = data.onboardingData
  if (data.name !== undefined) updateData.name = data.name
  if (data.role !== undefined) updateData.role = data.role
  if (data.trialEndDate !== undefined) {
    updateData.trialEndDate = Timestamp.fromDate(data.trialEndDate)
  }

  await updateDoc(doc(db!, USERS_COLLECTION, userId), updateData)
}

/**
 * Verificar se o trial expirou
 */
export function isTrialExpired(trialEndDate: Date): boolean {
  return new Date() > trialEndDate
}

/**
 * Calcular dias restantes do trial
 */
export function getTrialDaysRemaining(trialEndDate: Date): number {
  const now = new Date()
  const diff = trialEndDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}
