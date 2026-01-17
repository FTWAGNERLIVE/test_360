import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { db } from '../config/firebase'

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
  if (!data.userId || !data.email) {
    throw new Error('Dados do usuário incompletos. Faça login novamente.')
  }
  
  if (!data.companyName || !data.industry || !data.dataSource) {
    throw new Error('Preencha todos os campos obrigatórios do formulário.')
  }
  
  try {
    console.log('💾 Tentando salvar dados de onboarding:', {
      userId: data.userId,
      email: data.email,
      companyName: data.companyName,
      industry: data.industry
    })
    
    // Preparar dados antes de enviar para otimizar
    const dataToSave = {
      ...data,
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
