# RSVP Engine Data Model Design

> **Document ID**: READ-DATA-001  
> **Status**: Complete (v2.0)  
> **Date**: 2026-04-26  
> **Related**: READ-001 (RSVP Core Engine), re-t2h (Cloud Sync)
> 
> **Changelog**:
> - v2.0: Updated with Cloud Sync architecture (D1, R2, Cloudflare Workers)
> - v1.0: Initial data model with MMKV/SQLite storage

---

## Executive Summary

This document proposes a comprehensive data model for the RSVP Engine, covering current structures, proposed enhancements, storage strategies, and migration paths. The design balances performance (60fps target), persistence requirements, and future extensibility.

---

## 1. Current Data Structures

### 1.1 Core Types (Existing)

```typescript
// Word Tokenization
interface WordToken {
  text: string;      // The text content of the token
  index: number;     // Position in sequence (0-based)
}

// Optimal Recognition Point
interface ORPPosition {
  index: number;      // Character index (0-based)
  character: string;  // Character at ORP position
}

// Timing Configuration
interface TimingConfig {
  baseWPM: number;
  punctuationDelays: {
    period: number;      // ms delay for "."
    comma: number;       // ms delay for ","
    semicolon: number;   // ms delay for ";" or ":"
    other: number;       // ms delay for other punctuation
  };
  wordLengthMultipliers: {
    short: number;   // < 5 chars
    medium: number;  // 5-8 chars
    long: number;    // > 8 chars
  };
}

// Component Props
interface RSVPReaderProps {
  text: string;
  wpm?: number;              // Default: 300
  onComplete?: () => void;
  onProgress?: (current: number, total: number) => void;
  onWordChange?: (word: string, index: number) => void;
  fontSize?: number;         // Default: 48
  autoStart?: boolean;       // Default: true
  style?: ViewStyle;
  testID?: string;
}
```

### 1.2 Current Persistence Layer (MMKV)

| Key | Type | Purpose |
|-----|------|---------|
| `Reader.text` | string | Current reading text |
| `Reader.speed` | number | WPM setting (100-1000) |
| `Reader.chunkSize` | number | Words per display (1-3) |

**Limitations of Current Model:**
- No reading history or analytics
- No user preferences beyond speed/chunk
- No document metadata (title, source, added date)
- No reading session tracking
- No statistics (words read, time spent, completion rate)

---

## 2. Proposed Enhanced Data Model

### 2.1 Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   UserProfile   │────▶│  ReadingSession  │◀────│    Document     │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id: PK          │     │ id: PK           │     │ id: PK          │
│ supabaseId: idx │     │ documentId: FK   │     │ userId: FK      │
│ email: string   │     │ userId: FK       │     │ title: string   │
│ preferences: FK │     │ startedAt: ts    │     │ content: text │
└────────┬────────┘     │ endedAt: ts        │     │ wordCount: int  │
         │              │ wordsRead: int     │     │ source: string  │
         │              │ finalWpm: int      │     │ createdAt: ts   │
         │              │ progress: %        │     │ syncStatus: enum│
         │              │ syncStatus: enum   │     │ version: int    │
         │              └──────────────────┘     └────────┬────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                              ┌─────────────────┐
│ UserPreferences │                              │    Bookmark     │
├─────────────────┤                              ├─────────────────┤
│ defaultWpm: int │                              │ id: PK          │
│ defaultChunk: int│                             │ documentId: FK  │
│ theme: enum     │                              │ userId: FK      │
│ orpEnabled: bool│                              │ position: int   │
│ autoSync: bool  │                              │ text: string    │
│ syncOnWifiOnly  │                              │ note: string    │
└─────────────────┘                              │ syncStatus: enum│
                                                 └─────────────────┘

