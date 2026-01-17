import { collection, addDoc, getDocs, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface SupportMessage {
  id?: string
  userId: string
  userEmail: string
  userName: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved'
  timestamp: Date
  adminResponse?: string
  respondedAt?: Date
  respondedBy?: string
}

const SUPPORT_COLLECTION = 'support_messages'

/**
 * Enviar mensagem de suporte
 */
export async function sendSupportMessage(
  userId: string,
  userEmail: string,
  userName: string,
  subject: string,
  message: string
): Promise<string> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  const docRef = await addDoc(collection(db, SUPPORT_COLLECTION), {
    userId,
    userEmail,
    userName,
    subject,
    message,
    status: 'pending',
    timestamp: Timestamp.now()
  })
  return docRef.id
}

/**
 * Buscar todas as mensagens de suporte (admin)
 */
export async function getAllSupportMessages(): Promise<SupportMessage[]> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  const q = query(
    collection(db, SUPPORT_COLLECTION),
    orderBy('timestamp', 'desc')
  )
  
  const querySnapshot = await getDocs(q)
  const messages: SupportMessage[] = []
  
  querySnapshot.forEach((doc) => {
    const data = doc.data()
    messages.push({
      id: doc.id,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      subject: data.subject,
      message: data.message,
      status: data.status || 'pending',
      timestamp: data.timestamp?.toDate() || new Date(),
      adminResponse: data.adminResponse,
      respondedAt: data.respondedAt?.toDate(),
      respondedBy: data.respondedBy
    })
  })
  
  return messages
}

/**
 * Atualizar status da mensagem (admin)
 */
export async function updateSupportMessageStatus(
  messageId: string,
  status: 'pending' | 'in_progress' | 'resolved',
  adminResponse?: string,
  respondedBy?: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não está configurado')
  }

  const updateData: any = { status }
  if (adminResponse) updateData.adminResponse = adminResponse
  if (respondedBy) updateData.respondedBy = respondedBy
  if (status !== 'pending') updateData.respondedAt = Timestamp.now()
  
  await updateDoc(doc(db, SUPPORT_COLLECTION, messageId), updateData)
}
