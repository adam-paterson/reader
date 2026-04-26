/**
 * Auth Context with Supabase Integration
 *
 * Updated authentication context using Supabase Auth.
 * Provides email/password, magic link, and OAuth authentication.
 */

import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { supabaseAuth, User } from "@/services/supabase"
import { syncEngine } from "@/services/sync"

export type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  authEmail: string
  setAuthEmail: (email: string) => void

  // Auth methods
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>
  signInWithProvider: (provider: "google" | "apple" | "github") => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (newPassword: string) => Promise<{ error?: string }>

  // Legacy compatibility
  authToken?: string
  setAuthToken: (token?: string) => void
  logout: () => Promise<void>
  validationError: string
}

export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [authEmail, setAuthEmail] = useState("")

  // Initialize Supabase and check for existing session
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize Supabase client
        supabaseAuth.initialize()

        // Check for existing session
        const { user: currentUser } = await supabaseAuth.getUser()
        setUser(currentUser)
        if (currentUser?.email) {
          setAuthEmail(currentUser.email)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    void initAuth()

    // Subscribe to auth state changes
    const unsubscribe = supabaseAuth.onAuthStateChange((event, _session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void supabaseAuth.getUser().then(({ user: currentUser }) => {
          setUser(currentUser)
          if (currentUser?.email) {
            setAuthEmail(currentUser.email)
          }
        })
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setAuthEmail("")
        // Clear sync data on sign out
        void syncEngine.clear()
      }
    })

    return unsubscribe
  }, [])

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await supabaseAuth.signUp(email, password)
      return { error: error?.message }
    },
    [],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { user: currentUser, error } = await supabaseAuth.signIn(email, password)
      if (error) {
        return { error: error.message }
      }
      setUser(currentUser)
      return {}
    },
    [],
  )

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabaseAuth.signInWithMagicLink(email)
    return { error: error?.message }
  }, [])

  const signInWithProvider = useCallback(
    async (provider: "google" | "apple" | "github"): Promise<{ error?: string }> => {
      const { error } = await supabaseAuth.signInWithProvider(provider)
      return { error: error?.message }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<void> => {
    await supabaseAuth.signOut()
    setUser(null)
    setAuthEmail("")
    // Clear sync data
    await syncEngine.clear()
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabaseAuth.resetPassword(email)
    return { error: error?.message }
  }, [])

  const updatePassword = useCallback(async (newPassword: string): Promise<{ error?: string }> => {
    const { error } = await supabaseAuth.updatePassword(newPassword)
    return { error: error?.message }
  }, [])

  // Legacy compatibility
  const authToken = useMemo(() => {
    // Token is managed by Supabase, this is for legacy compatibility
    return undefined
  }, [])

  const setAuthToken = useCallback(() => {
    // No-op: tokens are managed by Supabase
  }, [])

  const logout = useCallback(async () => {
    await signOut()
  }, [signOut])

  const validationError = useMemo(() => {
    if (!authEmail || authEmail.length === 0) return "can't be blank"
    if (authEmail.length < 6) return "must be at least 6 characters"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) return "must be a valid email address"
    return ""
  }, [authEmail])

  const value: AuthContextType = {
    isAuthenticated: !!user,
    isLoading,
    user,
    authEmail,
    setAuthEmail,

    // Auth methods
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,

    // Legacy compatibility
    authToken,
    setAuthToken,
    logout,
    validationError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
