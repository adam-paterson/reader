/**
 * Word token for RSVP reading
 */
export interface WordToken {
  /** The text content of the token */
  text: string
  /** The index of this token in the sequence */
  index: number
}

/**
 * Tokenize text into words and punctuation for RSVP display.
 * Splits on whitespace and separates punctuation as individual tokens.
 *
 * @param text - The text to tokenize
 * @returns Array of WordToken objects
 *
 * @example
 * tokenizeWords("Hello, world!")
 * // Returns: [{text: "Hello", index: 0}, {text: ",", index: 1}, {text: "world", index: 2}, {text: "!", index: 3}]
 */
export function tokenizeWords(text: string): WordToken[] {
  if (!text || !text.trim()) return []

  // Split on whitespace OR punctuation (keeping punctuation as tokens)
  // Contractions like "It's" are preserved as single tokens
  const tokens = text
    .split(/(\s+|[.,!?;:])/) // Split on whitespace or punctuation
    .filter((t) => t && !/^\s+$/.test(t)) // Remove empty and pure whitespace

  return tokens.map((text, index) => ({ text, index }))
}