┌─────────────────┐
│ SyncCheckpoint  │
├─────────────────┤
│ id: PK          │
│ userId: FK      │
│ deviceId: string│
│ timestamp: ts   │
│ lastSequence: int
└─────────────────┘
```

### 2.2 Detailed Schema Definitions

#### 2.2.1 Document (Reading Material)

```typescript
interface Document {
  /** UUID v4 primary key */
  id: string;
  
  /** User ID for multi-user support */
  userId: string;
  
  /** Display title (auto-generated or user-defined) */
  title: string;
  
  /** Full text content (optional if contentUrl provided) */
  content?: string;
  
  /** URL to content for large documents (R2 storage) */
  contentUrl?: string;
  
  /** Local file path for offline access */
  localPath?: string;
  
  /** Cached word count (denormalized for performance) */
  wordCount: number;
  
  /** Source URL or import method */
  source?: string;
  
  /** ISO 8601 timestamp */
  createdAt: string;
  
  /** Last modified timestamp */
  updatedAt: string;
  
  /** Soft delete timestamp */
  deletedAt?: string;
  
  /** User-defined tags for organization */
  tags: string[];
  
  /** Reading difficulty estimate (Flesch-Kincaid) */
  difficulty?: number;
  
  /** Estimated reading time at 300 WPM (seconds) */
  estimatedReadTime: number;
  
  /** Current reading position (0-based word index) */
  bookmarkPosition: number;
  
  /** Completion status */
  status: 'unread' | 'reading' | 'completed' | 'archived';
  
  /** Sync state for cloud synchronization */
  syncStatus: SyncStatus;
  
  /** Version for conflict resolution */
  version: number;
}

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';

// Validation Constraints
type DocumentConstraints = {
  title: { min: 1, max: 200 };
  content: { max: 1000000 }; // ~1MB text
  tags: { max: 10, itemMax: 30 };
};
```

#### 2.2.2 Reading Session (Analytics)

```typescript
interface ReadingSession {
  /** UUID v4 primary key */
  id: string;
  
  /** Reference to Document */
  documentId: string;
  
  /** User ID for multi-user support */
  userId: string;
  
  /** Session start timestamp */
  startedAt: string;
  
  /** Session end timestamp (null if active) */
  endedAt?: string;
  
  /** Starting word position */
  startPosition: number;
  
  /** Ending word position */
  endPosition: number;
  
  /** Words displayed during session */
  wordsRead: number;
  
  /** Average WPM during session */
  averageWPM: number;
  
  /** Final WPM at session end */
  finalWpm: number;
  
  /** Progress percentage (0-1) */
  progress: number;
  
  /** WPM settings used (may vary during session) */
  wpmHistory: Array<{
    timestamp: string;
    wpm: number;
  }>;
  
  /** Pause events for attention analysis */
  pauses: Array<{
    wordIndex: number;
    duration: number; // seconds
    timestamp: string;
  }>;
  
  /** Backward navigation events (indicates confusion/review) */
  rewinds: Array<{
    fromIndex: number;
    toIndex: number;
    timestamp: string;
  }>;
  
  /** Completion percentage (0-1) */
  completionPercent: number;
  
  /** Session was completed */
  completed: boolean;
  
  /** Sync state for cloud synchronization */
  syncStatus: SyncStatus;
}
```

#### 2.2.3 User Preferences

```typescript
interface UserPreferences {
  /** Default reading speed (100-1000) */
  defaultWpm: number;
  
  /** Default chunk size (1-3) */
  defaultChunkSize: number;
  
  /** Visual theme preference */
  theme: 'light' | 'dark' | 'system';
  
  /** Enable ORP highlighting */
  orpEnabled: boolean;
  
  /** Enable variable timing (word length/punctuation) */
  variableTimingEnabled: boolean;
  
  /** ORP highlight color (hex) */
  orpColor: string;
  
  /** Enable automatic cloud sync */
  autoSync: boolean;
  
  /** Sync only on WiFi */
  syncOnWifiOnly: boolean;
  
