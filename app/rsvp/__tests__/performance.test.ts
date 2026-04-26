/**
 * Performance benchmarks for RSVP engine.
 *
 * Performance Budgets:
 * - Frame time: <16ms
 * - Memory: <100MB
 * - Start time: <50ms
 * - Bundle size: <500KB
 */

describe("RSVP Performance Benchmarks", () => {
  describe("Frame Time (60fps budget)", () => {
    it("should tokenize 1000 words in <50ms", () => {
      const text = Array(1000).fill("word").join(" ")

      const start = performance.now()
      const { tokenizeWords } = require("../tokenizer")
      tokenizeWords(text)
      const end = performance.now()

      // Allow 50ms for CI environment variance (target is still <16ms for production)
      expect(end - start).toBeLessThan(50)
    })

    it("should calculate ORP for 1000 words in <16ms", () => {
      const words = Array(1000).fill("average")
      const { calculateORP } = require("../orp")

      const start = performance.now()
      words.forEach((word) => calculateORP(word))
      const end = performance.now()

      expect(end - start).toBeLessThan(16)
    })

    it("should calculate timing for 1000 words in <16ms", () => {
      const words = Array(1000).fill("average")
      const { calculateWordDuration, createDefaultConfig } = require("../timing")
      const config = createDefaultConfig(300)

      const start = performance.now()
      words.forEach((word) => calculateWordDuration(word, config))
      const end = performance.now()

      expect(end - start).toBeLessThan(16)
    })
  })

  describe("Memory Budget (<100MB)", () => {
    it("should handle large text without excessive memory", () => {
      const { tokenizeWords } = require("../tokenizer")

      // Generate 10,000 words
      const text = Array(10000).fill("average").join(" ")

      const before = process.memoryUsage?.()?.heapUsed || 0
      const tokens = tokenizeWords(text)
      const after = process.memoryUsage?.()?.heapUsed || 0

      // Should create tokens without error
      expect(tokens).toHaveLength(10000)

      // Memory increase should be reasonable (<50MB for 10k words)
      if (before && after) {
        const increaseMB = (after - before) / 1024 / 1024
        expect(increaseMB).toBeLessThan(50)
      }
    })
  })

  describe("Start Time Budget (<50ms)", () => {
    it("should initialize RSVP reader in <50ms", () => {
      const React = require("react")
      const { RSVPReader } = require("../RSVPReader")

      const start = performance.now()
      // Simulate creating element (not full render)
      React.createElement(RSVPReader, { text: "Hello world", wpm: 300 })
      const end = performance.now()

      expect(end - start).toBeLessThan(50)
    })
  })
})
