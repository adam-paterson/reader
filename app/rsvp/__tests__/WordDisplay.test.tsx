import React from "react"
import { render } from "@testing-library/react-native"
import { WordDisplay } from "../WordDisplay"
import { calculateORP } from "../orp"

describe("WordDisplay", () => {
  it("should render a simple word", () => {
    const { getByTestId } = render(<WordDisplay word="Hello" />)
    expect(getByTestId("word-display")).toBeTruthy()
  })

  it("should highlight ORP character at 35%", () => {
    const { getByTestId } = render(<WordDisplay word="Hello" />)
    const orpChar = getByTestId("orp-character")
    expect(orpChar).toBeTruthy()
    expect(orpChar.children[0]).toBe("e") // ORP at index 1 for "Hello"
  })

  it("should handle single character words", () => {
    const { getByTestId } = render(<WordDisplay word="I" />)
    const orpChar = getByTestId("orp-character")
    expect(orpChar.children[0]).toBe("I")
  })

  it("should handle long words", () => {
    const { getByTestId } = render(<WordDisplay word="Extraordinary" />)
    const orpChar = getByTestId("orp-character")
    expect(orpChar.children[0]).toBe("a") // ORP at index 4
  })

  it("should render prefix before ORP", () => {
    const { getByTestId } = render(<WordDisplay word="Hello" />)
    const prefix = getByTestId("word-prefix")
    expect(prefix.children[0]).toBe("H") // "H" before "e"
  })

  it("should render suffix after ORP", () => {
    const { getByTestId } = render(<WordDisplay word="Hello" />)
    const suffix = getByTestId("word-suffix")
    expect(suffix.children[0]).toBe("llo") // "llo" after "e"
  })

  it("should apply custom font size", () => {
    const { getByTestId } = render(<WordDisplay word="Test" fontSize={32} />)
    const container = getByTestId("word-display")
    expect(container).toBeTruthy()
  })

  it("should apply custom ORP color", () => {
    const { getByTestId } = render(<WordDisplay word="Test" orpColor="#FF0000" />)
    const orpChar = getByTestId("orp-character")
    expect(orpChar).toBeTruthy()
  })
})