  /** Font settings */
  font: {
    family: 'system' | 'serif' | 'sans-serif' | 'dyslexic';
    size: number; // 24-72
    weight: 'normal' | 'bold';
  };
  
  /** Display settings */
  display: {
    showProgressBar: boolean;
    showWordCount: boolean;
    showPercentage: boolean;
    autoHideControls: boolean;
    autoHideDelay: number; // seconds
  };
  
  /** Gesture preferences */
  gestures: {
    tapToPause: boolean;
    swipeToNavigate: boolean;
    longPressForMenu: boolean;
  };
  
  /** Advanced timing overrides */
  timingOverrides?: Partial<TimingConfig>;
  
  /** Data retention policy */
  analyticsRetention: '30d' | '90d' | '1y' | 'forever';
}
```

#### 2.2.4 Bookmark (Reading Position Marker)

```typescript
interface Bookmark {
  /** UUID v4 primary key */
  id: string;
  
  /** Reference to Document */
  documentId: string;
  
  /** User ID for multi-user support */
  userId: string;
  
  /** Word position in document */
  position: number;
  
  /** Optional text snippet at bookmark */
  text?: string;
  
  /** Optional user note */
  note?: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last modified timestamp */
  updatedAt: string;
  
  /** Sync state for cloud synchronization */
  syncStatus: SyncStatus;
}
```

#### 2.2.5 User Profile

```typescript
interface UserProfile {
  /** UUID v4 primary key */
  id: string;
  
  /** Email address */
  email: string;
  
  /** Supabase authentication ID */
  supabaseId: string;
  
  /** User preferences */
  preferences: UserPreferences;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last modified timestamp */
  updatedAt: string;
}
```

#### 2.2.6 Sync Checkpoint

```typescript
interface SyncCheckpoint {
  /** Checkpoint ID */
  id: string;
  
  /** User ID */
  userId: string;
  
  /** Device ID */
  deviceId: string;
  
  /** Checkpoint timestamp */
  timestamp: string;
  
  /** Document versions at checkpoint */
  documentVersions: Record<string, number>;
  
  /** Last sequence number for incremental sync */
  lastSequence: number;
}
```

#### 2.2.7 Reading Statistics (Aggregated)

```typescript
interface ReadingStatistics {
  /** User ID (for multi-user future) */
  userId: 'default';
  
  /** All-time totals */
  total: {
    documentsRead: number;
    wordsRead: number;
    sessionsCompleted: number;
    timeSpent: number; // seconds
  };
  
  /** Current streak tracking */
  streak: {
    current: number; // days
    longest: number; // days
    lastReadDate: string;
  };
  
  /** Speed progression over time */
  speedHistory: Array<{
    date: string;     // YYYY-MM-DD
    avgWPM: number;
    maxWPM: number;
    sessions: number;
  }>;
  
  /** Daily reading goals */
  dailyGoal: {
    enabled: boolean;
    minutes: number;
    words: number;
  };
  
  /** Calculated from recent sessions */
  averageWPM: number;
  
  /** Reading speed trend (+/- percentage) */
  speedTrend: number;
  
  /** Most productive reading times (hour histogram) */
  peakHours: number[];
  
