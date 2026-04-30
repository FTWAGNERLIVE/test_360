import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
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
  
  // Limpar dados para evitar erros de campos vazios/undefined no Firestore
  const sanitizedDiscovery = smartDiscovery || null

  const csvDataDoc = {
    userId,
    csvData,
    csvHeaders,
    csvFileName: csvFileName || 'dados.csv',
    smartDiscovery: sanitizedDiscovery,
    uploadedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }

  try {
    const docId = `${userId}_${(csvFileName || 'dados').replace(/\s+/g, '_')}_${Date.now()}`
    await setDoc(doc(db, CSV_DATA_COLLECTION, docId), csvDataDoc)
  } catch (error: any) {
    console.error('❌ Erro ao salvar dados do CSV:', error)
    throw new Error(`Erro ao salvar dados do CSV: ${error.message}`)
  }
}

/**
 * Lista todos os arquivos CSV salvos pelo usuário
 */
export async function listUserFiles(targetUserId?: string): Promise<any[]> {
  if (!db || !auth?.currentUser) return []
  const userId = targetUserId || auth.currentUser.uid

  try {
    const q = query(
      collection(db, CSV_DATA_COLLECTION),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      fileName: doc.data().csvFileName,
      uploadedAt: doc.data().uploadedAt?.toDate(),
      rowCount: doc.data().csvData?.length || 0
    }))
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error)
    return []
  }
}

/**
 * Carrega um arquivo específico pelo ID
 */
export async function loadFileById(fileId: string): Promise<CSVData | null> {
  if (!db) return null
  try {
    const docRef = doc(db, CSV_DATA_COLLECTION, fileId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) return null
    
    const data = docSnap.data()
    return {
      userId: data.userId,
      csvData: data.csvData || [],
      csvHeaders: data.csvHeaders || [],
      csvFileName: data.csvFileName,
      csvFileContent: data.csvFileContent,
      smartDiscovery: data.smartDiscovery,
      uploadedAt: data.uploadedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
  } catch (error) {
    console.error('❌ Erro ao carregar arquivo:', error)
    return null
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
