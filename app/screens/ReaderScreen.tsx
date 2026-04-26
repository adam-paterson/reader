import { FC, useCallback, useEffect, useRef } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useReader } from "@/context/ReaderContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

interface ReaderScreenProps extends AppStackScreenProps<"Reader"> {}

export const ReaderScreen: FC<ReaderScreenProps> = function ReaderScreen({ navigation }) {
  const {
    currentWord,
    words,
    currentWordIndex,
    setCurrentWordIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    chunkSize,
    setChunkSize,
    progress,
    wordCount,
  } = useReader()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle the RSVP timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 * 1000) / speed
      intervalRef.current = setInterval(() => {
        setCurrentWordIndex((prev) => {
          const nextIndex = prev + chunkSize
          if (nextIndex >= words.length) {
            setIsPlaying(false)
            return prev
          }
          return nextIndex
        })
      }, intervalMs)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, speed, chunkSize, words.length, setCurrentWordIndex, setIsPlaying])

  const togglePlay = useCallback(() => {
    if (currentWordIndex >= words.length - 1) {
      // Restart from beginning if at end
      setCurrentWordIndex(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, currentWordIndex, words.length, setCurrentWordIndex, setIsPlaying])

  const increaseSpeed = useCallback(() => {
    setSpeed(Math.min(speed + 50, 1000))
  }, [speed, setSpeed])

  const decreaseSpeed = useCallback(() => {
    setSpeed(Math.max(speed - 50, 100))
  }, [speed, setSpeed])

  const increaseChunk = useCallback(() => {
    setChunkSize(Math.min(chunkSize + 1, 3))
  }, [chunkSize, setChunkSize])

  const decreaseChunk = useCallback(() => {
    setChunkSize(Math.max(chunkSize - 1, 1))
  }, [chunkSize, setChunkSize])

  const handleBack = useCallback(() => {
    setIsPlaying(false)
    navigation.navigate("TextInput")
  }, [setIsPlaying, navigation])

  const handleRestart = useCallback(() => {
    setCurrentWordIndex(0)
    setIsPlaying(true)
  }, [setCurrentWordIndex, setIsPlaying])

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1}>
      <View style={themed($container)}>
        {/* Header with back button */}
        <View style={themed($header)}>
          <Button preset="default" onPress={handleBack}>
            <Icon icon="back" />
          </Button>
          <Text preset="heading" tx="reader:title" />
          <View style={themed($placeholder)} />
        </View>

        {/* Progress bar */}
        <View style={themed($progressContainer)}>
          <View style={themed($progressBar)}>
            <View style={[themed($progressFill), { width: `${progress * 100}%` }]} />
          </View>
          <Text size="xs">
            {currentWordIndex + 1} / {wordCount} words
          </Text>
        </View>

        {/* RSVP Display Area */}
        <View style={themed($displayContainer)}>
          <Text testID="rsvp-word-display" preset="heading" size="xxl" style={themed($wordDisplay)}>
            {currentWord || "Done!"}
          </Text>
        </View>

        {/* Controls */}
        <View style={themed($controlsContainer)}>
          {/* Play/Pause button */}
          <View style={themed($playButtonContainer)}>
            <Button
              testID="play-pause-button"
              preset="reversed"
              onPress={togglePlay}
              style={themed($playButton)}
            >
              <Text style={themed($playButtonText)}>{isPlaying ? "❚❚" : "▶"}</Text>
            </Button>
          </View>

          {/* Speed control */}
          <View style={themed($controlRow)}>
            <Button preset="default" onPress={decreaseSpeed}>
              <Text>-</Text>
            </Button>
            <Text>{speed} WPM</Text>
            <Button preset="default" onPress={increaseSpeed}>
              <Text>+</Text>
            </Button>
          </View>

          {/* Chunk size control */}
          <View style={themed($controlRow)}>
            <Button preset="default" onPress={decreaseChunk}>
              <Text>-</Text>
            </Button>
            <Text>Words: {chunkSize}</Text>
            <Button preset="default" onPress={increaseChunk}>
              <Text>+</Text>
            </Button>
          </View>

          {/* Restart button */}
          <Button
            testID="restart-button"
            tx="reader:restart"
            preset="default"
            onPress={handleRestart}
          />
        </View>
      </View>
    </Screen>
  )
}

const themed = <T,>(style: ThemedStyle<T>) => style

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.lg,
})

const $header: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
})

const $placeholder: ThemedStyle<ViewStyle> = () => ({
  width: 50,
})

const $progressContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $progressBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 4,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 2,
  marginBottom: 8,
})

const $progressFill: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: "100%",
  backgroundColor: colors.palette.primary500,
  borderRadius: 2,
})

const $displayContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  marginVertical: spacing.lg,
  padding: spacing.lg,
  minHeight: 150,
})

const $wordDisplay: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
})

const $controlsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $playButtonContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
})

const $playButton: ThemedStyle<ViewStyle> = () => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  justifyContent: "center",
  alignItems: "center",
})

const $playButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 24,
})

const $controlRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 40,
})
