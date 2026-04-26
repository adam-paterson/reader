/**
 * Optimal Recognition Point position
 * The ORP is the optimal fixation point within a word for RSVP reading.
 * Research shows 35% from the start of the word is optimal.
 */
export interface ORPPosition {
  /** Character index (0-based) of the ORP */
  index: number
  /** The ORP character at the calculated position */
  character: string
}

/** ORP percentage based on RSVP research (35% is optimal) */
const ORP_PERCENTAGE = 0.35

/**
 * Calculate the Optimal Recognition Point (ORP) for a word.
 * The ORP is the optimal fixation point at approximately 35% of the word length.
 *
 * @param word - The word to calculate ORP for
 * @returns ORPPosition with index and character
 *
 * @example
 * calculateORP("Hello")
 * // Returns: { index: 1, character: "e" } // 35% of 5 = 1.75 -> 1
 *
 * @example
 * calculateORP("Extraordinary")
 * // Returns: { index: 4, character: "r" } // 35% of 13 = 4.55 -> 4
 */
export function calculateORP(word: string): ORPPosition {
  if (!word || word.length === 0) {
    return { index: 0, character: "" }
  }

  const index = Math.floor(word.length * ORP_PERCENTAGE)
  const safeIndex = Math.min(index, word.length - 1)

  return {
    index: safeIndex,
    character: word[safeIndex],
  }
}
