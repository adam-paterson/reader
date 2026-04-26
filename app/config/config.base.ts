export interface ConfigBaseProps {
  persistNavigation: "always" | "dev" | "prod" | "never"
  catchErrors: "always" | "dev" | "prod" | "never"
  exitRoutes: string[]
  
  // Cloud Sync Configuration
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  CLOUDFLARE_API_URL: string
  
  // API Configuration
  API_URL: string
}

export type PersistNavigationConfig = ConfigBaseProps["persistNavigation"]

const BaseConfig: ConfigBaseProps = {
  // This feature is particularly useful in development mode, but
  // can be used in production as well if you prefer.
  persistNavigation: "dev",

  /**
   * Only enable if we're catching errors in the right environment
   */
  catchErrors: "always",

  /**
   * This is a list of all the route names that will exit the app if the back button
   * is pressed while in that screen. Only affects Android.
   */
  exitRoutes: ["Welcome"],
  
  // Cloud Sync Configuration (override in dev/prod configs)
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  CLOUDFLARE_API_URL: "https://api.reader.app",
  
  // API Configuration
  API_URL: "https://api.reader.app",
}

export default BaseConfig
