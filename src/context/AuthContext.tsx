import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  email: string
  name: string
  onboardingCompleted: boolean
  onboardingData?: OnboardingData
}

export interface OnboardingData {
  companyName: string
  industry: string
  dataSource: string
  goals: string[]
  specificQuestions: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
  isLoading: boolean
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
    
    const existingUser = localStorage.getItem('user')
    if (existingUser) {
      const userData = JSON.parse(existingUser)
      if (userData.email === email) {
        setUser(userData)
        return true
      }
    }

    // Novo usuário
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0],
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
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, completeOnboarding, isLoading }}>
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
