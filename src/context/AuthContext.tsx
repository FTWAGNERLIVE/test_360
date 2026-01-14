import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  onboardingCompleted: boolean
  onboardingData?: OnboardingData
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
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
  isLoading: boolean
  getAllOnboardingData: () => Array<OnboardingData & { userId: string; email: string; timestamp: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular verificação de sessão
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulação de login - em produção, isso seria uma chamada à API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Verificar se é admin
    if (email === 'admin@creattive.com' && password === 'admin123') {
      const adminUser: User = {
        id: 'admin',
        email: 'admin@creattive.com',
        name: 'Administrador',
        role: 'admin',
        onboardingCompleted: true
      }
      localStorage.setItem('user', JSON.stringify(adminUser))
      setUser(adminUser)
      return true
    }
    
    const existingUser = localStorage.getItem('user')
    if (existingUser) {
      const userData = JSON.parse(existingUser)
      if (userData.email === email && userData.role !== 'admin') {
        setUser(userData)
        return true
      }
    }

    // Novo usuário (não admin)
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0],
      role: 'user',
      onboardingCompleted: false
    }
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
    return true
  }

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }

  const completeOnboarding = (data: OnboardingData) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        onboardingCompleted: true,
        onboardingData: data
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      // Salvar dados de onboarding em lista separada para admin
      const allOnboardingData = JSON.parse(localStorage.getItem('allOnboardingData') || '[]')
      allOnboardingData.push({
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
        ...data
      })
      localStorage.setItem('allOnboardingData', JSON.stringify(allOnboardingData))
    }
  }

  const getAllOnboardingData = () => {
    const data = localStorage.getItem('allOnboardingData')
    return data ? JSON.parse(data) : []
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, completeOnboarding, isLoading, getAllOnboardingData }}>
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
