/**
 * Readwise API Client
 *
 * Provides two-way sync with Readwise:
 * - Export highlights TO Readwise (POST /highlights/)
 * - Import highlights FROM Readwise (GET /export/)
 *
 * API Documentation: https://readwise.io/api_deets
 */

import { create, ApiResponse, ApisauceInstance } from "apisauce"

import {
  DEFAULT_READWISE_CONFIG,
  type ExportHighlightsRequest,
  type ExportHighlightsResponse,
  type ImportHighlightsResponse,
  type ReadwiseApiProblem,
  type ReadwiseConfig,
  type ReadwiseHighlight,
  type ReadwiseResult,
  type ReadwiseSyncConfig,
  type ReadwiseSyncState,
  type SyncStats,
  READWISE_STORAGE_KEYS,
  type ReadwiseImportedHighlight,
  type ReadwiseBook,
} from "./types"
import { load, loadString, save, saveString } from "@/utils/storage"

/**
 * Get the API token from secure storage
 */
export function getApiToken(): string | null {
  return loadString(READWISE_STORAGE_KEYS.API_TOKEN)
}

/**
 * Save the API token to secure storage
 */
export function setApiToken(token: string): boolean {
  return saveString(READWISE_STORAGE_KEYS.API_TOKEN, token)
}

/**
 * Remove the stored API token
 */
export function clearApiToken(): void {
  const { storage } = require("@/utils/storage")
  storage.delete(READWISE_STORAGE_KEYS.API_TOKEN)
}

/**
 * Get the current sync state
 */
export function getSyncState(): ReadwiseSyncState {
  return (
    load<ReadwiseSyncState>(READWISE_STORAGE_KEYS.SYNC_STATE) ?? {
      lastSyncAt: null,
      lastSyncCount: 0,
      nextPageCursor: null,
    }
  )
}

/**
 * Save the sync state
 */
export function saveSyncState(state: ReadwiseSyncState): boolean {
  return save(READWISE_STORAGE_KEYS.SYNC_STATE, state)
}

/**
 * Check if sync is enabled
 */
export function isSyncEnabled(): boolean {
  return load<boolean>(READWISE_STORAGE_KEYS.SYNC_ENABLED) ?? false
}

/**
 * Enable or disable sync
 */
export function setSyncEnabled(enabled: boolean): boolean {
  return save(READWISE_STORAGE_KEYS.SYNC_ENABLED, enabled)
}

/**
 * Convert an API error response to a ReadwiseApiProblem
 */
function getReadwiseProblem(response: ApiResponse<unknown>): ReadwiseApiProblem {
  if (!response.ok) {
    if (response.status === 401) {
      return { kind: "unauthorized", message: "Invalid API token" }
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers?.["retry-after"] ?? "60", 10)
      return { kind: "rate-limited", retryAfter }
    }
    if (response.status === 400) {
      return { kind: "bad-request", message: response.data?.toString() ?? "Bad request" }
    }
    if (response.status >= 500) {
      return { kind: "server", message: `Server error: ${response.status}` }
    }
    if (response.problem === "NETWORK_ERROR") {
      return { kind: "network", message: "Network connection failed" }
    }
    if (response.problem === "TIMEOUT_ERROR") {
      return { kind: "timeout" }
    }
  }
  return { kind: "unknown", message: response.problem ?? "Unknown error" }
}

/**
 * Readwise API Client class
 */
export class ReadwiseApi {
  apisauce: ApisauceInstance
  config: ReadwiseConfig

