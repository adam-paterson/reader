import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { useMMKVNumber, useMMKVString } from "react-native-mmkv"

export type ReaderContextType = {
  text: string
  setText: (text: string) => void
  words: string[]
  speed: number // words per minute
  setSpeed: (speed: number) => void
  currentWordIndex: number
  setCurrentWordIndex: (index: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  chunkSize: number // words to show at once (1-3 typically)
  setChunkSize: (size: number) => void
  progress: number // 0-1
  currentWord: string
  wordCount: number
}

export const ReaderContext = createContext<ReaderContextType | null>(null)

export const ReaderProvider: FC<PropsWithChildren> = ({ children }) => {
  const [text, setTextStorage] = useMMKVString("Reader.text")
  const [speed, setSpeedStorage] = useMMKVNumber("Reader.speed")
  const [chunkSize, setChunkSizeStorage] = useMMKVNumber("Reader.chunkSize")

  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const words = useMemo(() => {
    if (!text) return []
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
  }, [text])

  const wordCount = words.length

  const currentWord = useMemo(() => {
    if (currentWordIndex >= words.length) return ""
    const endIndex = Math.min(currentWordIndex + (chunkSize || 1), words.length)
    return words.slice(currentWordIndex, endIndex).join(" ")
  }, [words, currentWordIndex, chunkSize])

  const progress = useMemo(() => {
    if (wordCount === 0) return 0
    return currentWordIndex / wordCount
  }, [currentWordIndex, wordCount])

  const setText = useCallback(
    (newText: string) => {
      setTextStorage(newText)
      setCurrentWordIndex(0)
      setIsPlaying(false)
    },
    [setTextStorage],
  )

  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedStorage(newSpeed)
    },
    [setSpeedStorage],
  )

  const setChunkSize = useCallback(
    (newSize: number) => {
      setChunkSizeStorage(Math.max(1, Math.min(3, newSize)))
    },
    [setChunkSizeStorage],
  )

  const value = useMemo(
    () => ({
      text: text || "",
      setText,
      words,
      speed: speed || 300,
      setSpeed,
      currentWordIndex,
      setCurrentWordIndex,
      isPlaying,
      setIsPlaying,
      chunkSize: chunkSize || 1,
      setChunkSize,
      progress,
      currentWord,
      wordCount,
    }),
    [
      text,
      setText,
      words,
      speed,
      setSpeed,
      currentWordIndex,
      setCurrentWordIndex,
      isPlaying,
      chunkSize,
      setChunkSize,
      progress,
      currentWord,
      wordCount,
    ],
  )

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
}

export const useReader = () => {
  const context = useContext(ReaderContext)
  if (!context) throw new Error("useReader must be used within a ReaderProvider")
  return context
}
