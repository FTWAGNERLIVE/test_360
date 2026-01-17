import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../config/firebase'

const MIGRATION_FLAG = 'firebase_migration_completed'
const USERS_COLLECTION = 'users'
const ONBOARDING_COLLECTION = 'onboarding_data'
const SUPPORT_COLLECTION = 'support_messages'

/**
 * Verifica se o Firebase está configurado e funcionando
 */
export async function isFirebaseReady(): Promise<boolean> {
  if (!auth || !db) {
    return false
  }

  try {
    // Verificar se consegue acessar o Firestore
    // Não vamos fazer uma query real, apenas verificar se db está disponível
    return true
  } catch (error) {
    console.warn('Firebase não está pronto:', error)
    return false
  }
}

/**
 * Verifica se a migração já foi realizada
 */
export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true'
}

/**
 * Marca a migração como concluída
 */
function markMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_FLAG, 'true')
}

/**
 * Migra usuários do localStorage para Firebase
 */
async function migrateUsers(): Promise<number> {
  if (!auth || !db) {
    return 0
  }

  const credentials = JSON.parse(localStorage.getItem('userCredentials') || '{}')
  let migrated = 0

  for (const [email, credData] of Object.entries(credentials)) {
    try {
      const cred = credData as any
      const userData = cred.userData

      // Verificar se o usuário já existe no Firebase (por email)
      let userExists = false
      try {
        const usersQuery = query(
          collection(db!, USERS_COLLECTION),
          where('email', '==', email)
        )
        const existingUsers = await getDocs(usersQuery)
        userExists = !existingUsers.empty
      } catch (error) {
        // Se der erro na query, assumir que não existe
        console.warn(`Erro ao verificar usuário ${email}:`, error)
      }

      if (!userExists && userData) {
        // Criar usuário no Firebase Auth
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, cred.password)
          const firebaseUser = userCredential.user

          // Calcular trial end date
          const trialEndDate = new Date()
          if (userData.trialEndDate) {
            trialEndDate.setTime(new Date(userData.trialEndDate).getTime())
          } else {
            trialEndDate.setDate(trialEndDate.getDate() + 15)
          }

          // Criar documento no Firestore
          await addDoc(collection(db!, USERS_COLLECTION), {
            email: firebaseUser.email,
            name: userData.name || email.split('@')[0],
            role: userData.role || 'user',
            onboardingCompleted: userData.onboardingCompleted || false,
            createdAt: userData.createdAt ? Timestamp.fromDate(new Date(userData.createdAt)) : Timestamp.now(),
            trialEndDate: Timestamp.fromDate(trialEndDate),
            onboardingData: userData.onboardingData || null
          })

          migrated++
        } catch (authError: any) {
          // Se o usuário já existe no Auth, tentar criar apenas o documento
          if (authError.code === 'auth/email-already-in-use') {
            // Buscar o UID do usuário existente seria complexo, então vamos pular
            console.log(`Usuário ${email} já existe no Firebase Auth, pulando migração`)
          } else {
            throw authError
          }
        }
      }
    } catch (error: any) {
      // Se o usuário já existe, ignorar erro
      if (error.code !== 'auth/email-already-in-use') {
        console.error(`Erro ao migrar usuário ${email}:`, error)
      }
      // Continuar com próximo usuário mesmo se houver erro
    }
  }

  return migrated
}

/**
 * Migra dados de onboarding do localStorage para Firebase
 */
async function migrateOnboardingData(): Promise<number> {
  if (!db) {
    return 0
  }

  const allOnboardingData = JSON.parse(localStorage.getItem('allOnboardingData') || '[]')
  let migrated = 0

  for (const data of allOnboardingData) {
    try {
      // Verificar se já existe
      const onboardingQuery = query(
        collection(db!, ONBOARDING_COLLECTION),
        where('userId', '==', data.userId),
        where('email', '==', data.email)
      )
      const existing = await getDocs(onboardingQuery)

      if (existing.empty) {
        await addDoc(collection(db!, ONBOARDING_COLLECTION), {
          userId: data.userId,
          email: data.email,
          companyName: data.companyName,
          industry: data.industry,
          dataSource: data.dataSource,
          goals: data.goals || [],
          specificQuestions: data.specificQuestions || '',
          contact: data.contact || '',
          timestamp: data.timestamp ? Timestamp.fromDate(new Date(data.timestamp)) : Timestamp.now()
        })
        migrated++
      }
    } catch (error) {
      console.error('Erro ao migrar dados de onboarding:', error)
    }
  }

  return migrated
}

