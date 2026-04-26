/**
 * Supabase Client Setup
 *
 * Main Supabase client configuration and exports.
 */

import { supabaseAuth } from "./auth"

export { supabaseAuth }
export type { User, AuthError } from "./auth"

// Re-export for convenience
export const initializeSupabase = (): void => {
  supabaseAuth.initialize()
}
