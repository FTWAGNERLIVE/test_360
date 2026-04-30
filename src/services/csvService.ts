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

// Função auxiliar para esperar o Firebase Auth estar pronto
const waitForAuth = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        reject(new Error("Usuário não autenticado"));
      }
    });
    // Timeout de segurança
    setTimeout(() => {
      unsubscribe();
      if (auth.currentUser) resolve(auth.currentUser.uid);
      else reject(new Error("Timeout esperando autenticação"));
    }, 5000);
  });
};

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
  smartDiscovery?: any,
  docIdToUpdate?: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  // Esperar o Auth estar pronto antes de prosseguir
  let userId: string;
  try {
    userId = await waitForAuth();
    if (targetUserId) userId = targetUserId; // Se for admin impersonando, usa o target
  } catch (error) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }
  
  // SANITIZAÇÃO PROFUNDA: Firebase não aceita chaves vazias "" ou campos undefined
  // Isso acontece muito em arquivos Excel com colunas fantasmas.
  const cleanHeaders = csvHeaders.filter(h => h && h.trim() !== "")
  
  const sanitizedData = csvData.map(row => {
    const cleanRow: any = {}
    cleanHeaders.forEach(header => {
      const val = row[header]
      cleanRow[header] = (val === undefined || val === null) ? "" : val
    })
    return cleanRow
  })

  // ESTRATÉGIA PARA ARQUIVOS GIGANTES:
  const MAX_ROWS_TO_SAVE = 1000
  const isSampled = sanitizedData.length > MAX_ROWS_TO_SAVE
  const dataToSave = isSampled ? sanitizedData.slice(0, MAX_ROWS_TO_SAVE) : sanitizedData

  const sanitizedDiscovery = smartDiscovery || null

  const csvDataDoc = {
    userId,
    csvData: dataToSave,
    csvHeaders: cleanHeaders,
    csvFileName: csvFileName || 'dados.csv',
    smartDiscovery: sanitizedDiscovery,
    uploadedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    totalRows: sanitizedData.length,
    isSampled
  }

  try {
    // Gerar um ID de documento limpo e seguro
    const safeFileName = (csvFileName || 'dados').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const finalDocId = docIdToUpdate || `${userId}_${safeFileName}_${Date.now()}`
    
    await setDoc(doc(db, CSV_DATA_COLLECTION, finalDocId), csvDataDoc)
  } catch (error: any) {
    console.error('❌ Erro ao salvar dados do CSV:', error)
    throw new Error(`Erro ao salvar dados do CSV: ${error.message}`)
  }
}

/**
 * Lista todos os arquivos CSV salvos pelo usuário
 */
export async function listUserFiles(userId?: string) {
  if (!db) return []
  
  // Esperar o Auth estar pronto para evitar erro de permissão no carregamento inicial
  let effectiveUserId: string;
  try {
    effectiveUserId = userId || await waitForAuth();
  } catch (error) {
    console.warn("Aguardando autenticação para listar arquivos...");
    return [];
  }

  try {
    const q = query(
      collection(db, CSV_DATA_COLLECTION),
      where('userId', '==', effectiveUserId)
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