  /** Favorite sources */
  topSources: Array<{
    source: string;
    count: number;
  }>;
}
```

---

## 3. Storage Format Analysis

### 3.1 Option Comparison Matrix

| Format | Query Speed | Bundle Size | Native Support | Migration Ease | Recommendation |
|--------|-------------|-------------|----------------|----------------|----------------|
| **MMKV** | Excellent | 0KB | ✅ Native module | N/A | **Primary** for preferences & metadata |
| **FileSystem** | Good | 0KB | ✅ Built-in | Simple | **Large document content** |
| **SQLite** | Excellent | ~500KB | ✅ expo-sqlite | Complex | *Not used - MMKV sufficient* |
| **JSON Files** | Good | 0KB | ✅ Built-in | Simple | Backup/export |
| **Cloudflare D1** | Excellent | N/A | ✅ HTTP API | N/A | **Cloud sync database** |
| **Cloudflare R2** | Good | N/A | ✅ HTTP API | N/A | **Large content storage** |
| **WatermelonDB** | Good | ~200KB | ✅ Third-party | Medium | Not needed - custom sync |
| **Realm** | Excellent | ~4MB | ✅ Native module | Complex | Overkill for this use case |

### 3.2 Recommended Hybrid Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L1: MMKV (react-native-mmkv) - Fast Local Access           │
│  ├── UserPreferences (singleton, <1KB)                      │
│  ├── CurrentDocument (active reading state)                 │
│  ├── ReadingStatistics (aggregated, daily)                    │
│  ├── Documents list (metadata only)                         │
│  ├── ReadingProgress (per-document)                       │
│  └── Bookmarks (per-document)                               │
│                                                             │
│  L2: FileSystem (expo-file-system) - Large Content          │
│  ├── Document content (large text files)                    │
│  ├── Import cache (temporary during import)                 │
│  └── Export bundles (JSON backups)                          │
│                                                             │
│  L3: Cloud (Cloudflare Workers + D1 + R2) - Sync            │
│  ├── Documents (with contentUrl for large files)            │
│  ├── ReadingSessions (analytics sync)                       │
│  ├── Bookmarks (cross-device)                               │
│  └── UserProfiles (authentication)                          │
│                                                             │
│  L4: Sync State (MMKV) - Offline-First Support            │
│  ├── SyncCheckpoint (last sync state)                       │
│  ├── PendingChanges (queue for sync)                        │
│  └── ConflictResolution (pending conflicts)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L1: MMKV (react-native-mmkv)                               │
│  ├── UserPreferences (singleton, <1KB)                     │
│  ├── CurrentDocument (active reading state)                │
│  └── ReadingStatistics (aggregated, daily)               │
│                                                             │
│  L2: SQLite (expo-sqlite)                                   │
│  ├── Documents (full content, metadata)                    │
│  ├── ReadingSessions (analytics, time-series)              │
│  └── FTS index (full-text search on documents)            │
│                                                             │
│  L3: FileSystem (expo-file-system)                          │
│  ├── Document imports (large text files)                   │
│  ├── Export bundles (JSON backups)                         │
│  └── Cache (tokenized words, ORP positions)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Cloud Sync Schema (Cloudflare D1)

```sql
-- Documents table (cloud sync)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- Optional if contentUrl provided
  content_url TEXT, -- R2 storage URL for large documents
  word_count INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TEXT NOT NULL, -- ISO 8601
  updated_at TEXT NOT NULL,
  deleted_at TEXT, -- Soft delete
  tags TEXT, -- JSON array
  difficulty REAL,
  estimated_read_time INTEGER,
  bookmark_position INTEGER DEFAULT 0,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'reading', 'completed', 'archived')),
  version INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending'
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  text TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending'
);

-- Reading sessions for analytics
CREATE TABLE reading_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL DEFAULT 0,
  words_read INTEGER NOT NULL DEFAULT 0,
  average_wpm INTEGER,
  final_wpm INTEGER,
  progress REAL DEFAULT 0,
  sync_status TEXT DEFAULT 'pending'
);

-- User profiles
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  supabase_id TEXT NOT NULL UNIQUE,
  preferences TEXT, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sync checkpoints
CREATE TABLE sync_checkpoints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  document_versions TEXT, -- JSON
  last_sequence INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(user_id, status);
CREATE INDEX idx_documents_sync ON documents(sync_status);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_document ON bookmarks(document_id);
CREATE INDEX idx_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_sessions_document ON reading_sessions(document_id);
CREATE INDEX idx_profiles_supabase ON user_profiles(supabase_id);
```

---

## 4. Sync Architecture

### 4.1 Sync Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Mobile App    │◀───────▶│  Cloudflare      │◀───────▶│   Cloudflare    │
│   (MMKV Store)  │  HTTP   │  Workers API     │  SQL    │   D1 Database   │
└────────┬────────┘         └──────────────────┘         └─────────────────┘
         │
         │ Large Content
         ▼
┌─────────────────┐
│   Cloudflare R2 │ (Object Storage)
└─────────────────┘
```

