# Readrrr Integration Analysis

> **Document ID**: READ-INTEGRATE-001  
> **Status**: Draft  
> **Date**: 2026-04-26  
> **Related**: READ-DATA-001 (Data Model), READ-001 (RSVP Core Engine)

---

## Executive Summary

This document analyzes integration requirements for Readrrr, focusing on three critical dimensions: **import sources** (how content enters the system), **export targets** (where data flows outward), and **sync strategies** (how data consistency is maintained across environments). The analysis prioritizes user workflow continuity, data portability, and extensibility for future growth.

**Key Findings:**
- **7 import sources** identified across manual, file, cloud, and API categories
- **5 export targets** covering sharing, backup, and third-party workflows  
- **4 sync strategies** ranging from device-local to real-time cloud

---

## 1. Import Sources

Import sources define how reading material enters the Readrrr ecosystem. We categorize them by user effort and technical complexity.

### 1.1 Source Categories Matrix

| Category | Source | User Effort | Technical Complexity | Priority | Notes |
|----------|--------|-------------|---------------------|----------|-------|
| **Manual** | Direct Text Input | Low | Low | P0 | Current implementation |
| **File** | Plain Text (.txt) | Low | Low | P1 | Common format |
| **File** | Markdown (.md) | Low | Low | P1 | Popular for notes |
| **File** | EPUB | Medium | Medium | P2 | E-book standard |
| **File** | PDF | Medium | High | P2 | Complex parsing |
| **Cloud** | iCloud Drive | Low | Medium | P1 | iOS ecosystem |
| **Cloud** | Google Drive | Low | Medium | P1 | Android ecosystem |
| **Cloud** | Dropbox | Low | Medium | P2 | Cross-platform |
| **API** | URL/Web Article | Low | High | P2 | Requires scraping |
| **API** | RSS Feeds | Low | Medium | P2 | Subscription model |
| **API** | Readwise Integration | Low | Medium | P2 | Highlight sync |
| **API** | Pocket API | Low | Medium | P2 | Read-later service |

### 1.2 Detailed Import Source Analysis

#### 1.2.1 Direct Text Input (Current)
- **Implementation**: Simple text paste/type into `TextInputScreen`
- **Storage**: MMKV key `Reader.text`
- **Limitations**: No metadata, no persistence across documents
- **Migration Path**: Convert to Document entity (data-model.md v2)

#### 1.2.2 File-Based Imports

```typescript
// Import handler interface
interface FileImportHandler {
  mimeTypes: string[];
  extensions: string[];
  parse: (uri: string) => Promise<ImportResult>;
  extractText: (content: ArrayBuffer) => Promise<string>;
}

// Supported formats
const FILE_IMPORTERS: FileImportHandler[] = [
  {
    mimeTypes: ['text/plain'],
    extensions: ['.txt'],
    // Direct UTF-8 text reading
  },
  {
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    extensions: ['.md', '.markdown'],
    // Strip frontmatter, convert to plain text
  },
  {
    mimeTypes: ['application/epub+zip'],
    extensions: ['.epub'],
    // Requires epub.js or similar library
    // Extract chapters, concatenate text
  },
  {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    // Requires react-native-pdf or native module
    // Text extraction complexity varies
  }
];
```

**Implementation Notes:**
- Use `expo-document-picker` for file selection
- EPUB parsing: ~200KB library overhead
- PDF parsing: Platform-specific (iOS PDFKit, Android PdfRenderer)

#### 1.2.3 Cloud Storage Integration

```typescript
// Cloud provider interface
interface CloudProvider {
  name: string;
  auth: OAuth2Config;
  browse: (path: string) => Promise<CloudFile[]>;
  download: (fileId: string) => Promise<string>; // returns local URI
}

// iCloud Drive
const iCloudProvider: CloudProvider = {
  name: 'icloud',
  auth: { type: 'native' }, // Uses iOS native auth
  // NSFileCoordinator for file access
};

// Google Drive
const googleDriveProvider: CloudProvider = {
  name: 'google-drive',
  auth: {
    type: 'oauth2',
    scopes: ['drive.readonly', 'drive.file.readonly'],
    // Google Sign-In SDK
  },
  // REST API: drive.files.list, drive.files.get
};
```

