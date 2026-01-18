import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  doc,
  updateDoc,
  Timestamp 
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'

export type ClientStatus = 'pendente' | 'em_atendimento' | 'proposta_enviada' | 'fechado' | 'cancelado'

export interface OnboardingData {
  companyName: string
  industry: string
  dataSource: string
  goals: string[]
  specificQuestions: string
  contact: string
  userId: string
  email: string
  timestamp: Date | string
  status?: ClientStatus
  id?: string
}

const ONBOARDING_COLLECTION = 'onboarding_data'
const SAVE_TIMEOUT = 20000 // 20 segundos

/**
 * Salva os dados de onboarding no Firestore
 * Versão reestruturada e simplificada
 */
export async function saveOnboardingData(data: Omit<OnboardingData, 'timestamp'>): Promise<string> {
  // Validação 1: Firebase configurado
  if (!db) {
    throw new Error('Firebase não está configurado. Verifique as variáveis de ambiente.')
  }

  // Validação 2: Usuário autenticado
  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const currentUser = auth.currentUser
  const currentUserId = currentUser.uid
  const currentUserEmail = currentUser.email || data.email

  if (!currentUserEmail) {
    throw new Error('Email do usuário não encontrado. Faça login novamente.')
  }

  // Validação 3: Dados obrigatórios
  if (!data.companyName?.trim()) {
    throw new Error('Nome da empresa é obrigatório.')
  }
  if (!data.industry?.trim()) {
    throw new Error('Setor/Indústria é obrigatório.')
  }
  if (!data.dataSource?.trim()) {
    throw new Error('Fonte de dados é obrigatória.')
  }
  if (!data.goals || data.goals.length === 0) {
    throw new Error('Selecione pelo menos um objetivo.')
  }

  // Preparar dados para salvar
  const dataToSave = {
    companyName: data.companyName.trim(),
    industry: data.industry.trim(),
    dataSource: data.dataSource.trim(),
    goals: data.goals, // Array
    specificQuestions: data.specificQuestions?.trim() || '',
    contact: data.contact?.trim() || '',
    userId: currentUserId, // SEMPRE usar o UID do Firebase Auth
    email: currentUserEmail,
    status: (data.status || 'pendente') as ClientStatus, // Status padrão: pendente
    timestamp: Timestamp.now()
  }

  console.log('💾 Salvando dados de onboarding:', {
    userId: currentUserId,
    email: currentUserEmail,
    companyName: dataToSave.companyName,
    industry: dataToSave.industry,
    goalsCount: dataToSave.goals.length
  })

  try {
    // Criar promise de salvamento
    const savePromise = addDoc(collection(db, ONBOARDING_COLLECTION), dataToSave)

    // Criar promise de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'))
      }, SAVE_TIMEOUT)
    })

    // Executar com timeout
    const docRef = await Promise.race([savePromise, timeoutPromise])

    console.log('✅ Dados salvos com sucesso! ID do documento:', docRef.id)
    return docRef.id

  } catch (error: any) {
    console.error('❌ Erro ao salvar dados:', {
      code: error.code,
      message: error.message,
      name: error.name
    })

    // Tratamento de erros específicos
    if (error.message === 'TIMEOUT') {
      throw new Error('Operação demorou muito. Verifique sua conexão e tente novamente.')
    }

    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique: 1) Se as regras do Firestore estão PUBLICADAS, 2) Se você está autenticado, 3) Se o userId corresponde ao uid do usuário.')
    }

    if (error.code === 'unavailable' || error.code === 'failed-precondition') {
      throw new Error('Firestore indisponível. Verifique: 1) Se o Firestore está habilitado, 2) Se está em Native mode, 3) Se as regras estão publicadas.')
    }

    if (error.code === 'deadline-exceeded') {
      throw new Error('Tempo de espera esgotado. Verifique sua conexão e tente novamente.')
    }

    // Erro genérico
    throw new Error(error.message || 'Erro ao salvar dados. Tente novamente.')
  }
}

/**
 * Busca todos os dados de onboarding (para admin/vendas)
 */
export async function getAllOnboardingData(): Promise<OnboardingData[]> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  try {
    const q = query(
      collection(db, ONBOARDING_COLLECTION),
      orderBy('timestamp', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const data: OnboardingData[] = []

    querySnapshot.forEach((doc) => {
      const docData = doc.data()
      data.push({
        ...docData,
        timestamp: docData.timestamp?.toDate() || new Date(),
        id: doc.id
      } as OnboardingData & { id: string })
    })

    return data
  } catch (error) {
    console.error('Erro ao buscar dados de onboarding:', error)
    throw error
  }
}

/**
 * Atualiza o status de um cliente (apenas vendas)
 */
export async function updateClientStatus(onboardingId: string, status: ClientStatus): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  try {
    console.log('🔄 Atualizando status do cliente:', { onboardingId, status })

    await updateDoc(doc(db, ONBOARDING_COLLECTION, onboardingId), {
      status: status
    })

    console.log('✅ Status atualizado com sucesso!')
  } catch (error: any) {
    console.error('❌ Erro ao atualizar status:', {
      code: error.code,
      message: error.message,
      error: error
    })

    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else {
      throw new Error(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`)
    }
  }
}
