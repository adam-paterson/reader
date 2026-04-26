import React, { memo } from "react"
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { calculateORP } from "./orp"

/**
 * Props for WordDisplay component
 */
export interface WordDisplayProps {
  /** The word to display */
  word: string
  /** Font size for the word (default: 48) */
  fontSize?: number
  /** Color for the ORP highlight (default: #FF6B6B) */
  orpColor?: string
  /** Color for regular text (default: #333333) */
  textColor?: string
  /** Test ID for testing */
  testID?: string
}

/**
 * WordDisplay renders a single word with ORP (Optimal Recognition Point) highlighting.
 * The ORP is highlighted at approximately 35% of the word length for optimal reading.
 *
 * @example
 * <WordDisplay word="Hello" fontSize={48} orpColor="#FF6B6B" />
 */
export const WordDisplay = memo(function WordDisplay({
  word,
  fontSize = 48,
  orpColor = "#FF6B6B",
  textColor = "#333333",
  testID = "word-display",
}: WordDisplayProps) {
  if (!word || word.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={[styles.text, { fontSize, color: textColor }]}> </Text>
      </View>
    )
  }

  const orp = calculateORP(word)
  const prefix = word.slice(0, orp.index)
  const orpChar = orp.character
  const suffix = word.slice(orp.index + 1)

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.wordRow, { fontSize }]}>
        <Text style={{ color: textColor }} testID="word-prefix">
          {prefix}
        </Text>
        <Text style={[styles.orpChar, { color: orpColor, fontSize: fontSize * 1.1 }]} testID="orp-character">
          {orpChar}
        </Text>
        <Text style={{ color: textColor }} testID="word-suffix">
          {suffix}
        </Text>
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  wordRow: {
    flexDirection: "row",
    fontWeight: "500",
  },
  orpChar: {
    fontWeight: "700",
  },
  text: {
    fontWeight: "500",
  },
})
