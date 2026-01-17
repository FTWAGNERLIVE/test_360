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
  
  try {
    const docRef = await addDoc(collection(db, ONBOARDING_COLLECTION), {
      ...data,
      timestamp: Timestamp.now()
    })
    return docRef.id
  } catch (error) {
    console.error('Erro ao salvar dados de onboarding:', error)
    throw error
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