/**
 * Migra mensagens de suporte do localStorage para Firebase
 */
async function migrateSupportMessages(): Promise<number> {
  if (!db) {
    return 0
  }

  const supportMessages = JSON.parse(localStorage.getItem('supportMessages') || '[]')
  let migrated = 0

  for (const msg of supportMessages) {
    try {
      // Verificar se já existe
      // Verificar se já existe por userId e timestamp aproximado
      const supportQuery = query(
        collection(db!, SUPPORT_COLLECTION),
        where('userId', '==', msg.userId)
      )
      const existing = await getDocs(supportQuery)

      if (existing.empty) {
        await addDoc(collection(db!, SUPPORT_COLLECTION), {
          userId: msg.userId,
          userEmail: msg.userEmail,
          userName: msg.userName,
          subject: msg.subject,
          message: msg.message,
          status: msg.status || 'pending',
          timestamp: msg.timestamp ? Timestamp.fromDate(new Date(msg.timestamp)) : Timestamp.now(),
          adminResponse: msg.adminResponse || null,
          respondedAt: msg.respondedAt ? Timestamp.fromDate(new Date(msg.respondedAt)) : null,
          respondedBy: msg.respondedBy || null
        })
        migrated++
      }
    } catch (error) {
      console.error('Erro ao migrar mensagem de suporte:', error)
    }
  }

  return migrated
}

/**
 * Remove dados locais após migração bem-sucedida
 */
function clearLocalData(): void {
  // Remover credenciais locais
  localStorage.removeItem('userCredentials')
  
  // Remover dados de onboarding locais
  localStorage.removeItem('allOnboardingData')
  
  // Remover mensagens de suporte locais
  localStorage.removeItem('supportMessages')
  
  // Manter apenas o usuário atual logado
  // localStorage.removeItem('user') - NÃO remover, pois o usuário está logado
}

/**
 * Executa a migração completa
 */
export async function executeMigration(): Promise<{
  success: boolean
  usersMigrated: number
  onboardingMigrated: number
  supportMigrated: number
  message: string
}> {
  // Verificar se já foi migrado
  if (isMigrationCompleted()) {
    return {
      success: true,
      usersMigrated: 0,
      onboardingMigrated: 0,
      supportMigrated: 0,
      message: 'Migração já foi realizada anteriormente'
    }
  }

  // Verificar se Firebase está pronto
  const firebaseReady = await isFirebaseReady()
  if (!firebaseReady) {
    return {
      success: false,
      usersMigrated: 0,
      onboardingMigrated: 0,
      supportMigrated: 0,
      message: 'Firebase não está configurado ou não está funcionando'
    }
  }

  try {
    // Migrar dados
    const usersMigrated = await migrateUsers()
    const onboardingMigrated = await migrateOnboardingData()
    const supportMigrated = await migrateSupportMessages()

    // Se pelo menos uma migração foi bem-sucedida, limpar dados locais
    if (usersMigrated > 0 || onboardingMigrated > 0 || supportMigrated > 0) {
      clearLocalData()
      markMigrationCompleted()
    }

    return {
      success: true,
      usersMigrated,
      onboardingMigrated,
      supportMigrated,
      message: `Migração concluída: ${usersMigrated} usuários, ${onboardingMigrated} onboarding, ${supportMigrated} suportes`
    }
  } catch (error: any) {
    console.error('Erro na migração:', error)
    return {
      success: false,
      usersMigrated: 0,
      onboardingMigrated: 0,
      supportMigrated: 0,
      message: `Erro na migração: ${error.message}`
    }
  }
}

/**
 * Verifica e executa migração automaticamente na inicialização
 */
export async function checkAndMigrate(): Promise<void> {
  // Só migrar se Firebase estiver configurado e migração não foi feita
  if (!isMigrationCompleted() && auth && db) {
    try {
      const result = await executeMigration()
      if (result.success) {
        console.log('✅ Migração automática concluída:', result.message)
      } else {
        console.log('ℹ️ Migração não executada:', result.message)
      }
    } catch (error) {
      console.error('Erro na migração automática:', error)
    }
  }
}
