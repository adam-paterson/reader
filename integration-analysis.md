# RSVP Engine Integration Analysis

> **Document ID**: READ-INTEGRATE-RSVP-001  
> **Status**: Complete  
> **Date**: 2026-04-26  
> **Related**: READ-001 (RSVP Core Engine), READ-DATA-001 (Data Model v2.0), READ-INTEGRATE-001 (Integration Analysis)

---

## Executive Summary

This document provides a comprehensive integration analysis for the RSVP Engine within the Readrrr ecosystem. The RSVP Core Engine is a production-grade React Native component delivering 60fps Rapid Serial Visual Presentation reading with ORP (Optimal Recognition Point) highlighting, variable timing, and comprehensive test coverage.

**Key Findings:**
- **7 Integration Points** identified across UI, state management, persistence, and cloud sync
- **3 API Versions** to maintain compatibility with existing data model
- **5 Third-Party Dependencies** requiring coordination
- **3-Phase Migration Path** from legacy MMKV storage to full cloud sync
- **Comprehensive Rollback Strategy** with soft-delete and conflict resolution

---

## 1. Existing System Integration Points

### 1.1 Component Layer Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION POINTS MAP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Screens    │◀────▶│ RSVPReader   │◀────▶│  WordDisplay │  │
│  │              │      │  Component   │      │  Component   │  │
│  └──────────────┘      └──────┬───────┘      └──────────────┘  │
│                               │                                  │
│                      ┌────────┴────────┐                        │
│                      ▼                 ▼                        │
│               ┌──────────┐      ┌──────────┐                   │
│               │Tokenizer │      │  Timing  │                   │
│               │   ORP    │      │  Engine  │                   │
│               └──────────┘      └──────────┘                   │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Context    │◀────▶│   Services   │◀────▶│    Cloud     │  │
│  │  (State)     │      │  (Storage)   │      │   (Sync)     │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Integration Points Detail

| Point | Component | Interface | Status | Notes |
|-------|-----------|-----------|--------|-------|
| **IP-1** | RSVPReader ↔ Screens | Props callback | ✅ Active | `onProgress`, `onComplete`, `onWordChange` |
| **IP-2** | RSVPReader ↔ Context | State injection | ⚠️ Partial | Currently MMKV, migrating to Document model |
| **IP-3** | Tokenizer ↔ Storage | File content | ✅ Ready | Supports text, markdown, future EPUB/PDF |
| **IP-4** | Timing Engine ↔ Preferences | Config object | ✅ Active | `TimingConfig` from UserPreferences |
| **IP-5** | ORP Calculator ↔ Display | Position data | ✅ Active | Real-time ORP position calculation |
| **IP-6** | ReadingSession ↔ Analytics | Event stream | 🔄 Planned | Session tracking in Phase 3 |
| **IP-7** | Cloud Sync ↔ All Entities | Sync protocol | 🔄 Active | D1/R2/Workers infrastructure ready |

### 1.3 Current Implementation State

**Active Components (Production Ready):**
```typescript
// From app/rsvp/index.ts - Current exports
export { RSVPReader } from "./RSVPReader"
export type { RSVPReaderProps } from "./RSVPReader"
export { WordDisplay } from "./WordDisplay"
export type { WordDisplayProps } from "./WordDisplay"
export { tokenizeWords } from "./tokenizer"
export type { WordToken } from "./tokenizer"
export { calculateORP } from "./orp"
export type { ORPPosition } from "./orp"
export { calculateWordDuration, createDefaultConfig } from "./timing"
export type { TimingConfig } from "./timing"
```

**Integration Gaps Identified:**
1. RSVPReader currently receives `text` as prop - needs Document entity integration
2. No direct session tracking within RSVPReader - relies on external context
3. Progress tracking is real-time only - no persistence of partial reads
4. No bookmark integration within component - must be handled by parent

---

## 2. API Compatibility and Versioning

### 2.1 RSVP Engine API Surface

**Current API (v1.0):**
```typescript
interface RSVPReaderProps {
  text: string                    // Required: text content
  wpm?: number                     // Default: 300
  onComplete?: () => void          // Completion callback
  onProgress?: (current, total)    // Progress callback
  onWordChange?: (word, index)    // Word change callback
  fontSize?: number                // Default: 48
  autoStart?: boolean              // Default: true
  style?: ViewStyle                // Custom styling
  testID?: string                  // Testing identifier
}
```

**Proposed API Evolution:**

| Version | Changes | Migration Path |
|---------|---------|----------------|
| **v1.0** | Current | Baseline |
| **v1.1** | Add `documentId?: string` | Optional, backward compatible |
| **v1.2** | Add `bookmark?: Bookmark` | Optional, backward compatible |
| **v2.0** | Replace `text` with `document: Document` | Requires migration |

