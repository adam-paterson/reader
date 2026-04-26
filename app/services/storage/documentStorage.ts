/**
 * Document Storage
 * 
 * Offline-first document storage with local caching and cloud sync.
 * Uses MMKV for fast local storage with sync engine integration.
 */

import { storage } from "@/utils/storage"
import type { SyncDocument, SyncBookmark, SyncReadingSession } from "@/services/sync"

// Storage keys
const STORAGE_KEYS = {
  documents: "documents.list",
  documentContent: (id: string) => `document.content.${id}`,
  bookmarks: (documentId: string) => `bookmarks.${documentId}`,
  readingProgress: (documentId: string) => `reading.progress.${documentId}`,
  readingStats: "reading.stats",
} as const

interface ReadingProgress {
  documentId: string
  currentWord: number
  totalWords: number
  lastReadAt: string
  wpm: number
}

interface ReadingStats {
  totalWordsRead: number
  totalTimeMinutes: number
  sessionsCount: number
  streakDays: number
  lastReadDate: string
}

class DocumentStorage {
  /**
   * Get all documents from local storage
   */
  getDocuments(): SyncDocument[] {
    const data = storage.getString(STORAGE_KEYS.documents)
    return data ? (JSON.parse(data) as SyncDocument[]) : []
  }

  /**
   * Save documents to local storage
   */
  saveDocuments(documents: SyncDocument[]): void {
    storage.set(STORAGE_KEYS.documents, JSON.stringify(documents))
  }

  /**
   * Get a single document by ID
   */
  getDocument(id: string): SyncDocument | null {
    const documents = this.getDocuments()
    return documents.find((d) => d.id === id) || null
  }

  /**
   * Add or update a document
   */
  upsertDocument(document: SyncDocument): void {
    const documents = this.getDocuments()
    const existingIndex = documents.findIndex((d) => d.id === document.id)

    if (existingIndex >= 0) {
      documents[existingIndex] = document
    } else {
      documents.push(document)
    }

    this.saveDocuments(documents)
  }

  /**
   * Remove a document
   */
  removeDocument(id: string): void {
    const documents = this.getDocuments().filter((d) => d.id !== id)
    this.saveDocuments(documents)
    
    // Also remove content
    storage.delete(STORAGE_KEYS.documentContent(id))
    storage.delete(STORAGE_KEYS.bookmarks(id))
    storage.delete(STORAGE_KEYS.readingProgress(id))
  }

  /**
   * Get document content
   */
  getDocumentContent(id: string): string | null {
    return storage.getString(STORAGE_KEYS.documentContent(id)) ?? null
  }

  /**
   * Save document content
   */
  saveDocumentContent(id: string, content: string): void {
    storage.set(STORAGE_KEYS.documentContent(id), content)
  }

  /**
   * Get bookmarks for a document
   */
  getBookmarks(documentId: string): SyncBookmark[] {
    const data = storage.getString(STORAGE_KEYS.bookmarks(documentId))
    return data ? (JSON.parse(data) as SyncBookmark[]) : []
  }

  /**
   * Save bookmarks for a document
   */
  saveBookmarks(documentId: string, bookmarks: SyncBookmark[]): void {
    storage.set(STORAGE_KEYS.bookmarks(documentId), JSON.stringify(bookmarks))
  }

  /**
   * Add a bookmark
   */
  addBookmark(documentId: string, bookmark: SyncBookmark): void {
    const bookmarks = this.getBookmarks(documentId)
    bookmarks.push(bookmark)
    this.saveBookmarks(documentId, bookmarks)
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(documentId: string, bookmarkId: string): void {
    const bookmarks = this.getBookmarks(documentId).filter((b) => b.id !== bookmarkId)
    this.saveBookmarks(documentId, bookmarks)
  }

  /**
   * Get reading progress for a document
   */
  getReadingProgress(documentId: string): ReadingProgress | null {
    const data = storage.getString(STORAGE_KEYS.readingProgress(documentId))
    return data ? (JSON.parse(data) as ReadingProgress) : null
  }

  /**
   * Save reading progress
   */
  saveReadingProgress(progress: ReadingProgress): void {
    storage.set(STORAGE_KEYS.readingProgress(progress.documentId), JSON.stringify(progress))
  }

  /**
   * Get reading stats
   */
  getReadingStats(): ReadingStats {
    const data = storage.getString(STORAGE_KEYS.readingStats)
    return (
      data
        ? (JSON.parse(data) as ReadingStats)
        : {
            totalWordsRead: 0,
            totalTimeMinutes: 0,
            sessionsCount: 0,
            streakDays: 0,
            lastReadDate: "",
          }
    )
  }

  /**
   * Update reading stats
   */
  updateReadingStats(wordsRead: number, minutes: number): void {
    const stats = this.getReadingStats()
    const today = new Date().toISOString().split("T")[0]
    
    // Check if this is a new day for streak calculation
    const lastRead = stats.lastReadDate
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    
    if (lastRead === yesterday) {
      // Continued streak
      stats.streakDays += 1
    } else if (lastRead !== today) {
      // Streak broken or first time
      stats.streakDays = 1
    }
    
    stats.totalWordsRead += wordsRead
    stats.totalTimeMinutes += minutes
    stats.sessionsCount += 1
    stats.lastReadDate = today
    
    storage.set(STORAGE_KEYS.readingStats, JSON.stringify(stats))
  }

  /**
   * Search documents by title or content
   */
  searchDocuments(query: string): SyncDocument[] {
    const documents = this.getDocuments()
    const lowerQuery = query.toLowerCase()
    
    return documents.filter((doc) => {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery)
      const sourceMatch = doc.source?.toLowerCase().includes(lowerQuery) ?? false
      
      // Optionally search content (expensive, do only if needed)
      // const content = this.getDocumentContent(doc.id)
      // const contentMatch = content?.toLowerCase().includes(lowerQuery) ?? false
      
      return titleMatch || sourceMatch
    })
  }

  /**
   * Clear all document storage (logout/cleanup)
   */
  clear(): void {
    const documentIds = this.getDocuments().map((d) => d.id)
    
    // Clear document list
    storage.delete(STORAGE_KEYS.documents)
    storage.delete(STORAGE_KEYS.readingStats)
    
    // Clear all document-specific data
    documentIds.forEach((id) => {
      storage.delete(STORAGE_KEYS.documentContent(id))
      storage.delete(STORAGE_KEYS.bookmarks(id))
      storage.delete(STORAGE_KEYS.readingProgress(id))
    })
  }

  /**
   * Get storage statistics
   */
  getStats(): { documentCount: number; totalSize: number } {
    const documents = this.getDocuments()
    
    // Rough estimate of storage size
    let totalSize = 0
    documents.forEach((doc) => {
      const content = this.getDocumentContent(doc.id)
      if (content) {
        totalSize += content.length * 2 // UTF-16 estimate
      }
    })
    
    return {
      documentCount: documents.length,
      totalSize,
    }
  }
}

export const documentStorage = new DocumentStorage()
export type { ReadingProgress, ReadingStats }
