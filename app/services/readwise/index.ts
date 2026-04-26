/**
 * Readwise Service
 *
 * Two-way sync integration with Readwise API.
 *
 * @example
 * ```typescript
 * import { readwiseApi, setApiToken } from "@/services/readwise"
 *
 * // Set up API token
 * setApiToken("your-readwise-api-token")
 *
 * // Check authentication
 * const isAuth = readwiseApi.isAuthenticated()
 *
 * // Verify token is valid
 * const result = await readwiseApi.verifyToken()
 *
 * // Import highlights from Readwise
 * const importResult = await readwiseApi.importHighlights()
 * if (importResult.kind === "ok") {
 *   console.log(`Imported ${importResult.data.count} books`)
 * }
 *
 * // Export highlights to Readwise
 * const exportResult = await readwiseApi.exportHighlights([{
 *   text: "Important insight",
 *   title: "Book Title",
 *   author: "Author Name",
 *   category: "books"
 * }])
 * ```
 */

export * from "./types"
export {
  ReadwiseApi,
  syncWithReadwise,
  getApiToken,
  setApiToken,
  clearApiToken,
  getSyncState,
  saveSyncState,
  isSyncEnabled,
  setSyncEnabled,
  readwiseApi,
} from "./api"
export { useReadwiseSync } from "./useReadwiseSync"