  /**
   * Create a new Readwise API client
   */
  constructor(config: Partial<ReadwiseConfig> = {}) {
    const token = getApiToken() ?? ""
    this.config = {
      ...DEFAULT_READWISE_CONFIG,
      ...config,
      apiToken: config.apiToken ?? token,
    }

    this.apisauce = create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Token ${this.config.apiToken}`,
      },
    })
  }

  /**
   * Check if the client has a valid API token configured
   */
  isAuthenticated(): boolean {
    return this.config.apiToken.length > 0
  }

  /**
   * Export highlights TO Readwise
   *
   * POST /api/v2/highlights/
   */
  async exportHighlights(
    highlights: ReadwiseHighlight[],
  ): Promise<ReadwiseResult<ExportHighlightsResponse[]>> {
    if (!this.isAuthenticated()) {
      return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
    }

    if (highlights.length === 0) {
      return { kind: "ok", data: [] }
    }

    const response: ApiResponse<ExportHighlightsResponse[]> = await this.apisauce.post(
      "/highlights/",
      { highlights } satisfies ExportHighlightsRequest,
    )

    if (!response.ok) {
      return { kind: "error", problem: getReadwiseProblem(response) }
    }

    return { kind: "ok", data: response.data ?? [] }
  }

  /**
   * Import highlights FROM Readwise
   *
   * GET /api/v2/export/
   *
   * Supports pagination with pageCursor parameter for large libraries
   */
  async importHighlights(
    config: ReadwiseSyncConfig = {},
  ): Promise<ReadwiseResult<ImportHighlightsResponse>> {
    if (!this.isAuthenticated()) {
      return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
    }

    const params: Record<string, string> = {}

    if (config.updatedAfter) {
      params.updatedAfter = config.updatedAfter
    }

    if (config.includeDeleted !== undefined) {
      params.includeDeleted = config.includeDeleted.toString()
    }

    if (config.category) {
      params.category = config.category
    }

    const response: ApiResponse<ImportHighlightsResponse> = await this.apisauce.get("/export/", params)

    if (!response.ok) {
      return { kind: "error", problem: getReadwiseProblem(response) }
    }

    if (!response.data) {
      return { kind: "error", problem: { kind: "bad-request", message: "Empty response from Readwise" } }
    }

    return { kind: "ok", data: response.data }
  }

  /**
   * Import all highlights with automatic pagination handling
   *
   * This method will fetch all pages of results and return the complete list
   */
  async importAllHighlights(
    config: ReadwiseSyncConfig = {},
    onProgress?: (imported: number, total: number) => void,
  ): Promise<ReadwiseResult<{ books: ReadwiseBook[]; highlights: ReadwiseImportedHighlight[] }>> {
    if (!this.isAuthenticated()) {
      return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
    }

    const allBooks: ReadwiseBook[] = []
    const allHighlights: ReadwiseImportedHighlight[] = []
    let nextCursor: string | null = null
    let hasMore = true
    let totalCount = 0

    do {
      const pageConfig: ReadwiseSyncConfig = {
        ...config,
        ...(nextCursor ? { pageCursor: nextCursor } : {}),
      }

      const result = await this.importHighlights(pageConfig)

      if (result.kind === "error") {
        // Save progress for resumable sync
        saveSyncState({
          lastSyncAt: getSyncState().lastSyncAt,
          lastSyncCount: allHighlights.length,
          nextPageCursor: nextCursor,
        })
        return { kind: "error", problem: result.problem }
      }

      const data = result.data
      totalCount = data.count

      // Collect books
      allBooks.push(...data.results)

      // Collect all highlights from each book
      for (const book of data.results) {
        const bookHighlights = await this.getHighlightsForBook(book.id)
        if (bookHighlights.kind === "ok") {
          allHighlights.push(...bookHighlights.data)
        }
      }

      nextCursor = data.next
      hasMore = nextCursor !== null

      if (onProgress) {
        onProgress(allHighlights.length, totalCount)
      }

      // Respect rate limits - small delay between requests
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } while (hasMore)

    // Update sync state
    saveSyncState({
      lastSyncAt: new Date().toISOString(),
      lastSyncCount: allHighlights.length,
      nextPageCursor: null,
    })

    return { kind: "ok", data: { books: allBooks, highlights: allHighlights } }
  }

  /**
   * Get highlights for a specific book
   *
   * GET /api/v2/books/{book_id}/highlights/
   */
  async getHighlightsForBook(
    bookId: string,
  ): Promise<ReadwiseResult<ReadwiseImportedHighlight[]>> {
    if (!this.isAuthenticated()) {
      return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
    }

    const response: ApiResponse<{ results: ReadwiseImportedHighlight[] }> =
      await this.apisauce.get(`/books/${bookId}/highlights/`)

    if (!response.ok) {
      return { kind: "error", problem: getReadwiseProblem(response) }
    }

    return { kind: "ok", data: response.data?.results ?? [] }
  }

  /**
   * Perform an incremental sync - only fetch highlights updated since last sync
   */
  async incrementalSync(
    onProgress?: (imported: number) => void,
  ): Promise<ReadwiseResult<{ books: ReadwiseBook[]; highlights: ReadwiseImportedHighlight[] }>> {
    const syncState = getSyncState()

    const config: ReadwiseSyncConfig = syncState.lastSyncAt
      ? { updatedAfter: syncState.lastSyncAt }
      : {}

    return this.importAllHighlights(config, onProgress)
  }

  /**
   * Test the API token by making a simple request
   */
  async verifyToken(): Promise<ReadwiseResult<boolean>> {
    if (!this.isAuthenticated()) {
      return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
    }

    const response = await this.apisauce.get("/auth/")

    if (response.status === 204) {
      return { kind: "ok", data: true }
    }

    return { kind: "error", problem: getReadwiseProblem(response) }
  }
}

/**
 * Convenience function to perform a full bidirectional sync
 *
 * This function:
 * 1. Imports highlights from Readwise that are new or updated
 * 2. Exports any local highlights that haven't been synced to Readwise
 */
export async function syncWithReadwise(options: {
  apiToken?: string
  direction?: "import" | "export" | "bidirectional"
  onProgress?: (stats: SyncStats) => void
} = {}): Promise<ReadwiseResult<SyncStats>> {
  const stats: SyncStats = {
    imported: 0,
    exported: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }

  const api = new ReadwiseApi(options.apiToken ? { apiToken: options.apiToken } : {})

  if (!api.isAuthenticated()) {
    return { kind: "error", problem: { kind: "unauthorized", message: "No API token configured" } }
  }

  const direction = options.direction ?? "bidirectional"

  try {
    // Import from Readwise
    if (direction === "import" || direction === "bidirectional") {
      const importResult = await api.incrementalSync((imported) => {
        stats.imported = imported
        options.onProgress?.(stats)
      })

      if (importResult.kind === "error") {
        return { kind: "error", problem: importResult.problem }
      }

      stats.imported = importResult.data.highlights.length
    }

    // TODO: Export TO Readwise - requires integration with local highlights storage
    // This would need to be implemented based on how highlights are stored in the app
    if (direction === "export" || direction === "bidirectional") {
      // Placeholder for export functionality
      // Would need to:
      // 1. Query local highlights that haven't been exported
      // 2. Convert to ReadwiseHighlight format
      // 3. Call api.exportHighlights()
    }

    stats.completedAt = new Date().toISOString()
    return { kind: "ok", data: stats }
  } catch (error) {
    stats.errors += 1
    return {
      kind: "error",
      problem: {
        kind: "unknown",
        message: error instanceof Error ? error.message : "Sync failed",
      },
    }
  }
}

// Singleton instance for convenience
export const readwiseApi = new ReadwiseApi()