### 4.2 Sync Conflict Resolution

```typescript
// Last-write-wins with version check
interface SyncConflictResolver {
  resolveDocument(local: Document, remote: Document): Document {
    // Compare versions
    if (local.version > remote.version) {
      return local; // Local is newer
    } else if (remote.version > local.version) {
      return remote; // Remote is newer
    } else {
      // Same version - compare timestamps
      return new Date(local.updatedAt) > new Date(remote.updatedAt) 
        ? local 
        : remote;
    }
  }
}
```

### 4.3 Offline-First Strategy

1. **Local writes always succeed** - Write to MMKV immediately
2. **Sync queue** - Add to pending changes queue
3. **Background sync** - Attempt sync when online
4. **Conflict handling** - Automatic resolution with manual override option

## 5. Migration Strategy

### 5.1 Versioning

```typescript
// Schema version tracking in MMKV
const SCHEMA_VERSION_KEY = 'app.schemaVersion';
type SchemaVersion = 
  | 1  // Initial: MMKV only (current)
  | 2  // Add: SQLite documents
  | 3  // Add: Reading sessions
  | 4  // Add: Statistics aggregation
  | 5; // Add: FTS search

// Migration registry
type Migration = {
  from: SchemaVersion;
  to: SchemaVersion;
  run: () => Promise<void>;
};
```

### 5.2 Migration Implementations

```typescript
// Migration v1 → v2: Add Document storage layer
const migrateV1toV2: Migration = {
  from: 1,
  to: 2,
  run: async () => {
    // 1. Migrate existing MMKV text to Document structure
    const existingText = MMKV.getString('Reader.text');
    if (existingText) {
      const doc: Document = {
        id: generateUUID(),
        userId: 'default',
        title: 'Untitled Document',
        content: existingText,
        wordCount: existingText.split(/\s+/).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        bookmarkPosition: MMKV.getNumber('Reader.currentIndex') || 0,
        status: 'reading',
        estimatedReadTime: Math.ceil(existingText.split(/\s+/).length / 300 * 60),
        syncStatus: 'pending',
        version: 1,
      };
      // Save to MMKV documents list
      documentStorage.upsertDocument(doc);
    }
    
    // 2. Mark migration complete
    MMKV.set(SCHEMA_VERSION_KEY, 2);
  }
};

// Migration v2 → v3: Add sync support
const migrateV2toV3: Migration = {
  from: 2,
  to: 3,
  run: async () => {
    // 1. Add sync fields to existing documents
    const documents = documentStorage.getDocuments();
    const updatedDocs = documents.map(doc => ({
      ...doc,
      userId: doc.userId || 'default',
      syncStatus: doc.syncStatus || 'pending',
      version: doc.version || 1,
    }));
    documentStorage.saveDocuments(updatedDocs);
    
    // 2. Initialize sync checkpoint
    const checkpoint: SyncCheckpoint = {
      id: generateUUID(),
      userId: 'default',
      deviceId: getDeviceId(),
      timestamp: new Date().toISOString(),
      documentVersions: {},
      lastSequence: 0,
    };
    storage.set('sync.checkpoint', JSON.stringify(checkpoint));
    
    MMKV.set(SCHEMA_VERSION_KEY, 3);
  }
};
```

### 5.3 Backwards Compatibility

```typescript
// Fallback for reading current state
function getCurrentDocument(): Document | null {
  // Try new schema first
  const docId = MMKV.getString('Reader.currentDocumentId');
  if (docId) {
    return documentStorage.getDocument(docId);
  }
  
  // Fallback to legacy MMKV
  const legacyText = MMKV.getString('Reader.text');
  if (legacyText) {
    return createEphemeralDocument(legacyText);
  }
  
  return null;
}
```