### 2.2 Compatibility Matrix

| Integration Layer | Current RSVP API | Future API | Compatibility |
|-------------------|------------------|------------|---------------|
| ReaderScreen.tsx | ✅ Direct | ✅ Wrapper | Maintain wrapper |
| ReaderContext.tsx | ⚠️ Legacy MMKV | ✅ Document | Migration needed |
| TextInputScreen.tsx | ✅ Text input | ✅ Create Document | Seamless |
| Cloud Sync | 🔄 Pending | ✅ Full sync | Document model ready |

### 2.3 Version Migration Strategy

```typescript
// Compatibility layer for gradual migration
function RSVPReaderCompat(props: RSVPReaderProps | DocumentRSVPProps) {
  // Detect which props version
  if ('document' in props) {
    // New API: Extract text from document
    const text = props.document.content || ''
    const bookmarkPosition = props.document.bookmarkPosition
    
    return (
      <RSVPReader
        text={text}
        wpm={props.document.userPreferences?.defaultWpm}
        initialIndex={bookmarkPosition} // New prop needed
        {...commonProps}
      />
    )
  }
  
  // Legacy API: Pass through
  return <RSVPReader {...props} />
}
```

---

## 3. Third-Party Dependencies

### 3.1 Dependency Inventory

| Dependency | Version | Purpose | Integration Risk |
|------------|---------|---------|------------------|
| **react-native-reanimated** | ^3.x | 60fps animations | Low - Core to RSVP |
| **react-native-mmkv** | ^2.x | Local persistence | Medium - Migration in progress |
| **expo-file-system** | ^16.x | Large content storage | Low - New integration |
| **@supabase/supabase-js** | ^2.x | Auth & sync backend | Low - Established pattern |
| **cloudflare workers** | N/A | Edge sync infrastructure | Low - Server-side |

### 3.2 Dependency Integration Analysis

**Reanimated 3 (Critical Path):**
```typescript
// Current usage in RSVPReader.tsx
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"

// Animation values
const opacity = useSharedValue(1)
const scale = useSharedValue(1)
const slideX = useSharedValue(0)

// Performance budget: <16ms frame time
// Verified: GPU-accelerated, worklet-native
```
**Integration Status:** ✅ Stable, performance verified

**MMKV (Migration Required):**
```typescript
// Legacy storage (current)
MMKV.set('Reader.text', text)
MMKV.set('Reader.speed', wpm)
MMKV.set('Reader.currentIndex', index)

// New Document model (target)
documentStorage.upsertDocument({
  id: uuid(),
  content: text,
  bookmarkPosition: index,
  status: 'reading',
  syncStatus: 'pending'
})
```
**Integration Status:** 🔄 Migration in progress (v1→v2)

### 3.3 Dependency Compatibility Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reanimated upgrade breaks animations | High | Pin to v3.x, test before upgrade |
| MMKV v3 breaking changes | Medium | Migration to Document model reduces exposure |
| Expo SDK upgrade | Low | RSVP engine is SDK-agnostic |
| Cloudflare API changes | Low | Server-side, versioned endpoints |

---

## 4. Migration Path from Current System

### 4.1 Current State (v1 - Legacy MMKV)

```typescript
// Current storage schema
interface LegacyStorage {
  'Reader.text': string           // Raw text content
  'Reader.speed': number          // WPM setting
  'Reader.chunkSize': number      // Words per display
  'Reader.currentIndex': number    // Reading position
}
```

**Limitations:**
- Single document only (no library)
- No metadata (title, source, tags)
- No reading history
- No sync capability
- No session analytics

### 4.2 Migration Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION ROADMAP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: Foundation ────────────────────────────────► [DONE]  │
│  ├── RSVP Core Engine implementation                         │
│  ├── TypeScript interfaces defined                           │
│  └── Basic MMKV storage                                       │
│                                                                  │
│  PHASE 2: Document Model ────────────────────────────► [NOW]  │
│  ├── Document entity with metadata                           │
│  ├── Bookmark support                                        │
│  ├── Migration v1 → v2                                       │
│  └── Cloud sync infrastructure                               │
│                                                                  │
│  PHASE 3: Session Tracking ────────────────────────► [NEXT]  │
│  ├── ReadingSession entity                                   │
│  ├── Analytics aggregation                                   │
│  └── Statistics dashboard                                    │
│                                                                  │
│  PHASE 4: Full Integration ────────────────────────► [FUTURE]│
│  ├── Third-party imports (EPUB, PDF)                         │
│  ├── Advanced sync (real-time)                               │
│  └── Web app parity                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Migration Implementation

**Phase 2: v1 → v2 Migration (Current)**

