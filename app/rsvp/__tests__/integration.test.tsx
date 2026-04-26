import { render, waitFor } from "@testing-library/react-native"

import { calculateORP } from "../orp"
import { RSVPReader } from "../RSVPReader"
import { calculateWordDuration, createDefaultConfig } from "../timing"
import { tokenizeWords } from "../tokenizer"

/**
 * Integration tests for the complete RSVP engine workflow.
 * Tests the integration between tokenizer, ORP, timing, and UI components.
 */
describe("RSVP Engine Integration", () => {
  const sampleText = "The quick brown fox jumps over the lazy dog."

  describe("End-to-End Reading Flow", () => {
    it("should tokenize and display first word correctly", () => {
      const tokens = tokenizeWords(sampleText)
      expect(tokens[0].text).toBe("The")

      const { getByTestId } = render(<RSVPReader text={sampleText} wpm={300} autoStart={false} />)

      expect(getByTestId("rsvp-word-display")).toBeTruthy()
    })

    it("should calculate ORP for displayed word", () => {
      const tokens = tokenizeWords("Hello")
      const orp = calculateORP(tokens[0].text)

      expect(orp.index).toBe(1)
      expect(orp.character).toBe("e")
    })

    it("should calculate timing for each word type", () => {
      const config = createDefaultConfig(300)

      // Short word (< 5 chars)
      const shortDuration = calculateWordDuration("the", config)
      expect(shortDuration).toBe(200) // 200ms * 1.0

      // Medium word (5-8 chars)
      const mediumDuration = calculateWordDuration("quick", config)
      expect(mediumDuration).toBe(240) // 200ms * 1.2

      // Long word (> 8 chars)
      const longDuration = calculateWordDuration("extraordinary", config)
      expect(longDuration).toBe(300) // 200ms * 1.5
    })

    it("should add punctuation delays", () => {
      const config = createDefaultConfig(300)

      const withPeriod = calculateWordDuration("end.", config)
      expect(withPeriod).toBe(500) // 200ms + 300ms period delay

      const withComma = calculateWordDuration("word,", config)
      expect(withComma).toBe(390) // 200ms * 1.2 (medium) + 150ms comma delay
    })
  })

  describe("Progress Tracking", () => {
    it("should track progress through document", async () => {
      const onProgress = jest.fn()

      render(<RSVPReader text="One two three" wpm={300} onProgress={onProgress} />)

      // Should be called with initial progress
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalled()
      })
    })

    it("should report correct total word count", () => {
      const tokens = tokenizeWords("Hello world test")
      expect(tokens).toHaveLength(3)
    })
  })

  describe("Complete RSVP Pipeline", () => {
    it("should process text through all stages", () => {
      // Stage 1: Tokenization
      const tokens = tokenizeWords("It's a test.")
      expect(tokens.map((t) => t.text)).toEqual(["It's", "a", "test", "."])

      // Stage 2: ORP calculation for each word
      const orps = tokens.map((t) => calculateORP(t.text))
      expect(orps[0].index).toBe(1) // It's -> 1
      expect(orps[1].index).toBe(0) // a -> 0

      // Stage 3: Timing calculation
      const config = createDefaultConfig(300)
      const durations = tokens.map((t) => calculateWordDuration(t.text, config))
      expect(durations[3]).toBeGreaterThan(durations[0]) // Period adds delay
    })
  })

  describe("Edge Cases", () => {
    it("should handle text with only punctuation", () => {
      const tokens = tokenizeWords("...")
      expect(tokens).toHaveLength(3)
    })

    it("should handle very long words", () => {
      const longWord = "pneumonoultramicroscopicsilicovolcanoconiosis"
      const orp = calculateORP(longWord)
      expect(orp.index).toBe(Math.floor(longWord.length * 0.35))
    })

    it("should handle mixed whitespace", () => {
      const text = "Word1\t\n\rWord2"
      const tokens = tokenizeWords(text)
      expect(tokens).toHaveLength(2)
    })
  })
})
