/**
 * Sync Engine
 *
 * Core synchronization logic with offline support.
 * Manages sync queue, conflict resolution, and data consistency.
 */

import { cloudflareApi } from "@/services/cloudflare"
import { storage } from "@/utils/storage"

import type {
  SyncDocument,
  SyncBookmark,
  SyncReadingSession,
  SyncCheckpoint,
  SyncPullResult,
  SyncPushPayload,
  SyncConflict,
  SyncState,
} from "./types"

// Storage keys
const SYNC_KEYS = {
  checkpoint: "sync.checkpoint",
  pendingDocuments: "sync.pending.documents",
  pendingBookmarks: "sync.pending.bookmarks",
  pendingSessions: "sync.pending.sessions",
  deviceId: "sync.device.id",
  lastSyncAt: "sync.lastSyncAt",
} as const

// Generate unique device ID
const getDeviceId = (): string => {
  let deviceId = storage.getString(SYNC_KEYS.deviceId)
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    storage.set(SYNC_KEYS.deviceId, deviceId)
  }
  return deviceId
}

// Generate UUID v4
const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface PendingChanges {
  documents: SyncDocument[]
  bookmarks: SyncBookmark[]
  sessions: SyncReadingSession[]
}

class SyncEngine {
  private state: SyncState = {
    isInitialized: false,
    isOnline: true,
    isSyncing: false,
    pendingChanges: 0,
    conflicts: [],
  }

