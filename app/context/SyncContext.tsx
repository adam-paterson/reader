/**
 * Sync Context
 *
 * React context for cloud synchronization state and operations.
 * Provides sync status, pending changes, and conflict resolution.
 */

import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import {
  syncEngine,
  SyncState,
  SyncConflict,
  SyncDocument,
  SyncBookmark,
  SyncReadingSession,
} from "@/services/sync"

import { useAuth } from "./AuthContext"

export interface SyncContextType {
  // State
  isInitialized: boolean
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt?: string
  pendingChanges: number
  conflicts: SyncConflict[]
  error?: string

  // Actions
  sync: () => Promise<{ success: boolean; conflicts?: SyncConflict[]; error?: string }>
  fullSync: () => Promise<{ success: boolean; error?: string }>
  resolveConflicts: (resolutions: SyncConflict[]) => Promise<{ success: boolean; error?: string }>
  setOnlineStatus: (isOnline: boolean) => void

  // Document operations
  createDocument: (
    document: Omit<
      SyncDocument,
      "id" | "userId" | "createdAt" | "updatedAt" | "version" | "syncStatus"
    >,
  ) => Promise<SyncDocument>
  updateDocument: (document: SyncDocument, updates: Partial<SyncDocument>) => Promise<SyncDocument>
  deleteDocument: (document: SyncDocument) => Promise<void>

  // Bookmark operations
  createBookmark: (
    bookmark: Omit<SyncBookmark, "id" | "userId" | "createdAt" | "updatedAt" | "syncStatus">,
  ) => Promise<SyncBookmark>
  updateBookmark: (bookmark: SyncBookmark, updates: Partial<SyncBookmark>) => Promise<SyncBookmark>
  deleteBookmark: (bookmark: SyncBookmark) => Promise<void>

  // Reading session operations
  createReadingSession: (
    session: Omit<SyncReadingSession, "id" | "userId" | "syncStatus">,
  ) => Promise<SyncReadingSession>
}

export const SyncContext = createContext<SyncContextType | null>(null)

export interface SyncProviderProps {}

export const SyncProvider: FC<PropsWithChildren<SyncProviderProps>> = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [state, setState] = useState<SyncState>({
    isInitialized: false,
    isOnline: true,
    isSyncing: false,
    pendingChanges: 0,
    conflicts: [],
  })

  // Subscribe to sync engine state
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newState) => {
      setState(newState)
    })

    return unsubscribe
  }, [])

  // Initialize sync engine when authenticated
  useEffect(() => {
    if (isAuthenticated && !state.isInitialized) {
      void syncEngine.initialize()
    }
  }, [isAuthenticated, state.isInitialized])

  // Auto-sync on authentication
  useEffect(() => {
    if (isAuthenticated && state.isOnline && !state.isSyncing && state.pendingChanges > 0) {
      void syncEngine.sync()
    }
  }, [isAuthenticated, state.isOnline, state.isSyncing, state.pendingChanges])

  const sync = useCallback(async () => {
    if (!isAuthenticated) {
      return { success: false, error: "Not authenticated" }
    }
    return syncEngine.sync()
  }, [isAuthenticated])

  const fullSync = useCallback(async () => {
    if (!isAuthenticated) {
      return { success: false, error: "Not authenticated" }
    }
    const result = await syncEngine.fullSync()
    return { success: result.success, error: result.error }
  }, [isAuthenticated])

  const resolveConflicts = useCallback(async (resolutions: SyncConflict[]) => {
    return syncEngine.resolveConflicts(resolutions)
  }, [])

  const setOnlineStatus = useCallback((isOnline: boolean) => {
    syncEngine.setOnlineStatus(isOnline)
  }, [])

  // Document operations
  const createDocument = useCallback(
    async (
      document: Omit<
        SyncDocument,
        "id" | "userId" | "createdAt" | "updatedAt" | "version" | "syncStatus"
      >,
    ) => {
      if (!user?.id) throw new Error("User not authenticated")
      return syncEngine.createDocument(user.id, document)
    },
    [user],
  )

  const updateDocument = useCallback(
    async (document: SyncDocument, updates: Partial<SyncDocument>) => {
      return syncEngine.updateDocument(document, updates)
    },
    [],
  )

  const deleteDocument = useCallback(async (document: SyncDocument) => {
    return syncEngine.deleteDocument(document)
  }, [])

  // Bookmark operations
  const createBookmark = useCallback(
    async (
      bookmark: Omit<SyncBookmark, "id" | "userId" | "createdAt" | "updatedAt" | "syncStatus">,
    ) => {
      if (!user?.id) throw new Error("User not authenticated")
      return syncEngine.createBookmark(user.id, bookmark)
    },
    [user],
  )

  const updateBookmark = useCallback(
    async (bookmark: SyncBookmark, updates: Partial<SyncBookmark>) => {
      return syncEngine.updateBookmark(bookmark, updates)
    },
    [],
  )

  const deleteBookmark = useCallback(async (bookmark: SyncBookmark) => {
    return syncEngine.deleteBookmark(bookmark)
  }, [])

  // Reading session operations
  const createReadingSession = useCallback(
    async (session: Omit<SyncReadingSession, "id" | "userId" | "syncStatus">) => {
      if (!user?.id) throw new Error("User not authenticated")
      return syncEngine.createReadingSession(user.id, session)
    },
    [user],
  )

  const value: SyncContextType = {
    // State
    ...state,

    // Actions
    sync,
    fullSync,
    resolveConflicts,
    setOnlineStatus,

    // Document operations
    createDocument,
    updateDocument,
    deleteDocument,

    // Bookmark operations
    createBookmark,
    updateBookmark,
    deleteBookmark,

    // Reading session operations
    createReadingSession,
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export const useSync = () => {
  const context = useContext(SyncContext)
  if (!context) throw new Error("useSync must be used within a SyncProvider")
  return context
}
