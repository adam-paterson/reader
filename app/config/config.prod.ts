/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 * Use environment variables or a secure configuration method.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: "https://api.rss2json.com/v1/",
  
  // Cloud Sync - Production
  // These should be overridden with actual values from environment variables
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  CLOUDFLARE_API_URL: process.env.CLOUDFLARE_API_URL || "https://api.reader.app",
}
