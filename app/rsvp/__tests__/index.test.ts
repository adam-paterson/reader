// Test index.ts exports
import { RSVPReader, WordDisplay, tokenizeWords, calculateORP, calculateWordDuration, createDefaultConfig } from "../index"

describe("RSVP Module Exports", () => {
  it("should export RSVPReader", () => {
    expect(RSVPReader).toBeDefined()
  })

  it("should export WordDisplay", () => {
    expect(WordDisplay).toBeDefined()
  })

  it("should export tokenizeWords", () => {
    expect(tokenizeWords).toBeDefined()
    expect(typeof tokenizeWords).toBe("function")
  })

  it("should export calculateORP", () => {
    expect(calculateORP).toBeDefined()
    expect(typeof calculateORP).toBe("function")
  })

  it("should export calculateWordDuration", () => {
    expect(calculateWordDuration).toBeDefined()
    expect(typeof calculateWordDuration).toBe("function")
  })

  it("should export createDefaultConfig", () => {
    expect(createDefaultConfig).toBeDefined()
    expect(typeof createDefaultConfig).toBe("function")
  })

  it("should use exported functions correctly", () => {
    // Test a complete flow using only public exports
    const tokens = tokenizeWords("Hello world")
    expect(tokens).toHaveLength(2)

    const orp = calculateORP(tokens[0].text)
    expect(orp.index).toBe(1)

    const config = createDefaultConfig(300)
    const duration = calculateWordDuration(tokens[0].text, config)
    expect(duration).toBeGreaterThan(0)
  })
})