**Storage Quotas:**
| Provider | Free Tier | Rate Limits |
|----------|-----------|-------------|
| iCloud | 5GB | Native (no API limits) |
| Google Drive | 15GB | 1000 requests/100 seconds/user |
| Dropbox | 2GB | No strict limits for basic operations |

#### 1.2.4 API-Based Imports

**URL/Web Article Parsing:**
```typescript
interface WebImportConfig {
  // Mercury Parser (postlight) or Readability
  parser: 'mercury' | 'readability' | 'native';
  
  // Content extraction rules
  selectors: {
    title: string;
    author?: string;
    content: string;
    exclude?: string[];
  };
  
  // Caching strategy
  cacheDuration: number; // seconds
}
```

**RSS Feed Support:**
```typescript
interface RSSConfig {
  feedUrl: string;
  pollInterval: number; // minutes
  maxItems: number;
  autoImport: boolean;
  
  // Item processing
  filter: {
    minWordCount: number;
    maxAge: number; // days
  };
}
```

**Third-Party Integrations:**
| Service | API | Use Case |
|---------|-----|----------|
| Readwise | readwise.io/api | Sync highlights/notes |
| Pocket | getpocket.com/developer | Import read-later list |
| Instapaper | instapaper.com/api | Legacy read-later |
| Matter | api.getmatter.app | Modern read-later |

---

## 2. Export Targets

Export targets define where Readrrr data flows outward. Critical for backup, sharing, and workflow integration.

### 2.1 Export Categories Matrix

| Category | Target | Data Type | User Effort | Priority | Notes |
|----------|--------|-----------|-------------|----------|-------|
| **Sharing** | Share Sheet | Text/Snippets | Low | P0 | Native iOS/Android |
| **Sharing** | Clipboard | Text | Low | P0 | Immediate use |
| **Backup** | JSON Export | Full Library | Medium | P1 | Portable backup |
| **Backup** | iCloud Backup | App Data | None | P1 | iOS native |
| **Backup** | Google Drive | App Data | None | P1 | Android native |
| **Sync** | Custom Server | Full State | Low* | P2 | *Initial setup |
| **Analytics** | CSV Export | Reading Stats | Low | P2 | Data portability |
| **Integration** | Readwise | Highlights | Low | P2 | Two-way sync |
| **Integration** | Notion | Documents | Medium | P2 | API integration |

### 2.2 Detailed Export Target Analysis

#### 2.2.1 Native Sharing

```typescript
// iOS Share Sheet via expo-sharing
import * as Sharing from 'expo-sharing';

interface ShareOptions {
  // Content to share
  text?: string;
  fileUri?: string;
  mimeType?: string;
  
  // iOS-specific
  excludedActivityTypes?: string[];
  
  // Callback
  onComplete?: (success: boolean) => void;
}

// Usage: Share current document or excerpt
async function shareDocument(doc: Document, excerpt?: string) {
  const shareText = excerpt 
    ? `"${excerpt}" - from "${doc.title}"`
    : doc.content;
    
  await Sharing.shareAsync(tempFileUri, {
    mimeType: 'text/plain',
    dialogTitle: `Share "${doc.title}"`,
  });
}
```

#### 2.2.2 Backup Formats

**JSON Export Schema:**
```typescript
interface ExportBundle {
  version: '1.0.0';
  exportedAt: string;
  appVersion: string;
  
  data: {
    documents: Document[];
    sessions: ReadingSession[];
    statistics: ReadingStatistics;
    preferences: UserPreferences;
  };
  
  // Integrity
  checksum: string; // SHA-256
  recordCount: {
    documents: number;
    sessions: number;
  };
}

// Export size estimates
const EXPORT_SIZES = {
  'minimal': '~10KB',     // Preferences only
  'documents': '~500KB',  // 100 documents avg
  'full': '~2MB',         // Everything including sessions
};
```

**CSV Export (Analytics):**
```csv
date,documents_read,words_read,avg_wpm,time_spent_minutes
2026-04-25,3,4500,285,15.8
2026-04-26,1,1200,320,3.8
```

#### 2.2.3 Third-Party Export

