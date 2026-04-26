import { calculateORP, ORPPosition } from "../orp"

describe("calculateORP", () => {
  it("should calculate ORP at 35% for 'Hello'", () => {
    const result = calculateORP("Hello")
    expect(result.index).toBe(1) // 35% of 5 = 1.75 -> 1
    expect(result.character).toBe("e")
  })

  it("should calculate ORP for 'world' (5 chars)", () => {
    const result = calculateORP("world")
    expect(result.index).toBe(1)
    expect(result.character).toBe("o")
  })

  it("should handle single character", () => {
    const result = calculateORP("I")
    expect(result.index).toBe(0)
    expect(result.character).toBe("I")
  })

  it("should handle two characters", () => {
    const result = calculateORP("am")
    expect(result.index).toBe(0)
    expect(result.character).toBe("a")
  })

  it("should handle long words", () => {
    const result = calculateORP("Extraordinary")
    expect(result.index).toBe(4) // 35% of 13 = 4.55 -> 4
    expect(result.character).toBe("a") // E-x-t-r-a-o-r-d-i-n-a-r-y, index 4 is 'a'
  })

  it("should handle empty string", () => {
    const result = calculateORP("")
    expect(result.index).toBe(0)
    expect(result.character).toBe("")
  })

  it("should handle very short words (3 chars)", () => {
    const result = calculateORP("the")
    expect(result.index).toBe(1) // 35% of 3 = 1.05 -> 1
    expect(result.character).toBe("h")
  })
})
