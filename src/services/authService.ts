import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  updatePassword
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, Timestamp, onSnapshot } from 'firebase/firestore'
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
  passwordSet?: boolean
  isPro?: boolean
  plan?: 'free' | 'basic' | 'plus' | 'pro'
  lastAccess?: Date
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

  let firebaseUser: any = null

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    firebaseUser = userCredential.user
  } catch (error: any) {
    console.error('Erro completo ao criar usuário no Firebase Auth:', {
      code: error.code,
      message: error.message,
      error: error,
      stack: error.stack
    })
    
    // Tratar erros específicos do Firebase Auth
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este email já está cadastrado. Tente fazer login.')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Email inválido. Verifique o formato do email.')
    } else if (error.code === 'auth/weak-password') {
      throw new Error('A senha é muito fraca. Use uma senha com pelo menos 8 caracteres.')
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Operação não permitida. Verifique se o método de autenticação por email/senha está habilitado no Firebase Console.')
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio não autorizado. Adicione este domínio em Firebase Console > Authentication > Settings > Authorized domains')
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error('Chave API inválida. Verifique as variáveis de ambiente no Vercel.')
    } else if (error.code === 'auth/app-not-authorized') {
      throw new Error('Aplicação não autorizada. Verifique as configurações do Firebase.')
    } else {
      // Para erros 400 sem código específico, verificar a mensagem
      const errorMsg = error.message || 'Erro ao criar conta. Tente novamente.'
      console.error('Erro ao criar conta:', {
        code: error.code,
        message: errorMsg,
        fullError: error
      })
      
      // Verificar se é um erro 400 genérico
      if (errorMsg.includes('400') || errorMsg.includes('Bad Request') || !error.code) {
        throw new Error('Erro ao criar conta. Verifique: 1) Se o domínio está autorizado no Firebase, 2) Se o método Email/Password está habilitado, 3) Se as variáveis de ambiente estão corretas no Vercel.')
      }
      
      throw new Error(`${errorMsg} (Código: ${error.code || 'N/A'})`)
    }
  }

  if (!firebaseUser) {
    throw new Error('Falha ao criar usuário')
  }

  try {
    // Criar documento do usuário no Firestore
    // Log de dados sensíveis removido
    
    const userData: Omit<UserData, 'id'> = {
      email: firebaseUser.email!,
      name: name || email.split('@')[0],
      role: role,
      onboardingCompleted: role !== 'user', // Admin e vendas não precisam de onboarding
      createdAt: new Date(),
      trialEndDate,
      passwordSet: true
    }

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
      ...userData,
      createdAt: Timestamp.now(),
      trialEndDate: Timestamp.fromDate(trialEndDate)
    })
    
    // Log removido
  } catch (error: any) {
    console.error('❌ Erro ao criar documento no Firestore:', {
      code: error.code,
      message: error.message,
      error: error
    })
    
    // Se falhar ao criar no Firestore, tentar deletar o usuário do Auth para evitar inconsistência
    try {
      if (firebaseUser) {
        await firebaseUser.delete()
      }
    } catch (deleteError) {
      console.error('Erro ao deletar usuário após falha no Firestore:', deleteError)
    }

    // Tratar erros específicos do Firestore
    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else {
      throw new Error('Erro ao salvar dados do usuário. Tente novamente.')
    }
  }

  try {
    // Enviar email de verificação
    if (firebaseUser.email) {
      await sendEmailVerification(firebaseUser)
    }
  } catch (error: any) {
    // Não bloquear a criação se falhar o envio de email
    console.warn('Erro ao enviar email de verificação:', error)
  }

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    name: name || email.split('@')[0],
    role: role,
    onboardingCompleted: role !== 'user',
    createdAt: new Date(),
    trialEndDate,
    passwordSet: true
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

  // Fallback temporário para cliente sem Firebase
  const CLIENT_CREDENTIALS = {
    email: 'cliente@creattive.com',
    password: 'cliente123'
  }

  if (email === CLIENT_CREDENTIALS.email && password === CLIENT_CREDENTIALS.password) {
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 15) // 15 dias para cliente
    
    return {
      id: 'temp-client-' + Date.now(),
      email: CLIENT_CREDENTIALS.email,
      name: 'Cliente Teste',
      role: 'user',
      onboardingCompleted: true,
      createdAt: new Date(),
      trialEndDate,
      onboardingData: undefined
    }
  }

  // Limpar espaços em branco do email
  const cleanEmail = email.trim()

  // Se não for admin ou cliente hardcoded, tentar Firebase
  if (!auth || !db) {
    console.error('Firebase não está configurado. Verifique as variáveis de ambiente no Vercel.')
    throw new Error('Firebase não está configurado. Verifique as configurações do servidor.')
  }

  let userCredential
  try {
    userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password)
  } catch (error: any) {
    console.error('Erro no Firebase Auth:', {
      code: error.code,
      message: error.message,
      fullError: error
    })
    
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Credenciais inválidas. Verifique seu email e senha.')
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio não autorizado. Verifique as configurações do Firebase Authentication.')
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('Usuário não encontrado. Verifique se o email está correto.')
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Senha incorreta. Tente novamente ou use "Esqueceu sua senha?".')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Email inválido. Verifique o formato do email.')
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.')
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
    }
    
    // Para erros 400 sem código específico
    if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
      throw new Error('Erro ao fazer login. Verifique: 1) Se o domínio está autorizado no Firebase, 2) Se as variáveis de ambiente estão corretas no Vercel.')
    }
    
    throw new Error(error.message || 'Erro ao fazer login. Tente novamente.')
  }

  const firebaseUser = userCredential.user

  // Buscar dados do usuário no Firestore com retry
  let userDoc = null
  let retries = 3
  let lastError: any = null
  
  while (retries > 0) {
    try {
      userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid))
      break
    } catch (error: any) {
      lastError = error
      retries--
      
      if (error.code === 'unavailable' || error.code === 'failed-precondition' || error.message?.includes('offline')) {
        console.warn(`Firestore offline. Tentativas restantes: ${retries}`)
        if (retries > 0) {
          // Aguardar progressivamente mais tempo entre tentativas
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
        }
      } else if (error.code === 'permission-denied') {
        // Erro de permissão - não adianta tentar novamente
        throw new Error('Permissão negada. Verifique as regras do Firestore.')
      } else {
        // Outro tipo de erro - não adianta tentar novamente
        throw new Error(`Erro ao buscar dados: ${error.message || 'Erro desconhecido'}`)
      }
    }
  }
  
  // Se não conseguiu buscar após todas as tentativas
  if (!userDoc) {
    console.error('Não foi possível conectar ao Firestore após múltiplas tentativas:', lastError)
    throw new Error('Não foi possível conectar ao banco de dados. Verifique sua conexão e as configurações do Firebase.')
  }
  
  if (!userDoc.exists()) {
    throw new Error('Dados do usuário não encontrados')
  }

  const userData = userDoc.data()
  const trialEndDate = userData.trialEndDate?.toDate() || new Date()
  
  // Atualizar lastAccess
  const lastAccess = new Date()
  await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
    lastAccess: Timestamp.fromDate(lastAccess)
  })

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    name: userData.name || email.split('@')[0],
    role: userData.role || 'user',
    onboardingCompleted: userData.onboardingCompleted || false,
    createdAt: userData.createdAt?.toDate() || new Date(),
    trialEndDate,
    passwordSet: userData.passwordSet !== undefined ? userData.passwordSet : true,
    isPro: userData.isPro || false,
    plan: userData.plan || 'free',
    lastAccess
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
      if (error.code === 'unavailable' || error.code === 'failed-precondition' || error.message?.includes('offline')) {
        console.warn(`Firestore offline. Tentativas restantes: ${retries}`)
        if (retries > 0) {
          // Aguardar progressivamente mais tempo entre tentativas
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
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
      passwordSet: userData.passwordSet !== undefined ? userData.passwordSet : true,
      isPro: userData.isPro || false,
      plan: userData.plan || 'free'
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

    const lastAccess = new Date()
    try {
      await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
        lastAccess: Timestamp.fromDate(lastAccess)
      })
    } catch (e) {
      console.warn('Não foi possível atualizar lastAccess:', e)
    }

    return {
      id: firebaseUser.uid,
      ...newUserData,
      passwordSet: false,
      lastAccess
    }
  }
}

