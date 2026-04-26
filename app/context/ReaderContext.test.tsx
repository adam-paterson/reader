import { renderHook, act } from "@testing-library/react-native"
import { ReactNode } from "react"

import { ReaderProvider, useReader } from "../../app/context/ReaderContext"

describe("ReaderContext", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ReaderProvider>{children}</ReaderProvider>
  )

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    expect(result.current.text).toBe("")
    expect(result.current.speed).toBe(300)
    expect(result.current.chunkSize).toBe(1)
    expect(result.current.currentWordIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.words).toEqual([])
  })

  it("should set text and parse words", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("Hello world test")
    })

    expect(result.current.text).toBe("Hello world test")
    expect(result.current.words).toEqual(["Hello", "world", "test"])
    expect(result.current.wordCount).toBe(3)
  })

  it("should handle empty text", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("")
    })

    expect(result.current.words).toEqual([])
    expect(result.current.wordCount).toBe(0)
    expect(result.current.currentWord).toBe("")
  })

  it("should update current word based on index", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("Hello world test")
    })

    expect(result.current.currentWord).toBe("Hello")

    act(() => {
      result.current.setCurrentWordIndex(1)
    })

    expect(result.current.currentWord).toBe("world")
  })

  it("should update speed", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setSpeed(500)
    })

    expect(result.current.speed).toBe(500)
  })

  it("should update chunk size", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("One two three four")
    })

    // Default chunk size is 1
    expect(result.current.currentWord).toBe("One")

    act(() => {
      result.current.setChunkSize(2)
    })

    expect(result.current.chunkSize).toBe(2)
    expect(result.current.currentWord).toBe("One two")
  })

  it("should limit chunk size to 1-3", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setChunkSize(5)
    })

    expect(result.current.chunkSize).toBe(3)

    act(() => {
      result.current.setChunkSize(0)
    })

    expect(result.current.chunkSize).toBe(1)
  })

  it("should calculate progress correctly", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("One two three four")
    })

    expect(result.current.progress).toBe(0)

    act(() => {
      result.current.setCurrentWordIndex(2)
    })

    expect(result.current.progress).toBe(0.5)

    act(() => {
      result.current.setCurrentWordIndex(4)
    })

    expect(result.current.progress).toBe(1)
  })

  it("should handle play/pause toggle", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    expect(result.current.isPlaying).toBe(false)

    act(() => {
      result.current.setIsPlaying(true)
    })

    expect(result.current.isPlaying).toBe(true)

    act(() => {
      result.current.setIsPlaying(false)
    })

    expect(result.current.isPlaying).toBe(false)
  })

  it("should reset index when setting new text", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("First text")
      result.current.setCurrentWordIndex(1)
      result.current.setIsPlaying(true)
    })

    expect(result.current.currentWordIndex).toBe(1)
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      result.current.setText("Second text")
    })

    expect(result.current.currentWordIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
  })

  it("should handle text with multiple spaces", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("Hello    world   test")
    })

    expect(result.current.words).toEqual(["Hello", "world", "test"])
  })

  it("should handle text with newlines and tabs", () => {
    const { result } = renderHook(() => useReader(), { wrapper })

    act(() => {
      result.current.setText("Hello\tworld\ntest")
    })

    expect(result.current.words).toEqual(["Hello", "world", "test"])
  })
})
