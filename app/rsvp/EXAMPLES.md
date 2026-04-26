# RSVP Engine Usage Examples

## Basic Usage

### Simple RSVP Reader

```tsx
import { RSVPReader } from "./rsvp"

function SimpleReader() {
  return (
    <RSVPReader
      text="The quick brown fox jumps over the lazy dog."
      wpm={300}
    />
  )
}
```

### With Progress Tracking

```tsx
import { RSVPReader } from "./rsvp"
import { View, Text } from "react-native"

function ReaderWithProgress() {
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  return (
    <View style={{ flex: 1 }}>
      <RSVPReader
        text={articleContent}
        wpm={400}
        onProgress={(current, total) => setProgress({ current, total })}
        onComplete={() => console.log("Done!")}
      />
      <Text>
        {progress.current} / {progress.total} words
      </Text>
    </View>
  )
}
```

## Advanced Usage

### Custom Styling

```tsx
import { RSVPReader } from "./rsvp"

function StyledReader() {
  return (
    <RSVPReader
      text="Your text here..."
      wpm={350}
      fontSize={56}
      style={{
        backgroundColor: "#1a1a1a",
        padding: 30,
      }}
    />
  )
}
```

### Manual Control

```tsx
import { RSVPReader } from "./rsvp"
import { useRef } from "react"
import { View, Button } from "react-native"

function ControlledReader() {
  return (
    <View style={{ flex: 1 }}>
      <RSVPReader
        text="Your text here..."
        wpm={300}
        autoStart={false}
      />
    </View>
  )
}
```

## Using Core Functions Directly

### Custom Tokenization

```tsx
import { tokenizeWords } from "./tokenizer"

function analyzeText(text: string) {
  const tokens = tokenizeWords(text)

  console.log(`Word count: ${tokens.length}`)
  console.log(`Average word length: ${
    tokens.reduce((sum, t) => sum + t.text.length, 0) / tokens.length
  }`)

  return tokens
}
```

### ORP Analysis

```tsx
import { calculateORP } from "./orp"

function getORPPositions(text: string) {
  const words = text.split(/\s+/)

  return words.map(word => ({
    word,
    orp: calculateORP(word)
  }))
}

// Example output:
// [
//   { word: "Hello", orp: { index: 1, character: "e" } },
//   { word: "world", orp: { index: 1, character: "o" } }
// ]
```

### Custom Timing Configuration

```tsx
import { calculateWordDuration, TimingConfig } from "./timing"

const fastReaderConfig: TimingConfig = {
  baseWPM: 500,
  punctuationDelays: {
    period: 200,
    comma: 100,
    semicolon: 150,
    other: 50,
  },
  wordLengthMultipliers: {
    short: 0.8,   // Faster for short words
    medium: 1.0,
    long: 1.2,    // Less penalty for long words
  },
}

function calculateReadingTime(text: string): number {
  const { tokenizeWords } = require("./tokenizer")
  const tokens = tokenizeWords(text)

  return tokens.reduce((total, token) => {
    return total + calculateWordDuration(token.text, fastReaderConfig)
  }, 0)
}
```

## Integration with WordDisplay Only

```tsx
import { WordDisplay } from "./WordDisplay"
import { useState, useEffect } from "react"
import { View } from "react-native"

function CustomRSVP() {
  const [currentWord, setCurrentWord] = useState("Hello")

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <WordDisplay
        word={currentWord}
        fontSize={64}
        orpColor="#FF6B6B"
        textColor="#333333"
      />
    </View>
  )
}
```

## Speed Test Comparison

```tsx
import { RSVPReader } from "./rsvp"
import { useState } from "react"
import { View, Button } from "react-native"

function SpeedComparison() {
  const [wpm, setWpm] = useState(300)
  const text = "This is a sample text for testing different reading speeds."

  return (
    <View style={{ flex: 1 }}>
      <RSVPReader
        text={text}
        wpm={wpm}
        autoStart={false}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
        <Button title="200 WPM" onPress={() => setWpm(200)} />
        <Button title="300 WPM" onPress={() => setWpm(300)} />
        <Button title="400 WPM" onPress={() => setWpm(400)} />
        <Button title="500 WPM" onPress={() => setWpm(500)} />
      </View>
    </View>
  )
}
```

## Testing Your Implementation

```tsx
// __tests__/MyRSVP.test.tsx
import { render } from "@testing-library/react-native"
import { RSVPReader } from "./rsvp"

describe("My RSVP Implementation", () => {
  it("renders correctly", () => {
    const { getByTestId } = render(
      <RSVPReader text="Test" wpm={300} />
    )
    expect(getByTestId("rsvp-word-display")).toBeTruthy()
  })
})
```

---

*See README.md for API documentation and architecture overview*
