/**
 * Cloud Sync Types
 *
 * Type definitions for cloud synchronization with Cloudflare Workers,
 * D1 database, and R2 storage.
 */

export interface SyncDocument {
  id: string
  userId: string
  title: string
  content?: string
  contentUrl?: string
  wordCount: number
  source?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  localPath?: string
  syncStatus: SyncStatus
  version: number
}

export interface SyncBookmark {
  id: string
  documentId: string
  userId: string
  position: number
  text?: string
  note?: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface SyncReadingSession {
  id: string
  documentId: string
  userId: string
  startedAt: string
  endedAt?: string
  wordsRead: number
  finalWpm: number
  progress: number
  syncStatus: SyncStatus
}

export type SyncStatus = "pending" | "syncing" | "synced" | "error" | "conflict"

export interface SyncCheckpoint {
  id: string
  userId: string
  deviceId: string
  timestamp: string
  documentVersions: Record<string, number>
  lastSequence: number
}

export interface SyncPullResult {
  documents: SyncDocument[]
  bookmarks: SyncBookmark[]
  sessions: SyncReadingSession[]
  checkpoint: SyncCheckpoint
  hasMore: boolean
}

export interface SyncPushPayload {
  documents: SyncDocument[]
  bookmarks: SyncBookmark[]
  sessions: SyncReadingSession[]
  checkpoint: SyncCheckpoint
}

export interface SyncConflict {
  type: "document" | "bookmark" | "session"
  id: string
  localVersion: unknown
  remoteVersion: unknown
  resolved?: unknown
}

export interface UserProfile {
  id: string
  email: string
  supabaseId: string
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  defaultWpm: number
  defaultChunkSize: number
  theme: "light" | "dark" | "system"
  autoSync: boolean
  syncOnWifiOnly: boolean
}

export interface SyncState {
  isInitialized: boolean
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt?: string
  pendingChanges: number
  conflicts: SyncConflict[]
  error?: string
}
