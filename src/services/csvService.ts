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
  csvFileContent?: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = auth.currentUser.uid
  const csvDataDoc: Omit<CSVData, 'uploadedAt' | 'updatedAt'> & { uploadedAt: Timestamp, updatedAt: Timestamp } = {
    userId,
    csvData,
    csvHeaders,
    csvFileName: csvFileName || 'dados.csv',
    csvFileContent: csvFileContent || '',
    uploadedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }

  try {
    console.log('💾 Salvando dados do CSV no Firestore...', {
      userId,
      dataRows: csvData.length,
      headers: csvHeaders.length,
      fileName: csvFileName
    })

    // Salvar no Firestore (um documento por usuário, sempre atualizado)
    await setDoc(doc(db, CSV_DATA_COLLECTION, userId), csvDataDoc)
    
    console.log('✅ Dados do CSV salvos com sucesso no Firestore!')
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
export async function loadCSVData(): Promise<CSVData | null> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = auth.currentUser.uid

  try {
    console.log('🔍 Buscando dados do CSV no Firestore...', { userId })

    const csvDataDoc = await getDoc(doc(db, CSV_DATA_COLLECTION, userId))
    
    if (!csvDataDoc.exists()) {
      console.log('ℹ️ Nenhum dado do CSV encontrado no Firestore')
      return null
    }

    const data = csvDataDoc.data()
    const csvData: CSVData = {
      userId: data.userId,
      csvData: data.csvData || [],
      csvHeaders: data.csvHeaders || [],
      csvFileName: data.csvFileName,
      csvFileContent: data.csvFileContent,
      uploadedAt: data.uploadedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }

    console.log('✅ Dados do CSV carregados com sucesso!', {
      dataRows: csvData.csvData.length,
      headers: csvData.csvHeaders.length,
      fileName: csvData.csvFileName
    })

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
export async function deleteCSVData(): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  if (!auth || !auth.currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const userId = auth.currentUser.uid

  try {
    console.log('🗑️ Removendo dados do CSV do Firestore...', { userId })

    await setDoc(doc(db, CSV_DATA_COLLECTION, userId), {
      userId,
      csvData: [],
      csvHeaders: [],
      csvFileName: '',
      csvFileContent: '',
      updatedAt: Timestamp.now()
    }, { merge: true })
    
    console.log('✅ Dados do CSV removidos com sucesso!')
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
