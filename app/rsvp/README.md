# RSVP Core Engine

Production-grade RSVP (Rapid Serial Visual Presentation) reading engine for React Native with 60fps animations, ORP highlighting, and comprehensive test coverage.

## Features

- **60fps Animations**: GPU-accelerated with Reanimated 3
- **ORP Highlighting**: Optimal Recognition Point at 35% word position
- **Variable Timing**: Adjusts for word length and punctuation
- **Gesture Controls**: Tap-to-pause, swipe navigation (extensible)
- **TypeScript**: Full type safety, no `any` types
- **Test Coverage**: 90%+ coverage with TDD approach

## Quick Start

```tsx
import { RSVPReader } from "./rsvp"

function ReadingScreen() {
  return (
    <RSVPReader
      text="The quick brown fox jumps over the lazy dog."
      wpm={400}
      onComplete={() => console.log("Reading complete!")}
      onProgress={(current, total) => console.log(`${current}/${total}`)}
    />
  )
}
```

## Components

### RSVPReader

Main RSVP reading component with auto-advance and progress tracking.

```tsx
<RSVPReader
  text={string}           // Required: text to display
  wpm={300}              // Words per minute (100-500)
  onComplete={fn}          // Called when reading completes
  onProgress={fn}          // Called on each word change
  fontSize={48}           // Word display font size
  autoStart={true}        // Auto-start on mount
/>
```

### WordDisplay

Renders a single word with ORP character highlighted.

```tsx
<WordDisplay
  word="Hello"
  fontSize={48}
  orpColor="#FF6B6B"
  textColor="#333333"
/>
```

## Core Functions

### Tokenization

```typescript
import { tokenizeWords } from "./tokenizer"

const tokens = tokenizeWords("Hello, world!")
// [{ text: "Hello", index: 0 }, { text: ",", index: 1 }, ...]
```

### ORP Calculation

```typescript
import { calculateORP } from "./orp"

const orp = calculateORP("Hello") // { index: 1, character: "e" }
```

### Timing

```typescript
import { calculateWordDuration, createDefaultConfig } from "./timing"

const config = createDefaultConfig(300)
const duration = calculateWordDuration("hello", config) // 240ms
```

## Performance Budgets

| Metric | Target | Status |
|--------|--------|--------|
| Frame Time | <16ms | ✅ Verified |
| Memory | <100MB | ✅ Verified |
| Start Time | <50ms | ✅ Verified |
| Bundle Size | <500KB | ✅ Verified |
| Test Coverage | 90%+ | ✅ Verified |

## Architecture

```
┌─────────────────┐
│   RSVPReader    │
│  (Component)    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌───────┐ ┌────────┐ ┌─────────┐
│Word   │ │Timing  │ │Progress │
│Display│ │Engine  │ │Tracker  │
└───────┘ └────────┘ └─────────┘
    │         │
    ▼         ▼
┌─────────────────┐
│   Tokenizer     │
│   ORP Calc      │
└─────────────────┘
```

## File Structure

```
app/rsvp/
├── __tests__/
│   ├── tokenizer.test.ts      # Tokenization tests
│   ├── orp.test.ts            # ORP calculation tests
│   ├── timing.test.ts         # Timing engine tests
│   ├── WordDisplay.test.tsx   # UI component tests
│   ├── RSVPReader.test.tsx    # Integration tests
│   ├── integration.test.tsx   # E2E flow tests
│   └── performance.test.ts    # Performance benchmarks
├── tokenizer.ts               # Word tokenization
├── orp.ts                     # ORP calculation
├── timing.ts                  # Variable timing
├── WordDisplay.tsx            # Word display component
├── RSVPReader.tsx             # Main RSVP component
├── README.md                  # This file
└── EXAMPLES.md               # Usage examples
```

## Testing

```bash
# Run all RSVP tests
npm test -- app/rsvp

# Run with coverage
npm run test:coverage

# Run performance benchmarks
npm test -- performance.test.ts
```

## CI/CD

GitHub Actions workflow runs on every push to RSVP-related files:
- TypeScript compilation
- ESLint checks
- Jest tests with coverage
- Performance benchmarks

## References

- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/)
- [RSVP Research](https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation)
- [Reanimated 3 Docs](https://docs.swmansion.com/react-native-reanimated/)

---

*Part of READ-001: RSVP Core Engine*
*Built with TDD, 90%+ coverage, 60fps performance*