```typescript
// Migration function from data-model.md
const migrateV1toV2: Migration = {
  from: 1,
  to: 2,
  run: async () => {
    // 1. Migrate existing MMKV text to Document structure
    const existingText = MMKV.getString('Reader.text')
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
      }
      documentStorage.upsertDocument(doc)
    }
    
    // 2. Mark migration complete
    MMKV.set(SCHEMA_VERSION_KEY, 2)
  }
}
```

**Migration Triggers:**
- App update with new schema
- User enables cloud sync
- First document creation

### 4.4 Data Migration Safety

```typescript
// Safe migration with rollback capability
interface MigrationOperation {
  id: string
  timestamp: string
  
  // Pre-migration state snapshot
  snapshot: {
    schemaVersion: number
    legacyKeys: string[]
    documentCount: number
  }
  
  // Rollback capability
  rollback: () => Promise<void>
}

// Auto-cleanup of failed migrations
const MIGRATION_CLEANUP = {
  cleanupOnError: true,
  retainSnapshotHours: 24,
  validateBeforeCommit: true
}
```

---

## 5. Backwards Compatibility Requirements

### 5.1 Compatibility Layers

**Legacy State Fallback:**
```typescript
// From data-model.md - Backwards compatibility
function getCurrentDocument(): Document | null {
  // Try new schema first
  const docId = MMKV.getString('Reader.currentDocumentId')
  if (docId) {
    return documentStorage.getDocument(docId)
  }
  
  // Fallback to legacy MMKV
  const legacyText = MMKV.getString('Reader.text')
  if (legacyText) {
    return createEphemeralDocument(legacyText)
  }
  
  return null
}
```

**RSVPReader Compatibility:**
```typescript
// Support both legacy and new APIs
interface RSVPReaderUnifiedProps {
  // Legacy (v1.0)
  text?: string
  
  // New (v2.0)
  document?: Document
  initialBookmark?: number
  
  // Common
  wpm?: number
  onComplete?: () => void
  onProgress?: (current: number, total: number) => void
}

export const RSVPReader = memo(function RSVPReader({
  text,
  document,
  initialBookmark,
  ...props
}: RSVPReaderUnifiedProps) {
  // Resolve content source
  const content = document?.content || text || ''
  const startIndex = initialBookmark || document?.bookmarkPosition || 0
  
  // ... rest of component
})
```

### 5.2 Compatibility Test Matrix

| Scenario | Legacy API | New API | Mixed | Expected Result |
|----------|------------|---------|-------|-----------------|
| Text only | ✅ | - | - | Works with ephemeral document |
| Document only | - | ✅ | - | Works with full features |
| Both provided | ✅ | ✅ | ⚠️ | New API takes precedence |
| Neither | - | - | - | Empty state displayed |
| Bookmark only | - | Partial | ⚠️ | Uses bookmark with empty text |

### 5.3 Breaking Changes Policy

| Change Type | Policy | Example |
|-------------|--------|---------|
| **Additive** | Always allowed | New optional props |
| **Deprecate** | 2-version warning | Mark `text` as deprecated |
| **Remove** | Major version only | Remove legacy MMKV keys |
| **Behavior** | Document & gate | Timing algorithm changes |

---

## 6. Rollback Strategies

### 6.1 Import Rollback

```typescript
// From integration.md - Import rollback capability
interface ImportOperation {
  id: string
  timestamp: string
  
  // Pre-import state snapshot
  snapshot: {
    documentIds: string[]
    statistics: ReadingStatistics
  }
  
  // Rollback capability
  rollback: () => Promise<void>
}

// Auto-cleanup of failed imports
const IMPORT_CLEANUP = {
  cleanupOnError: true,
  retainForRecoveryHours: 24
}
```

**Import Failure Scenarios:**

| Scenario | Detection | Action | Recovery |
|----------|-----------|--------|----------|
| Parse error | Try-catch | Abort, cleanup partial | Retry with different parser |
| Storage full | Exception | Abort, notify user | Free space, retry |
| Timeout | Timer | Abort, queue for later | Background retry |
| Invalid format | Validation | Reject, log error | Manual review |

### 6.2 Sync Conflict Recovery

```typescript
// Conflict resolution strategies
interface ConflictRecovery {
  autoResolve: {
    'preferences': 'timestamp-wins'
    'bookmark': 'max-position-wins'  // Farther reading wins
    'statistics': 'additive-merge'   // Combine counts
  }
  
  manualReview: {
    'document-content': 'different-hash'
    'deleted-on-one': 'restore-choice'
  }
}
```

**Conflict Resolution Matrix:**

