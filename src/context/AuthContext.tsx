import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as firebaseLogin, loginWithGoogle as firebaseLoginWithGoogle, logout as firebaseLogout, onAuthStateChange, resetPassword, getAllUsers, updateUserData, resetUserPassword, createAccount as firebaseCreateAccount, UserData, isTrialExpired, getTrialDaysRemaining } from '../services/authService'
import { getAllOnboardingData as getFirestoreOnboardingData } from '../services/firestoreService'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendas' | 'user'
  onboardingCompleted: boolean
  onboardingData?: OnboardingData
  trialEndDate?: Date
}

export interface OnboardingData {
  companyName: string
  industry: string
  dataSource: string
  goals: string[]
  specificQuestions: string
  contact: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  createAccount: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resetUserPassword: (userId: string) => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
  isLoading: boolean
  getAllOnboardingData: () => Promise<Array<OnboardingData & { userId: string; email: string; timestamp: string }>>
  getAllUsers: () => Promise<User[]>
  isTrialExpired: (trialEndDate: Date) => boolean
  getTrialDaysRemaining: (trialEndDate: Date) => number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Observar mudanças no estado de autenticação do Firebase
    const unsubscribe = onAuthStateChange((firebaseUser: UserData | null) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.id,
          email: firebaseUser.email,
          name: firebaseUser.name,
          role: firebaseUser.role,
          onboardingCompleted: firebaseUser.onboardingCompleted,
          onboardingData: firebaseUser.onboardingData,
          trialEndDate: firebaseUser.trialEndDate
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userData = await firebaseLogin(email, password)
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        onboardingCompleted: userData.onboardingCompleted,
        onboardingData: userData.onboardingData,
        trialEndDate: userData.trialEndDate
      })
      return true
    } catch (error: any) {
      console.error('Erro no login:', error)
      // Re-throw para que o componente Login possa exibir a mensagem de erro específica
      throw error
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const userData = await firebaseLoginWithGoogle()
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        onboardingCompleted: userData.onboardingCompleted,
        onboardingData: userData.onboardingData,
        trialEndDate: userData.trialEndDate
      })
      return true
    } catch (error: any) {
      console.error('Erro no login com Google:', error)
      return false
    }
  }

  const createAccount = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const userData = await firebaseCreateAccount(email, password, name, 'user')
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        onboardingCompleted: userData.onboardingCompleted,
        onboardingData: userData.onboardingData,
        trialEndDate: userData.trialEndDate
      })
      return true
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await firebaseLogout()
    } catch (error) {
      console.error('Erro no logout:', error)
    }
    setUser(null)
  }

  const handleResetPassword = async (email: string): Promise<void> => {
    try {
      await resetPassword(email)
    } catch (error: any) {
      if (error.message?.includes('não está configurado')) {
        throw new Error('Sistema de recuperação de senha não está disponível. Entre em contato com o suporte.')
      }
      throw error
    }
  }

  const handleResetUserPassword = async (userId: string): Promise<void> => {
    try {
      await resetUserPassword(userId)
    } catch (error: any) {
      if (error.message?.includes('não está configurado')) {
        throw new Error('Sistema de reset de senha não está disponível.')
      }
      throw error
    }
  }

  const completeOnboarding = async (data: OnboardingData) => {
    if (user) {
      // Atualizar no Firebase
      await updateUserData(user.id, {
        onboardingCompleted: true,
        onboardingData: data
      })

      const updatedUser: User = {
        ...user,
        onboardingCompleted: true,
        onboardingData: data
      }
      setUser(updatedUser)
    }
  }

  const getAllOnboardingData = async () => {
    const data = await getFirestoreOnboardingData()
    return data.map(item => ({
      ...item,
      timestamp: item.timestamp instanceof Date 
        ? item.timestamp.toISOString() 
        : typeof item.timestamp === 'string' 
          ? item.timestamp 
          : new Date().toISOString()
    }))
  }

  const handleGetAllUsers = async (): Promise<User[]> => {
    try {
      const users = await getAllUsers()
      return users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        onboardingCompleted: u.onboardingCompleted,
        onboardingData: u.onboardingData,
        trialEndDate: u.trialEndDate
      }))
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      return []
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle,
      createAccount,
      logout, 
      resetPassword: handleResetPassword,
      resetUserPassword: handleResetUserPassword,
      completeOnboarding, 
      isLoading, 
      getAllOnboardingData,
      getAllUsers: handleGetAllUsers,
      isTrialExpired,
      getTrialDaysRemaining
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
