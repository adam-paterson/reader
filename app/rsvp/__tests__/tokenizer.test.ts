import { tokenizeWords, WordToken } from "../tokenizer"

describe("tokenizeWords", () => {
  it("should tokenize simple sentence", () => {
    const result = tokenizeWords("Hello world")
    expect(result).toEqual([
      { text: "Hello", index: 0 },
      { text: "world", index: 1 },
    ])
  })

  it("should handle multiple spaces", () => {
    const result = tokenizeWords("Hello   world")
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe("Hello")
    expect(result[1].text).toBe("world")
  })

  it("should handle punctuation as separate tokens", () => {
    const result = tokenizeWords("Hello, world!")
    expect(result.map((t) => t.text)).toEqual(["Hello", ",", "world", "!"])
  })

  it("should handle empty string", () => {
    const result = tokenizeWords("")
    expect(result).toEqual([])
  })

  it("should preserve contractions", () => {
    const result = tokenizeWords("It's a test")
    expect(result.map((t) => t.text)).toContain("It's")
  })

  it("should handle mixed punctuation and words", () => {
    const result = tokenizeWords("Hello, world! How are you?")
    expect(result.map((t) => t.text)).toEqual([
      "Hello",
      ",",
      "world",
      "!",
      "How",
      "are",
      "you",
      "?",
    ])
  })

  it("should handle semicolons and colons", () => {
    const result = tokenizeWords("First; second: third")
    expect(result.map((t) => t.text)).toEqual(["First", ";", "second", ":", "third"])
  })
})
