import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'

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
  id?: string
}

const ONBOARDING_COLLECTION = 'onboarding_data'

/**
 * Salva os dados de onboarding no Firestore
 */
export async function saveOnboardingData(data: Omit<OnboardingData, 'timestamp'>): Promise<string> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }
  
  // Validar dados antes de tentar salvar
  if (!data.companyName || !data.industry || !data.dataSource) {
    throw new Error('Preencha todos os campos obrigatórios do formulário.')
  }
  
  // Obter o UID do usuário autenticado atual (garantir que seja o correto)
  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }
  
  const currentUserId = auth.currentUser.uid
  
  // Usar o UID atual do Firebase Auth, não o userId passado (pode estar incorreto)
  const userIdToSave = data.userId || currentUserId
  
  // Verificar se o userId passado corresponde ao UID atual
  if (data.userId && data.userId !== currentUserId) {
    console.warn('⚠️ ATENÇÃO: userId passado não corresponde ao UID do usuário autenticado!')
    console.warn('📋 Usando UID do Firebase Auth atual em vez do userId passado.')
    console.warn('📋 userId passado:', data.userId)
    console.warn('📋 UID atual:', currentUserId)
  }
  
  if (!data.email) {
    // Usar o email do usuário autenticado se não foi passado
    const currentUserEmail = auth.currentUser.email
    if (!currentUserEmail) {
      throw new Error('Email do usuário não encontrado. Faça login novamente.')
    }
    data.email = currentUserEmail
  }
  
  try {
    console.log('💾 Tentando salvar dados de onboarding:', {
      userIdUsado: userIdToSave,
      email: data.email,
      companyName: data.companyName,
      industry: data.industry,
      uidAtual: currentUserId
    })
    
    // Preparar dados antes de enviar para otimizar
    const dataToSave = {
      ...data,
      userId: userIdToSave, // Garantir que use o UID correto
      timestamp: Timestamp.now()
    }
    
    const docRef = await addDoc(collection(db, ONBOARDING_COLLECTION), dataToSave)
    console.log('✅ Dados de onboarding salvos com sucesso. ID:', docRef.id)
    return docRef.id
  } catch (error: any) {
    console.error('❌ Erro ao salvar dados de onboarding:', {
      code: error.code,
      message: error.message,
      error: error
    })
    
    // Tratar erros específicos do Firestore
    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore ou se você está autenticado.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else if (error.code === 'deadline-exceeded') {
      throw new Error('Tempo de espera esgotado. Verifique sua conexão e tente novamente.')
    } else if (error.code === 'failed-precondition') {
      throw new Error('Erro de pré-condição. Verifique se o Firestore está habilitado e as regras estão publicadas.')
    }
    
    // Re-throw com mensagem mais clara
    throw new Error(error.message || 'Erro ao salvar dados. Tente novamente.')
  }
}

/**
 * Busca todos os dados de onboarding (para admin)
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