**Readwise Integration:**
```typescript
interface ReadwiseExport {
  // Authentication
  apiToken: string;
  
  // Document as highlight source
  highlights: {
    text: string;        // The excerpt
    title: string;       // Document title
    author?: string;
    source_url?: string;
    category: 'articles' | 'books' | 'tweets' | 'podcasts';
    highlighted_at: string;
    
    // Optional Readrrr-specific
    reading_time_seconds: number;
    wpm_at_excerpt: number;
  }[];
}
```

**Notion Integration:**
```typescript
interface NotionExportConfig {
  // OAuth or integration token
  token: string;
  
  // Target database
  databaseId: string;
  
  // Field mapping
  mapping: {
    title: 'Name';
    content: 'Content'; // Page property or body
    wordCount: 'Word Count';
    source: 'Source';
    tags: 'Tags';
    readTime: 'Reading Time';
  };
  
  // Sync mode
  mode: 'create' | 'update' | 'upsert';
}
```

---

## 3. Sync Strategies

Sync strategies define how data consistency is maintained across devices and environments. Critical for multi-device users and data durability.

### 3.1 Strategy Comparison Matrix

| Strategy | Conflict Resolution | Offline Support | Complexity | Cost | Best For |
|----------|--------------------|-----------------|------------|------|----------|
| **Device-Only** | N/A | Full | Low | Free | Single-device users |
| **iCloud KV** | Last-write-wins | Partial | Low | Free | Apple ecosystem |
| **Custom Backend** | Custom logic | Configurable | High | Server costs | Power users |
| **CouchDB/PouchDB** | MVCC + replication | Full | Medium | Self-hosted | Offline-first |
| **Firebase** | Server timestamp | Full | Medium | Pay-as-you-go | Rapid development |
| **Supabase** | PostgreSQL rules | Full | Medium | Free tier available | SQL preference |

### 3.2 Detailed Sync Strategy Analysis

#### 3.2.1 Device-Only (Current)

```typescript
// Current: MMKV local storage only
const DeviceOnlyStrategy = {
  storage: 'react-native-mmkv',
  sync: null,
  backup: 'native-ios-android',
  
  // Limitations
  limitations: [
    'No cross-device sync',
    'Data loss on device failure',
    'No web app access',
  ],
  
  // Migration trigger
  migrationSignal: 'user-requests-sync',
};
```

**iCloud Key-Value Bridge:**
```typescript
// Minimal sync for preferences only
const iCloudKVStrategy = {
  syncs: ['preferences', 'statistics.summary'],
  doesNotSync: ['documents', 'sessions', 'large-data'],
  
  // iCloud KV limits
  limits: {
    maxKeySize: '64 bytes',
    maxValueSize: '64 KB',
    maxKeys: '1024 per app',
  },
  
  // Conflict: last-write-wins, timestamp-based
  conflictResolution: 'timestamp',
};
```

#### 3.2.2 Custom Backend Strategy

```typescript
interface SyncServerConfig {
  // Server endpoint
  apiUrl: string;
  
  // Authentication
  auth: {
    type: 'jwt' | 'oauth' | 'api-key';
    refreshStrategy: 'background' | 'on-demand';
  };
  
  // Sync behavior
  sync: {
    mode: 'realtime' | 'periodic' | 'manual';
    interval: number; // seconds (for periodic)
    priority: ['preferences', 'statistics', 'documents', 'sessions'];
  };
  
  // Conflict resolution
  conflict: {
    strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
    mergeFunction?: (local: any, remote: any) => any;
  };
  
  // Offline queue
  offline: {
    maxQueueSize: number;
    retryStrategy: 'exponential-backoff';
    persistQueue: boolean;
  };
}
```

**Sync Protocol:**
```typescript
interface SyncPayload {
  // Device identification
  deviceId: string;
  userId: string;
  
  // Last known server state
  lastSyncAt: string;
  
  // Changes since last sync (delta)
  changes: {
    upserts: DatabaseRecord[];
    deletes: { table: string; id: string }[];
  };
  
  // Current state checksum
  checksum: string;
}

interface SyncResponse {
  serverTime: string;
  
  // Server changes client needs
  serverChanges: {
    upserts: DatabaseRecord[];
    deletes: { table: string; id: string }[];
  };
  
  // Conflicts requiring resolution
  conflicts: SyncConflict[];
  
  // Next sync recommendation
  nextSyncIn: number; // seconds
}
```

