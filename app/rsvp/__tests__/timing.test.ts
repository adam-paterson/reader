import { calculateWordDuration, createDefaultConfig } from "../timing"

describe("calculateWordDuration", () => {
  const defaultConfig = {
    baseWPM: 300,
    punctuationDelays: {
      period: 300,
      comma: 150,
      semicolon: 200,
      other: 100,
    },
    wordLengthMultipliers: {
      short: 1.0, // < 5 chars
      medium: 1.2, // 5-8 chars
      long: 1.5, // > 8 chars
    },
  }

  it("should calculate base duration from WPM (300 WPM = 200ms)", () => {
    const result = calculateWordDuration("test", defaultConfig)
    // 60000 / 300 = 200ms base
    expect(result).toBe(200)
  })

  it("should apply short word multiplier (< 5 chars)", () => {
    const result = calculateWordDuration("the", defaultConfig)
    // 200ms * 1.0 = 200ms
    expect(result).toBe(200)
  })

  it("should apply medium word multiplier (5-8 chars)", () => {
    const result = calculateWordDuration("hello", defaultConfig)
    // 200ms * 1.2 = 240ms
    expect(result).toBe(240)
  })

  it("should apply long word multiplier (> 8 chars)", () => {
    const result = calculateWordDuration("extraordinary", defaultConfig)
    // 200ms * 1.5 = 300ms
    expect(result).toBe(300)
  })

  it("should add period delay", () => {
    const result = calculateWordDuration("ends.", defaultConfig)
    // 200ms * 1.2 (medium for 5 chars) + 300ms = 540ms
    expect(result).toBe(540)
  })

  it("should add comma delay", () => {
    const result = calculateWordDuration("word,", defaultConfig)
    // 200ms * 1.2 (medium) + 150ms = 390ms
    expect(result).toBe(390)
  })

  it("should handle empty string", () => {
    const result = calculateWordDuration("", defaultConfig)
    expect(result).toBe(0)
  })

  it("should work with different WPM settings", () => {
    const slowConfig = { ...defaultConfig, baseWPM: 200 }
    const result = calculateWordDuration("test", slowConfig)
    // 60000 / 200 = 300ms base
    expect(result).toBe(300)
  })

  it("should work with fast WPM settings (500 WPM)", () => {
    const fastConfig = { ...defaultConfig, baseWPM: 500 }
    const result = calculateWordDuration("test", fastConfig)
    // 60000 / 500 = 120ms base
    expect(result).toBe(120)
  })
})

describe("createDefaultConfig", () => {
  it("should create default timing config", () => {
    const config = createDefaultConfig()
    expect(config.baseWPM).toBe(300)
    expect(config.punctuationDelays.period).toBe(300)
    expect(config.wordLengthMultipliers.short).toBe(1.0)
  })

  it("should allow custom WPM", () => {
    const config = createDefaultConfig(400)
    expect(config.baseWPM).toBe(400)
  })
})