/**
 * Definir ou atualizar senha do usuário
 */
export async function updateAccountPassword(password: string): Promise<void> {
  const user = auth?.currentUser
  if (!user || !db) {
    throw new Error('Usuário não autenticado ou Firebase não configurado')
  }

  try {
    // Atualizar no Firebase Auth
    await updatePassword(user, password)

    // Atualizar no Firestore
    await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
      passwordSet: true
    })
  } catch (error: any) {
    console.error('Erro ao atualizar senha:', error)
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Por segurança, esta operação requer um login recente. Por favor, saia e entre novamente.')
    }
    throw error
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

  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser || !db) {
      callback(null)
      return
    }

    // Listener em tempo real para o perfil do usuário
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid)
    const unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data()
        const trialEndDate = userData.trialEndDate?.toDate() || new Date()
        
        callback({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userData.name || firebaseUser.email!.split('@')[0],
          role: userData.role || 'user',
          onboardingCompleted: userData.onboardingCompleted || false,
          createdAt: userData.createdAt?.toDate() || new Date(),
          trialEndDate,
          passwordSet: userData.passwordSet !== undefined ? userData.passwordSet : true,
          isPro: userData.isPro || false,
          plan: userData.plan || 'free',
          lastAccess: userData.lastAccess?.toDate()
        })
      } else {
        // Se o documento não existe, criamos um padrão
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 15)
        
        const newUserData = {
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: 'user' as const,
          onboardingCompleted: false,
          createdAt: Timestamp.now(),
          trialEndDate: Timestamp.fromDate(trialEndDate),
          passwordSet: false
        }
        
        setDoc(userDocRef, newUserData).catch(err => {
          console.error("Erro ao criar perfil inicial:", err)
        })

        callback({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: newUserData.name,
          role: 'user',
          onboardingCompleted: false,
          createdAt: new Date(),
          trialEndDate,
          passwordSet: false
        })
      }
    }, (error) => {
      console.error("Erro no listener de usuário:", error)
      // Fallback em caso de erro de permissão temporário
      callback({
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        role: 'user',
        onboardingCompleted: false,
        createdAt: new Date(),
        trialEndDate: new Date(),
        passwordSet: true
      })
    })

    return () => unsubscribeSnapshot()
  })
}

