# RSVP Engine Data Model Design

> **Document ID**: READ-DATA-001  
> **Status**: Draft  
> **Date**: 2026-04-26  
> **Related**: READ-001 (RSVP Core Engine)

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
│     User        │────▶│  ReadingSession  │◀────│    Document     │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id: PK          │     │ id: PK           │     │ id: PK          │
│ preferences: FK │     │ documentId: FK   │     │ title: string   │
│ stats: FK       │     │ userId: FK       │     │ content: text   │
└────────┬────────┘     │ startedAt: ts    │     │ wordCount: int  │
         │              │ endedAt: ts      │     │ source: string  │
         │              │ finalWPM: int    │     │ createdAt: ts   │
         ▼              │ progress: %      │     │ tags: string[]  │
┌─────────────────┐     └──────────────────┘     └─────────────────┘
│ UserPreferences │
├─────────────────┤
│ id: PK          │
│ defaultWPM: int │
│ defaultChunk: int│
│ theme: enum     │
│ orpEnabled: bool│
│ variableTiming: bool│
└─────────────────┘
```

### 2.2 Detailed Schema Definitions

#### 2.2.1 Document (Reading Material)

```typescript
interface Document {
  /** UUID v4 primary key */
  id: string;
  
  /** Display title (auto-generated or user-defined) */
  title: string;
  
  /** Full text content */
  content: string;
  
  /** Cached word count (denormalized for performance) */
  wordCount: number;
  
  /** Source URL or import method */
  source?: string;
  
  /** ISO 8601 timestamp */
  createdAt: string;
  
  /** Last modified timestamp */
  updatedAt: string;
  
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
}

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
}
```

#### 2.2.3 User Preferences

```typescript
interface UserPreferences {
  /** Singleton record ID */
  id: 'default';
  
