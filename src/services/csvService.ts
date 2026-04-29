import { 
  doc, 
  setDoc, 
  getDoc,
  Timestamp 
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'

const CSV_DATA_COLLECTION = 'user_csv_data'

export interface CSVData {
  userId: string
  csvData: any[]
  csvHeaders: string[]
  csvFileName?: string
  csvFileContent?: string // Conteúdo original do CSV como string
  smartDiscovery?: any // Mapeamento e insights da IA
  uploadedAt: Date
  updatedAt: Date
}

/**
 * Salva os dados do CSV no Firestore
 */
export async function saveCSVData(
  csvData: any[], 
  csvHeaders: string[], 
  csvFileName?: string,
  csvFileContent?: string,
  targetUserId?: string,
  smartDiscovery?: any
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = targetUserId || auth.currentUser.uid
  const csvDataDoc: Omit<CSVData, 'uploadedAt' | 'updatedAt'> & { uploadedAt: Timestamp, updatedAt: Timestamp } = {
    userId,
    csvData,
    csvHeaders,
    csvFileName: csvFileName || 'dados.csv',
    csvFileContent: csvFileContent || '',
    smartDiscovery: smartDiscovery || null,
    uploadedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }

  try {
    // console.log('💾 Salvando CSV')

    // Salvar no Firestore (um documento por usuário, sempre atualizado)
    await setDoc(doc(db, CSV_DATA_COLLECTION, userId), csvDataDoc)
    
    // console.log('✅ CSV salvo')
  } catch (error: any) {
    console.error('❌ Erro ao salvar dados do CSV:', {
      code: error.code,
      message: error.message,
      error: error
    })

    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else {
      throw new Error(`Erro ao salvar dados do CSV: ${error.message || 'Erro desconhecido'}`)
    }
  }
}

/**
 * Carrega os dados do CSV do Firestore
 */
export async function loadCSVData(targetUserId?: string): Promise<CSVData | null> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = targetUserId || auth.currentUser.uid

  try {
    // console.log('🔍 Buscando CSV')

    const csvDataDoc = await getDoc(doc(db, CSV_DATA_COLLECTION, userId))
    
    if (!csvDataDoc.exists()) {
      // console.log('ℹ️ Sem dados CSV')
      return null
    }

    const data = csvDataDoc.data()
    const csvData: CSVData = {
      userId: data.userId,
      csvData: data.csvData || [],
      csvHeaders: data.csvHeaders || [],
      csvFileName: data.csvFileName,
      csvFileContent: data.csvFileContent,
      smartDiscovery: data.smartDiscovery,
      uploadedAt: data.uploadedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }

    // console.log('✅ CSV carregado')

    return csvData
  } catch (error: any) {
    console.error('❌ Erro ao carregar dados do CSV:', {
      code: error.code,
      message: error.message,
      error: error
    })

    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore.')
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
    } else {
      throw new Error(`Erro ao carregar dados do CSV: ${error.message || 'Erro desconhecido'}`)
    }
  }
}

/**
 * Remove os dados do CSV do Firestore
 */
export async function deleteCSVData(targetUserId?: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = targetUserId || auth.currentUser.uid

  try {
    // console.log('🗑️ Removendo CSV')

    await setDoc(doc(db, CSV_DATA_COLLECTION, userId), {
      userId,
      csvData: [],
      csvHeaders: [],
      csvFileName: '',
      csvFileContent: '',
      updatedAt: Timestamp.now()
    }, { merge: true })
    
    // console.log('✅ CSV removido')
  } catch (error: any) {
    console.error('❌ Erro ao remover dados do CSV:', {
      code: error.code,
      message: error.message,
      error: error
    })

    if (error.code === 'permission-denied') {
      throw new Error('Permissão negada. Verifique as regras do Firestore.')
    } else {
      throw new Error(`Erro ao remover dados do CSV: ${error.message || 'Erro desconhecido'}`)
    }
  }
}