#### 3.2.3 CouchDB/PouchDB Strategy (Offline-First)

```typescript
// PouchDB on device, CouchDB on server
const CouchStrategy = {
  local: {
    adapter: 'react-native-sqlite-2', // SQLite backend
    name: 'readrrr_local',
  },
  
  remote: {
    url: 'https://sync.readrrr.app/userdb-{hash}',
    auth: 'cookie-based',
  },
  
  replication: {
    mode: 'continuous',
    direction: 'bidirectional',
    
    // Conflict resolution via MVCC
    conflicts: 'automatic', // Or manual review
  },
  
  // Filtered sync
  filter: {
    documents: true,
    sessions: true,
    preferences: true,
    // Large analytics: deferred
    statistics: 'daily-sync-only',
  },
};
```

**Conflict Resolution Example:**
```typescript
// Automatic merge for non-critical data
function mergeDocumentConflicts(local: Document, remote: Document): Document {
  // Bookmark position: take the higher (farthest read)
  const bookmarkPosition = Math.max(local.bookmarkPosition, remote.bookmarkPosition);
  
  // Tags: union of both
  const tags = [...new Set([...local.tags, ...remote.tags])];
  
  // Content: if different, keep both versions
  // (rare - content shouldn't change)
  if (local.content !== remote.content) {
    return createVersionedDocument(local, remote);
  }
  
  return {
    ...remote,
    bookmarkPosition,
    tags,
    updatedAt: new Date().toISOString(),
  };
}
```

#### 3.2.4 Firebase Strategy

```typescript
const FirebaseStrategy = {
  services: {
    auth: 'firebase-auth', // Anonymous or OAuth
    firestore: 'primary-db',
    storage: 'large-files', // For imported documents
    functions: 'server-logic',
  },
  
  // Offline persistence
  offline: {
    enabled: true,
    cacheSize: 100, // MB
    persistenceMode: 'memory-and-disk',
  },
  
  // Real-time listeners
  realtime: {
    documents: true,      // Live updates
    statistics: 'on-demand', // Pull when needed
    sessions: false,        // Don't sync live (too noisy)
  },
  
  // Security rules (server-side)
  security: `
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId}/{document=**} {
          allow read, write: if request.auth != null 
                             && request.auth.uid == userId;
        }
      }
    }
  `,
};
```

**Cost Estimates (Firebase):**
| Tier | Documents | Reads/Month | Writes/Month | Cost |
|------|-----------|-------------|--------------|------|
| Free | 1GB | 50K | 20K | $0 |
| Light | 2GB | 250K | 100K | ~$5 |
| Medium | 10GB | 1M | 500K | ~$25 |
| Heavy | 50GB | 5M | 2M | ~$100 |

### 3.3 Sync Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Device A  │◀───▶│  Sync Layer │◀───▶│   Device B  │
│  (iPhone)   │     │             │     │  (iPad)     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │    ┌───────────────┴───────────────┐   │
       │    │                               │   │
       ▼    ▼                               ▼   ▼
┌─────────────┐                       ┌─────────────┐
│  Local DB   │                       │   Web App   │
│  (SQLite)   │                       │  (Future)   │
└─────────────┘                       └─────────────┘
```

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Current Sprint)
- [x] Direct text input (existing)
- [ ] File import (.txt, .md)
- [ ] JSON export for backup
- [ ] Share sheet integration

### Phase 2: Cloud Connectivity
- [ ] iCloud document picker (iOS)
- [ ] Google Drive integration (Android)
- [ ] Automatic iCloud KV for preferences
- [ ] JSON import (round-trip backup)

### Phase 3: Third-Party Integrations
- [ ] URL/web article import
- [ ] Readwise export (highlights)
- [ ] RSS feed subscription
- [ ] Pocket integration

### Phase 4: Full Sync
- [ ] User accounts
- [ ] Device pairing
- [ ] Conflict resolution UI
- [ ] Real-time sync (WebSocket/Socket.io)

---

## 5. API Compatibility & Versioning

### 5.1 Import API Versioning

```typescript
// Import adapters are versioned
interface ImportAdapter {
  version: string; // SemVer
  supportedFormats: string[];
  
  // Migration path from previous versions
  migrate?: (data: any, fromVersion: string) => any;
}