  /** Default reading speed (100-1000) */
  defaultWPM: number;
  
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

#### 2.2.4 Reading Statistics (Aggregated)

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
| **MMKV** | Excellent | 0KB | ✅ Native module | N/A | **Primary** for preferences |
| **SQLite** | Excellent | ~500KB | ✅ expo-sqlite | Complex | Documents, sessions |
| **JSON Files** | Good | 0KB | ✅ Built-in | Simple | Backup/export |
| **TOML** | Poor | ~50KB | ❌ Library needed | Simple | Config only |
| **WatermelonDB** | Good | ~200KB | ✅ Third-party | Medium | If offline-sync needed |
| **Realm** | Excellent | ~4MB | ✅ Native module | Complex | Overkill for this use case |

### 3.2 Recommended Hybrid Strategy

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

### 3.3 SQLite Schema

```sql
-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TEXT NOT NULL, -- ISO 8601
  updated_at TEXT NOT NULL,
  tags TEXT, -- JSON array
  difficulty REAL,
  estimated_read_time INTEGER,
  bookmark_position INTEGER DEFAULT 0,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'reading', 'completed', 'archived'))
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  content,
  content='documents',
  content_rowid='id'
);

-- Reading sessions for analytics
CREATE TABLE reading_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL DEFAULT 0,
  words_read INTEGER NOT NULL DEFAULT 0,
  average_wpm INTEGER,
  wpm_history TEXT, -- JSON array
  pauses TEXT, -- JSON array
  rewinds TEXT, -- JSON array
  completion_percent REAL DEFAULT 0,
  completed BOOLEAN DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_sessions_document ON reading_sessions(document_id);
CREATE INDEX idx_sessions_started ON reading_sessions(started_at);

-- Triggers for FTS sync
CREATE TRIGGER documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
```

---

## 4. Migration Strategy

### 4.1 Versioning

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

### 4.2 Migration Implementations

```typescript
// Migration v1 → v2: Add SQLite documents
const migrateV1toV2: Migration = {
  from: 1,
  to: 2,
  run: async () => {
    // 1. Create SQLite tables
    const db = await SQLite.openDatabaseAsync('reader.db');
    await db.execAsync(CREATE_DOCUMENTS_TABLE);
    
    // 2. Migrate existing MMKV text to Document
    const existingText = MMKV.getString('Reader.text');
    if (existingText) {
      const doc: Document = {
        id: generateUUID(),
        title: 'Untitled Document',
        content: existingText,
        wordCount: existingText.split(/\s+/).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        bookmarkPosition: MMKV.getNumber('Reader.currentIndex') || 0,
        status: 'reading',
        estimatedReadTime: Math.ceil(existingText.split(/\s+/).length / 300 * 60),
      };
      await insertDocument(db, doc);
    }
    
    // 3. Mark migration complete
    MMKV.set(SCHEMA_VERSION_KEY, 2);
  }
};

// Migration v2 → v3: Add reading sessions
const migrateV2toV3: Migration = {
  from: 2,
  to: 3,
  run: async () => {
    const db = await SQLite.openDatabaseAsync('reader.db');
    await db.execAsync(CREATE_SESSIONS_TABLE);
    await db.execAsync(CREATE_SESSIONS_INDEXES);
    MMKV.set(SCHEMA_VERSION_KEY, 3);
  }
};
```

### 4.3 Backwards Compatibility

```typescript
// Fallback for reading current state
function getCurrentDocument(): Document | null {
  // Try new schema first
  const docId = MMKV.getString('Reader.currentDocumentId');
  if (docId) {
    return getDocumentById(docId);
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

## 5. Data Lifecycle

### 5.1 Document Lifecycle

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
```

### 5.2 Session Lifecycle

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

### 5.3 Data Retention Policies

```typescript
interface RetentionPolicy {
  // Auto-archive unread documents after 30 days
  archiveUnreadDays: 30;
  
  // Delete archived documents after 90 days
  deleteArchivedDays: 90;
  
  // Compress session data after 7 days (remove granular events)
  compressSessionsDays: 7;
  
  // Delete old sessions based on user preference
  deleteSessions: '30d' | '90d' | '1y' | 'forever';
  
  // Keep statistics forever (tiny data)
  keepStatistics: true;
}
```

---

## 6. Persistence vs Ephemeral

### 6.1 Persistence Matrix

| Data | MMKV | SQLite | Ephemeral | Rationale |
|------|------|--------|-----------|-----------|
| User Preferences | ✅ | ❌ | ❌ | Small, frequent reads |
| Current Document | ✅ (cache) | ✅ | ❌ | Must survive restarts |
| Document Library | ❌ | ✅ | ❌ | Large, queryable |
| Reading Session | ❌ | ✅ | ❌ | Analytics, permanent |
| Tokenized Words | ❌ | ❌ | ✅ | Regenerated on load |
| ORP Positions | ❌ | ❌ | ✅ | Computed from content |
| Animation State | ❌ | ❌ | ✅ | Frame-by-frame only |
| Word Timing | ❌ | ❌ | ✅ | Derived from config |

### 6.2 Cache Invalidation Strategy

```typescript
interface CacheStrategy {
  // Document content cache (avoid re-tokenization)
  tokenizedWords: {
    key: (docId: string) => `cache:tokens:${docId}`;
    ttl: 300; // 5 minutes
    invalidateOn: ['documentUpdated', 'preferencesChanged'];
  };
  
  // ORP position cache
  orpPositions: {
    key: (word: string) => `cache:orp:${hash(word)}`;
    ttl: 600; // 10 minutes
    maxSize: 10000; // LRU eviction
  };
  
  // Statistics aggregation
  statsCache: {
    key: 'cache:stats:daily';
    ttl: 60; // 1 minute (frequently updated)
  };
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Current Sprint)
- [ ] Define TypeScript interfaces for all entities
- [ ] Set up SQLite database with initial schema
- [ ] Implement Document CRUD operations
- [ ] Add schema migration framework

### Phase 2: Session Tracking
- [ ] Create ReadingSession model
- [ ] Implement session lifecycle management
- [ ] Add analytics aggregation (daily/weekly)
- [ ] Statistics dashboard queries

### Phase 3: Advanced Features
- [ ] Full-text search (FTS5)
- [ ] Document import/export (JSON backup)
- [ ] Sync adapter (future: cloud backup)
- [ ] Data retention job scheduler

### Phase 4: Performance Optimization
- [ ] Tokenization caching
- [ ] Lazy document loading (pagination)
- [ ] Session data compression
- [ ] Query performance profiling

---

## 8. TypeScript Interface Definitions

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

// Main interfaces
export interface Document {
  id: DocumentId;
  title: string;
  content: string;
  wordCount: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  difficulty?: number;
  estimatedReadTime: number;
  bookmarkPosition: number;
  status: DocumentStatus;
}

export interface ReadingSession {
  id: SessionId;
  documentId: DocumentId;
  startedAt: string;
  endedAt?: string;
  startPosition: number;
  endPosition: number;
  wordsRead: number;
  averageWPM?: number;
  wpmHistory: WPMEvent[];
  pauses: PauseEvent[];
  rewinds: RewindEvent[];
  completionPercent: number;
  completed: boolean;
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

1. **No sensitive data**: RSVP Engine doesn't handle PII beyond reading preferences
2. **Local-only by default**: All data stored on device
3. **Optional encryption**: MMKV and SQLite support encryption at rest
4. **Export sanitization**: Remove metadata when sharing documents

---

## Appendix A: Database Size Estimates

| Data Type | Record Size | Max Records | Total Size |
|-----------|-------------|-------------|------------|
| Document (avg 5KB text) | 6 KB | 1,000 | 6 MB |
| Reading Session | 2 KB | 10,000 | 20 MB |
| Statistics (daily) | 0.1 KB | 3,650 (10yr) | 365 KB |
| FTS Index | ~30% of content | - | 2 MB |
| **Total** | - | - | **~30 MB** |

---

## Appendix B: Related Documents

- [RSVP Core Engine README](./app/rsvp/README.md)
- [AGENTS.md](./.designs/readrrr-rsvp-engine/AGENTS.md) - Agent specifications
- [EXAMPLES.md](./app/rsvp/EXAMPLES.md) - Usage examples

---

*Document Version: 1.0*  
*Next Review: After Phase 1 implementation*
