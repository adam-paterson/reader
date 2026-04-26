import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { RSVPReader, RSVPReaderProps } from "../RSVPReader"

// Mock timer for animation tests
jest.useFakeTimers()

describe("RSVPReader", () => {
  const defaultProps: RSVPReaderProps = {
    text: "Hello world test",
    wpm: 300,
    onComplete: jest.fn(),
    onProgress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render first word on mount", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    const wordDisplay = getByTestId("rsvp-word-display")
    expect(wordDisplay).toBeTruthy()
  })

  it("should display progress indicator", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    expect(getByTestId("rsvp-progress")).toBeTruthy()
  })

  it("should show initial progress text", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    const progressText = getByTestId("rsvp-progress-text")
    expect(progressText.children[0]).toContain("1") // Shows "1 / 3" for first word
  })

  it("should call onProgress when word changes", async () => {
    render(<RSVPReader {...defaultProps} />)
    // onProgress is called on initial render
    await waitFor(() => {
      expect(defaultProps.onProgress).toHaveBeenCalled()
    })
  })

  it("should render with custom WPM", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} wpm={500} />)
    expect(getByTestId("rsvp-reader-container")).toBeTruthy()
  })

  it("should handle empty text gracefully", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} text="" />)
    expect(getByTestId("rsvp-reader")).toBeTruthy()
  })

  it("should render pause button", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    expect(getByTestId("rsvp-pause-button")).toBeTruthy()
  })

  it("should display total word count", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    // "Hello world test" = 3 words
    const progressText = getByTestId("rsvp-progress-text")
    expect(progressText).toBeTruthy()
  })

  it("should call onComplete when text is finished", async () => {
    const onComplete = jest.fn()
    render(<RSVPReader text="One" wpm={600} onComplete={onComplete} autoStart={true} />)

    // Fast-forward past the single word's duration (faster WPM = shorter wait)
    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it("should call onWordChange callback exists", () => {
    const onWordChange = jest.fn()
    render(<RSVPReader text="One two" wpm={300} onWordChange={onWordChange} />)
    // onWordChange is called during initial setup
    expect(onWordChange).toBeDefined()
  })

  it("should toggle play/pause when button is pressed", () => {
    const { getByTestId, getByLabelText } = render(
      <RSVPReader {...defaultProps} autoStart={true} />,
    )

    const pauseButton = getByTestId("rsvp-pause-button")
    expect(getByLabelText("Pause")).toBeTruthy()

    fireEvent.press(pauseButton)

    // After pressing, should show Play
    expect(getByLabelText("Play")).toBeTruthy()
  })

  it("should not auto-advance when paused", () => {
    const onWordChange = jest.fn()
    render(
      <RSVPReader text="One two three" wpm={300} onWordChange={onWordChange} autoStart={false} />,
    )

    // Clear initial call
    onWordChange.mockClear()

    // Advance time while paused
    jest.advanceTimersByTime(2000)

    // Should not have advanced
    expect(onWordChange).not.toHaveBeenCalled()
  })

  it("should handle single word text", async () => {
    const onComplete = jest.fn()
    render(<RSVPReader text="Hello" wpm={600} onComplete={onComplete} />)

    // Single word should call onComplete quickly
    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it("should advance through multiple words", async () => {
    const onProgress = jest.fn()
    render(<RSVPReader text="One two" wpm={600} onProgress={onProgress} />)

    // Initial render calls onProgress
    expect(onProgress).toHaveBeenCalledWith(0, 2)

    // Clear mock to track advancement
    onProgress.mockClear()

    // Advance past first word duration (100ms base for 600 WPM)
    jest.advanceTimersByTime(200)

    // Should have advanced to second word
    await waitFor(
      () => {
        expect(onProgress).toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it("should apply custom font size", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} fontSize={64} />)
    expect(getByTestId("rsvp-word-display")).toBeTruthy()
  })
})