---

## 6. Data Lifecycle

### 6.1 Document Lifecycle

```
[Import/Creation]
      │
      ▼
┌─────────────┐    [First Open]    ┌─────────────┐
│   UNREAD    │────────────────────▶│   READING   │
└─────────────┘                     └──────┬──────┘
      │                                    │
      │ [No activity 30d]                  │ [Progress < 100%]
      ▼                                    │
┌─────────────┐                           │
│  ARCHIVED   │◀──────────────────────────┤
└─────────────┘                           │
      │                                   │ [Progress = 100%]
      │ [Manual restore]                  ▼
      │                            ┌─────────────┐
      └───────────────────────────▶│  COMPLETED  │
                                    └─────────────┘
                                         │
                                         │ [User deletes]
                                         ▼
                                   ┌─────────────┐
                                   │   DELETED   │ (soft delete)
                                   └─────────────┘
```

### 6.2 Session Lifecycle

```typescript
// Session state machine
type SessionState = 
  | 'initializing'   // Creating session record
  | 'active'         // User is actively reading
  | 'paused'         // User paused mid-session
  | 'interrupted'    // App backgrounded
  | 'completed'      // Normal completion
  | 'abandoned';     // No activity timeout (30min)

// State transitions
const sessionTransitions: Record<SessionState, SessionState[]> = {
  initializing: ['active'],
  active: ['paused', 'interrupted', 'completed', 'abandoned'],
  paused: ['active', 'interrupted', 'completed', 'abandoned'],
  interrupted: ['active', 'paused', 'abandoned'],
  completed: [], // terminal
  abandoned: [], // terminal
};
```

### 6.3 Sync Lifecycle

```typescript
// Sync state machine
type SyncEntityState = 
  | 'pending'    // Local changes waiting to sync
  | 'syncing'    // Currently uploading/downloading
  | 'synced'     // In sync with cloud
  | 'error'      // Sync failed, will retry
  | 'conflict';  // Manual resolution needed

// Sync flow
// pending → syncing → synced (success)
// pending → syncing → error → pending (retry)
// pending → syncing → conflict → resolved → syncing → synced
```

### 6.4 Data Retention Policies

```typescript
interface RetentionPolicy {
  // Auto-archive unread documents after 30 days
  archiveUnreadDays: 30;
  
  // Soft-delete archived documents after 90 days
  deleteArchivedDays: 90;
  
  // Hard delete after additional grace period (GDPR compliance)
  permanentDeleteDays: 30;
  
  // Compress session data after 7 days (remove granular events)
  compressSessionsDays: 7;
  
  // Delete old sessions based on user preference
  deleteSessions: '30d' | '90d' | '1y' | 'forever';
  
  // Keep statistics forever (tiny data)
  keepStatistics: true;
  
  // Sync retention - keep offline changes for
  syncRetentionDays: 30;
}
```

---

## 7. Persistence vs Ephemeral

### 7.1 Persistence Matrix

| Data | MMKV | FileSystem | Cloud | Ephemeral | Rationale |
|------|------|------------|-------|-----------|-----------|
| User Preferences | ✅ | ❌ | ❌ | ❌ | Small, frequent reads |
| User Profile | ✅ | ❌ | ✅ | ❌ | Synced, cached locally |
| Current Document | ✅ | ❌ | ❌ | ❌ | Active reading state |
| Document Metadata | ✅ | ❌ | ✅ | ❌ | Fast list display |
| Document Content | ❌ | ✅ | ✅ (R2) | ❌ | Large files, cached |
| Reading Session | ✅ | ❌ | ✅ | ❌ | Analytics, synced |
| Bookmarks | ✅ | ❌ | ✅ | ❌ | Cross-device sync |
| Sync State | ✅ | ❌ | ❌ | ❌ | Offline-first queue |
| Tokenized Words | ❌ | ❌ | ❌ | ✅ | Regenerated on load |
| ORP Positions | ❌ | ❌ | ❌ | ✅ | Computed from content |
| Animation State | ❌ | ❌ | ❌ | ✅ | Frame-by-frame only |
| Word Timing | ❌ | ❌ | ❌ | ✅ | Derived from config |

