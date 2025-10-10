'use client'

import * as React from 'react'

interface AuthContextType {
  isAdmin: boolean
  login: (password: string) => boolean
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | null>(null)

// Simple password - you can change this
const ADMIN_PASSWORD = 'iau2025admin'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    // Check if admin is already logged in
    const adminSession = localStorage.getItem('admin_session')
    if (adminSession === 'true') {
      setIsAdmin(true)
    }
  }, [])

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      localStorage.setItem('admin_session', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdmin(false)
    localStorage.removeItem('admin_session')
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
