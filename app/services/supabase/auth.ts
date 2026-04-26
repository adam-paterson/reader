/**
 * Supabase Auth Service
 * 
 * Handles authentication using Supabase Auth with 50K free MAU.
 * Provides email/password, magic link, and OAuth providers.
 */

import { createClient, SupabaseClient, User, AuthError } from "@supabase/supabase-js"
import { storage } from "@/utils/storage"
import Config from "@/config"

const SUPABASE_URL = Config.SUPABASE_URL || ""
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY || ""

// Storage key constants
const AUTH_KEYS = {
  session: "supabase.auth.session",
  user: "supabase.auth.user",
  refreshToken: "supabase.auth.refreshToken",
} as const

class SupabaseAuthService {
  private client: SupabaseClient | null = null
  private initialized = false

  /**
   * Initialize the Supabase client
   */
  initialize(): SupabaseClient {
    if (this.client) return this.client

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured")
    }

    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: (key) => storage.getString(key) ?? null,
          setItem: (key, value) => storage.set(key, value),
          removeItem: (key) => storage.delete(key),
        },
        persistSession: true,
        autoRefreshToken: true,
      },
    })

    this.initialized = true
    return this.client
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      return this.initialize()
    }
    return this.client
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    const client = this.getClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { user: null, error }
    }

    return { user: data.user, error: null }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    const client = this.getClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { user: null, error }
    }

    return { user: data.user, error: null }
  }

  /**
   * Sign in with magic link (passwordless)
   */
  async signInWithMagicLink(email: string): Promise<{ error: AuthError | null }> {
    const client = this.getClient()
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "reader://auth/callback",
      },
    })

    return { error }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: "google" | "apple" | "github"): Promise<{ error: AuthError | null }> {
    const client = this.getClient()
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "reader://auth/callback",
      },
    })

    return { error }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const client = this.getClient()
    const { error } = await client.auth.signOut()

    // Clear local storage
    if (!error) {
      storage.delete(AUTH_KEYS.session)
      storage.delete(AUTH_KEYS.user)
      storage.delete(AUTH_KEYS.refreshToken)
    }

    return { error }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<{ session: unknown | null; error: AuthError | null }> {
    const client = this.getClient()
    const { data, error } = await client.auth.getSession()
    return { session: data.session, error }
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const client = this.getClient()
    const { data, error } = await client.auth.getUser()
    return { user: data.user, error }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const client = this.getClient()
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: "reader://auth/reset-password",
    })

    return { error }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const client = this.getClient()
    const { error } = await client.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: unknown | null) => void): () => void {
    const client = this.getClient()
    const { data } = client.auth.onAuthStateChange(callback)
    return data.subscription.unsubscribe
  }

  /**
   * Get the current access token
   */
  async getAccessToken(): Promise<string | null> {
    const client = this.getClient()
    const { data } = await client.auth.getSession()
    return data.session?.access_token ?? null
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { session } = await this.getSession()
    return !!session
  }
}

export const supabaseAuth = new SupabaseAuthService()
export type { User, AuthError }