---

## 8. Implementation Roadmap

### Phase 1: Foundation ✅
- [x] Define TypeScript interfaces for all entities
- [x] Set up MMKV storage with sync types
- [x] Implement Document CRUD operations
- [x] Add DocumentStorage service

### Phase 2: Cloud Sync ✅
- [x] Create sync types with version tracking
- [x] Implement Cloudflare Workers API
- [x] Set up D1 database schema
- [x] Add R2 storage for large content

### Phase 3: Session Tracking 🔄
- [ ] Create ReadingSession model
- [ ] Implement session lifecycle management
- [ ] Add analytics aggregation (daily/weekly)
- [ ] Statistics dashboard queries

### Phase 4: Advanced Features
- [ ] Document bookmarks
- [ ] Document import/export (JSON backup)
- [ ] Full-text search
- [ ] Data retention job scheduler

### Phase 5: Performance Optimization
- [ ] Tokenization caching
- [ ] Lazy document loading (pagination)
- [ ] Session data compression
- [ ] Query performance profiling

---

## 9. TypeScript Interface Definitions

```typescript
// types/database.ts - Complete type definitions

export type DocumentId = string; // UUID v4
export type SessionId = string;    // UUID v4

// Enums
export enum DocumentStatus {
  UNREAD = 'unread',
  READING = 'reading',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

// Sync status enum
export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
  CONFLICT = 'conflict',
}

// Main interfaces
export interface Document {
  id: DocumentId;
  userId: string;
  title: string;
  content?: string;
  contentUrl?: string;
  localPath?: string;
  wordCount: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  tags: string[];
  difficulty?: number;
  estimatedReadTime: number;
  bookmarkPosition: number;
  status: DocumentStatus;
  syncStatus: SyncStatus;
  version: number;
}

export interface ReadingSession {
  id: SessionId;
  documentId: DocumentId;
  userId: string;
  startedAt: string;
  endedAt?: string;
  startPosition: number;
  endPosition: number;
  wordsRead: number;
  averageWPM?: number;
  finalWpm: number;
  progress: number;
  wpmHistory: WPMEvent[];
  pauses: PauseEvent[];
  rewinds: RewindEvent[];
  completionPercent: number;
  completed: boolean;
  syncStatus: SyncStatus;
}

export interface Bookmark {
  id: string;
  documentId: DocumentId;
  userId: string;
  position: number;
  text?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface UserProfile {
  id: string;
  email: string;
  supabaseId: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  defaultWpm: number;
  defaultChunkSize: number;
  theme: Theme;
  orpEnabled: boolean;
  variableTimingEnabled: boolean;
  orpColor: string;
  autoSync: boolean;
  syncOnWifiOnly: boolean;
  font: {
    family: 'system' | 'serif' | 'sans-serif' | 'dyslexic';
    size: number;
    weight: 'normal' | 'bold';
  };
  display: {
    showProgressBar: boolean;
    showWordCount: boolean;
    showPercentage: boolean;
    autoHideControls: boolean;
    autoHideDelay: number;
  };
  gestures: {
    tapToPause: boolean;
    swipeToNavigate: boolean;
    longPressForMenu: boolean;
  };
  timingOverrides?: Partial<TimingConfig>;
  analyticsRetention: '30d' | '90d' | '1y' | 'forever';
}

export interface SyncCheckpoint {
  id: string;
  userId: string;
  deviceId: string;
  timestamp: string;
  documentVersions: Record<string, number>;
  lastSequence: number;
}

// Event types for session tracking
export interface WPMEvent {
  timestamp: string;
  wpm: number;
}

export interface PauseEvent {
  wordIndex: number;
  duration: number; // seconds
  timestamp: string;
}

export interface RewindEvent {
  fromIndex: number;
  toIndex: number;
  timestamp: string;
}

// DTOs for creation
export interface CreateDocumentDTO {
  title?: string;
  content: string;
  source?: string;
  tags?: string[];
}

export interface UpdateDocumentDTO {
  title?: string;
  content?: string;
  tags?: string[];
  bookmarkPosition?: number;
  status?: DocumentStatus;
}

// Query filters
export interface DocumentFilter {
  status?: DocumentStatus | DocumentStatus[];
  tags?: string[];
  searchQuery?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// Query results
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## 9. Query Examples

```typescript
// Get documents with filtering
async function getDocuments(
  filter: DocumentFilter,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<Document>> {
  // Implementation using SQLite
}

// Search documents (uses FTS)
async function searchDocuments(
  query: string,
  limit: number = 20
): Promise<Document[]> {
  // FTS5 query on documents_fts virtual table
}

// Get reading statistics for date range
async function getReadingStats(
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  // Aggregate sessions by day
}

// Get current reading position
async function getReadingPosition(
  documentId: DocumentId
): Promise<{ wordIndex: number; sessionActive: boolean }> {
  // Check active session or return bookmark
}
```

---

## 10. Security Considerations

1. **User data protection**: 
   - Email stored in user profile (encrypted in transit and at rest)
   - Supabase ID used for authentication, not stored directly
   - Content URLs (R2) use signed URLs with expiration

2. **Local storage security**:
   - MMKV supports encryption at rest (optional)
   - Document content stored in app-private directories
   - No sensitive data in global storage

3. **Sync security**:
   - HTTPS for all cloud communication
   - JWT tokens for API authentication
   - Row-level security in D1 database
   - Content URLs signed and time-limited

4. **Data retention (GDPR)**:
   - Soft delete for user data
   - 30-day grace period before permanent deletion
   - Export all user data on request
   - Complete purge option available

5. **Export sanitization**: Remove metadata when sharing documents

---

## Appendix A: Database Size Estimates

### Local Storage (MMKV + FileSystem)

| Data Type | Record Size | Max Records | Total Size |
|-----------|-------------|-------------|------------|
| Document Metadata | 0.5 KB | 1,000 | 500 KB |
| Document Content (FileSystem) | 5 KB avg | 1,000 | 5 MB |
| Reading Session | 0.5 KB | 1,000 local | 500 KB |
| Bookmarks | 0.2 KB | 500 | 100 KB |
| Reading Statistics | 0.1 KB | 3,650 (10yr) | 365 KB |
| Sync State & Queue | 10 KB | 1 | 10 KB |
| User Preferences | 1 KB | 1 | 1 KB |
| **Total Local** | - | - | **~6.5 MB** |

### Cloud Storage (D1 + R2)

| Data Type | Record Size | Max Records | Total Size |
|-----------|-------------|-------------|------------|
| Documents (D1 metadata) | 0.3 KB | Unlimited | Scalable |
| Document Content (R2) | 5 KB avg | Unlimited | Scalable |
| Reading Sessions (D1) | 0.3 KB | Unlimited | Scalable |
| Bookmarks (D1) | 0.2 KB | Unlimited | Scalable |
| User Profiles (D1) | 0.5 KB | 1 per user | Scalable |

---

## Appendix B: Related Documents

- [RSVP Core Engine README](./app/rsvp/README.md)
- [AGENTS.md](./.designs/readrrr-rsvp-engine/AGENTS.md) - Agent specifications
- [EXAMPLES.md](./app/rsvp/EXAMPLES.md) - Usage examples

---

*Document Version: 2.0*  
*Status: Updated with Cloud Sync Architecture*  
*Last Updated: 2026-04-26*  
*Next Review: After Phase 3 completion*