| Data Type | Strategy | Winner | User Action |
|-----------|----------|--------|-------------|
| Preferences | Last-write | Timestamp | None |
| Bookmark | Max-position | Higher value | None |
| Reading stats | Additive | Combined | None |
| Document content | Manual | User choice | Review required |
| Deleted flag | Manual | User choice | Review required |

### 6.3 Application Rollback

**Version Rollback Scenarios:**

```
┌──────────────────────────────────────────────────────────────┐
│                  ROLLBACK SCENARIOS                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  SCENARIO 1: App Update Failure                              │
│  ├── Detect: Crash on launch after update                    │
│  ├── Action: Clear new schema, restore legacy                │
│  └── Recovery: Auto-retry on next launch                   │
│                                                               │
│  SCENARIO 2: Migration Failure                              │
│  ├── Detect: Migration throws error                         │
│  ├── Action: Restore snapshot, keep legacy                   │
│  └── Recovery: Defer migration, notify user                 │
│                                                               │
│  SCENARIO 3: Sync Corruption                                │
│  ├── Detect: Data validation fails                          │
│  ├── Action: Quarantine corrupt data, fetch from cloud      │
│  └── Recovery: Manual review of conflicts                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Rollback Procedures:**

```typescript
// Emergency rollback function
async function emergencyRollback(targetVersion: number): Promise<void> {
  // 1. Stop all sync operations
  syncEngine.pause()
  
  // 2. Restore data from snapshot
  const snapshot = await loadSnapshot(targetVersion)
  await restoreFromSnapshot(snapshot)
  
  // 3. Reset schema version
  MMKV.set(SCHEMA_VERSION_KEY, targetVersion)
  
  // 4. Clear any partial migration state
  await clearMigrationState()
  
  // 5. Resume with legacy mode
  syncEngine.resume({ mode: 'legacy' })
}
```

### 6.4 Data Recovery Procedures

| Data Loss Scenario | Prevention | Recovery | RTO |
|--------------------|------------|----------|-----|
| Device failure | Cloud sync | Restore from cloud | <5 min |
| Accidental delete | Soft delete | Restore from trash | Immediate |
| Sync conflict | Versioning | Manual resolution | <1 min |
| Corruption | Checksums | Restore from backup | <10 min |
| App uninstall | iCloud backup | Restore from iCloud | Variable |

---

## 7. Integration Recommendations

### 7.1 Immediate Actions (P0)

1. **Complete Document Model Migration**
   - Implement v1→v2 migration function
   - Add rollback capability
   - Test with legacy data

2. **RSVPReader API Enhancement**
   - Add `document` prop support (v1.1)
   - Add `initialBookmark` prop
   - Maintain backwards compatibility

3. **Sync Integration**
   - Connect Document to Cloudflare sync
   - Implement conflict resolution
   - Add offline queue

### 7.2 Near-Term (P1)

1. **Session Tracking Integration**
   - Wire ReadingSession to RSVPReader events
   - Implement analytics aggregation
   - Create statistics dashboard

2. **Import/Export Pipeline**
   - File import handlers (.txt, .md)
   - JSON backup/restore
   - Share sheet integration

3. **Bookmark System**
   - Integrate bookmarks with RSVPReader
   - Quick resume from bookmark
   - Bookmark management UI

### 7.3 Future (P2)

1. **Third-Party Integrations**
   - Readwise highlights export
   - Pocket/Instapaper import
   - Notion integration

2. **Advanced Features**
   - EPUB/PDF parsing
   - URL article extraction
   - RSS feed subscriptions

---

## Appendix A: Integration Checklist

### Pre-Integration
- [ ] RSVP Engine v1.0 deployed and tested
- [ ] Document model v2.0 implemented
- [ ] Migration functions tested
- [ ] Rollback procedures documented

### Integration Phase
- [ ] RSVPReader accepts Document prop
- [ ] Legacy text prop still works
- [ ] Bookmark integration tested
- [ ] Sync integration verified
- [ ] Conflict resolution tested

### Post-Integration
- [ ] All tests passing
- [ ] Performance budgets met (<16ms frame time)
- [ ] Migration success metrics collected
- [ ] Rollback tested in staging
- [ ] Documentation updated

---

## Appendix B: Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [RSVP Core Engine README](./app/rsvp/README.md) | Component API | Complete |
| [RSVP Examples](./app/rsvp/EXAMPLES.md) | Usage patterns | Complete |
| [Data Model v2.0](./data-model.md) | Entity schemas | Complete |
| [Integration Analysis](./integration.md) | General integration | Complete |
| [Agent Specifications](./.designs/readrrr-rsvp-engine/AGENTS.md) | Development process | Complete |

---

*Document Version: 1.0*  
*Status: Integration Analysis Complete*  
*Next Review: After Phase 2 implementation*
