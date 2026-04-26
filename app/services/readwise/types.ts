/**
 * Readwise API Types
 *
 * Based on Readwise API documentation: https://readwise.io/api_deets
 * Supports two-way sync: export highlights TO Readwise, import highlights FROM Readwise
 */

/**
 * Readwise API Configuration
 */
export interface ReadwiseConfig {
  /** Readwise API base URL */
  baseURL: string
  /** User's Readwise API token */
  apiToken: string
  /** Request timeout in milliseconds */
  timeout: number
}

/**
 * Default Readwise API configuration
 */
export const DEFAULT_READWISE_CONFIG: ReadwiseConfig = {
  baseURL: "https://readwise.io/api/v2",
  apiToken: "",
  timeout: 30000,
}

/**
 * Readwise highlight categories
 */
export type ReadwiseCategory = "books" | "articles" | "tweets" | "podcasts"

/**
 * Highlight data structure for exporting TO Readwise
 */
export interface ReadwiseHighlight {
  /** The highlighted text (required) */
  text: string
  /** Title of the book/article */
  title?: string
  /** Author name */
  author?: string
  /** Source URL for articles/web content */
  source_url?: string
  /** User's note attached to highlight */
  note?: string
  /** ISO8601 timestamp when highlight was created */
  highlighted_at?: string
  /** Category of the highlight */
  category?: ReadwiseCategory
}

/**
 * Request body for creating highlights in Readwise
 */
export interface ExportHighlightsRequest {
  highlights: ReadwiseHighlight[]
}

/**
 * Response from creating highlights in Readwise
 */
export interface ExportHighlightsResponse {
  id: string
  title: string
  author: string
  category: ReadwiseCategory
  source_url?: string
  num_highlights: number
  last_highlight_at: string | null
  updated: string
  cover_image_url?: string
  highlights_url?: string
  source_file_id?: string
  modified_highlights?: string[]
}

/**
 * A single highlight from Readwise (imported FROM Readwise)
 */
export interface ReadwiseImportedHighlight {
  /** Unique ID from Readwise */
  id: string
  /** The highlighted text content */
  text: string
  /** User's note */
  note: string
  /** Book/article title */
  book_title: string
  /** Author name */
  author: string
  /** Highlight category */
  category: ReadwiseCategory
  /** Source URL */
  source_url?: string
  /** ISO8601 timestamp */
  highlighted_at: string | null
  /** ISO8601 timestamp */
  created_at: string
  /** ISO8601 timestamp */
  updated_at: string
  /** URL to view in Readwise */
  readwise_url: string
  /** Book unique ID */
  book_id: string
}

/**
 * A book/document from Readwise
 */
export interface ReadwiseBook {
  id: string
  title: string
  author: string
  category: ReadwiseCategory
  source: string
  num_highlights: number
  last_highlight_at: string | null
  updated: string
  cover_image_url?: string
  highlights_url?: string
  source_url?: string
  asin?: string
  tags: string[]
}

/**
 * Response from importing highlights from Readwise (GET /export/)
 */
export interface ImportHighlightsResponse {
  /** Total count of results */
  count: number
  /** URL for next page of results */
  next: string | null
  /** URL for previous page of results */
  previous: string | null
  /** List of books with their highlights */
  results: ReadwiseBook[]
}

/**
 * Sync configuration for incremental updates
 */
export interface ReadwiseSyncConfig {
  /** ISO8601 date string - only fetch highlights updated after this time */
  updatedAfter?: string
  /** Include deleted highlights */
  includeDeleted?: boolean
  /** Category filter */
  category?: ReadwiseCategory
}

/**
 * Stored sync state for tracking last sync time
 */
export interface ReadwiseSyncState {
  /** Last successful sync timestamp (ISO8601) */
  lastSyncAt: string | null
  /** Number of highlights synced in last operation */
  lastSyncCount: number
  /** Cursor for pagination (if interrupted) */
  nextPageCursor: string | null
}

/**
 * Storage keys for Readwise data
 */
export const READWISE_STORAGE_KEYS = {
  /** Encrypted API token */
  API_TOKEN: "readwise.api_token",
  /** Last sync state */
  SYNC_STATE: "readwise.sync_state",
  /** Sync enabled flag */
  SYNC_ENABLED: "readwise.sync_enabled",
} as const

/**
 * API Problem types for Readwise errors
 */
export type ReadwiseApiProblem =
  | { kind: "unauthorized"; message: string }
  | { kind: "rate-limited"; retryAfter: number }
  | { kind: "network"; message: string }
  | { kind: "server"; message: string }
  | { kind: "unknown"; message: string }
  | { kind: "timeout" }
  | { kind: "bad-request"; message: string }

/**
 * Result type for Readwise operations
 */
export type ReadwiseResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "error"; problem: ReadwiseApiProblem }

/**
 * Sync direction for two-way sync
 */
export type SyncDirection = "import" | "export" | "bidirectional"

/**
 * Sync statistics
 */
export interface SyncStats {
  imported: number
  exported: number
  errors: number
  startedAt: string
  completedAt: string | null
}
