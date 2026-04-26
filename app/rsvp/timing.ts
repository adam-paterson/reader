/**
 * Timing configuration for RSVP word display
 */
export interface TimingConfig {
  /** Base words per minute rate */
  baseWPM: number
  /** Millisecond delays for punctuation marks */
  punctuationDelays: {
    period: number
    comma: number
    semicolon: number
    other: number
  }
  /** Multipliers based on word length */
  wordLengthMultipliers: {
    short: number // < 5 chars
    medium: number // 5-8 chars
    long: number // > 8 chars
  }
}

/** Default base delay in milliseconds (for 300 WPM) */
const DEFAULT_BASE_DELAY_MS = 200

/**
 * Calculate the display duration for a word in RSVP mode.
 * Considers word length, punctuation, and WPM settings.
 *
 * @param word - The word to calculate duration for
 * @param config - Timing configuration
 * @returns Duration in milliseconds
 *
 * @example
 * calculateWordDuration("hello", defaultConfig)
 * // Returns: 240 (200ms base * 1.2 medium multiplier)
 *
 * @example
 * calculateWordDuration("end.", defaultConfig)
 * // Returns: 540 (200ms * 1.2 + 300ms period delay)
 */
export function calculateWordDuration(word: string, config: TimingConfig): number {
  if (!word || word.length === 0) {
    return 0
  }

  // Base duration from WPM: 60000ms / WPM = ms per word
  const baseDuration = Math.round(60000 / config.baseWPM)

  // Determine word length multiplier
  let multiplier = config.wordLengthMultipliers.short
  if (word.length >= 5 && word.length <= 8) {
    multiplier = config.wordLengthMultipliers.medium
  } else if (word.length > 8) {
    multiplier = config.wordLengthMultipliers.long
  }

  let duration = Math.round(baseDuration * multiplier)

  // Add punctuation delays
  const lastChar = word[word.length - 1]
  if (lastChar === ".") {
    duration += config.punctuationDelays.period
  } else if (lastChar === ",") {
    duration += config.punctuationDelays.comma
  } else if (lastChar === ";" || lastChar === ":") {
    duration += config.punctuationDelays.semicolon
  } else if (",.!?;:".includes(lastChar)) {
    duration += config.punctuationDelays.other
  }

  return duration
}

/**
 * Create a default timing configuration.
 *
 * @param baseWPM - Base words per minute (default: 300)
 * @returns TimingConfig with sensible defaults
 *
 * @example
 * createDefaultConfig(400)
 * // Returns config for 400 WPM reading speed
 */
export function createDefaultConfig(baseWPM: number = 300): TimingConfig {
  return {
    baseWPM,
    punctuationDelays: {
      period: 300,
      comma: 150,
      semicolon: 200,
      other: 100,
    },
    wordLengthMultipliers: {
      short: 1.0,
      medium: 1.2,
      long: 1.5,
    },
  }
}
