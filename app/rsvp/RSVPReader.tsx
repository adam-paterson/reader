import { memo, useCallback, useEffect, useRef, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { calculateWordDuration, createDefaultConfig } from "./timing"
import { tokenizeWords, WordToken } from "./tokenizer"
import { WordDisplay } from "./WordDisplay"

/**
 * Props for RSVPReader component
 */
export interface RSVPReaderProps {
  /** Text content to display in RSVP mode */
  text: string
  /** Reading speed in words per minute (default: 300) */
  wpm?: number
  /** Callback when reading is complete */
  onComplete?: () => void
  /** Callback with progress updates (currentIndex, totalWords) */
  onProgress?: (current: number, total: number) => void
  /** Callback when word changes */
  onWordChange?: (word: string, index: number) => void
  /** Custom font size (default: 48) */
  fontSize?: number
  /** Auto-start reading on mount (default: true) */
  autoStart?: boolean
  /** Custom styles for container */
  style?: ViewStyle
  /** Test ID for testing */
  testID?: string
}

const { width: SCREEN_WIDTH } = Dimensions.get("window")

/**
 * RSVPReader displays text in Rapid Serial Visual Presentation mode.
 * Words are shown one at a time with ORP highlighting, variable timing,
 * and smooth animations at 60fps.
 *
 * @example
 * <RSVPReader
 *   text="The quick brown fox jumps over the lazy dog."
 *   wpm={400}
 *   onComplete={() => console.log("Done!")}
 * />
 */
export const RSVPReader = memo(function RSVPReader({
  text,
  wpm = 300,
  onComplete,
  onProgress,
  onWordChange,
  fontSize = 48,
  autoStart = true,
  style,
  testID = "rsvp-reader",
}: RSVPReaderProps) {
  // Tokenize text into words
  const tokens = useRef<WordToken[]>(tokenizeWords(text)).current
  const totalWords = tokens.length

  // State
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoStart)

  // Animation values
  const opacity = useSharedValue(1)
  const scale = useSharedValue(1)
  const slideX = useSharedValue(0)

  // Timing config
  const timingConfig = useRef(createDefaultConfig(wpm)).current

  // Get current word
  const currentWord = tokens[currentIndex]?.text || ""

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }, { translateX: slideX.value }],
    }
  }, [])

  // Advance to next word
  const advanceWord = useCallback(() => {
    if (currentIndex < totalWords - 1) {
      // Animate out
      opacity.value = withTiming(0, { duration: 50, easing: Easing.ease })
      slideX.value = withTiming(-20, { duration: 50 })

      setTimeout(() => {
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
        onWordChange?.(tokens[nextIndex]?.text, nextIndex)

        // Reset position and animate in
        slideX.value = 20
        opacity.value = withTiming(1, { duration: 50, easing: Easing.ease })
        slideX.value = withSpring(0, { damping: 20, stiffness: 200 })
      }, 60)
    } else {
      onComplete?.()
      setIsPlaying(false)
    }
  }, [currentIndex, totalWords, tokens, onComplete, onWordChange, opacity, slideX])

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || totalWords === 0) return

    const duration = calculateWordDuration(currentWord, timingConfig)
    const timer = setTimeout(advanceWord, Math.max(duration, 50))

    return () => clearTimeout(timer)
  }, [currentIndex, isPlaying, currentWord, timingConfig, totalWords, advanceWord])

  // Report progress
  useEffect(() => {
    onProgress?.(currentIndex, totalWords)
  }, [currentIndex, totalWords, onProgress])

  // Initial animation
  useEffect(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }, [scale])

  // Handle empty text
  if (totalWords === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <Text style={styles.emptyText}>No text to display</Text>
      </View>
    )
  }

  const progress = totalWords > 0 ? Math.round((currentIndex / totalWords) * 100) : 0

  return (
    <View style={[styles.container, style]} testID={`${testID}-container`}>
      {/* Word Display with animation */}
      <Animated.View style={[styles.wordContainer, animatedStyle]} testID="rsvp-word-container">
        <WordDisplay word={currentWord} fontSize={fontSize} testID="rsvp-word-display" />
      </Animated.View>

      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="rsvp-progress">
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${progress}%` }]}
            testID="rsvp-progress-fill"
          />
        </View>
        <Text style={styles.progressText} testID="rsvp-progress-text">
          {currentIndex + 1} / {totalWords} ({progress}%)
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={togglePlayPause}
          testID="rsvp-pause-button"
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonText}>{isPlaying ? "⏸" : "▶️"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

/* eslint-disable react-native/no-color-literals, react-native/sort-styles */
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  controlButton: {
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 30,
    minWidth: 60,
    padding: 15,
  },
  controlButtonText: {
    fontSize: 24,
  },
  controlsContainer: {
    flexDirection: "row",
    gap: 20,
    marginTop: 30,
  },
  emptyText: {
    color: "#999999",
    fontSize: 16,
  },
  progressBarBackground: {
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    height: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    backgroundColor: "#FF6B6B",
    borderRadius: 2,
    height: "100%",
  },
  progressContainer: {
    marginTop: 40,
    width: SCREEN_WIDTH * 0.8,
  },
  progressText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  wordContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
})