// Example: Document import evolution
const DocumentImportV1: ImportAdapter = {
  version: '1.0.0',
  supportedFormats: ['txt', 'md'],
};

const DocumentImportV2: ImportAdapter = {
  version: '2.0.0',
  supportedFormats: ['txt', 'md', 'epub', 'pdf'],
  migrate: (data, fromVersion) => {
    if (fromVersion === '1.0.0') {
      // Add default fields introduced in v2
      return { ...data, difficulty: null, tags: [] };
    }
    return data;
  },
};
```

### 5.2 Export Compatibility

| Export Version | Importable By | Notes |
|----------------|---------------|-------|
| 1.0.0 | 1.0.0+ | Initial format |
| 1.1.0 | 1.0.0+ | Added statistics (backward compat) |
| 2.0.0 | 2.0.0+ | Schema change (migration required) |

---

## 6. Security Considerations

### 6.1 Data Handling by Source

| Source | Sensitivity | Encryption | Retention |
|--------|-------------|------------|-----------|
| User text | Medium | Device encryption | Until deleted |
| Import files | Low | Transit only | After processing |
| Cloud tokens | High | Keychain/Keystore | Rotated regularly |
| Analytics | Low | Aggregate only | 90 days default |

### 6.2 OAuth Security

```typescript
// Secure token storage
interface TokenStorage {
  // Never in MMKV (unencrypted)
  // Use platform secure storage
  
  ios: 'Keychain (kSecClassGenericPassword)',
  android: 'EncryptedSharedPreferences (AndroidX)',
}

// Token refresh
const tokenRefresh = {
  // Background refresh before expiry
  refreshAt: 'expiry - 5 minutes',
  
  // Failure handling
  onRefreshFailure: 'notify-user-reauth-required',
};
```

---

## 7. Rollback & Recovery

### 7.1 Import Rollback

```typescript
interface ImportOperation {
  id: string;
  timestamp: string;
  
  // Pre-import state snapshot
  snapshot: {
    documentIds: string[];
    statistics: ReadingStatistics;
  };
  
  // Rollback capability
  rollback: () => Promise<void>;
}

// Auto-cleanup of failed imports
const IMPORT_CLEANUP = {
  // Delete partial data on import failure
  cleanupOnError: true,
  
  // Retain for recovery period
  retentionHours: 24,
};
```

### 7.2 Sync Conflict Recovery

```typescript
interface ConflictRecovery {
  // Automatic resolution strategies
  autoResolve: {
    'preferences': 'timestamp-wins',
    'bookmark': 'max-position-wins',
    'statistics': 'additive-merge',
  };
  
  // Manual review queue
  manualReview: {
    'document-content': 'different-hash',
    'deleted-on-one': 'restore-choice',
  };
}
```

---

## Appendix A: Supported Format Matrix

| Format | Import | Export | Notes |
|--------|--------|--------|-------|
| Plain Text (.txt) | ✅ | ✅ | Full support |
| Markdown (.md) | ✅ | ✅ | Strips formatting |
| EPUB (.epub) | ✅ | ❌ | Import only |
| PDF (.pdf) | ✅ | ❌ | Text extraction only |
| HTML (.html) | ✅ | ✅ | Sanitized import |
| JSON (.json) | ✅ | ✅ | Full backup |
| CSV (.csv) | ❌ | ✅ | Statistics only |
| Instapaper | ✅ | ❌ | API integration |
| Pocket | ✅ | ✅ | Two-way possible |
| Readwise | ❌ | ✅ | Export highlights |

---

## Appendix B: Third-Party API Requirements

| Service | Auth | Rate Limit | Cost |
|---------|------|------------|------|
| Google Drive | OAuth 2.0 | 1000/100s/user | Free |
| Dropbox | OAuth 2.0 | No hard limit | Free tier |
| iCloud | Native | None | Free (5GB) |
| Readwise | Token | 100/min | Free |
| Pocket | OAuth 1.0a | 500/ hour | Free |
| Instapaper | OAuth 1.0a | Undocumented | Free |
| Notion | Token | 3/sec | Free tier |
| Mercury Parser | Token | 1000/day | Free tier |

---

*Document Version: 1.0*  
*Next Review: After Phase 1 implementation*