/**
 * Buscar todos os usuários (admin/vendas)
 */
export async function getAllUsers(): Promise<UserData[]> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  try {
    // Log de carregamento interno removido por segurança
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION))
    
    const users: UserData[] = []

    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      // Processamento interno de usuários
      users.push({
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role || 'user',
        onboardingCompleted: data.onboardingCompleted || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        trialEndDate: data.trialEndDate?.toDate() || new Date(),
        onboardingData: data.onboardingData,
        isPro: data.isPro || false,
        plan: data.plan || 'free',
        lastAccess: data.lastAccess?.toDate()
      })
    })

    // Log removido
    return users
  } catch (error: any) {
    console.error('❌ Erro ao buscar usuários:', {
      code: error.code,
      message: error.message,
      error: error
    })
    
    // Tratar erros específicos
    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique se você tem permissão de admin/vendas e se as regras do Firestore estão corretas.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else {
      throw new Error(`Erro ao buscar usuários: ${error.message || 'Erro desconhecido'}`)
    }
  }
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

  if (data.plan !== undefined) updateData.plan = data.plan
  if (data.isPro !== undefined) updateData.isPro = data.isPro

  await updateDoc(doc(db!, USERS_COLLECTION, userId), updateData)
}

/**
 * Verificar se o trial expirou
 */
/**
 * Deletar conta de usuário (Firestore apenas)
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  await deleteDoc(doc(db, USERS_COLLECTION, userId))
}

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