  private listeners: Set<(state: SyncState) => void> = new Set()

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) return

    // Load any pending changes from storage
    const pending = this.getPendingChanges()
    this.state = {
      ...this.state,
      isInitialized: true,
      pendingChanges: this.countPendingChanges(pending),
    }

    this.notifyListeners()
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback)
    callback(this.state)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.state))
  }

  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    this.updateState({ isOnline })
    if (isOnline && this.state.pendingChanges > 0) {
      // Auto-sync when coming back online
      void this.sync()
    }
  }

  // ==================== Local Data Management ====================

  private getPendingChanges(): PendingChanges {
    return {
      documents: storage.getString(SYNC_KEYS.pendingDocuments)
        ? (JSON.parse(storage.getString(SYNC_KEYS.pendingDocuments)!) as SyncDocument[])
        : [],
      bookmarks: storage.getString(SYNC_KEYS.pendingBookmarks)
        ? (JSON.parse(storage.getString(SYNC_KEYS.pendingBookmarks)!) as SyncBookmark[])
        : [],
      sessions: storage.getString(SYNC_KEYS.pendingSessions)
        ? (JSON.parse(storage.getString(SYNC_KEYS.pendingSessions)!) as SyncReadingSession[])
        : [],
    }
  }

  private savePendingChanges(pending: PendingChanges): void {
    storage.set(SYNC_KEYS.pendingDocuments, JSON.stringify(pending.documents))
    storage.set(SYNC_KEYS.pendingBookmarks, JSON.stringify(pending.bookmarks))
    storage.set(SYNC_KEYS.pendingSessions, JSON.stringify(pending.sessions))

    this.updateState({
      pendingChanges: this.countPendingChanges(pending),
    })
  }

  private countPendingChanges(pending: PendingChanges): number {
    return pending.documents.length + pending.bookmarks.length + pending.sessions.length
  }

  private getCheckpoint(): SyncCheckpoint | undefined {
    const data = storage.getString(SYNC_KEYS.checkpoint)
    return data ? (JSON.parse(data) as SyncCheckpoint) : undefined
  }

  private saveCheckpoint(checkpoint: SyncCheckpoint): void {
    storage.set(SYNC_KEYS.checkpoint, JSON.stringify(checkpoint))
  }

  // ==================== Document Operations ====================

  async createDocument(
    userId: string,
    document: Omit<
      SyncDocument,
      "id" | "userId" | "createdAt" | "updatedAt" | "version" | "syncStatus"
    >,
  ): Promise<SyncDocument> {
    const now = new Date().toISOString()
    const newDoc: SyncDocument = {
      ...document,
      id: generateId(),
      userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    pending.documents.push(newDoc)
    this.savePendingChanges(pending)

    // Try to sync immediately if online
    if (this.state.isOnline) {
      void this.sync()
    }

    return newDoc
  }

  async updateDocument(
    document: SyncDocument,
    updates: Partial<SyncDocument>,
  ): Promise<SyncDocument> {
    const now = new Date().toISOString()
    const updatedDoc: SyncDocument = {
      ...document,
      ...updates,
      updatedAt: now,
      version: document.version + 1,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    const existingIndex = pending.documents.findIndex((d) => d.id === document.id)

    if (existingIndex >= 0) {
      // Merge with existing pending changes
      pending.documents[existingIndex] = updatedDoc
    } else {
      pending.documents.push(updatedDoc)
    }

    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }

    return updatedDoc
  }

  async deleteDocument(document: SyncDocument): Promise<void> {
    const now = new Date().toISOString()
    const deletedDoc: SyncDocument = {
      ...document,
      deletedAt: now,
      updatedAt: now,
      version: document.version + 1,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    const existingIndex = pending.documents.findIndex((d) => d.id === document.id)

    if (existingIndex >= 0) {
      pending.documents[existingIndex] = deletedDoc
    } else {
      pending.documents.push(deletedDoc)
    }

    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }
  }

  // ==================== Bookmark Operations ====================

  async createBookmark(
    userId: string,
    bookmark: Omit<SyncBookmark, "id" | "userId" | "createdAt" | "updatedAt" | "syncStatus">,
  ): Promise<SyncBookmark> {
    const now = new Date().toISOString()
    const newBookmark: SyncBookmark = {
      ...bookmark,
      id: generateId(),
      userId,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    pending.bookmarks.push(newBookmark)
    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }

    return newBookmark
  }

  async updateBookmark(
    bookmark: SyncBookmark,
    updates: Partial<SyncBookmark>,
  ): Promise<SyncBookmark> {
    const now = new Date().toISOString()
    const updatedBookmark: SyncBookmark = {
      ...bookmark,
      ...updates,
      updatedAt: now,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    const existingIndex = pending.bookmarks.findIndex((b) => b.id === bookmark.id)

    if (existingIndex >= 0) {
      pending.bookmarks[existingIndex] = updatedBookmark
    } else {
      pending.bookmarks.push(updatedBookmark)
    }

    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }

    return updatedBookmark
  }

  async deleteBookmark(bookmark: SyncBookmark): Promise<void> {
    const pending = this.getPendingChanges()
    pending.bookmarks = pending.bookmarks.filter((b) => b.id !== bookmark.id)
    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }
  }

  // ==================== Reading Session Operations ====================

  async createReadingSession(
    userId: string,
    session: Omit<SyncReadingSession, "id" | "userId" | "syncStatus">,
  ): Promise<SyncReadingSession> {
    const newSession: SyncReadingSession = {
      ...session,
      id: generateId(),
      userId,
      syncStatus: "pending",
    }

    const pending = this.getPendingChanges()
    pending.sessions.push(newSession)
    this.savePendingChanges(pending)

    if (this.state.isOnline) {
      void this.sync()
    }

    return newSession
  }

  // ==================== Sync Operations ====================

  async sync(): Promise<{ success: boolean; conflicts?: SyncConflict[]; error?: string }> {
    if (this.state.isSyncing || !this.state.isOnline) {
      return { success: false, error: "Sync already in progress or offline" }
    }

    this.updateState({ isSyncing: true, error: undefined })

    try {
      // 1. Pull remote changes
      const checkpoint = this.getCheckpoint()
      const pullResult = await cloudflareApi.pullChanges(checkpoint)

      if (pullResult.kind !== "ok") {
        throw new Error(`Pull failed: ${pullResult.kind}`)
      }

      // 2. Get local pending changes
      const pending = this.getPendingChanges()

      // 3. Merge remote changes into local storage (handled by calling code)
      // For now, we just track what was pulled

      // 4. Push local changes
      const deviceId = getDeviceId()
      const pushPayload: SyncPushPayload = {
        documents: pending.documents,
        bookmarks: pending.bookmarks,
        sessions: pending.sessions,
        checkpoint: {
          id: generateId(),
          userId: pending.documents[0]?.userId || pending.bookmarks[0]?.userId || "",
          deviceId,
          timestamp: new Date().toISOString(),
          documentVersions: {},
          lastSequence: 0,
        },
      }

      const pushResult = await cloudflareApi.pushChanges(pushPayload)

      if (pushResult.kind !== "ok") {
        throw new Error(`Push failed: ${pushResult.kind}`)
      }

      // 5. Save new checkpoint
      this.saveCheckpoint(pushResult.checkpoint)
      storage.set(SYNC_KEYS.lastSyncAt, new Date().toISOString())

      // 6. Clear pending changes that were synced
      this.savePendingChanges({
        documents: [],
        bookmarks: [],
        sessions: [],
      })

      // 7. Handle conflicts
      if (pushResult.conflicts.length > 0) {
        this.updateState({
          conflicts: pushResult.conflicts,
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
        })
        return { success: true, conflicts: pushResult.conflicts }
      }

      this.updateState({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed"
      this.updateState({
        isSyncing: false,
        error: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Force a full sync (pull all data from server)
   */
  async fullSync(): Promise<{ success: boolean; data?: SyncPullResult; error?: string }> {
    if (this.state.isSyncing || !this.state.isOnline) {
      return { success: false, error: "Sync already in progress or offline" }
    }

    this.updateState({ isSyncing: true, error: undefined })

    try {
      // Clear checkpoint to get all data
      const pullResult = await cloudflareApi.pullChanges(undefined, 1000)

      if (pullResult.kind !== "ok") {
        throw new Error(`Full sync failed: ${pullResult.kind}`)
      }

      this.updateState({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      })

      return { success: true, data: pullResult.result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Full sync failed"
      this.updateState({
        isSyncing: false,
        error: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(
    resolutions: SyncConflict[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await cloudflareApi.resolveConflicts(resolutions)

      if (result.kind !== "ok") {
        throw new Error("Failed to resolve conflicts")
      }

      // Remove resolved conflicts from state
      const remainingConflicts = this.state.conflicts.filter(
        (c) => !resolutions.find((r) => r.id === c.id && r.type === c.type),
      )

      this.updateState({ conflicts: remainingConflicts })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Conflict resolution failed"
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return this.state
  }

  /**
   * Clear all sync data (logout)
   */
  async clear(): Promise<void> {
    storage.delete(SYNC_KEYS.checkpoint)
    storage.delete(SYNC_KEYS.pendingDocuments)
    storage.delete(SYNC_KEYS.pendingBookmarks)
    storage.delete(SYNC_KEYS.pendingSessions)
    storage.delete(SYNC_KEYS.lastSyncAt)

    this.state = {
      isInitialized: false,
      isOnline: true,
      isSyncing: false,
      pendingChanges: 0,
      conflicts: [],
    }

    this.notifyListeners()
  }
}

export const syncEngine = new SyncEngine()
